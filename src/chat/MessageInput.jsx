import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import cx from 'classnames'
import { Plus, Mic, MicOff, Send, AudioLines } from 'lucide-react'
import { useVoiceInput } from './useVoiceInput.js'
import styles from './messageInput.module.scss'

/**
 * Composer — text + voice.
 *
 * Parent (ChatPane) owns `value` (so the Suggestions Strip can prefill it)
 * AND the voice state (`voice = { active, muted }`), so the composer's
 * feedback can be driven by real engine activity rather than a local
 * timer. The forwarded ref points at the underlying <textarea>.
 *
 * Rendered states:
 *   default (empty)  →  + · "Ask anything" · [dictate mic] [enter-voice ▮▮]
 *   typing (1 line)  →  box border lights up · [send]
 *   typing (wrapped) →  text on top, + and [send] on a row below
 *   voice active     →  + · "Ask anything" · [mute mic] [••• End]
 *   voice + muted    →  [red mic-off] [••• End]
 *
 * Voice feedback (mutually exclusive, from live bot activity):
 *   Ada speaking  (botSpeaking)                       → bottom bloom
 *   you / listening (voice on, not muted, bot idle)   → bright box border
 *   bot thinking  (botTyping)                         → neutral (typing dots in stream)
 *
 * Sandbox note: there's no real mic/STT here, so in voice mode the field
 * stays editable as a stand-in — type what you'd say and Enter sends it as
 * a spoken turn (the reply then streams into the chat as the transcript).
 */

const BLOOM_BARS = 64

export const MessageInput = forwardRef(function MessageInput(
  {
    value,
    onChange,
    onSend,
    disabled = false,
    accented = false,
    voice = { active: false, muted: false },
    onVoiceChange,
    botTyping = false,
    botSpeaking = false,
    onInterrupt,
    bargeSensitivity = 0.5,
    bloomIntensity = 0.8,
  },
  forwardedRef,
) {
  const taRef = useRef(null)
  useImperativeHandle(forwardedRef, () => taRef.current, [])

  const [multiline, setMultiline] = useState(false)

  const text = value ?? ''
  const hasText = text.trim().length > 0
  const voiceActive = voice?.active ?? false
  const muted = voice?.muted ?? false

  /* Real mic + transcription while in voice mode. We "listen" only when
     voice is on, not muted, and the bot isn't mid-turn. Final phrases are
     submitted as spoken turns (the reply then streams back). */
  const listening = voiceActive && !muted && !botTyping && !botSpeaking
  const handleUtterance = useCallback(
    (spoken) => onSend({ type: 'text', payload: { text: spoken } }, { voice: true }),
    [onSend],
  )
  const { supported: voiceSupported, status: voiceStatus, interim, level } = useVoiceInput({
    active: voiceActive,
    listening,
    muted,
    assistantSpeaking: botSpeaking,
    bargeSensitivity,
    onUtterance: handleUtterance,
    onInterrupt,
  })
  /* True when live transcription is driving the field (vs. the type-to-
     speak fallback when speech recognition is unsupported or blocked). */
  const transcribing = voiceActive && voiceSupported && voiceStatus !== 'denied'

  /* Per-bar params for the Ada-speaking bloom. Center-weighted peaks +
     randomised duration/phase so the blurred shape morphs organically.
     Memoised so it's stable across re-renders. */
  const bloomBars = useMemo(() => {
    const n = BLOOM_BARS
    return Array.from({ length: n }, (_, i) => {
      const center = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)
      /* Flatter centre-weighting so the bloom stays visible across the full
         width (taller in the middle, but the edges still glow). */
      const peak = (0.5 + 0.5 * center) * (0.7 + 0.3 * Math.random())
      return {
        '--peak': peak.toFixed(2),
        '--lo': (0.12 + 0.06 * Math.random()).toFixed(2),
        '--dur': `${(0.7 + Math.random() * 0.6).toFixed(2)}s`,
        '--dly': `${(-Math.random() * 0.8).toFixed(2)}s`,
      }
    })
  }, [])

  /* Auto-grow the field + detect the wrap to a second line. */
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = el.scrollHeight
    el.style.height = `${Math.min(h, 120)}px`
    setMultiline(h > 48)
  }, [text, voiceActive, interim])

  const enterVoice = useCallback(() => onVoiceChange?.({ active: true, muted: false }), [onVoiceChange])
  const endVoice = useCallback(() => onVoiceChange?.({ active: false, muted: false }), [onVoiceChange])
  const toggleMute = useCallback(
    () => onVoiceChange?.({ active: true, muted: !muted }),
    [onVoiceChange, muted],
  )

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    /* `voice` tells the engine to stream this reply into the chat as a
       chunked transcript. */
    onSend({ type: 'text', payload: { text: trimmed } }, { voice: voiceActive })
    onChange('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  /* Feedback, mutually exclusive, from real engine state. */
  const showAssistantSpeaking = voiceActive && botSpeaking
  const showUserSpeaking = voiceActive && !muted && !botSpeaking && !botTyping
  /* Slider 0..1 → bloom opacity, with a visible floor and a sane ceiling. */
  const bloomOpacity = Math.min(0.95, 0.2 + bloomIntensity * 0.75)

  let placeholder = disabled ? 'Bot is replying…' : 'Ask anything'
  if (transcribing) placeholder = listening ? 'Listening…' : 'Ask anything'
  else if (voiceActive && voiceSupported && voiceStatus === 'denied')
    placeholder = 'Microphone blocked — allow it, then tap voice again'
  else if (voiceActive && !voiceSupported)
    placeholder = 'Voice input isn’t supported here — type your message'

  return (
    <div className={styles.input}>
      {/* Ada speaking: blurred reactive waveform rising from the bottom,
          behind the composer box, bleeding up into the stream. */}
      {showAssistantSpeaking && (
        <div className={styles.bloom} style={{ opacity: bloomOpacity }} aria-hidden="true">
          {bloomBars.map((style, i) => (
            <span key={i} className={styles.bloomBar} style={style} />
          ))}
        </div>
      )}

      <div
        className={cx(
          styles.box,
          voiceActive && styles.boxVoice,
          multiline && styles.multiline,
          showUserSpeaking && styles.speakingUser,
          accented && styles.accented,
        )}
        style={{ '--level': showUserSpeaking ? level.toFixed(2) : 0 }}
      >
        <button
          type="button"
          className={styles.plus}
          aria-label="Add attachment"
          disabled={disabled}
        >
          <Plus size={22} strokeWidth={2} />
        </button>

        <textarea
          ref={taRef}
          className={styles.field}
          rows={1}
          placeholder={placeholder}
          value={transcribing ? interim : text}
          onChange={(e) => { if (!transcribing) onChange(e.target.value) }}
          onKeyDown={handleKeyDown}
          readOnly={transcribing}
          disabled={!transcribing && disabled}
        />

        <div className={styles.trailing}>
          {voiceActive ? (
            <>
              <button
                type="button"
                className={cx(styles.iconBtn, muted ? styles.micMuted : styles.micLive)}
                onClick={toggleMute}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {muted ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
              </button>
              <button
                type="button"
                className={styles.endBtn}
                onClick={endVoice}
                aria-label="End voice mode"
              >
                <span className={styles.endDots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                End
              </button>
            </>
          ) : hasText ? (
            <button
              type="button"
              className={styles.sendBtn}
              onClick={submit}
              disabled={disabled}
              aria-label="Send"
            >
              <Send size={18} strokeWidth={2} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Dictate (voice to text)"
                disabled={disabled}
              >
                <Mic size={20} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={styles.voiceBtn}
                onClick={enterVoice}
                aria-label="Use voice mode"
                disabled={disabled}
              >
                <AudioLines size={18} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})
