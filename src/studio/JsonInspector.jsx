import { useEffect, useRef } from 'react'
import styles from './jsonInspector.module.scss'

export function JsonInspector({ messages }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [messages])

  return (
    <pre className={styles.inspector} ref={ref}>
      {messages.length === 0
        ? <span className={styles.empty}>[]</span>
        : JSON.stringify(messages, null, 2)}
    </pre>
  )
}
