import { useState } from 'react'
import cx from 'classnames'
import { CheckCircle2, Check, ArrowRight, AlertCircle } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './formWidget.module.scss'

/* ─── Form Widget ────────────────────────────────────────────────────
   "Considered data capture" — optional title/description header,
   live progress meter, per-field completion indicator, staggered
   field arrival. Supports field types: text, number, date, email,
   phone, pincode, dropdown. After submit: collapses to a clean
   summary card with timestamp.
   ─────────────────────────────────────────────────────────────────── */

/* ─── Validators ──────────────────────────────────────────────────── */

function validate(field, value) {
  const trimmed = (value ?? '').trim()

  if (!trimmed) {
    return field.required ? 'Required' : null
  }

  switch (field.type) {
    case 'number':
      return /^-?\d+(\.\d+)?$/.test(trimmed) ? null : 'Enter a valid number'

    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? null : 'Enter a valid date (YYYY-MM-DD)'

    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? null : 'Enter a valid email address'

    case 'phone':
      return /^\+?\d{10,15}$/.test(trimmed.replace(/\s/g, '')) ? null : 'Enter a valid phone number (10-15 digits)'

    case 'pincode':
      return /^\d{6}$/.test(trimmed) ? null : 'Enter a valid 6-digit pincode'

    case 'dropdown':
      return field.required && !trimmed ? 'Required' : null

    default:
      return null
  }
}

/* A field is "complete" when it's non-empty AND passes its validator.
   Drives the per-field green check and the progress meter. */
function isFieldComplete(field, value) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return false
  return validate(field, trimmed) === null
}

/* ─── Map payload type → HTML input type ─────────────────────────── */

function resolveInputType(fieldType) {
  switch (fieldType) {
    case 'number': return 'number'
    case 'date':   return 'date'
    case 'email':  return 'email'
    default:       return 'text'
  }
}

/* ─── Map payload type → inputMode for numeric mobile keyboards ──── */

function resolveInputMode(fieldType) {
  if (fieldType === 'phone' || fieldType === 'pincode') return 'numeric'
  return undefined
}

/* ─── HH:MM timestamp formatter for the summary chip ─────────────── */

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/* ─── Component ───────────────────────────────────────────────────── */

export function FormWidget({ payload }) {
  const { onReply } = useChatActions()

  const fields       = payload?.fields ?? []
  const title        = payload?.title
  const description  = payload?.description
  const submitLabel  = payload?.submit_label ?? 'Submit'
  const isSilent     = !!payload?.silent

  /* ─── Internal state ────────────────────────────────────────────── */

  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, ''])),
  )

  const [errors, setErrors] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, null])),
  )

  const [submitted, setSubmitted]               = useState(false)
  const [submittedSnapshot, setSubmittedSnapshot] = useState(null)
  const [submittedAt, setSubmittedAt]           = useState(null)

  /* ─── Helpers ───────────────────────────────────────────────────── */

  const updateValue = (name, raw) => {
    setValues((prev) => ({ ...prev, [name]: raw }))
    setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const blurField = (field) => {
    const error = validate(field, values[field.name])
    setErrors((prev) => ({ ...prev, [field.name]: error }))
  }

  /* ─── Submit ────────────────────────────────────────────────────── */

  const handleSubmit = () => {
    if (submitted) return

    const nextErrors = Object.fromEntries(
      fields.map((f) => [f.name, validate(f, values[f.name])]),
    )
    setErrors(nextErrors)

    const hasErrors = Object.values(nextErrors).some(Boolean)
    if (hasErrors) {
      // Auto-focus first invalid field (accessibility + UX: user shouldn't
      // have to hunt for the error on a long form). Wait a tick so React
      // commits the error styles before focus moves.
      const firstInvalid = fields.find((f) => !!nextErrors[f.name])
      if (firstInvalid) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`form-field-${firstInvalid.name}`)
          el?.focus?.()
        })
      }
      return
    }

    const snapshot = { ...values }
    const now = Date.now()
    setSubmittedSnapshot(snapshot)
    setSubmittedAt(now)
    setSubmitted(true)

    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'form',
          source_widget_id: payload?.widget_id,
          data: {
            label: `Submitted ${Object.keys(snapshot).length} fields`,
            form_id: payload?.form_id,
            fields: snapshot,
            submitted_at: now,
            validation_status: 'valid',
          },
        },
      },
      { silent: isSilent },
    )
  }

  /* ─── Full validity gate for submit button ──────────────────────── */

  const isSubmittable = fields.every((f) => validate(f, values[f.name]) === null)

  /* ─── Progress meter: count of complete fields (live) ─────────── */

  const completedCount = fields.filter((f) => isFieldComplete(f, values[f.name])).length
  const totalCount     = fields.length
  const progressPct    = totalCount === 0 ? 0 : (completedCount / totalCount) * 100

  /* ─── Post-submit summary card ──────────────────────────────────── */

  if (submitted && submittedSnapshot) {
    return (
      <div className={styles.summaryCard} role="region" aria-label="Form submission summary">
        <div className={styles.summaryHeader}>
          <div className={styles.chip}>
            <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
            Submitted
          </div>
          {submittedAt && (
            <span className={styles.timestamp}>{formatTime(submittedAt)}</span>
          )}
        </div>

        <hr className={styles.summaryDivider} />

        <div className={styles.summaryRows}>
          {fields.map((f) => {
            const displayValue = submittedSnapshot[f.name] || '—'
            const matchedOption =
              f.type === 'dropdown' && f.options
                ? f.options.find((o) => o.value === submittedSnapshot[f.name])
                : null
            const label = matchedOption ? matchedOption.label : displayValue

            return (
              <div key={f.name} className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{f.label}</span>
                <span className={styles.summaryValue}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── Form card ─────────────────────────────────────────────────── */

  const hasHeader = !!(title || description)

  return (
    <div className={styles.card} role="form" aria-label={title || 'Form'}>
      {hasHeader && (
        <header className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
          {totalCount > 0 && (
            <div className={styles.progress} aria-live="polite">
              <span className={styles.progressText}>
                {completedCount} of {totalCount} complete
              </span>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </header>
      )}

      <div className={styles.fields}>
        {fields.map((field) => {
          const hasError   = !!errors[field.name]
          const complete   = isFieldComplete(field, values[field.name])
          const fieldId    = `form-field-${field.name}`

          return (
            <div key={field.name} className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor={fieldId} className={styles.label}>
                  {field.label}
                  {field.required && (
                    <span className={styles.required} aria-hidden="true">*</span>
                  )}
                </label>
                <span
                  className={cx(styles.fieldCheck, complete && styles.visible)}
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={2.5} />
                </span>
              </div>

              {field.type === 'dropdown' ? (
                <Select
                  value={values[field.name]}
                  onValueChange={(val) => updateValue(field.name, val)}
                  disabled={submitted}
                >
                  <SelectTrigger
                    id={fieldId}
                    size="md"
                    error={hasError}
                    placeholder={field.placeholder ?? `Select ${field.label}`}
                    className={styles.selectTrigger}
                  />
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={fieldId}
                  type={resolveInputType(field.type)}
                  inputMode={resolveInputMode(field.type)}
                  size="md"
                  error={hasError}
                  disabled={submitted}
                  placeholder={field.placeholder ?? ''}
                  value={values[field.name]}
                  onChange={(e) => updateValue(field.name, e.target.value)}
                  onBlur={() => blurField(field)}
                  aria-describedby={hasError ? `${fieldId}-error` : undefined}
                  aria-required={field.required || undefined}
                />
              )}

              {hasError && (
                <span
                  id={`${fieldId}-error`}
                  className={styles.errorMsg}
                  role="alert"
                  aria-live="polite"
                >
                  <span className={styles.errorIcon} aria-hidden="true">
                    <AlertCircle size={12} strokeWidth={2.5} />
                  </span>
                  {errors[field.name]}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.submitBar}>
        <Button
          variant="primary"
          size="md"
          disabled={!isSubmittable}
          onClick={handleSubmit}
          className={styles.submitBtn}
        >
          <span className={styles.submitInner}>
            {submitLabel}
            <ArrowRight size={14} strokeWidth={2.25} />
          </span>
        </Button>
      </div>
    </div>
  )
}
