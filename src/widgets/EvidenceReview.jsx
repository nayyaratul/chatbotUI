import { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  ClipboardCheck,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Check,
  X,
  CheckCircle2,
  ArrowRight,
  ChevronsUpDown,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './evidenceReview.module.scss'

/* ─── Evidence Review Widget ─────────────────────────────────────────
   Admin / reviewer side: walk through multiple evidence items a
   candidate submitted (Image Capture + File Upload outputs) and
   approve / reject each one. Optional reviewer note required on
   rejection. Bulk-approve shortcut for the straightforward cases.
   Submit fires a single widget_response with the full decision set.

   (For task-photo QC with AI-generated bounding boxes, see the
   separate QcEvidenceReview widget — different scope per CSV #20.)
   ─────────────────────────────────────────────────────────────────── */

/* ─── Helpers ─────────────────────────────────────────────────────── */

function fileCategory(type, name) {
  if ((type || '').startsWith('image/') || type === 'image') return 'image'
  if (type === 'application/pdf' || type === 'pdf' || /\.pdf$/i.test(name || '')) return 'pdf'
  if (/\.(docx?|odt|rtf)$/i.test(name || '') || type === 'doc') return 'doc'
  return 'file'
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extLabel(type, name) {
  const fromName = name?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromName) return fromName.toUpperCase()
  if (type === 'image') return 'IMG'
  if (type === 'pdf') return 'PDF'
  if (type === 'doc') return 'DOC'
  const fromMime = type?.split('/')?.[1]?.split(';')?.[0]
  return fromMime?.toUpperCase() ?? 'FILE'
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/** "2h ago" / "5 min ago" / "Just now" — keeps the reviewer oriented
 *  without needing a full timestamp line. */
function relativeTime(ms) {
  if (!ms) return ''
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function CategoryIcon({ category, size = 18, strokeWidth = 2 }) {
  switch (category) {
    case 'image': return <ImageIcon size={size} strokeWidth={strokeWidth} />
    case 'pdf':
    case 'doc':   return <FileText size={size} strokeWidth={strokeWidth} />
    default:      return <FileIcon size={size} strokeWidth={strokeWidth} />
  }
}

const STATUS_LABELS = {
  pending:  'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

/* ─── Root ──────────────────────────────────────────────────────── */

export function EvidenceReview({ payload }) {
  const { onReply } = useChatActions()

  const widgetId         = payload?.widget_id
  const candidate        = payload?.candidate ?? {}
  const submission       = payload?.submission ?? {}
  const allowBulkApprove = payload?.allow_bulk_approve !== false
  const isSilent         = Boolean(payload?.silent)

  /* Mutable per-item state — seed from payload, then updated as the
     reviewer acts. Each item: { item_id, label, type, url, pages?,
     size_bytes?, status, reviewer_note? } */
  const [items, setItems] = useState(() => (payload?.items ?? []).map((it) => ({
    status: 'pending',
    reviewer_note: null,
    ...it,
  })))

  const [rejectingId, setRejectingId]     = useState(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [submitted, setSubmitted]         = useState(false)
  const [submittedAt, setSubmittedAt]     = useState(null)

  const total      = items.length
  const approved   = items.filter((i) => i.status === 'approved').length
  const rejected   = items.filter((i) => i.status === 'rejected').length
  const decided    = approved + rejected
  const pending    = total - decided
  const allDecided = pending === 0 && total > 0

  const approveItem = useCallback((itemId) => {
    setItems((prev) => prev.map((i) =>
      i.item_id === itemId ? { ...i, status: 'approved', reviewer_note: null } : i
    ))
  }, [])

  const startReject = useCallback((itemId) => {
    setRejectingId(itemId)
    setRejectionNote('')
  }, [])

  const cancelReject = useCallback(() => {
    setRejectingId(null)
    setRejectionNote('')
  }, [])

  const confirmReject = useCallback(() => {
    const note = rejectionNote.trim()
    if (!rejectingId) return
    setItems((prev) => prev.map((i) =>
      i.item_id === rejectingId
        ? { ...i, status: 'rejected', reviewer_note: note || null }
        : i
    ))
    setRejectingId(null)
    setRejectionNote('')
  }, [rejectingId, rejectionNote])

  const reopenItem = useCallback((itemId) => {
    setItems((prev) => prev.map((i) =>
      i.item_id === itemId ? { ...i, status: 'pending', reviewer_note: null } : i
    ))
  }, [])

  const approveAllPending = useCallback(() => {
    setItems((prev) => prev.map((i) =>
      i.status === 'pending' ? { ...i, status: 'approved' } : i
    ))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!allDecided) return
    const now = Date.now()
    setSubmittedAt(now)
    setSubmitted(true)
    const decisions = items.map((i) => ({
      item_id: i.item_id,
      status: i.status,
      ...(i.reviewer_note ? { note: i.reviewer_note } : {}),
    }))
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'qc_evidence_review',
          source_widget_id: widgetId,
          data: {
            label: `Review submitted · ${approved} approved, ${rejected} rejected`,
            submission_id: submission.id,
            candidate_id: candidate.id,
            decisions,
            reviewed_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [allDecided, items, onReply, widgetId, submission.id, candidate.id, approved, rejected, isSilent])

  /* ─── Derived progress % for the bar fill ─────────────────────── */
  const progressPct = useMemo(
    () => total === 0 ? 0 : Math.round((decided / total) * 100),
    [decided, total],
  )

  const submittedAgo = submission?.submitted_at ? relativeTime(submission.submitted_at) : null

  return (
    <div className={styles.card} role="article" aria-label="Evidence review">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <ClipboardCheck size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>Evidence review</h3>
          {(candidate.name || submittedAgo) && (
            <p className={styles.description}>
              {candidate.name}
              {candidate.name && submittedAgo && <span className={styles.dotSep} aria-hidden="true"> · </span>}
              {submittedAgo && <>submitted {submittedAgo}</>}
            </p>
          )}
        </div>
      </div>

      {/* ─── Progress strip — one segment per item, colored by its
          decision status. Grey = pending, green = approved, red =
          rejected. Gives an at-a-glance overview of the full review
          set in a way a single linear bar can't. */}
      {!submitted && total > 0 && (
        <div className={styles.progressStrip}>
          <div
            className={styles.progressSegments}
            aria-hidden="true"
            role="presentation"
          >
            {items.map((item) => (
              <span
                key={item.item_id}
                className={cx(styles.segment, styles[`segment_${item.status}`])}
              />
            ))}
          </div>
          <div className={styles.progressText}>
            <strong>{decided}</strong>
            <span className={styles.progressOf}>/ {total} reviewed</span>
          </div>
        </div>
      )}

      {/* ─── Item list ──────────────────────────────────────────── */}
      <ul className={styles.itemList}>
        {items.map((item) => (
          <Item
            key={item.item_id}
            item={item}
            isRejecting={rejectingId === item.item_id}
            rejectionNote={rejectingId === item.item_id ? rejectionNote : ''}
            onRejectionNoteChange={setRejectionNote}
            onApprove={() => approveItem(item.item_id)}
            onReject={() => startReject(item.item_id)}
            onCancelReject={cancelReject}
            onConfirmReject={confirmReject}
            onReopen={() => reopenItem(item.item_id)}
            disableAll={submitted}
          />
        ))}
      </ul>

      {/* ─── Submitted success OR bottom actions ──────────────────── */}
      {submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>Review submitted</div>
            <div className={styles.successSub}>
              <span className={styles.countApproved}>
                <Check size={11} strokeWidth={3} aria-hidden="true" />
                <strong>{approved}</strong> approved
              </span>
              <span className={styles.dotSep} aria-hidden="true"> · </span>
              <span className={styles.countRejected}>
                <X size={11} strokeWidth={3} aria-hidden="true" />
                <strong>{rejected}</strong> rejected
              </span>
              <span className={styles.dotSep} aria-hidden="true"> · </span>
              <span className={styles.successTime}>{timeLabel(submittedAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.actionsGroup}>
          {allowBulkApprove && pending > 1 && (
            <button
              type="button"
              className={styles.bulkApproveBtn}
              onClick={approveAllPending}
            >
              <ChevronsUpDown size={14} strokeWidth={2} aria-hidden="true" />
              Approve all remaining ({pending})
            </button>
          )}
          <Button
            variant="primary"
            size="md"
            disabled={!allDecided}
            className={styles.submitBtn}
            iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
            onClick={handleSubmit}
          >
            {allDecided
              ? `Submit review · ${approved} ✓ · ${rejected} ✗`
              : `${pending} ${pending === 1 ? 'item' : 'items'} pending`}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── Item — one reviewable row ─────────────────────────────────── */

function Item({
  item,
  isRejecting,
  rejectionNote,
  onRejectionNoteChange,
  onApprove,
  onReject,
  onCancelReject,
  onConfirmReject,
  onReopen,
  disableAll,
}) {
  const { item_id, label, type, url, pages, size_bytes, status, reviewer_note } = item
  const category = fileCategory(type, label)

  return (
    <li className={cx(styles.item, styles[`item_${status}`])}>
      {/* Thumb — image preview or tinted icon tile */}
      <div className={cx(styles.thumb, styles[`thumb_${category}`])} aria-hidden="true">
        {category === 'image' && url
          ? <img src={url} alt="" className={styles.thumbImage} />
          : <CategoryIcon category={category} size={22} strokeWidth={2} />
        }
      </div>

      {/* Body — label + meta + status chip */}
      <div className={styles.itemBody}>
        <div className={styles.itemHead}>
          <div className={styles.itemLabel}>{label}</div>
          <span className={cx(styles.statusChip, styles[`statusChip_${status}`])}>
            {status === 'approved' && <Check size={10} strokeWidth={3} aria-hidden="true" />}
            {status === 'rejected' && <X size={10} strokeWidth={3} aria-hidden="true" />}
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className={styles.itemMeta}>
          <span className={styles.itemExt}>{extLabel(type, label)}</span>
          {pages != null && (
            <>
              <span className={styles.dotSep} aria-hidden="true">·</span>
              <span>{pages} {pages === 1 ? 'page' : 'pages'}</span>
            </>
          )}
          {size_bytes != null && (
            <>
              <span className={styles.dotSep} aria-hidden="true">·</span>
              <span>{formatBytes(size_bytes)}</span>
            </>
          )}
        </div>

        {/* Reviewer note (when the item is rejected AND has a note) */}
        {status === 'rejected' && reviewer_note && (
          <div className={styles.rejectionNote}>
            <AlertTriangle size={12} strokeWidth={2.25} aria-hidden="true" />
            <span>{reviewer_note}</span>
          </div>
        )}

        {/* Rejection note input (when this item is being rejected) */}
        {isRejecting && (
          <div className={styles.rejectForm}>
            <label className={styles.rejectLabel} htmlFor={`reject-${item_id}`}>
              Reason for rejection
            </label>
            <textarea
              id={`reject-${item_id}`}
              className={styles.rejectInput}
              placeholder="e.g. blurry — please retake"
              rows={2}
              value={rejectionNote}
              autoFocus
              onChange={(e) => onRejectionNoteChange(e.target.value)}
            />
            <div className={styles.rejectActions}>
              <button
                type="button"
                className={styles.rejectCancelBtn}
                onClick={onCancelReject}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.rejectConfirmBtn}
                onClick={onConfirmReject}
              >
                Confirm reject
              </button>
            </div>
          </div>
        )}

        {/* Per-item actions — only for pending items, hidden while submitting */}
        {status === 'pending' && !isRejecting && !disableAll && (
          <div className={styles.itemActions}>
            <button
              type="button"
              className={cx(styles.decisionBtn, styles.decisionApprove)}
              onClick={onApprove}
            >
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              className={cx(styles.decisionBtn, styles.decisionReject)}
              onClick={onReject}
            >
              <X size={13} strokeWidth={2.5} aria-hidden="true" />
              Reject
            </button>
          </div>
        )}

        {/* Reopen a decided item (approved or rejected) — a quiet affordance
            so reviewers can fix mistakes before submitting the whole set. */}
        {(status === 'approved' || status === 'rejected') && !disableAll && (
          <button
            type="button"
            className={styles.reopenBtn}
            onClick={onReopen}
          >
            Undo decision
          </button>
        )}
      </div>
    </li>
  )
}
