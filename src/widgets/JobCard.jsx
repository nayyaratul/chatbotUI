import { useState, useRef, useCallback } from 'react'
import cx from 'classnames'
import {
  MapPin,
  Clock,
  Bookmark,
  X,
  ExternalLink,
  CheckCircle2,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './jobCard.module.scss'

/* ─── Job Card Widget ─────────────────────────────────────────────────
   Visually rich card for a job opportunity.
   Supports single-card and carousel (array.isArray(payload.items)) modes.
   Action → onReply mapping per spec.
   ─────────────────────────────────────────────────────────────────── */

/* ─── Helpers ─────────────────────────────────────────────────────── */

/** Extract up to 2 uppercase initials from a company name. */
function companyInitials(name = '') {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name.slice(0, 2)).toUpperCase()
}

/** Human-readable label for each action. */
function actionLabel(action) {
  switch (action) {
    case 'apply':        return 'Apply'
    case 'save':         return 'Save'
    case 'dismiss':      return 'Not interested'
    case 'view_details': return 'View details'
    default:             return action
  }
}

/** Chip label shown after user acts. */
function doneLabel(action) {
  switch (action) {
    case 'apply':        return 'Applied'
    case 'save':         return 'Saved'
    case 'dismiss':      return 'Dismissed'
    case 'view_details': return 'Viewed'
    default:             return 'Done'
  }
}

/* ─── SingleCard ──────────────────────────────────────────────────── */

function SingleCard({ item, containerWidgetId, isSilent, onReply, isCarousel }) {
  const [doneAction, setDoneAction] = useState(null)

  const jobId     = item?.job_id ?? ''
  const title     = item?.title ?? 'Untitled role'
  const company   = item?.company ?? {}
  const location  = item?.location ?? {}
  const pay       = item?.pay ?? {}
  const timing    = item?.timing
  const reqs      = (item?.requirements ?? []).slice(0, 4)
  const actions   = item?.actions ?? ['apply']

  const hasApply  = actions.includes('apply')
  const others    = actions.filter((a) => a !== 'apply')

  const handleAction = useCallback((action) => {
    if (doneAction) return
    setDoneAction(action)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'job_card',
          source_widget_id: containerWidgetId,
          data: {
            label: `${doneLabel(action)} ${title}`,
            job_id: jobId,
            action,
            timestamp: Date.now(),
          },
        },
      },
      { silent: isSilent },
    )
  }, [doneAction, onReply, containerWidgetId, jobId, title, isSilent])

  const distanceText = location.distance_km != null
    ? `${Number(location.distance_km).toFixed(1)} km`
    : null

  return (
    <div
      className={cx(styles.card, isCarousel && styles.carouselCard)}
      role="article"
      aria-label={`Job: ${title} at ${company.name ?? ''}`}
    >
      {/* Done chip — appears in top-right corner after user action */}
      {doneAction && (
        <span className={cx(styles.doneChip, styles[doneAction])}>
          <CheckCircle2 size={11} strokeWidth={2.5} aria-hidden="true" />
          {doneLabel(doneAction)}
        </span>
      )}

      {/* Head row */}
      <div className={styles.head}>
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={`${company.name ?? 'Company'} logo`}
            className={styles.logo}
            width={40}
            height={40}
          />
        ) : (
          <div className={styles.logoFallback} aria-hidden="true">
            {companyInitials(company.name ?? 'Co')}
          </div>
        )}

        <div className={styles.headText}>
          <h3 className={styles.jobTitle}>{title}</h3>
          {company.name && (
            <span className={styles.companyName}>{company.name}</span>
          )}
        </div>
      </div>

      {/* Pay — tinted chip, headliner */}
      {(pay.amount || pay.period) && (
        <div className={styles.payChip}>
          {pay.amount && <span className={styles.payAmount}>{pay.amount}</span>}
          {pay.period && <span className={styles.payPeriod}>/ {pay.period}</span>}
        </div>
      )}

      {/* Meta row: location (with optional Near-you badge) + timing */}
      {(location.name || timing) && (
        <div className={styles.metaRow}>
          {location.name && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
              </span>
              {location.name}
              {distanceText && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaDistance}>{distanceText}</span>
                </>
              )}
              {location.distance_km != null && location.distance_km < 5 && (
                <span className={styles.nearBadge}>Near you</span>
              )}
            </span>
          )}
          {timing && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>
                <Clock size={13} strokeWidth={2} aria-hidden="true" />
              </span>
              {timing}
            </span>
          )}
        </div>
      )}

      {/* Requirements — checklist style */}
      {reqs.length > 0 && (
        <ul className={styles.requirementsList} aria-label="Key requirements">
          {reqs.map((req, i) => (
            <li key={i} className={styles.requirementItem}>
              <span className={styles.requirementIcon} aria-hidden="true">
                <Check size={12} strokeWidth={2.75} />
              </span>
              <span>{req}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className={styles.actionsRow}>
        {hasApply && (
          <Button
            variant="primary"
            size="md"
            disabled={!!doneAction}
            className={styles.applyBtn}
            onClick={() => handleAction('apply')}
          >
            <span className={styles.btnInner}>
              Apply
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
            </span>
          </Button>
        )}

        {others.includes('save') && (
          <Button
            variant="secondary"
            size="md"
            disabled={!!doneAction}
            className={styles.secondaryBtn}
            onClick={() => handleAction('save')}
          >
            <span className={styles.btnInner}>
              <Bookmark size={14} strokeWidth={2} aria-hidden="true" />
              Save
            </span>
          </Button>
        )}

        {others.includes('dismiss') && (
          <Button
            variant="secondary"
            size="md"
            disabled={!!doneAction}
            className={styles.secondaryBtn}
            onClick={() => handleAction('dismiss')}
          >
            <span className={styles.btnInner}>
              <X size={14} strokeWidth={2} aria-hidden="true" />
              Not interested
            </span>
          </Button>
        )}

        {others.includes('view_details') && (
          <Button
            variant="secondary"
            size="md"
            disabled={!!doneAction}
            className={styles.secondaryBtn}
            onClick={() => handleAction('view_details')}
          >
            <span className={styles.btnInner}>
              <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
              Details
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Carousel dots tracker ───────────────────────────────────────── */

function CarouselDots({ count, activeIndex, onDotClick }) {
  return (
    <div className={styles.dots} aria-label="Carousel position">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          className={cx(styles.dot, i === activeIndex && styles.activeDot)}
          onClick={() => onDotClick(i)}
          aria-label={`Go to card ${i + 1}`}
          type="button"
        />
      ))}
    </div>
  )
}

/* ─── Root export ─────────────────────────────────────────────────── */

export function JobCard({ payload }) {
  const { onReply } = useChatActions()

  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)

  const isCarousel   = Array.isArray(payload?.items)
  const isSilent     = !!payload?.silent
  const widgetId     = payload?.widget_id

  /* ─── Carousel scroll → update active dot ────────────────────── */
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

  const scrollToCard = useCallback((index) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index]
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }, [])

  /* ─── Single card mode ────────────────────────────────────────── */
  if (!isCarousel) {
    return (
      <SingleCard
        item={payload}
        containerWidgetId={widgetId}
        isSilent={isSilent}
        onReply={onReply}
        isCarousel={false}
      />
    )
  }

  /* ─── Carousel mode ───────────────────────────────────────────── */
  const items = payload.items ?? []

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-label="Job opportunities"
    >
      <div
        ref={trackRef}
        className={styles.carouselTrack}
        onScroll={handleScroll}
        aria-live="polite"
      >
        {items.map((item, i) => (
          <SingleCard
            key={item?.job_id ?? i}
            item={item}
            containerWidgetId={widgetId}
            isSilent={isSilent}
            onReply={onReply}
            isCarousel={true}
          />
        ))}
      </div>

      {items.length > 1 && (
        <CarouselDots
          count={items.length}
          activeIndex={activeIndex}
          onDotClick={scrollToCard}
        />
      )}
    </div>
  )
}
