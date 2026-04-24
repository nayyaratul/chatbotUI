import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  ShieldCheck,
  Check,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './validatedInput.module.scss'

/* ─── Validated Input Widget ──────────────────────────────────────────
   Single-field capture with realtime validation. Lighter sibling of
   Form — use when you just need one piece of data (OTP, phone, PAN,
   pincode) with built-in format validation.

   The distinctive affordance is the OTP variant, which renders as
   N split-digit boxes with auto-advance focus and smart paste. All
   other types render as a single input field with an inline validity
   glyph + helper/error text swap.

   Built-in validators: otp · phone · pincode · email · aadhaar ·
   pan · ifsc · text (custom pattern) · number
   ─────────────────────────────────────────────────────────────────── */

/* ─── Validators + formatters ─────────────────────────────────────── */

const OTP_LEN_DEFAULT = 6

/** Built-in format validators keyed by `input_type`. Return
 *  `{ valid: boolean, reason?: string }`. */
function validate(value, type, options = {}) {
  const v = (value ?? '').trim()
  if (!v) return { valid: false, reason: 'Required' }

  switch (type) {
    case 'otp': {
      const len = options.max_length ?? OTP_LEN_DEFAULT
      if (!/^\d+$/.test(v)) return { valid: false, reason: 'Digits only' }
      if (v.length !== len) return { valid: false, reason: `Enter all ${len} digits` }
      return { valid: true }
    }
    case 'phone': {
      const digits = v.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 15) {
        return { valid: false, reason: 'Enter 10–15 digits' }
      }
      return { valid: true }
    }
    case 'pincode':
      return /^\d{6}$/.test(v)
        ? { valid: true }
        : { valid: false, reason: 'Enter a 6-digit pincode' }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? { valid: true }
        : { valid: false, reason: 'Enter a valid email address' }
    case 'aadhaar': {
      const digits = v.replace(/\s/g, '')
      return /^\d{12}$/.test(digits)
        ? { valid: true }
        : { valid: false, reason: 'Enter a 12-digit Aadhaar number' }
    }
    case 'pan':
      return /^[A-Z]{5}\d{4}[A-Z]$/.test(v.toUpperCase())
        ? { valid: true }
        : { valid: false, reason: 'Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)' }
    case 'ifsc':
      return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())
        ? { valid: true }
        : { valid: false, reason: 'Format: 4 letters, 0, 6 alphanumeric (e.g. SBIN0001234)' }
    case 'bank_account': {
      /* Indian bank account numbers are 9–18 digits, no fixed format.
         Keep the check loose — reject non-digits and obviously-wrong
         lengths, everything else falls to server-side verification. */
      const digits = v.replace(/\D/g, '')
      if (digits.length < 9 || digits.length > 18) {
        return { valid: false, reason: 'Account numbers are 9–18 digits' }
      }
      return { valid: true }
    }
    case 'text': {
      if (options.pattern) {
        try {
          const re = new RegExp(options.pattern)
          return re.test(v)
            ? { valid: true }
            : { valid: false, reason: options.pattern_message ?? 'Invalid format' }
        } catch {
          return { valid: true }  // bad pattern — don't block the user
        }
      }
      if (options.min_length && v.length < options.min_length) {
        return { valid: false, reason: `At least ${options.min_length} characters` }
      }
      return { valid: true }
    }
    case 'number':
      return /^-?\d+(\.\d+)?$/.test(v)
        ? { valid: true }
        : { valid: false, reason: 'Enter a valid number' }
    default:
      return { valid: true }
  }
}

/** Shape the raw string the user typed into a displayable form —
 *  auto-inserts Aadhaar spaces, uppercases PAN/IFSC, etc. */
function formatValue(value, type, options = {}) {
  const raw = value ?? ''
  switch (type) {
    case 'aadhaar': {
      const digits = raw.replace(/\D/g, '').slice(0, 12)
      return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    }
    case 'pan':
      return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    case 'ifsc':
      return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
    case 'bank_account':
      return raw.replace(/\D/g, '').slice(0, 18)
    case 'pincode':
      return raw.replace(/\D/g, '').slice(0, 6)
    case 'phone':
      /* Keep only digits and leading + (international prefix). */
      return raw.replace(/[^\d+]/g, '').slice(0, 16)
    case 'number':
      return raw.replace(/[^\d.-]/g, '')
    case 'text':
      return options.max_length ? raw.slice(0, options.max_length) : raw
    default:
      return raw
  }
}

/** Input-mode + HTML type + autocomplete hint per field type so the
 *  right mobile keyboard pops up. */
function inputAttrs(type) {
  switch (type) {
    case 'otp':     return { inputMode: 'numeric', autoComplete: 'one-time-code' }
    case 'phone':   return { inputMode: 'tel', autoComplete: 'tel', type: 'tel' }
    case 'pincode': return { inputMode: 'numeric', autoComplete: 'postal-code' }
    case 'email':   return { inputMode: 'email', autoComplete: 'email', type: 'email' }
    case 'aadhaar': return { inputMode: 'numeric' }
    case 'pan':     return { inputMode: 'text', autoCapitalize: 'characters' }
    case 'ifsc':    return { inputMode: 'text', autoCapitalize: 'characters' }
    case 'bank_account': return { inputMode: 'numeric', autoComplete: 'off' }
    case 'number':  return { inputMode: 'decimal' }
    default:        return {}
  }
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

export function ValidatedInput({ payload }) {
  const { onReply } = useChatActions()

  const widgetId      = payload?.widget_id
  const fieldId       = payload?.field_id
  const title         = payload?.title ?? 'Enter value'
  const description   = payload?.description
  const inputType     = payload?.input_type ?? 'text'
  const label         = payload?.label
  const placeholder   = payload?.placeholder
  const helperText    = payload?.helper_text
  const prefix        = payload?.prefix
  const pattern       = payload?.pattern
  const patternMsg    = payload?.pattern_message
  const minLength     = payload?.min_length
  const maxLength     = payload?.max_length
    ?? (inputType === 'otp' ? OTP_LEN_DEFAULT : null)
  const submitLabel   = payload?.submit_label ?? 'Submit'
  const resend        = payload?.resend   // { label?: string, cooldown_seconds?: number }
  const isSilent      = Boolean(payload?.silent)

  const [value, setValue]             = useState(payload?.value ?? '')
  const [touched, setTouched]         = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)

  const validationOpts = useMemo(
    () => ({ max_length: maxLength, min_length: minLength, pattern, pattern_message: patternMsg }),
    [maxLength, minLength, pattern, patternMsg],
  )
  const result = useMemo(
    () => validate(value, inputType, validationOpts),
    [value, inputType, validationOpts],
  )

  const hasValue = value.trim().length > 0
  const isValid  = result.valid
  const showError = touched && hasValue && !isValid
  const canSubmit = isValid && !submitted

  const handleChange = useCallback((raw) => {
    setValue(formatValue(raw, inputType, { max_length: maxLength }))
  }, [inputType, maxLength])

  const handleBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    setTouched(true)
    if (!isValid) return
    const now = Date.now()
    setSubmittedAt(now)
    setSubmitted(true)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'validated_input',
          source_widget_id: widgetId,
          data: {
            label: `${title} · ${value}`,
            field_id: fieldId,
            input_type: inputType,
            value,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [canSubmit, isValid, onReply, widgetId, fieldId, inputType, value, title, isSilent])

  /* ─── Resend countdown (OTP only) ──────────────────────────────── */
  const [resendLeft, setResendLeft] = useState(resend?.cooldown_seconds ?? 0)
  useEffect(() => {
    if (resendLeft <= 0) return
    const id = window.setTimeout(() => setResendLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resendLeft])

  const handleResend = useCallback(() => {
    if (resendLeft > 0) return
    setResendLeft(resend?.cooldown_seconds ?? 30)
    setValue('')
    setTouched(false)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'validated_input',
          source_widget_id: widgetId,
          data: {
            label: `Requested resend of ${title}`,
            field_id: fieldId,
            action: 'resend',
          },
        },
      },
      { silent: true },
    )
  }, [resendLeft, resend, onReply, widgetId, title, fieldId])

  const isOtp = inputType === 'otp'

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <ShieldCheck size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      </div>

      {/* ─── Field ──────────────────────────────────────────────── */}
      <div className={styles.fieldBlock}>
        {label && !isOtp && (
          <label className={styles.fieldLabel} htmlFor={`vi-${widgetId}`}>
            {label}
          </label>
        )}

        {isOtp ? (
          <OtpInput
            length={maxLength ?? OTP_LEN_DEFAULT}
            value={value}
            onChange={handleChange}
            onComplete={() => setTouched(true)}
            disabled={submitted}
            status={showError ? 'invalid' : isValid ? 'valid' : 'neutral'}
          />
        ) : (
          <SingleInput
            id={`vi-${widgetId}`}
            inputType={inputType}
            value={value}
            placeholder={placeholder}
            prefix={prefix}
            disabled={submitted}
            status={showError ? 'invalid' : (isValid && hasValue) ? 'valid' : 'neutral'}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        )}

        {/* Helper / error swap — reserved height so layout doesn't jump */}
        <div className={styles.messageSlot} aria-live="polite">
          {showError ? (
            <div className={styles.errorMsg}>
              <AlertCircle size={12} strokeWidth={2.25} aria-hidden="true" />
              {result.reason}
            </div>
          ) : helperText ? (
            <div className={styles.helperMsg}>{helperText}</div>
          ) : null}
        </div>

        {/* Resend (OTP only) */}
        {isOtp && resend && (
          <div className={styles.resendRow}>
            <span className={styles.resendPrompt}>
              {resend.label ?? 'Didn\'t get the code?'}
            </span>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResend}
              disabled={resendLeft > 0 || submitted}
            >
              {resendLeft > 0 ? (
                <>
                  <RefreshCw size={12} strokeWidth={2.25} aria-hidden="true" />
                  Resend in {resendLeft}s
                </>
              ) : (
                <>
                  <RefreshCw size={12} strokeWidth={2.25} aria-hidden="true" />
                  Resend
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ─── Bottom — submit OR success banner ──────────────────── */}
      {submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>
              {isOtp ? 'Verified' : 'Submitted'}
            </div>
            <div className={styles.successSub}>
              <span className={styles.successValue}>{value}</span>
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
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── SingleInput — one line for everything except OTP ───────────── */

function SingleInput({ id, inputType, value, placeholder, prefix, disabled, status, onChange, onBlur }) {
  const attrs = inputAttrs(inputType)
  return (
    <div className={cx(styles.inputShell, styles[`inputShell_${status}`], disabled && styles.inputShellDisabled)}>
      {prefix && <span className={styles.inputPrefix}>{prefix}</span>}
      <input
        id={id}
        className={styles.inputEl}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        {...attrs}
      />
      {status === 'valid' && (
        <span className={styles.inputStatus} aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      {status === 'invalid' && (
        <span className={cx(styles.inputStatus, styles.inputStatusInvalid)} aria-hidden="true">
          <AlertCircle size={14} strokeWidth={2.25} />
        </span>
      )}
    </div>
  )
}

/* ─── OtpInput — N split-digit boxes with auto-advance + paste ───── */

function OtpInput({ length, value, onChange, onComplete, disabled, status }) {
  const inputsRef = useRef([])

  const digits = useMemo(() => {
    const padded = (value ?? '').slice(0, length).padEnd(length, ' ')
    return padded.split('').map((c) => (c === ' ' ? '' : c))
  }, [value, length])

  const focusBox = (i) => {
    const el = inputsRef.current[i]
    if (el) {
      el.focus()
      /* Select the digit if any, so typing overwrites in place. */
      try { el.select() } catch { /* noop */ }
    }
  }

  const commit = useCallback((nextDigits) => {
    onChange(nextDigits.join('').replace(/\0/g, ''))
  }, [onChange])

  const handleChange = (i, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1)   // keep just the last typed digit
    const next = [...digits]
    next[i] = digit
    commit(next)
    if (digit && i < length - 1) focusBox(i + 1)
    if (digit && i === length - 1 && next.every(Boolean)) onComplete?.()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) {
        e.preventDefault()
        const next = [...digits]
        next[i - 1] = ''
        commit(next)
        focusBox(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    const next = new Array(length).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    commit(next)
    const target = Math.min(pasted.length, length - 1)
    setTimeout(() => focusBox(target), 0)
    if (pasted.length === length) onComplete?.()
  }

  return (
    <div
      className={cx(styles.otpRow, styles[`otpRow_${status}`])}
      role="group"
      aria-label="Enter verification code"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cx(styles.otpBox, d && styles.otpBoxFilled)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
