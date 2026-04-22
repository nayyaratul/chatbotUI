import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
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
   Compact multi-field form rendered as a single chat message.
   Supports field types: text, number, date, email, phone, pincode, dropdown.
   After submit: collapses to a clean summary card.
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

/* ─── Map payload type → HTML input type ─────────────────────────── */

function resolveInputType(fieldType) {
  switch (fieldType) {
    case 'number': return 'number'
    case 'date':   return 'date'
    case 'email':  return 'email'
    default:       return 'text'
  }
}

/* ─── Map payload type → inputMode for numeric mobile keyboards ───── */

function resolveInputMode(fieldType) {
  if (fieldType === 'phone' || fieldType === 'pincode') return 'numeric'
  return undefined
}

/* ─── Component ───────────────────────────────────────────────────── */

export function FormWidget({ payload }) {
  const { onReply } = useChatActions()

  const fields       = payload?.fields ?? []
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
    if (hasErrors) return

    const snapshot = { ...values }
    setSubmittedSnapshot(snapshot)
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
            submitted_at: Date.now(),
            validation_status: 'valid',
          },
        },
      },
      { silent: isSilent },
    )
  }

  /* ─── Full validity gate for submit button ──────────────────────────
     Enables only when every field passes its format validator. Required
     empty fields fail, required fields with invalid format (e.g. phone
     "123", date "3rd May") also fail. Non-required empty fields pass. */

  const isSubmittable = fields.every((f) => validate(f, values[f.name]) === null)

  /* ─── Post-submit summary card ──────────────────────────────────── */

  if (submitted && submittedSnapshot) {
    return (
      <div className={styles.summaryCard} role="region" aria-label="Form submission summary">
        <div className={styles.chip}>
          <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
          Submitted
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

  return (
    <div className={styles.card} role="form" aria-label="Form">
      <div className={styles.fields}>
        {fields.map((field) => {
          const hasError = !!errors[field.name]
          const fieldId = `form-field-${field.name}`

          return (
            <div key={field.name} className={styles.field}>
              <label htmlFor={fieldId} className={styles.label}>
                {field.label}
                {field.required && (
                  <span className={styles.required} aria-hidden="true">*</span>
                )}
              </label>

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
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
