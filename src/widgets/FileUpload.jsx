import { useCallback, useRef, useState } from 'react'
import cx from 'classnames'
import {
  UploadCloud,
  FileText,
  File as FileIcon,
  X,
  Plus,
  Check,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './fileUpload.module.scss'

/* ─── File Upload Widget ────────────────────────────────────────────
   Pick a file (or multiple) from the device. Complements Image
   Capture — same "get a document into the system" responsibility
   but sourced from file storage (PDFs, docs, pre-saved images)
   rather than the camera.

   Three states:
     1. "ready"     — instructions + dropzone with cloud icon
     2. "selected"  — file list + Remove per-file + Add more + Upload
     3. "submitted" — success banner + collapsed file list readout

   Drag-and-drop works on desktop; native file picker on mobile.
   Image files are re-encoded to cap at 2000px / JPEG 0.85 like
   Image Capture, so previews stay lean. PDFs / docs pass through
   as-is (size-checked against max_size_mb).
   ─────────────────────────────────────────────────────────────────── */

const MAX_IMAGE_DIM = 2000
const JPEG_QUALITY = 0.85

/* ─── Helpers ─────────────────────────────────────────────────────── */

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

/** Images re-encoded to cap dimensions + JPEG quality. Non-images
 *  pass through unchanged (their bytes are their bytes). */
async function prepareFile(file) {
  if (file.type.startsWith('image/')) {
    const dataUrl = await new Promise((resolve, reject) => {
      readAsDataUrl(file).then((raw) => {
        const img = new Image()
        img.onerror = reject
        img.onload = () => {
          let { width: w, height: h } = img
          if (Math.max(w, h) > MAX_IMAGE_DIM) {
            if (w >= h) { h = Math.round(h * (MAX_IMAGE_DIM / w)); w = MAX_IMAGE_DIM }
            else        { w = Math.round(w * (MAX_IMAGE_DIM / h)); h = MAX_IMAGE_DIM }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
        }
        img.src = raw
      }).catch(reject)
    })
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    return { dataUrl, sizeBytes: Math.round(base64.length * 0.75) }
  }
  const dataUrl = await readAsDataUrl(file)
  return { dataUrl, sizeBytes: file.size }
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileCategory(type, name) {
  if ((type || '').startsWith('image/')) return 'image'
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  if (/\.(docx?|odt|rtf)$/i.test(name) || /wordprocessing|msword/.test(type || '')) return 'doc'
  return 'file'
}

/** Short extension label — "PDF", "JPEG", "DOCX". Falls back to the
 *  MIME subtype when no extension is present in the filename. */
function extLabel(type, name) {
  const fromName = name?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromName) return fromName.toUpperCase()
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

/* ─── Root ──────────────────────────────────────────────────────── */

export function FileUpload({ payload }) {
  const { onReply } = useChatActions()

  const [phase, setPhase] = useState('ready')      // 'ready' | 'selected' | 'submitted'
  const [files, setFiles] = useState([])           // { id, name, type, sizeBytes, dataUrl, category }
  const [submittedAt, setSubmittedAt] = useState(null)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const widgetId      = payload?.widget_id
  const instructionId = payload?.instruction_id
  const title         = payload?.title ?? 'Upload file'
  const description   = payload?.description
  const accept        = payload?.accept ?? 'image/*,application/pdf'
  const maxFiles      = Math.max(1, Number(payload?.max_files ?? 1))
  const maxSizeMb     = Math.max(1, Number(payload?.max_size_mb ?? 10))
  const guidelines    = Array.isArray(payload?.guidelines) ? payload.guidelines : []
  const isSilent      = Boolean(payload?.silent)

  const canAddMore = files.length < maxFiles
  const isMulti    = maxFiles > 1

  const openPicker = useCallback(() => {
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }, [])

  const processPicked = useCallback(async (picked) => {
    if (!picked?.length) return
    setError(null)
    const roomLeft = maxFiles - files.length
    const slots = picked.slice(0, roomLeft)
    const added = []
    for (const f of slots) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`${f.name} is larger than ${maxSizeMb} MB.`)
        continue
      }
      try {
        const { dataUrl, sizeBytes } = await prepareFile(f)
        added.push({
          id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          type: f.type || '',
          sizeBytes,
          dataUrl,
          category: fileCategory(f.type, f.name),
        })
      } catch {
        setError(`Couldn't read ${f.name}.`)
      }
    }
    if (added.length) {
      const next = [...files, ...added]
      setFiles(next)
      if (phase === 'ready') setPhase('selected')
    }
  }, [files, maxFiles, maxSizeMb, phase])

  const handleFileInput = useCallback((e) => {
    const picked = Array.from(e.target.files ?? [])
    processPicked(picked)
  }, [processPicked])

  const handleRemoveFile = useCallback((id) => {
    const next = files.filter((f) => f.id !== id)
    setFiles(next)
    if (next.length === 0) setPhase('ready')
  }, [files])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (phase === 'submitted') return
    if (!isDragging) setIsDragging(true)
  }, [isDragging, phase])

  const handleDragLeave = useCallback(() => {
    if (isDragging) setIsDragging(false)
  }, [isDragging])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (phase === 'submitted') return
    const dropped = Array.from(e.dataTransfer?.files ?? [])
    processPicked(dropped)
  }, [processPicked, phase])

  const handleSubmit = useCallback(() => {
    const now = Date.now()
    setSubmittedAt(now)
    setPhase('submitted')
    const payloadFiles = files.map((f) => ({
      name: f.name,
      type: f.type,
      size_bytes: f.sizeBytes,
      data_url: f.dataUrl,
    }))
    const label = files.length === 1
      ? `Uploaded ${files[0].name}`
      : `Uploaded ${files.length} files`
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'file_upload',
          source_widget_id: widgetId,
          data: {
            label,
            instruction_id: instructionId,
            files: payloadFiles,
            uploaded_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [files, onReply, widgetId, instructionId, isSilent])

  const totalSize = files.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0)

  return (
    <div className={styles.card} role="article" aria-label={title}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={isMulti}
        onChange={handleFileInput}
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <UploadCloud size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* ─── READY — dropzone + guidelines ──────────────────────── */}
      {phase === 'ready' && (
        <>
          <button
            type="button"
            className={cx(styles.dropzone, isDragging && styles.dropzoneActive)}
            onClick={openPicker}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label={`Browse files to upload — ${title}`}
          >
            <div className={styles.dropzoneCenter}>
              <div className={styles.dropzoneIcon} aria-hidden="true">
                <UploadCloud size={34} strokeWidth={1.5} />
              </div>
              <span className={styles.dropzoneLabel}>
                {isDragging ? 'Release to add' : 'Tap to browse'}
              </span>
              <span className={styles.dropzoneSub}>
                or drag &amp; drop · max {maxSizeMb} MB{isMulti ? ` · up to ${maxFiles} files` : ''}
              </span>
            </div>
          </button>

          {guidelines.length > 0 && (
            <ul className={styles.guidelines} aria-label="Upload guidelines">
              {guidelines.map((g, i) => (
                <li key={i} className={styles.guidelineItem}>
                  <span className={styles.guidelineIcon} aria-hidden="true">
                    <Check size={12} strokeWidth={2.75} />
                  </span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className={styles.error}>
              <AlertCircle size={14} strokeWidth={2.25} aria-hidden="true" />
              {error}
            </div>
          )}
        </>
      )}

      {/* ─── SELECTED — file list + Add more + Upload ────────────── */}
      {phase === 'selected' && (
        <>
          <ul
            className={styles.fileList}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {files.map((f) => (
              <FileItem
                key={f.id}
                file={f}
                onRemove={() => handleRemoveFile(f.id)}
              />
            ))}
          </ul>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={14} strokeWidth={2.25} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className={styles.actionsRow}>
            {canAddMore && (
              <Button
                variant="secondary"
                size="md"
                className={styles.addMoreBtn}
                iconLeft={<Plus size={14} strokeWidth={2.25} aria-hidden="true" />}
                onClick={openPicker}
              >
                Add more
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              className={styles.primaryBtn}
              iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleSubmit}
            >
              Upload
            </Button>
          </div>
        </>
      )}

      {/* ─── SUBMITTED — success banner + collapsed file list ────── */}
      {phase === 'submitted' && (
        <>
          <div className={styles.successBanner}>
            <span className={styles.successCheck} aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.successBody}>
              <div className={styles.successTitle}>
                {files.length === 1 ? 'File uploaded' : `${files.length} files uploaded`}
              </div>
              <div className={styles.successSub}>
                Saved successfully · {timeLabel(submittedAt)}
              </div>
            </div>
          </div>

          <ul className={cx(styles.fileList, styles.fileListSubmitted)}>
            {files.map((f) => (
              <FileItem key={f.id} file={f} />
            ))}
          </ul>

          <div className={styles.submittedFoot}>
            <span className={styles.submittedLabel}>{title}</span>
            <span className={styles.submittedMeta}>
              {files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(totalSize)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── FileItem — one row per selected/submitted file ────────────── */

function FileItem({ file, onRemove }) {
  const { category, name, type, sizeBytes, dataUrl } = file
  return (
    <li className={styles.fileItem}>
      <div className={cx(styles.fileThumb, styles[`fileThumb_${category}`])} aria-hidden="true">
        {category === 'image'
          ? <img src={dataUrl} alt="" className={styles.fileThumbImage} />
          : category === 'pdf'
            ? <FileText size={20} strokeWidth={2} />
            : category === 'doc'
              ? <FileText size={20} strokeWidth={2} />
              : <FileIcon size={20} strokeWidth={2} />
        }
      </div>

      <div className={styles.fileBody}>
        <div className={styles.fileName} title={name}>{name}</div>
        <div className={styles.fileMeta}>
          <span className={styles.fileExt}>{extLabel(type, name)}</span>
          <span className={styles.fileDot} aria-hidden="true">·</span>
          <span>{formatBytes(sizeBytes)}</span>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          className={styles.fileRemove}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          title="Remove"
        >
          <X size={15} strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}
    </li>
  )
}
