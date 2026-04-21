import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import styles from './chatPane.module.scss'

export function ChatPane({ bot }) {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <MessageList messages={bot.messages} />
      </div>
      <MessageInput
        onSend={bot.sendUserMessage}
        disabled={bot.isBotTyping}
      />
    </div>
  )
}
