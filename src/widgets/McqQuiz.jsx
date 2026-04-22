import { useState } from 'react'
import cx from 'classnames'
import { Check, X } from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './mcqQuiz.module.scss'

/* ─── MCQ / Quiz Widget ──────────────────────────────────────────
   Supports single-select (radio) and multi-select (checkbox) modes.
   Scored mode shows correct/incorrect feedback after submission.
   ─────────────────────────────────────────────────────────────── */

export function McqQuiz({ payload }) {
  const { onReply } = useChatActions()
  // viewport available for future responsive layout decisions
  // eslint-disable-next-line no-unused-vars
  const { viewport } = useViewport()

  const [selected, setSelected] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [startedAt] = useState(() => Date.now())

  const options       = payload?.options ?? []
  const mode          = payload?.mode === 'multi' ? 'multi' : 'single'
  const scored        = !!payload?.scored
  const correctSet    = new Set(payload?.correct_answers ?? [])
  const progress      = payload?.progress ?? null

  /* ─── Emit widget_response ───────────────────────────────────── */

  const emit = (selectedValues) => {
    const time_taken_seconds = Math.round((Date.now() - startedAt) / 1000)

    // Build human-readable label
    const selectedOptions = options.filter((o) => selectedValues.has(o.value))
    const label = selectedOptions.map((o) => o.label).join(', ')

    // Scored logic
    let is_correct
    let score
    if (scored && correctSet.size > 0) {
      is_correct =
        selectedValues.size === correctSet.size &&
        [...selectedValues].every((v) => correctSet.has(v))
      score = is_correct ? 1 : 0
    }

    const data = {
      question_id: payload?.question_id,
      selected_options: [...selectedValues],
      label,
      time_taken_seconds,
      ...(scored && correctSet.size > 0 ? { is_correct, score } : {}),
    }

    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'mcq',
        source_widget_id: payload?.widget_id,
        data,
      },
    })
  }

  /* ─── Tap handler ────────────────────────────────────────────── */

  const handleTap = (optionValue) => {
    if (submitted) return

    if (mode === 'single') {
      const next = new Set([optionValue])
      setSelected(next)
      setSubmitted(true)
      emit(next)
    } else {
      // multi: toggle membership
      const next = new Set(selected)
      if (next.has(optionValue)) {
        next.delete(optionValue)
      } else {
        next.add(optionValue)
      }
      setSelected(next)
    }
  }

  /* ─── Multi-mode submit ──────────────────────────────────────── */

  const handleSubmit = () => {
    if (submitted || selected.size === 0) return
    setSubmitted(true)
    emit(selected)
  }

  /* ─── Per-option state derivation ───────────────────────────── */

  const getOptionState = (value) => {
    const isSelected = selected.has(value)
    if (!submitted) return { isSelected, isCorrect: false, isIncorrect: false }
    if (!scored || correctSet.size === 0) return { isSelected, isCorrect: false, isIncorrect: false }
    const isInCorrectSet = correctSet.has(value)
    return {
      isSelected,
      isCorrect: isInCorrectSet,
      isIncorrect: isSelected && !isInCorrectSet,
    }
  }

  /* ─── Render ─────────────────────────────────────────────────── */

  return (
    <div className={styles.card}>

      {/* Progress indicator */}
      {progress && (
        <div className={styles.progress}>
          Question {progress.index} of {progress.total}
        </div>
      )}

      {/* Question */}
      {payload?.question && (
        <p className={styles.question}>{payload.question}</p>
      )}

      {/* Options */}
      <div className={styles.options} role={mode === 'single' ? 'radiogroup' : 'group'}>
        {options.map((option) => {
          const { isSelected, isCorrect, isIncorrect } = getOptionState(option.value)

          // Disabled when submitted AND not involved in feedback display
          const isDisabled = submitted && !isSelected && !isCorrect

          const indicatorClass = cx(
            styles.indicator,
            mode === 'single' ? styles.indicatorRadio : styles.indicatorCheckbox,
            !submitted && isSelected && styles.indicatorActive,
            submitted && isCorrect && styles.indicatorCorrect,
            submitted && isIncorrect && styles.indicatorError,
          )

          return (
            <button
              key={option.value}
              type="button"
              role={mode === 'single' ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              disabled={isDisabled}
              className={cx(
                styles.option,
                isSelected && !submitted && styles.selected,
                submitted && isCorrect && styles.correct,
                submitted && isIncorrect && styles.incorrect,
                submitted && !isSelected && !isCorrect && styles.option,
              )}
              onClick={() => handleTap(option.value)}
            >
              {/* Custom indicator */}
              <span className={indicatorClass} aria-hidden="true" />

              {/* Optional image */}
              {option.image_url && (
                <img
                  src={option.image_url}
                  alt=""
                  className={styles.optionImage}
                />
              )}

              {/* Label */}
              <span className={styles.optionLabel}>{option.label}</span>

              {/* Post-submit status icon (scored only) */}
              {submitted && scored && isCorrect && (
                <span className={cx(styles.statusIcon, styles.iconCorrect)} aria-label="Correct">
                  <Check size={14} strokeWidth={2.5} />
                </span>
              )}
              {submitted && scored && isIncorrect && (
                <span className={cx(styles.statusIcon, styles.iconError)} aria-label="Incorrect">
                  <X size={14} strokeWidth={2.5} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Submit bar — multi-mode only, pre-submit */}
      {mode === 'multi' && !submitted && (
        <div className={styles.submitBar}>
          <Button
            variant="primary"
            size="md"
            disabled={selected.size === 0}
            onClick={handleSubmit}
          >
            Submit ({selected.size})
          </Button>
        </div>
      )}
    </div>
  )
}
