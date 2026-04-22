import styles from './suggestionsStrip.module.scss'

/**
 * Right-aligned stack of outlined bubble prompts, rising from the
 * bottom of the chat surface. Tapping a bubble does NOT send — it
 * calls `onSelect(text)` which the parent routes into the input
 * textarea. User edits, then sends.
 *
 * `suggestions` is an array of { label, text?, ... }. If `text` is
 * omitted, the label is used as the prefill value.
 */
export function SuggestionsStrip({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className={styles.strip} role="list" aria-label="Conversation starters">
      {suggestions.map((s, i) => (
        <button
          key={s.text ?? s.label ?? i}
          type="button"
          role="listitem"
          className={styles.bubble}
          onClick={() => onSelect(s.text ?? s.label)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
