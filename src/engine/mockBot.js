import { v4 as uuid } from 'uuid'

/**
 * Rule-based mock bot. Each rule is { match: RegExp, build: (userMessage) => botWidget | null }.
 * The first matching rule wins. Unmatched text messages and all widget_response messages fall through
 * to the default echo.
 *
 * Each widget task APPENDS one entry to this list.
 */
const rules = []

export function registerRule(rule) {
  rules.push(rule)
}

function defaultEcho(userMessage) {
  const payload = userMessage?.widget?.payload ?? {}
  let incoming = ''
  if (userMessage?.widget?.type === 'text') {
    incoming = payload.text ?? ''
  } else if (userMessage?.widget?.type === 'widget_response') {
    incoming = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  } else {
    incoming = `(${userMessage?.widget?.type ?? 'unknown'})`
  }
  return { type: 'text', payload: { text: `You said: ${incoming}` } }
}

export function respond(userMessage) {
  if (userMessage?.widget?.type === 'text') {
    const text = userMessage.widget.payload?.text?.toLowerCase().trim() ?? ''
    for (const rule of rules) {
      if (rule.match.test(text)) {
        const built = rule.build(userMessage)
        if (built) return built
      }
    }
  }
  return defaultEcho(userMessage)
}

// Helper used by widget rule factories to stamp fresh ids on each build.
export function makeId(prefix = 'w') {
  return `${prefix}-${uuid().slice(0, 8)}`
}

registerRule({
  match: /^(show )?quick[- ]?reply/i,
  build: () => ({
    type: 'quick_reply',
    payload: {
      widget_id: makeId('qr'),
      prompt: 'Pick one:',
      options: [
        { label: 'Yes', value: 'yes', emoji: '👍' },
        { label: 'No', value: 'no', emoji: '👎' },
        { label: 'Maybe', value: 'maybe' },
      ],
    },
  }),
})

registerRule({
  match: /^(show )?confirm(ation)?/i,
  build: () => ({
    type: 'confirmation',
    payload: {
      widget_id: makeId('confirm'),
      action_id: makeId('action'),
      title: 'Confirm your choice',
      description: 'Are you sure you want to continue?',
      details: [
        { label: 'Action', value: 'Demo confirmation' },
        { label: 'When',   value: 'Immediately' },
      ],
      confirm_label: 'Yes, continue',
      cancel_label: 'Go back',
    },
  }),
})
