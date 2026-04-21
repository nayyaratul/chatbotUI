import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import styles from './chatPane.module.scss'

const SAMPLE_MESSAGES = [
  { id: '1', role: 'bot', timestamp: Date.now() - 60000, widget: { type: 'text', payload: { text: 'Hello from the bot.' } } },
  { id: '2', role: 'user', timestamp: Date.now() - 50000, widget: { type: 'text', payload: { text: 'Hi! This is a user message.' } } },
  { id: '3', role: 'user', timestamp: Date.now() - 40000, widget: { type: 'widget_response', payload: { source_type: 'quick_reply', data: { label: 'Yes, proceed' } } } },
  { id: '4', role: 'bot', timestamp: Date.now() - 30000, widget: { type: 'mystery_widget', payload: { foo: 'bar' } } },
]

export function ChatPane() {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <MessageList messages={SAMPLE_MESSAGES} />
      </div>
    </div>
  )
}
