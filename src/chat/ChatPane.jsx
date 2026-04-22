import { useCallback, useRef, useState } from 'react'
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

  const showStarters = bot.messages.length === 0 && !bot.isBotTyping
  const activeSuggestions = showStarters ? STARTER_PROMPTS : []

  const handleSuggestionSelect = (text) => {
    setInputText(text)
    // Commit the state then focus with caret at end.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(text.length, text.length)
      }
    })
  }

  // Passed into SuggestionsStrip so it can measure the textarea for
  // the fly-to-input animation. Returns the live viewport rect every
  // call — no stale values after scroll/resize.
  const getTargetRect = useCallback(() => {
    return textareaRef.current?.getBoundingClientRect() ?? null
  }, [])

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
              getTargetRect={getTargetRect}
            />
          )}
        </div>
        <MessageInput
          ref={textareaRef}
          value={inputText}
          onChange={setInputText}
          onSend={bot.sendUserMessage}
          disabled={bot.isBotTyping}
          accented={showStarters}
        />
      </div>
    </ChatActionsProvider>
  )
}
