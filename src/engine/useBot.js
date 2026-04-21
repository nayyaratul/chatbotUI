import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

export function useBot({ latencyMs = 700 } = {}) {
  const [messages, setMessages] = useState([])
  const [isBotTyping, setIsBotTyping] = useState(false)

  const append = useCallback((role, widget) => {
    const message = {
      id: uuid(),
      role,
      timestamp: Date.now(),
      widget,
    }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  const sendUserMessage = useCallback(
    (widget) => {
      const userMessage = append('user', widget)
      setIsBotTyping(true)
      setTimeout(() => {
        const botWidget = respond(userMessage)
        if (botWidget) append('bot', botWidget)
        setIsBotTyping(false)
      }, latencyMs)
    },
    [append, latencyMs],
  )

  const injectBotMessage = useCallback(
    (widget) => { append('bot', widget) },
    [append],
  )

  const injectUserWidgetResponse = useCallback(
    (widget) => { append('user', widget) },
    [append],
  )

  const reset = useCallback(() => {
    setMessages([])
    setIsBotTyping(false)
  }, [])

  return {
    messages,
    isBotTyping,
    setIsBotTyping,
    sendUserMessage,
    injectBotMessage,
    injectUserWidgetResponse,
    reset,
  }
}
