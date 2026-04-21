import { useState } from 'react'
import { Button, Textarea } from '@nexus/atoms'
import { Send } from 'lucide-react'
import styles from './messageInput.module.scss'

export function MessageInput({ onSend, disabled = false }) {
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend({ type: 'text', payload: { text: trimmed } })
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.input}>
      <Textarea
        className={styles.textarea}
        rows={1}
        resize="none"
        placeholder={disabled ? 'Bot is replying…' : 'Type a message'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <Button
        variant="primary"
        size="md"
        iconOnly
        className={styles.sendButton}
        disabled={disabled || !text.trim()}
        onClick={submit}
        aria-label="Send"
      >
        <Send size={16} />
      </Button>
    </div>
  )
}
