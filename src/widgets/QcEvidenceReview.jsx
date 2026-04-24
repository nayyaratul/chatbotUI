import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  ScanSearch,
  Check,
  X,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './qcEvidenceReview.module.scss'

/* ─── QC Evidence Review Widget (CSV #20) ──────────────────────────────
   Specialised image display: worker's submitted task photo with AI-
   generated annotations. Shows:
     • the full image with bounding boxes around evaluated regions
     • per-criterion verdict list (pass / fail / partial) with AI
       reasoning (expandable)
     • overall verdict badge + confidence
     • admin mode → Approve / Reject / Resubmit + optional notes
     • worker mode → read-only feedback, no action buttons

   Distinct from the candidate-onboarding EvidenceReview widget —
   that one handles multi-item document approval; this one is for
   single-image task-output QC (OkayGo merchandising shots, etc.).
   ─────────────────────────────────────────────────────────────────── */

const VERDICT_META = {
  pass:     { label: 'Pass',    tone: 'success', Icon: Check },
  fail:     { label: 'Fail',    tone: 'danger',  Icon: X },
  partial:  { label: 'Partial', tone: 'warn',    Icon: AlertCircle },
}

const OVERALL_META = {
  approve:    { label: 'Approved',    tone: 'success' },
  reject:     { label: 'Rejected',    tone: 'danger' },
  borderline: { label: 'Borderline',  tone: 'warn' },
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

export function QcEvidenceReview({ payload }) {
  const { onReply } = useChatActions()

  const widgetId        = payload?.widget_id
  const submissionId    = payload?.submission_id
  const title           = payload?.title ?? 'Task evidence'
  const description     = payload?.description
  const imageUrl        = payload?.image_url
  const annotations     = Array.isArray(payload?.annotations) ? payload.annotations : []
  const criteria        = Array.isArray(payload?.criteria) ? payload.criteria : []
  const overallVerdict  = OVERALL_META[payload?.overall_verdict]
    ? payload.overall_verdict
    : 'borderline'
  const confidence      = payload?.confidence
  const mode            = payload?.mode === 'worker' ? 'worker' : 'admin'
  const allowedActions  = Array.isArray(payload?.actions)
    ? payload.actions
    : ['approve', 'reject', 'resubmit']
  const isSilent        = Boolean(payload?.silent)

  const [expandedReasoning, setExpandedReasoning] = useState(() => new Set())
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState(null)
  const [submittedAt, setSubmittedAt] = useState(null)

  const toggleReasoning = useCallback((index) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }, [])

  const handleDecision = useCallback((actionId) => {
    if (submitted) return
    /* Reject / resubmit both invite an optional reviewer note. Approve
       can commit immediately since it needs no justification. */
    if (actionId !== 'approve' && !showNote) {
      setShowNote(actionId)
      return
    }
    const now = Date.now()
    setDecision(actionId)
    setSubmittedAt(now)
    setSubmitted(true)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'qc_evidence_review',
          source_widget_id: widgetId,
          data: {
            label: `QC: ${actionId}${note ? ' · noted' : ''}`,
            submission_id: submissionId,
            verdict: actionId,
            reviewer_notes: note || null,
            reviewed_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [submitted, showNote, note, onReply, widgetId, submissionId, isSilent])

  const overall = OVERALL_META[overallVerdict]

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* ─── Header — title + description ────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <ScanSearch size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      </div>

      {/* ─── Image + overlays — hero of the widget ─────────────── */}
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Submitted task evidence"
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <ScanSearch size={40} strokeWidth={1.25} aria-hidden="true" />
            <span>Submitted photo</span>
          </div>
        )}

        {/* Overall verdict — corner chip on the image itself. Places
            the stamp on the primary subject, not in the header where
            it competed with the title on narrow panels. */}
        <span
          className={cx(styles.overallBadge, styles[`overallBadge_${overall.tone}`])}
        >
          <span className={styles.overallLabel}>{overall.label}</span>
          {confidence != null && (
            <span className={styles.confidence}>
              {Math.round(confidence * 100)}%
            </span>
          )}
        </span>

        {/* Bounding boxes — only rendered when there's a real image to
            overlay. Without this guard, boxes would float over the
            empty placeholder on rendered mock payloads. */}
        {imageUrl && annotations.map((a, i) => {
          const meta = VERDICT_META[a.verdict] ?? VERDICT_META.partial
          const r = a.region ?? {}
          return (
            <div
              key={i}
              className={cx(styles.annotation, styles[`annotation_${meta.tone}`])}
              style={{
                left:   `${(r.x ?? 0) * 100}%`,
                top:    `${(r.y ?? 0) * 100}%`,
                width:  `${(r.w ?? 0) * 100}%`,
                height: `${(r.h ?? 0) * 100}%`,
              }}
              aria-hidden="true"
            >
              {a.label && (
                <span className={styles.annotationLabel}>{a.label}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── Criteria list with expandable reasoning ─────────────── */}
      {criteria.length > 0 && (
        <section className={styles.criteria}>
          <div className={styles.criteriaLabel}>Per-criterion verdict</div>
          <ul className={styles.criteriaList}>
            {criteria.map((c, i) => {
              const meta = VERDICT_META[c.verdict] ?? VERDICT_META.partial
              const { Icon, label, tone } = meta
              const isExpanded = expandedReasoning.has(i)
              const hasReasoning = Boolean(c.reasoning)
              return (
                <li key={i} className={styles.criterion}>
                  <button
                    type="button"
                    className={styles.criterionHead}
                    onClick={() => hasReasoning && toggleReasoning(i)}
                    disabled={!hasReasoning}
                    aria-expanded={isExpanded}
                  >
                    <span
                      className={cx(styles.verdictIcon, styles[`verdictIcon_${tone}`])}
                      aria-hidden="true"
                    >
                      <Icon size={12} strokeWidth={3} />
                    </span>
                    <span className={styles.criterionName}>{c.name}</span>
                    <span className={cx(styles.verdictChip, styles[`verdictChip_${tone}`])}>
                      {label}
                    </span>
                    {hasReasoning && (
                      <ChevronDown
                        size={14}
                        strokeWidth={2.25}
                        aria-hidden="true"
                        className={cx(styles.criterionChevron, isExpanded && styles.criterionChevronOpen)}
                      />
                    )}
                  </button>
                  {hasReasoning && isExpanded && (
                    <div className={styles.criterionReasoning}>
                      {c.reasoning}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ─── Reviewer note (admin only, opens on Reject/Resubmit) ─ */}
      {mode === 'admin' && showNote && !submitted && (
        <div className={styles.noteBlock}>
          <label className={styles.noteLabel} htmlFor={`qc-${widgetId}-note`}>
            Reviewer note (optional)
          </label>
          <textarea
            id={`qc-${widgetId}-note`}
            className={styles.noteInput}
            placeholder={showNote === 'reject'
              ? 'What went wrong? The worker will see this.'
              : 'What should the worker fix before re-submitting?'}
            rows={2}
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
          />
          <div className={styles.noteActions}>
            <button
              type="button"
              className={styles.noteCancelBtn}
              onClick={() => { setShowNote(false); setNote('') }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cx(
                styles.noteConfirmBtn,
                showNote === 'reject' && styles.noteConfirmReject,
                showNote === 'resubmit' && styles.noteConfirmResubmit,
              )}
              onClick={() => handleDecision(showNote)}
            >
              {showNote === 'reject' ? 'Reject submission' : 'Request resubmission'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Bottom — actions (admin) OR success banner ─────────── */}
      {submitted ? (
        <div className={cx(
          styles.successBanner,
          decision === 'approve' && styles.successBanner_success,
          decision === 'reject'  && styles.successBanner_danger,
          decision === 'resubmit' && styles.successBanner_warn,
        )}>
          <span className={styles.successCheck} aria-hidden="true">
            {decision === 'approve' && <CheckCircle2 size={18} strokeWidth={2.25} />}
            {decision === 'reject'  && <X size={18} strokeWidth={2.5} />}
            {decision === 'resubmit' && <RefreshCcw size={18} strokeWidth={2.25} />}
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>
              {decision === 'approve' && 'Submission approved'}
              {decision === 'reject'  && 'Submission rejected'}
              {decision === 'resubmit' && 'Resubmission requested'}
            </div>
            <div className={styles.successSub}>
              {note && <span className={styles.noteEcho}>Note: {note}</span>}
              {note && <span className={styles.successDot} aria-hidden="true"> · </span>}
              <span className={styles.successTime}>{timeLabel(submittedAt)}</span>
            </div>
          </div>
        </div>
      ) : mode === 'admin' && !showNote ? (
        <div className={styles.actionsRow}>
          {allowedActions.includes('reject') && (
            <Button
              variant="secondary"
              size="md"
              className={styles.rejectBtn}
              iconLeft={<X size={14} strokeWidth={2.5} aria-hidden="true" />}
              onClick={() => handleDecision('reject')}
            >
              Reject
            </Button>
          )}
          {allowedActions.includes('resubmit') && (
            <Button
              variant="secondary"
              size="md"
              className={styles.resubmitBtn}
              iconLeft={<RefreshCcw size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={() => handleDecision('resubmit')}
            >
              Resubmit
            </Button>
          )}
          {allowedActions.includes('approve') && (
            <Button
              variant="primary"
              size="md"
              className={styles.approveBtn}
              iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={() => handleDecision('approve')}
            >
              Approve
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
