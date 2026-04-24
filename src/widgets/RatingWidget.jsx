import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Angry,
  Frown,
  Meh,
  Smile,
  Laugh,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './ratingWidget.module.scss'

/* ─── Rating Widget ───────────────────────────────────────────────────
   Sentiment / satisfaction capture. Two variants supported in v1:

     • stars  — 1..N stars, hover preview + tap to commit.
                `scale` controls how many stars (default 5).
     • thumbs — binary thumbs up / thumbs down.

   Optional free-text comment field, optionally required when the
   rating falls below a configurable threshold (`require_comment_below`).
   Submit fires a widget_response with the rating + comment.
   ─────────────────────────────────────────────────────────────────── */

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

export function RatingWidget({ payload }) {
  const { onReply } = useChatActions()

  const widgetId       = payload?.widget_id
  const ratingId       = payload?.rating_id
  const title          = payload?.title ?? 'Rate your experience'
  const description    = payload?.description
  const variant        = ['thumbs', 'emoji', 'nps'].includes(payload?.variant)
    ? payload.variant
    : 'stars'
  const scale          = Math.max(2, Math.min(10, Number(payload?.scale ?? 5)))
  const levelLabels    = Array.isArray(payload?.level_labels)
    ? payload.level_labels
    : null
  const allowComment   = payload?.allow_comment !== false
  const commentPlaceholder = payload?.comment_placeholder ?? 'Tell us more (optional)'
  const requireCommentBelow = Number.isFinite(payload?.require_comment_below)
    ? payload.require_comment_below
    : null
  const submitLabel    = payload?.submit_label ?? 'Submit'
  const isSilent       = Boolean(payload?.silent)

  const [value, setValue]           = useState(null)
  const [hoverValue, setHoverValue] = useState(null)
  const [comment, setComment]       = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)

  const hasValue = value != null
  const commentRequired = requireCommentBelow != null && hasValue && value <= requireCommentBelow
  const canSubmit = hasValue && (!commentRequired || comment.trim().length > 0)

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    const now = Date.now()
    setSubmittedAt(now)
    setSubmitted(true)
    const labelText = variant === 'thumbs'
      ? (value === 1 ? 'Rated 👍' : 'Rated 👎')
      : variant === 'nps'
        ? `Rated ${value} / 10 (NPS)`
        : `Rated ${value} of ${variant === 'emoji' ? 5 : scale}`
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'rating',
          source_widget_id: widgetId,
          data: {
            label: labelText,
            rating_id: ratingId,
            variant,
            value,
            scale: variant === 'stars' ? scale : null,
            comment: comment.trim() || null,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [canSubmit, variant, value, scale, comment, onReply, widgetId, ratingId, isSilent])

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* Header — same family chrome */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Star size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      </div>

      {/* Rating control */}
      {variant === 'stars' && (
        <StarScale
          scale={scale}
          value={value}
          hoverValue={hoverValue}
          onChange={setValue}
          onHover={setHoverValue}
          disabled={submitted}
          levelLabels={levelLabels}
        />
      )}
      {variant === 'thumbs' && (
        <ThumbsScale
          value={value}
          onChange={setValue}
          disabled={submitted}
        />
      )}
      {variant === 'emoji' && (
        <EmojiScale
          value={value}
          hoverValue={hoverValue}
          onChange={setValue}
          onHover={setHoverValue}
          disabled={submitted}
          levelLabels={levelLabels}
        />
      )}
      {variant === 'nps' && (
        <NpsScale
          value={value}
          hoverValue={hoverValue}
          onChange={setValue}
          onHover={setHoverValue}
          disabled={submitted}
          labels={payload?.nps_labels}
        />
      )}

      {/* Comment — appears only after a rating is given */}
      {allowComment && hasValue && !submitted && (
        <div className={styles.commentBlock}>
          <label htmlFor={`rating-${widgetId}-comment`} className={styles.commentLabel}>
            <MessageSquare size={12} strokeWidth={2.25} aria-hidden="true" />
            {commentRequired ? 'Tell us more (required)' : 'Comment (optional)'}
          </label>
          <textarea
            id={`rating-${widgetId}-comment`}
            className={styles.commentInput}
            placeholder={commentPlaceholder}
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      )}

      {/* Bottom: submit CTA OR success banner */}
      {submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>Thanks for the feedback</div>
            <div className={styles.successSub}>
              <SubmittedRating variant={variant} value={value} scale={scale} />
              <span className={styles.successDot} aria-hidden="true"> · </span>
              <span className={styles.successTime}>{timeLabel(submittedAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.actionsGroup}>
          <Button
            variant="primary"
            size="md"
            disabled={!canSubmit}
            className={styles.primaryBtn}
            iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
            onClick={handleSubmit}
          >
            {hasValue ? submitLabel : 'Select a rating'}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── StarScale — 1..N stars, hover preview, click to commit.
   Ships with a live sentiment label above the row that updates as the
   cursor moves across — the widget's emotional payoff. */

const DEFAULT_LEVEL_LABELS = {
  2: ['No', 'Yes'],
  3: ['Poor', 'Okay', 'Good'],
  4: ['Poor', 'Fair', 'Good', 'Great'],
  5: ['Poor', 'Fair', 'Good', 'Great', 'Excellent'],
  10: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
}

function resolveLevelLabel({ value, scale, levelLabels }) {
  if (value == null) return null
  const table = Array.isArray(levelLabels) && levelLabels.length === scale
    ? levelLabels
    : (DEFAULT_LEVEL_LABELS[scale] ?? null)
  if (table) return table[value - 1]
  return `${value} of ${scale}`
}

function StarScale({ scale, value, hoverValue, onChange, onHover, disabled, levelLabels }) {
  const effective      = hoverValue ?? value ?? 0
  const labelValue     = hoverValue ?? value
  const liveLabel      = resolveLevelLabel({ value: labelValue, scale, levelLabels })
  const isCommitted    = !hoverValue && value != null

  return (
    <div className={styles.scaleWrap}>
      {/* Live sentiment label — updates with hover/select. Reserved
          height via &nbsp; so the star row doesn't jump when empty. */}
      <div
        className={cx(
          styles.liveLabel,
          liveLabel && styles.liveLabelVisible,
          isCommitted && styles.liveLabelCommitted,
        )}
        aria-live="polite"
        /* key-based remount gives us a crisp fade when the text
           changes — otherwise CSS transitions can't animate the
           swap of inner text nodes. */
        key={liveLabel ?? 'empty'}
      >
        {liveLabel ?? ' '}
      </div>

      <div
        className={styles.starRow}
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => onHover?.(null)}
      >
        {Array.from({ length: scale }, (_, i) => {
          const index  = i + 1
          const filled = index <= effective
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={value === index}
              aria-label={`${index} ${index === 1 ? 'star' : 'stars'}`}
              className={cx(styles.star, filled && styles.starFilled)}
              style={{ '--star-index': index }}
              onClick={() => onChange(index)}
              onMouseEnter={() => onHover?.(index)}
              onFocus={() => onHover?.(index)}
              onBlur={() => onHover?.(null)}
              disabled={disabled}
            >
              <Star size={28} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── EmojiScale — 5 face icons from unhappy to delighted ────────
   Lucide iconography (Angry / Frown / Meh / Smile / Laugh) instead
   of unicode emoji so the widget family's visual vocabulary holds. */

const EMOJI_FACES = [
  { v: 1, Icon: Angry, tone: 'red',    label: 'Terrible' },
  { v: 2, Icon: Frown, tone: 'red',    label: 'Bad' },
  { v: 3, Icon: Meh,   tone: 'grey',   label: 'Okay' },
  { v: 4, Icon: Smile, tone: 'amber',  label: 'Good' },
  { v: 5, Icon: Laugh, tone: 'amber',  label: 'Amazing' },
]

function EmojiScale({ value, hoverValue, onChange, onHover, disabled, levelLabels }) {
  const labelValue = hoverValue ?? value
  const liveLabel  = labelValue != null
    ? (Array.isArray(levelLabels) && levelLabels.length === 5
        ? levelLabels[labelValue - 1]
        : EMOJI_FACES[labelValue - 1]?.label)
    : null
  const isCommitted = !hoverValue && value != null

  return (
    <div className={styles.scaleWrap}>
      <div
        className={cx(
          styles.liveLabel,
          liveLabel && styles.liveLabelVisible,
          isCommitted && styles.liveLabelCommitted,
        )}
        aria-live="polite"
        key={liveLabel ?? 'empty'}
      >
        {liveLabel ?? ' '}
      </div>

      <div
        className={styles.emojiRow}
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => onHover?.(null)}
      >
        {EMOJI_FACES.map(({ v, Icon, tone, label }) => {
          const isSelected = value === v
          const isActive   = (hoverValue ?? value) === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={cx(
                styles.emojiBtn,
                isActive && styles.emojiActive,
                isSelected && styles.emojiSelected,
                styles[`emojiTone_${tone}`],
              )}
              onClick={() => onChange(v)}
              onMouseEnter={() => onHover?.(v)}
              onFocus={() => onHover?.(v)}
              onBlur={() => onHover?.(null)}
              disabled={disabled}
            >
              <Icon size={30} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── NpsScale — 0-10 number pills with low/high anchors ───────── */

function NpsScale({ value, hoverValue, onChange, onHover, disabled, labels }) {
  const active = hoverValue ?? value
  const lowLabel  = labels?.[0] ?? 'Not likely'
  const highLabel = labels?.[1] ?? 'Very likely'

  const bandFor = (n) => (n <= 6 ? 'detractor' : n <= 8 ? 'passive' : 'promoter')

  return (
    <div className={cx(styles.scaleWrap, styles.npsWrap)}>
      <div
        className={styles.npsRow}
        role="radiogroup"
        aria-label="NPS rating"
        onMouseLeave={() => onHover?.(null)}
      >
        {Array.from({ length: 11 }, (_, n) => {
          const isSelected = value === n
          const isActive   = active === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${n} of 10`}
              className={cx(
                styles.npsBtn,
                styles[`npsBand_${bandFor(n)}`],
                isActive && styles.npsActive,
                isSelected && styles.npsSelected,
              )}
              onClick={() => onChange(n)}
              onMouseEnter={() => onHover?.(n)}
              onFocus={() => onHover?.(n)}
              onBlur={() => onHover?.(null)}
              disabled={disabled}
            >
              {n}
            </button>
          )
        })}
      </div>

      <div className={styles.npsAnchors} aria-hidden="true">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

/* ─── ThumbsScale — binary up / down ────────────────────────────── */

function ThumbsScale({ value, onChange, disabled }) {
  return (
    <div className={styles.thumbRow} role="radiogroup" aria-label="Rating">
      <button
        type="button"
        role="radio"
        aria-checked={value === 1}
        className={cx(
          styles.thumbBtn,
          styles.thumbUp,
          value === 1 && styles.thumbSelected,
        )}
        onClick={() => onChange(1)}
        disabled={disabled}
      >
        <ThumbsUp size={22} strokeWidth={1.75} aria-hidden="true" />
        <span>Good</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === -1}
        className={cx(
          styles.thumbBtn,
          styles.thumbDown,
          value === -1 && styles.thumbSelected,
        )}
        onClick={() => onChange(-1)}
        disabled={disabled}
      >
        <ThumbsDown size={22} strokeWidth={1.75} aria-hidden="true" />
        <span>Bad</span>
      </button>
    </div>
  )
}

/* ─── SubmittedRating — renders the committed value in the success
   banner as a small visual echo (filled stars / thumbs glyph). */

function SubmittedRating({ variant, value, scale }) {
  if (variant === 'thumbs') {
    return (
      <span className={styles.submittedThumb}>
        {value === 1
          ? <ThumbsUp size={14} strokeWidth={2.25} aria-hidden="true" />
          : <ThumbsDown size={14} strokeWidth={2.25} aria-hidden="true" />}
        <strong>{value === 1 ? 'Good' : 'Bad'}</strong>
      </span>
    )
  }

  if (variant === 'emoji') {
    const face = EMOJI_FACES[value - 1]
    if (!face) return null
    const { Icon, label } = face
    return (
      <span className={styles.submittedThumb}>
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        <strong>{label}</strong>
      </span>
    )
  }

  if (variant === 'nps') {
    return (
      <span className={styles.submittedThumb}>
        <strong>{value}/10</strong>
        <span className={styles.submittedNpsBand}>
          {value <= 6 ? 'Detractor' : value <= 8 ? 'Passive' : 'Promoter'}
        </span>
      </span>
    )
  }

  /* default: stars */
  return (
    <span className={styles.submittedStars}>
      {Array.from({ length: scale }, (_, i) => (
        <Star
          key={i}
          size={12}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cx(styles.submittedStar, i < value && styles.submittedStarFilled)}
        />
      ))}
      <strong>{value}/{scale}</strong>
    </span>
  )
}
