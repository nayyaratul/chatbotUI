import { useState, useRef, useCallback } from 'react'
import cx from 'classnames'
import {
  Bookmark,
  CheckCircle2,
  Check,
  ArrowRight,
  ShieldCheck,
  Clock,
  Phone,
  Wallet,
  MapPin,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { JobDetailsModal } from './JobDetailsModal.jsx'
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

/** Map a raw period ("month", "hour", "year") to its adverb form
 *  ("monthly", "hourly", "yearly"). Cleaner typography vs "/month". */
function periodLabel(period) {
  if (!period) return ''
  const p = String(period).toLowerCase()
  const map = { month: 'monthly', hour: 'hourly', year: 'yearly', week: 'weekly', day: 'daily' }
  return map[p] ?? `/ ${period}`
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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [originRect, setOriginRect] = useState(null)
  const cardRef = useRef(null)

  const jobId     = item?.job_id ?? ''
  const title     = item?.title ?? 'Untitled role'
  const company   = item?.company ?? {}
  const location  = item?.location ?? {}
  const pay       = item?.pay ?? {}
  const timing    = item?.timing
  const allReqs   = item?.requirements ?? []
  const reqs      = allReqs.slice(0, 3)
  const moreReqs  = Math.max(0, allReqs.length - reqs.length)
  const actions   = item?.actions ?? ['apply']

  const hasApply   = actions.includes('apply')
  const hasSave    = actions.includes('save')
  const hasDismiss = actions.includes('dismiss')

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

  const handleCall = useCallback(() => {
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'job_card',
          source_widget_id: containerWidgetId,
          data: {
            label: `Called HR for ${title}`,
            job_id: jobId,
            action: 'call_hr',
            timestamp: Date.now(),
          },
        },
      },
      { silent: true },
    )
    if (item?.phone) window.location.href = `tel:${item.phone}`
  }, [onReply, containerWidgetId, jobId, title, item])

  const openDetails = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect()
    const root = document.getElementById('chat-modal-root')
    const rootRect = root?.getBoundingClientRect()
    if (rect && rootRect && rootRect.width > 0 && rootRect.height > 0) {
      // FLIP-style: precompute translate + scale values so the modal
      // sheet can start at the card's size/position and animate to
      // fill the pane. Values are relative to the modal root (pane).
      setOriginRect({
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        scaleX: rect.width / rootRect.width,
        scaleY: rect.height / rootRect.height,
      })
    }
    setDetailsOpen(true)
  }, [])

  // Pay displays either a range (min–max) or a single amount.
  // An en-dash (U+2013) separates the bounds of a range.
  const payText = (pay?.min != null && pay?.max != null)
    ? `${pay.min} – ${pay.max}`
    : (pay?.amount ?? null)

  return (
    <div
      ref={cardRef}
      className={cx(styles.card, isCarousel && styles.carouselCard)}
      role="article"
      aria-label={`Job: ${title} at ${company.name ?? ''}`}
    >
      {/* Top-right corner — Save icon. Dismiss moved to a labeled
          "Not interested" button in the actions row. Hidden when doneChip shows. */}
      {!doneAction && hasSave && (
        <div className={styles.cornerActions}>
          <button
            type="button"
            className={styles.cornerBtn}
            onClick={() => handleAction('save')}
            aria-label="Save"
            title="Save"
          >
            <Bookmark size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Done chip — appears in top-right corner after user action */}
      {doneAction && (
        <span className={cx(styles.doneChip, styles[doneAction])}>
          <CheckCircle2 size={11} strokeWidth={2.5} aria-hidden="true" />
          {doneLabel(doneAction)}
        </span>
      )}

      {/* Top meta strip — urgency + freshness (Indian job-card convention) */}
      {(item?.urgent || item?.posted_at) && (
        <div className={styles.metaStrip}>
          {item.urgent && (
            <span className={cx(styles.metaPill, styles.urgent)}>Urgent</span>
          )}
          {item.urgent && item.posted_at && (
            <span className={styles.dotSep} aria-hidden="true">·</span>
          )}
          {item.posted_at && (
            <span className={styles.metaPosted}>Posted {item.posted_at}</span>
          )}
        </div>
      )}

      {/* Head row: logo + title + subtitle (company ✓ · location) */}
      <div className={styles.head}>
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={`${company.name ?? 'Company'} logo`}
            className={styles.logo}
            width={36}
            height={36}
          />
        ) : (
          <div className={styles.logoFallback} aria-hidden="true">
            {companyInitials(company.name ?? 'Co')}
          </div>
        )}

        <div className={styles.headText}>
          <h3 className={styles.jobTitle}>{title}</h3>
          {company.name && (
            <div className={styles.subtitle}>
              <span className={styles.subtitlePart}>
                {company.name}
                {company.verified && (
                  <ShieldCheck
                    size={12}
                    strokeWidth={2.5}
                    aria-label="Verified employer"
                    className={styles.verifiedInline}
                  />
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Facts cluster — salary / location / timing. Tighter internal
          gap than the card's macro rhythm so these three rows read as
          one grouped "what matters" panel, not an even stack. */}
      {(payText || location.name || timing) && (
        <div className={styles.factsGroup}>
          {payText && (
            <div className={styles.factLine}>
              <Wallet size={14} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
              <span className={styles.factText}>
                <strong>{payText}</strong>
                {pay?.period && (
                  <span className={styles.factPeriod}> {periodLabel(pay.period)}</span>
                )}
              </span>
            </div>
          )}

          {location.name && (
            <div className={styles.factLine}>
              <MapPin size={14} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
              <span className={styles.factText}>{location.name}</span>
            </div>
          )}

          {timing && (
            <div className={styles.factLine}>
              <Clock size={14} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
              <span className={styles.factText}>{timing}</span>
            </div>
          )}
        </div>
      )}

      {/* Requirements — compact checklist, capped at 3 + overflow label */}
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
          {moreReqs > 0 && (
            <li className={styles.requirementMore}>
              +{moreReqs} more {moreReqs === 1 ? 'requirement' : 'requirements'}
            </li>
          )}
        </ul>
      )}

      {/* View details — sits ABOVE the primary CTAs as a secondary
          affordance ("read more before deciding"). margin-top: auto
          on this element pins it + the actions row to the bottom of
          the card so all carousel cards align their CTAs. */}
      <button
        type="button"
        className={styles.viewDetailsLink}
        onClick={openDetails}
        aria-label={`View full details for ${title}`}
      >
        View full details
        <ArrowRight size={12} strokeWidth={2.25} aria-hidden="true" />
      </button>

      {/* Actions — conditionally rendered based on doneAction:
          • Pre-action: [Not interested] + [Apply →] split 50/50
          • Post-apply: [📞 Call HR now] — reward CTA, Apna pattern
          • Post-save / post-dismiss: nothing (doneChip alone suffices) */}
      {doneAction === 'apply' && item?.phone ? (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.postApplyCallBtn}
            onClick={handleCall}
          >
            <Phone size={15} strokeWidth={2.25} aria-hidden="true" />
            Call HR now
          </button>
        </div>
      ) : !doneAction ? (
        <div className={styles.actionsRow}>
          {hasDismiss && (
            <Button
              variant="secondary"
              size="md"
              className={styles.dismissBtn}
              onClick={() => handleAction('dismiss')}
            >
              Not interested
            </Button>
          )}

          {hasApply && (
            <Button
              variant="primary"
              size="md"
              className={styles.primaryBtn}
              iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={() => handleAction('apply')}
            >
              Apply
            </Button>
          )}
        </div>
      ) : null}

      {/* Expanded modal */}
      {detailsOpen && (
        <JobDetailsModal
          item={item}
          originRect={originRect}
          disabled={!!doneAction}
          onClose={() => setDetailsOpen(false)}
          onApply={() => handleAction('apply')}
          onSave={() => handleAction('save')}
          onDismiss={() => handleAction('dismiss')}
        />
      )}
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
      /* Opts the carousel out of the MessageRenderer's 28rem slot
         cap so multiple cards + peek can breathe on desktop. */
      data-widget-variant="wide"
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
