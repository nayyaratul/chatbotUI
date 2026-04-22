import { forwardRef } from 'react'
import cx from 'classnames'
import { Button, Textarea } from '@nexus/atoms'
import { Send } from 'lucide-react'
import styles from './messageInput.module.scss'

/**
 * Controlled textarea + send button. Parent owns the `value` state so
 * the Suggestions Strip can prefill it. Ref forwards to the underlying
 * textarea for programmatic focus after a prefill.
 *
 * `accented={true}` turns the container border-top and textarea border
 * blue-60, signalling a visual link with the starter-prompts strip.
 */
export const MessageInput = forwardRef(function MessageInput(
  { value, onChange, onSend, disabled = false, accented = false },
  textareaRef,
) {
  const submit = () => {
    const trimmed = (value ?? '').trim()
    if (!trimmed || disabled) return
    onSend({ type: 'text', payload: { text: trimmed } })
    onChange('')
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
        ref={textareaRef}
        className={cx(styles.textarea, accented && styles.accented)}
        rows={1}
        resize="none"
        placeholder={disabled ? 'Bot is replying…' : 'Type a message'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <Button
        variant="primary"
        size="md"
        iconOnly
        className={styles.sendButton}
        disabled={disabled || !(value ?? '').trim()}
        onClick={submit}
        aria-label="Send"
      >
        <Send size={16} />
      </Button>
    </div>
  )
})
