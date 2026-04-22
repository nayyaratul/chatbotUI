import { useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import { SuggestionsStrip } from './SuggestionsStrip.jsx'
import { ChatActionsProvider } from './ChatActionsContext.jsx'
import { STARTER_PROMPTS } from './starterPrompts.js'
import styles from './chatPane.module.scss'

export function ChatPane({ bot }) {
  const [inputText, setInputText] = useState('')
  const textareaRef = useRef(null)

  // Starter prompts appear only on a fresh conversation. Any user message
  // (or reset that re-populates) will hide them until the chat is empty again.
  const showStarters = bot.messages.length === 0
  const activeSuggestions = showStarters ? STARTER_PROMPTS : []

  const handleSuggestionSelect = (text) => {
    setInputText(text)
    // Focus on the next frame so React has committed the value update.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        // Place the caret at the end so users can continue typing without
        // having to tap to move it.
        el.setSelectionRange(text.length, text.length)
      }
    })
  }

  return (
    <ChatActionsProvider onReply={bot.sendUserMessage}>
      <div className={styles.pane}>
        <ChatHeader />
        <div className={styles.body}>
          <MessageList messages={bot.messages} isBotTyping={bot.isBotTyping} />
        </div>
        <SuggestionsStrip
          suggestions={activeSuggestions}
          onSelect={handleSuggestionSelect}
        />
        <MessageInput
          ref={textareaRef}
          value={inputText}
          onChange={setInputText}
          onSend={bot.sendUserMessage}
          disabled={bot.isBotTyping}
        />
      </div>
    </ChatActionsProvider>
  )
}
