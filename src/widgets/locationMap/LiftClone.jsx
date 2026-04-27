import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './liftClone.module.scss'

/* ─── LiftClone — FLIP source-to-target shared-element transition ──
   Used by LocationMap to animate the compact-card mini-map into the
   sheet's map region (and back, on dismiss). Both rects are
   chat-modal-root-relative; the clone is portaled into the same
   container so positioning matches.

   Phases (forward open):
     1. Mount with `phase: 'source'` styles (clone covers source rect).
     2. After 2× RAF, flip `phase` → 'target'. CSS transitions the
        transform from identity to (translate dx,dy + scale sx,sy)
        over 520ms on the §16 rise-up curve.
     3. After 540ms total, fire `onDone` so the parent unmounts the
        clone and switches the sheet's map region to opacity 1.

   Reverse pass: same component, `reverse` prop swaps the start/end
   so the clone lifts back DOWN to the source rect.

   Off-screen source fallback: if sourceRect.bottom < 0 or
   sourceRect.top > window.innerHeight, the parent passes a
   synthesised rect at the bottom of the viewport so the clone still
   reads as "rising in" (or "dropping out") rather than failing
   silently.
   ─────────────────────────────────────────────────────────────── */

/* Lift timing — the transform animates over LIFT_MS, then the clone
   spends FADE_MS cross-fading to opacity 0 while the sheet's actual
   map region is already painted underneath. Total hand-off feels
   continuous instead of snap-fading at the end of the transform. */
const LIFT_MS = 520
const FADE_MS = 140
const ANIM_MS = LIFT_MS + FADE_MS

export function LiftClone({
  sourceRect,
  targetRect,
  children,
  onDone,
  reverse = false,
}) {
  const target = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Phases:
       source → target → fading   (forward: lift up, then fade out)
       target → source → fading   (reverse: lift down, then fade out)
     The 'fading' phase is what makes the hand-off cross-fade —
     transform has settled, only opacity moves. */
  const [phase, setPhase] = useState(reverse ? 'target' : 'source')

  useEffect(() => {
    let raf2 = 0
    let fadeT = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setPhase(reverse ? 'source' : 'target')
        fadeT = window.setTimeout(() => setPhase('fading'), LIFT_MS)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(fadeT)
    }
  }, [reverse])

  useEffect(() => {
    if (phase !== 'fading') return undefined
    const t = window.setTimeout(() => onDone?.(), FADE_MS + 20)
    return () => window.clearTimeout(t)
  }, [phase, onDone])

  if (!target || !sourceRect || !targetRect) return null

  /* Anchor the clone at the source rect via top/left/width/height —
     transform interpolates from identity to the (dx,dy,sx,sy) that
     lands it on the target rect. Keeps everything GPU-friendly. */
  const sx = targetRect.width  > 0 && sourceRect.width  > 0 ? targetRect.width  / sourceRect.width  : 1
  const sy = targetRect.height > 0 && sourceRect.height > 0 ? targetRect.height / sourceRect.height : 1
  const dx = targetRect.left - sourceRect.left
  const dy = targetRect.top  - sourceRect.top

  const baseStyle = {
    top: `${sourceRect.top}px`,
    left: `${sourceRect.left}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    transformOrigin: 'top left',
  }

  const settledTransform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
  const transform = phase === 'source'
    ? 'translate(0, 0) scale(1, 1)'
    : settledTransform

  const phaseClass = `clone_${phase}`

  return createPortal(
    <div
      className={`${styles.clone} ${styles[phaseClass]}`}
      style={{ ...baseStyle, transform }}
      aria-hidden="true"
    >
      {children}
    </div>,
    target,
  )
}

LiftClone.ANIM_MS = ANIM_MS

export default LiftClone
