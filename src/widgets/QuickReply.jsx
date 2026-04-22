import { useState } from 'react'
import cx from 'classnames'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './quickReply.module.scss'

export function QuickReply({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [selectedValues, setSelectedValues] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)

  const options = payload?.options ?? []
  const allowMultiple = !!payload?.allow_multiple
  const orientation =
    options.length >= 4 && (viewport === 'mobile' || options.length > 5)
      ? 'vertical'
      : 'horizontal'

  const handleTap = (option, index) => {
    if (submitted) return

    if (allowMultiple) {
      const next = new Set(selectedValues)
      if (next.has(option.value)) next.delete(option.value)
      else next.add(option.value)
      setSelectedValues(next)
      return
    }

    setSubmitted(true)
    setSelectedValues(new Set([option.value]))
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'quick_reply',
        source_widget_id: payload?.widget_id,
        data: {
          label: option.label,
          value: option.value,
          option_index: index,
          timestamp: Date.now(),
        },
      },
    })
  }

  const submitMulti = () => {
    if (submitted || selectedValues.size === 0) return
    setSubmitted(true)
    const selectedOptions = options.filter((o) => selectedValues.has(o.value))
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'quick_reply',
        source_widget_id: payload?.widget_id,
        data: {
          label: selectedOptions.map((o) => o.label).join(', '),
          values: selectedOptions.map((o) => o.value),
          timestamp: Date.now(),
        },
      },
    })
  }

  return (
    <div className={styles.container}>
      {payload?.prompt && <div className={styles.prompt}>{payload.prompt}</div>}
      <div className={cx(styles.options, styles[orientation])}>
        {options.map((option, index) => {
          const isSelected = selectedValues.has(option.value)
          return (
            <Button
              key={option.value}
              className={styles.option}
              variant={isSelected ? 'primary' : 'secondary'}
              size="md"
              disabled={submitted && !isSelected}
              onClick={() => handleTap(option, index)}
            >
              {option.emoji && <span className={styles.emoji}>{option.emoji}</span>}
              {option.label}
            </Button>
          )
        })}
      </div>
      {allowMultiple && !submitted && selectedValues.size > 0 && (
        <Button variant="primary" size="sm" onClick={submitMulti}>
          Submit ({selectedValues.size})
        </Button>
      )}
    </div>
  )
}
