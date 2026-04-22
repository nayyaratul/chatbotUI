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
  // (or reset that re-empties the thread) re-offers them.
  const showStarters = bot.messages.length === 0 && !bot.isBotTyping
  const activeSuggestions = showStarters ? STARTER_PROMPTS : []

  const handleSuggestionSelect = (text) => {
    setInputText(text)
    // Focus the next frame so React commits the value, then place caret
    // at end so the user can type additions without moving the cursor.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(text.length, text.length)
      }
    })
  }

  return (
    <ChatActionsProvider onReply={bot.sendUserMessage}>
      <div className={styles.pane}>
        <ChatHeader />
        <div className={styles.body}>
          <MessageList
            messages={bot.messages}
            isBotTyping={bot.isBotTyping}
            hideEmptyState={showStarters}
          />
          {showStarters && (
            <SuggestionsStrip
              suggestions={activeSuggestions}
              onSelect={handleSuggestionSelect}
            />
          )}
        </div>
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
