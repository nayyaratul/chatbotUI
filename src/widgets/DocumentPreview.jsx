import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
  Download,
  Check,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './documentPreview.module.scss'

/* ─── Document Preview Widget ─────────────────────────────────────────
   Read-only consumer widget — the bot shows a document to the user
   (offer letter, contract, approved ID, payslip) and optionally
   asks them to acknowledge having reviewed it.

   Inverse of Image Capture / File Upload: those move a doc from
   user → system, this one moves system → user.

   States:
     • default       — preview + metadata + action row
     • acknowledged  — same top content, actions swapped for a
                       green success banner with timestamp
   ─────────────────────────────────────────────────────────────────── */

/* ─── Helpers ─────────────────────────────────────────────────────── */

function fileCategory(type, name) {
  if ((type || '').startsWith('image/')) return 'image'
  if (type === 'application/pdf' || /\.pdf$/i.test(name || '')) return 'pdf'
  if (/\.(docx?|odt|rtf)$/i.test(name || '') || /wordprocessing|msword/.test(type || '')) return 'doc'
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
  const fromMime = type?.split('/')?.[1]?.split(';')?.[0]
  return fromMime?.toUpperCase() ?? 'FILE'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

const STATUS_MAP = {
  pending_review: { label: 'Pending review', tone: 'neutral' },
  reviewed:       { label: 'Reviewed',       tone: 'brand' },
  signed:         { label: 'Signed',         tone: 'success' },
  rejected:       { label: 'Rejected',       tone: 'danger' },
}

function CategoryIcon({ category, size = 18, strokeWidth = 2 }) {
  switch (category) {
    case 'image':
      return <ImageIcon size={size} strokeWidth={strokeWidth} />
    case 'pdf':
    case 'doc':
      return <FileText size={size} strokeWidth={strokeWidth} />
    default:
      return <FileIcon size={size} strokeWidth={strokeWidth} />
  }
}

/* ─── Root ──────────────────────────────────────────────────────── */

export function DocumentPreview({ payload }) {
  const { onReply } = useChatActions()

  const [acknowledged, setAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState(null)

  const widgetId     = payload?.widget_id
  const documentId   = payload?.document_id
  const title        = payload?.title ?? 'Document'
  const description  = payload?.description
  const doc          = payload?.document ?? {}
  const actionsList  = Array.isArray(payload?.actions) ? payload.actions : ['view']
  const status       = payload?.status
  const requireAck   = Boolean(payload?.require_acknowledgement)
  const isSilent     = Boolean(payload?.silent)

  const category     = fileCategory(doc.type, doc.name)
  const previewUrl   = (category === 'image' && doc.url) ? doc.url : doc.thumbnail_url

  const canView      = actionsList.includes('view')
  const canDownload  = actionsList.includes('download')

  const handleView = useCallback(() => {
    if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer')
  }, [doc.url])

  const handleDownload = useCallback(() => {
    // In the demo we don't actually have a real file to download — open
    // in a new tab as the closest approximation. In production this
    // would invoke the native download path.
    if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer')
  }, [doc.url])

  const handleAcknowledge = useCallback(() => {
    const now = Date.now()
    setAcknowledged(true)
    setAcknowledgedAt(now)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'document_preview',
          source_widget_id: widgetId,
          data: {
            label: `Reviewed ${title}`,
            document_id: documentId,
            acknowledged_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [onReply, widgetId, documentId, title, isSilent])

  const statusConfig = status ? STATUS_MAP[status] : null

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* Header — uniform brand-60 icon badge + title + description.
          Matches Image Capture / File Upload chrome so the widget
          family reads as one design system. Category info lives in
          the preview tile + meta line below, not in the badge. */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <CategoryIcon category={category} size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* Meta strip — status chip on its own line. Mirrors Job Card's
          meta strip (Urgent · Posted · Applicants) pattern. */}
      {statusConfig && (
        <div className={styles.metaStrip}>
          <span className={cx(styles.statusChip, styles[`statusChip_${statusConfig.tone}`])}>
            {statusConfig.label}
          </span>
        </div>
      )}

      {/* Preview — image if available, stylized doc tile otherwise */}
      <div className={cx(styles.preview, styles[`preview_${category}`])}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={doc.name ?? title}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.previewDoc} aria-hidden="true">
            {/* Folded page corner — tiny visual cue that this is "a doc" */}
            <span className={styles.pageFold} />
            <div className={styles.previewIcon}>
              <CategoryIcon category={category} size={40} strokeWidth={1.25} />
            </div>
            <div className={styles.previewType}>
              {extLabel(doc.type, doc.name)}
            </div>
            {doc.pages != null && (
              <div className={styles.previewPages}>
                {doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File meta — name + ext · pages · size · date line */}
      {doc.name && (
        <div className={styles.fileMetaBlock}>
          <div className={styles.fileName} title={doc.name}>{doc.name}</div>
          <div className={styles.fileMetaLine}>
            <span className={styles.fileExt}>{extLabel(doc.type, doc.name)}</span>
            {doc.pages != null && (
              <>
                <span className={styles.metaDot} aria-hidden="true">·</span>
                <span>{doc.pages} {doc.pages === 1 ? 'page' : 'pages'}</span>
              </>
            )}
            {doc.size_bytes != null && (
              <>
                <span className={styles.metaDot} aria-hidden="true">·</span>
                <span>{formatBytes(doc.size_bytes)}</span>
              </>
            )}
            {doc.modified_at && (
              <>
                <span className={styles.metaDot} aria-hidden="true">·</span>
                <span>{formatDate(doc.modified_at)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions OR acknowledged success banner */}
      {acknowledged ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>You&apos;ve reviewed this document</div>
            <div className={styles.successSub}>
              Acknowledged · {timeLabel(acknowledgedAt)}
            </div>
          </div>
        </div>
      ) : (
        /* Actions row — capped at 2 buttons for visual consistency
           with the rest of the widget family:
             • require_ack:        [ View ]   [ Acknowledge → ]
             • no ack required:    [ View ]   [ Download ]
           If both View and Download are requested AND acknowledgement
           is required, Download steps aside (it's accessible via the
           browser's own menu after View opens the doc). */
        <div className={styles.actionsRow}>
          {canView && (
            <Button
              variant="secondary"
              size="md"
              className={styles.secondaryBtn}
              iconLeft={<Eye size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleView}
            >
              View
            </Button>
          )}
          {requireAck ? (
            <Button
              variant="primary"
              size="md"
              className={styles.primaryBtn}
              iconRight={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleAcknowledge}
            >
              Acknowledge
            </Button>
          ) : canDownload && (
            <Button
              variant="secondary"
              size="md"
              className={styles.secondaryBtn}
              iconLeft={<Download size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleDownload}
            >
              Download
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
