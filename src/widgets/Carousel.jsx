import { useCallback, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Megaphone,
  BookOpen,
} from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { registry } from '../chat/registry.js'
import styles from './carousel.module.scss'

/* ─── Generic Carousel Widget (CSV #19) ──────────────────────────────
   Horizontal scroll rail. Supports two item formats:

     • Composed widgets — `{ type: 'job_card', payload: {...} }`.
       Looked up in the widget registry and rendered inside a slide.
       Matches the CSV spec: "each card is a mini version of another
       widget type (job cards, training modules, shift options)".

     • Inline tiles — `{ title, subtitle?, description?, cta_label?,
       tone?, image_url?, accent_label? }`. Rendered with the
       carousel's own lightweight tile chrome. Useful for tips /
       announcements / learning blurbs where pulling in a full widget
       is overkill.

   Items can be mixed in the same rail. Opts out of the 28rem slot
   cap via data-widget-variant="wide" so the rail has room to breathe
   on desktop.
   ─────────────────────────────────────────────────────────────────── */

const TONE_MAP = {
  info:        { Icon: Sparkles,      variantClass: 'tone_info' },
  warn:        { Icon: AlertTriangle, variantClass: 'tone_warn' },
  success:     { Icon: CheckCircle2,  variantClass: 'tone_success' },
  announcement:{ Icon: Megaphone,     variantClass: 'tone_info' },
  learning:    { Icon: BookOpen,      variantClass: 'tone_info' },
}

export function Carousel({ payload }) {
  const { onReply } = useChatActions()

  const widgetId    = payload?.widget_id
  const carouselId  = payload?.carousel_id
  const title       = payload?.title
  const description = payload?.description
  const tone        = TONE_MAP[payload?.tone] ? payload.tone : 'info'
  const items       = Array.isArray(payload?.items) ? payload.items : []
  const isSilent    = Boolean(payload?.silent)

  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)

  /* ─── Active-dot tracking as the user scrolls the rail ────────── */
  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const cards = Array.from(track.children)
    const trackLeft = track.getBoundingClientRect().left
    let nearest = 0
    let minDist = Infinity
    cards.forEach((card, i) => {
      const dist = Math.abs(card.getBoundingClientRect().left - trackLeft)
      if (dist < minDist) { minDist = dist; nearest = i }
    })
    setActiveIndex(nearest)
  }, [])

  const scrollToIndex = useCallback((i) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[i]
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }, [])

  const handleItemAction = useCallback((item) => {
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'carousel',
          source_widget_id: widgetId,
          data: {
            label: `Selected ${item.title ?? 'item'}`,
            carousel_id: carouselId,
            item_id: item.item_id,
            action: item.action ?? null,
            timestamp: Date.now(),
          },
        },
      },
      { silent: isSilent },
    )
  }, [onReply, widgetId, carouselId, isSilent])

  const { Icon, variantClass } = TONE_MAP[tone]

  return (
    <div
      className={cx(styles.widget, styles[variantClass])}
      role="region"
      aria-label={title ?? 'Content carousel'}
      data-widget-variant="wide"
    >
      {/* Optional header — only renders when title is provided */}
      {title && (
        <div className={styles.header}>
          <div className={styles.iconBadge} aria-hidden="true">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {description && (
              <p className={styles.description}>{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Horizontal scroll rail */}
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
        aria-live="polite"
      >
        {items.map((item, i) => (
          <CarouselItem
            key={item.item_id ?? i}
            item={item}
            delay={i}
            widgetTone={tone}
            isActive={i === activeIndex}
            onAction={() => handleItemAction(item)}
          />
        ))}
      </div>

      {/* Dot indicator — only when > 1 item */}
      {items.length > 1 && (
        <div className={styles.dots} aria-label="Carousel position">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cx(styles.dot, i === activeIndex && styles.dotActive)}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── CarouselItem — dispatches between composed widget + tile ─── */

function CarouselItem({ item, delay, widgetTone, isActive, onAction }) {
  /* If the item declares a widget `type` that's registered, render
     the nested widget inside a slide wrapper. Matches CSV spec
     ("mini version of another widget type"). */
  const ComposedComponent = item.type && item.type !== 'tile'
    ? registry[item.type]
    : null

  if (ComposedComponent) {
    return (
      <div
        className={cx(styles.slide, styles.slideComposed, !isActive && styles.slideDim)}
        style={{ '--card-delay': `${delay * 80}ms` }}
      >
        <ComposedComponent payload={item.payload ?? {}} />
      </div>
    )
  }

  /* Fallback: inline-tile format. */
  return (
    <CarouselTile
      item={item}
      delay={delay}
      widgetTone={widgetTone}
      isActive={isActive}
      onAction={onAction}
    />
  )
}

/* ─── CarouselTile — inline tile (legacy, tips / announcements) ── */

function CarouselTile({ item, delay, widgetTone, isActive, onAction }) {
  const hasImage = Boolean(item.image_url)
  const hasCta   = Boolean(item.cta_label)

  /* Resolve tone: per-card `tone` wins, then legacy `hero_icon`
     (same semantics), then the widget-level tone. This lets the
     rail mix accents — a safety card in amber alongside an earnings
     card in green — rather than forcing one tone across all tiles. */
  const resolvedTone = (item.tone && TONE_MAP[item.tone])
    ? item.tone
    : (item.hero_icon && TONE_MAP[item.hero_icon])
      ? item.hero_icon
      : widgetTone
  const { Icon: HeroIcon, variantClass } = TONE_MAP[resolvedTone]

  return (
    <article
      className={cx(
        styles.card,
        styles[variantClass],           // per-card tone drives the accent vars
        !isActive && styles.cardDim,    // subtle focus hierarchy across the rail
      )}
      style={{ '--card-delay': `${delay * 80}ms` }}
    >
      {hasImage ? (
        <div className={styles.hero}>
          <img src={item.image_url} alt="" className={styles.heroImage} />
        </div>
      ) : (
        <div className={cx(styles.hero, styles.heroTinted)}>
          {/* Ghost icon — same glyph, much larger, deeply faded, pinned
              to the bottom-right. Adds editorial depth + repetition-
              as-motif without asking the payload to supply an image. */}
          <HeroIcon
            size={128}
            strokeWidth={1}
            aria-hidden="true"
            className={styles.heroGhost}
          />
          <HeroIcon
            size={36}
            strokeWidth={1.5}
            aria-hidden="true"
            className={styles.heroIcon}
          />
        </div>
      )}

      <div className={styles.body}>
        {item.accent_label && (
          <div className={styles.accent}>{item.accent_label}</div>
        )}

        {item.title && (
          <h4 className={styles.cardTitle}>{item.title}</h4>
        )}

        {item.subtitle && (
          <div className={styles.subtitle}>{item.subtitle}</div>
        )}

        {item.description && (
          <p className={styles.cardDescription}>{item.description}</p>
        )}

        {hasCta && (
          <button
            type="button"
            className={styles.cta}
            onClick={onAction}
          >
            {item.cta_label}
            <ArrowRight
              size={14}
              strokeWidth={2.25}
              aria-hidden="true"
              className={styles.ctaArrow}
            />
          </button>
        )}
      </div>
    </article>
  )
}
