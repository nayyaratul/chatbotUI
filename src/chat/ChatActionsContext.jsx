import { createContext, useCallback, useContext, useMemo } from 'react'

/**
 * Widgets consume `onReply(widget, options?)` to dispatch a user
 * response to the conversation.
 *
 * `options.silent: true` feeds the bot the selection without posting
 * a user-visible message. Use when the AI should react to a choice
 * but the choice itself shouldn't appear in the chat thread.
 */
const ChatActionsContext = createContext({
  onReply: () => {},
})

export function ChatActionsProvider({ sendUserMessage, silentlyReact, children }) {
  const onReply = useCallback(
    (widget, options) => {
      if (options?.silent && silentlyReact) {
        silentlyReact(widget)
      } else if (sendUserMessage) {
        sendUserMessage(widget)
      }
    },
    [sendUserMessage, silentlyReact],
  )

  const value = useMemo(() => ({ onReply }), [onReply])
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  )
}

export function useChatActions() {
  return useContext(ChatActionsContext)
}
