import { Button } from '@nexus/atoms'
import styles from './suggestionsStrip.module.scss'

/**
 * Horizontally-scrollable strip of suggestion pills above the chat input.
 * Tapping a pill does NOT send — it prefills `onSelect(text)` which the
 * parent routes into the input textarea. User can edit, then send.
 *
 * Each suggestion: { label, emoji?, text? }. If `text` is omitted, the
 * label is used as the prefill value.
 */
export function SuggestionsStrip({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className={styles.strip} role="list" aria-label="Conversation starters">
      {suggestions.map((s, i) => (
        <Button
          key={s.text ?? s.label ?? i}
          className={styles.pill}
          variant="secondary"
          size="md"
          onClick={() => onSelect(s.text ?? s.label)}
        >
          {s.emoji && <span className={styles.pillEmoji}>{s.emoji}</span>}
          {s.label}
        </Button>
      ))}
    </div>
  )
}
