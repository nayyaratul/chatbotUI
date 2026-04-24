import { useMemo } from 'react'
import cx from 'classnames'
import { Textarea } from '@nexus/atoms'
import styles from './payloadEditor.module.scss'

/**
 * Labelled JSON editor for widget payloads. Header strip shows live
 * parse status (green dot = valid JSON, amber dot = unparseable) and
 * character count. The inline red error block at the bottom is the
 * *last inject attempt* result — distinct from live typing state.
 *
 * `onKeyDown` is forwarded to the textarea so the parent can wire
 * keyboard shortcuts like ⌘↵ → inject.
 */
export function PayloadEditor({ value, error, onChange, onKeyDown }) {
  const validity = useMemo(() => {
    try {
      JSON.parse(value)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }, [value])

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.label}>Payload</span>
        <span className={styles.rule} aria-hidden />
        <span className={styles.meta}>
          <span
            className={cx(
              styles.validity,
              validity.ok ? styles.validityOk : styles.validityWarn,
            )}
          >
            {validity.ok ? 'parseable' : 'unparseable'}
          </span>
          <span className={styles.chars}>{value.length.toLocaleString()} ch</span>
        </span>
      </div>
      <Textarea
        className={styles.textarea}
        rows={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
      />
      {error ? (
        <div role="alert" className={styles.error}>
          <span className={styles.errorMark} aria-hidden>✕</span>
          <span>Invalid JSON: {error}</span>
        </div>
      ) : null}
    </div>
  )
}
