import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import { SuggestionsStrip } from './SuggestionsStrip.jsx'
import { TopProgressBar } from './TopProgressBar.jsx'
import { ChatActionsProvider } from './ChatActionsContext.jsx'
import { STARTER_PROMPTS } from './starterPrompts.js'
import styles from './chatPane.module.scss'

export function ChatPane({ bot, bargeSensitivity = 0.25, bloomIntensity = 0.8 }) {
  const [inputText, setInputText] = useState('')
  /* Voice mode lives here so the composer (MessageInput) and the engine
     activity (bot.isBotSpeaking / isBotTyping) can drive the same
     feedback. { active, muted }. */
  const [voice, setVoice] = useState({ active: false, muted: false })
  const textareaRef = useRef(null)

  const showStarters = bot.messages.length === 0 && !bot.isBotTyping && !voice.active
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

  /* Stop the assistant's voice the moment voice mode closes, and on
     unmount — so it never keeps talking after you tap End. */
  useEffect(() => {
    if (!voice.active && typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [voice.active])
  useEffect(() => () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
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
          voice={voice}
          onVoiceChange={setVoice}
          botTyping={bot.isBotTyping}
          botSpeaking={bot.isBotSpeaking}
          onInterrupt={bot.stopSpeaking}
          bargeSensitivity={bargeSensitivity}
          bloomIntensity={bloomIntensity}
        />
        {/* Portal target for widget-owned modals (see JobDetailsModal) */}
        <div id="chat-modal-root" className={styles.modalRoot} />
      </div>
    </ChatActionsProvider>
  )
}
