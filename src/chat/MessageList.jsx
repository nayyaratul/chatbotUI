import { Fragment, useEffect, useRef } from 'react'
import { MessageRenderer } from './MessageRenderer.jsx'
import { DateDivider } from './DateDivider.jsx'
import { TypingIndicator } from './TypingIndicator.jsx'
import styles from './messageList.module.scss'

function toYmd(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MessageList({ messages, isBotTyping, hideEmptyState = false }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isBotTyping])

  if (messages.length === 0 && !isBotTyping) {
    if (hideEmptyState) return null
    return <div className={styles.empty}>Say something to start…</div>
  }

  let lastYmd = null

  return (
    <div className={styles.list}>
      {messages.map((m) => {
        const ymd = toYmd(m.timestamp)
        const needsDivider = ymd !== lastYmd
        lastYmd = ymd
        return (
          <Fragment key={m.id}>
            {needsDivider && <DateDivider date={m.timestamp} />}
            <MessageRenderer message={m} />
          </Fragment>
        )
      })}
      {isBotTyping && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
