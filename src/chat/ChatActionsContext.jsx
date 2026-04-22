import { createContext, useContext, useMemo } from 'react'

const ChatActionsContext = createContext({
  onReply: () => {},
})

export function ChatActionsProvider({ onReply, children }) {
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
