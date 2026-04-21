import { useEffect, useRef } from 'react'
import { MessageRenderer } from './MessageRenderer.jsx'
import styles from './messageList.module.scss'

export function MessageList({ messages }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  if (messages.length === 0) {
    return <div className={styles.empty}>Say something to start…</div>
  }

  return (
    <div className={styles.list}>
      {messages.map((m) => (
        <MessageRenderer key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
