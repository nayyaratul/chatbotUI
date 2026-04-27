import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import styles from './typingIndicator.module.scss'

/* ─── Thinking indicator — Claude-style ─────────────────────────────
   Replaces the old three-dot bubble with a small Sparkles glyph + a
   verb that cycles every ~1.5s while the bot is "thinking", with a
   shimmer gradient running across the text. Mounts when the bot is
   typing; unmounts on first reply. The cycle duration is independent
   of `bot reply latency` — latency drives how long this is visible,
   the verbs just rotate while it is.
   ─────────────────────────────────────────────────────────────── */

/* Per-context verb buckets. Each list ends with a softer
   "Almost there" so longer waits glide into a stable closer instead
   of looping novel verbs forever. `default` is the fallback when the
   engine doesn't know what's coming (force-on indicator, plain echo
   replies, etc.). */
const VERB_BUCKETS = {
  default: ['Thinking', 'Considering', 'Pondering', 'Working on it', 'Almost there'],
  jobs:    ['Pulling jobs', 'Matching openings', 'Sorting picks', 'Almost there'],
  form:    ['Drafting questions', 'Composing form', 'Almost there'],
  photo:   ['Reviewing photo', 'Analysing capture', 'Looking it over', 'Almost there'],
  rating:  ['Preparing question', 'Setting up rating', 'Almost there'],
  confirm: ['Reviewing details', 'Composing summary', 'Almost there'],
  scoring: ['Evaluating', 'Computing score', 'Tallying', 'Almost there'],
  profile: ['Pulling stats', 'Loading profile', 'Almost there'],
  compare: ['Comparing options', 'Lining up specs', 'Almost there'],
  upload:  ['Setting up upload', 'Preparing fields', 'Almost there'],
}

const CYCLE_MS = 1500
const DOT_STEP_MS = 350    // each dot appears 350ms after the previous

export function TypingIndicator({ context }) {
  const verbs = VERB_BUCKETS[context] ?? VERB_BUCKETS.default
  const [verbIndex, setVerbIndex] = useState(0)
  const [dotCount, setDotCount]   = useState(0) // 0 → 1 → 2 → 3 → 0 → …

  /* Reset to the first verb whenever the context changes — otherwise a
     stale index from the previous bucket can land out of bounds when
     buckets are different lengths. */
  useEffect(() => {
    setVerbIndex(0)
  }, [context])

  useEffect(() => {
    const id = window.setInterval(() => {
      setVerbIndex((i) => (i + 1) % verbs.length)
    }, CYCLE_MS)
    return () => window.clearInterval(id)
  }, [verbs])

  /* Trailing dots — independent timer so they keep ticking 1 → 2 → 3
     → 0 regardless of which verb is on screen. Reads as "Thinking →
     Thinking. → Thinking.. → Thinking..." */
  useEffect(() => {
    const id = window.setInterval(() => {
      setDotCount((c) => (c + 1) % 4)
    }, DOT_STEP_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.row} aria-live="polite" aria-label="Bot is thinking">
      <span className={styles.iconSlot} aria-hidden="true">
        <Sparkles size={14} strokeWidth={2} />
      </span>
      {/* `key` forces a remount on each verb change so the fade animation
          re-runs from the start — without it the text just snaps. The
          dots span sits inside `.verb` so it inherits the same shimmer
          gradient (background-clip: text) and reads as one phrase. */}
      <span key={`${context ?? 'default'}-${verbIndex}`} className={styles.verb}>
        {verbs[verbIndex]}
        <span className={styles.dotsSlot} aria-hidden="true">
          {'.'.repeat(dotCount)}
        </span>
      </span>
    </div>
  )
}
