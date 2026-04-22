import { useState } from 'react'
import cx from 'classnames'
import { Check, X } from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './mcqQuiz.module.scss'

/* ─── MCQ / Quiz Widget ──────────────────────────────────────────
   "Exam card" — lettered options (A, B, C, D, E). The letter badge
   is the indicator; post-submit scored cards swap the letter for
   a Check (correct) or X (incorrect selected) icon. Non-scored
   submissions keep the letter throughout.
   ─────────────────────────────────────────────────────────────── */

function letterFor(index) {
  return String.fromCharCode(65 + index) // 'A', 'B', 'C', ...
}

export function McqQuiz({ payload }) {
  const { onReply } = useChatActions()

  const [selected, setSelected] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [startedAt] = useState(() => Date.now())

  const options    = payload?.options ?? []
  const mode       = payload?.mode === 'multi' ? 'multi' : 'single'
  const scored     = !!payload?.scored
  const correctSet = new Set(payload?.correct_answers ?? [])
  const progress   = payload?.progress ?? null

  /* ─── Emit widget_response ───────────────────────────────────── */

  const emit = (selectedValues) => {
    const time_taken_seconds = Math.round((Date.now() - startedAt) / 1000)
    const selectedOptions = options.filter((o) => selectedValues.has(o.value))
    const label = selectedOptions.map((o) => o.label).join(', ')

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
      const next = new Set(selected)
      if (next.has(optionValue)) next.delete(optionValue)
      else next.add(optionValue)
      setSelected(next)
    }
  }

  const handleSubmit = () => {
    if (submitted || selected.size === 0) return
    setSubmitted(true)
    emit(selected)
  }

  /* ─── Per-option state derivation ───────────────────────────── */

  const getOptionState = (value) => {
    const isSelected = selected.has(value)
    if (!submitted || !scored || correctSet.size === 0) {
      return { isSelected, isCorrect: false, isIncorrect: false }
    }
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

      {progress && (
        <div className={styles.progress}>
          Question {progress.index} of {progress.total}
        </div>
      )}

      {payload?.question && (
        <p className={styles.question}>{payload.question}</p>
      )}

      <div
        className={styles.options}
        role={mode === 'single' ? 'radiogroup' : 'group'}
      >
        {options.map((option, idx) => {
          const { isSelected, isCorrect, isIncorrect } = getOptionState(option.value)
          const isDisabled = submitted && !isSelected && !isCorrect

          // Badge glyph: Check icon if this is a correct option post-submit,
          // X icon if this is the user's wrong pick, otherwise the letter.
          const badge =
            submitted && isCorrect ? <Check size={16} strokeWidth={2.5} /> :
            submitted && isIncorrect ? <X size={16} strokeWidth={2.5} /> :
            letterFor(idx)

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
              )}
              onClick={() => handleTap(option.value)}
            >
              <span className={styles.letterBadge} aria-hidden="true">
                {badge}
              </span>

              {option.image_url && (
                <img
                  src={option.image_url}
                  alt=""
                  className={styles.optionImage}
                />
              )}

              <span className={styles.optionLabel}>{option.label}</span>
            </button>
          )
        })}
      </div>

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
