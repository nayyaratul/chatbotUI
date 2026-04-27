import { useCallback, useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import { SuggestionsStrip } from './SuggestionsStrip.jsx'
import { TopProgressBar } from './TopProgressBar.jsx'
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
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(text.length, text.length)
      }
    })
  }

  const getTargetRect = useCallback(() => {
    return textareaRef.current?.getBoundingClientRect() ?? null
  }, [])

  return (
    <ChatActionsProvider
      sendUserMessage={bot.sendUserMessage}
      silentlyReact={bot.silentlyReact}
    >
      <div className={styles.pane}>
        <ChatHeader />
        <TopProgressBar messages={bot.messages} />
        <div className={styles.body}>
          <MessageList
            messages={bot.messages}
            isBotTyping={bot.isBotTyping}
            typingContext={bot.typingContext}
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
        {/* Portal target for widget-owned modals (see JobDetailsModal) */}
        <div id="chat-modal-root" className={styles.modalRoot} />
      </div>
    </ChatActionsProvider>
  )
}
