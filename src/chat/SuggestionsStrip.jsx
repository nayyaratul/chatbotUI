import { useRef, useState } from 'react'
import cx from 'classnames'
import { ArrowUpRight } from 'lucide-react'
import styles from './suggestionsStrip.module.scss'

/**
 * Fresh-chat invitation: a bot-voice intro block on the left paired
 * with user-voice prompt bubbles rising from the bottom-right.
 * Tapping a bubble prefills the input via `onSelect(text)` and plays
 * a fly animation from the bubble's position toward the target
 * (the textarea) whose rect is supplied by `getTargetRect`.
 *
 * Each suggestion: { label, text?, ... }. `text` falls back to
 * `label` when omitted.
 */
export function SuggestionsStrip({ suggestions, onSelect, getTargetRect }) {
  const bubbleRefs = useRef([])
  const [flying, setFlying] = useState(null) // { index, dx, dy } | null
  const [used, setUsed] = useState(() => new Set())

  if (!suggestions || suggestions.length === 0) return null

  const handleClick = (i, s) => {
    if (flying || used.has(i)) return

    const bubbleEl = bubbleRefs.current[i]
    const targetRect = getTargetRect?.()

    // Prefill immediately so the textarea fills in parallel with the animation.
    onSelect(s.text ?? s.label)

    if (!bubbleEl || !targetRect) {
      setUsed((prev) => new Set(prev).add(i))
      return
    }

    const bubbleRect = bubbleEl.getBoundingClientRect()
    const dx =
      targetRect.left + targetRect.width / 2 -
      (bubbleRect.left + bubbleRect.width / 2)
    const dy =
      targetRect.top + targetRect.height / 2 -
      (bubbleRect.top + bubbleRect.height / 2)

    setFlying({ index: i, dx, dy })
  }

  const handleAnimationEnd = (i, e) => {
    if (!e.animationName.includes('fly')) return
    if (flying?.index === i) {
      setFlying(null)
      setUsed((prev) => {
        const next = new Set(prev)
        next.add(i)
        return next
      })
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.introBlock}>
        <h2 className={styles.introTitle}>What can I help you with?</h2>
        <p className={styles.introSubtitle}>
          Try one of these, or type your own.
        </p>
      </header>

      <div className={styles.strip} role="list" aria-label="Conversation starters">
        {suggestions.map((s, i) => {
          if (used.has(i) && flying?.index !== i) return null

          const isFlying = flying?.index === i
          const style = isFlying
            ? { '--fly-x': `${flying.dx}px`, '--fly-y': `${flying.dy}px` }
            : undefined

          return (
            <button
              key={s.text ?? s.label ?? i}
              type="button"
              role="listitem"
              ref={(el) => { bubbleRefs.current[i] = el }}
              className={cx(styles.bubble, isFlying && styles.flying)}
              style={style}
              onClick={() => handleClick(i, s)}
              onAnimationEnd={(e) => handleAnimationEnd(i, e)}
            >
              <span className={styles.bubbleLabel}>{s.label}</span>
              <ArrowUpRight
                size={14}
                strokeWidth={2.25}
                className={styles.bubbleArrow}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
