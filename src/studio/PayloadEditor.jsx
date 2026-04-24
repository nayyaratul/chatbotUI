import { Textarea } from '@nexus/atoms'
import styles from './payloadEditor.module.scss'

/**
 * Labelled JSON editor for widget payloads. Inline red error slot
 * below the textarea uses role="alert" so screen readers announce
 * parse failures.
 */
export function PayloadEditor({ value, error, onChange }) {
  return (
    <div className={styles.editor}>
      <div className={styles.label}>Payload (JSON)</div>
      <Textarea
        className={styles.textarea}
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <div role="alert" className={styles.error}>
          Invalid JSON: {error}
        </div>
      ) : null}
    </div>
  )
}
