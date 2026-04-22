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

// Confirmation Card — three tone variants reachable by typing.
// "show confirmation" / "show confirm"              → info    (default tone)
// "show caution confirmation" / "show commit"       → caution (high-stakes, e.g. job application)
// "show danger confirmation" / "show delete"        → danger  (irreversible + checkbox)

registerRule({
  match: /^(show )?(caution confirm(ation)?|commit(ment)?)/i,
  build: () => ({
    type: 'confirmation',
    payload: {
      widget_id: makeId('confirm'),
      action_id: makeId('action'),
      tone: 'caution',
      title: 'Confirm your application',
      description: 'Your profile will be shared with the employer.',
      details: [
        { label: 'Role',       value: 'Delivery Associate' },
        { label: 'Location',   value: 'Koramangala, Bangalore' },
        { label: 'Pay',        value: '₹850/day' },
        { label: 'Start date', value: '2026-05-01' },
      ],
      confirm_label: 'Submit application',
      cancel_label: 'Go back',
      require_checkbox: true,
      checkbox_label: 'I understand this submission is final.',
    },
  }),
})

registerRule({
  match: /^(show )?(danger confirm(ation)?|delete|destructive)/i,
  build: () => ({
    type: 'confirmation',
    payload: {
      widget_id: makeId('confirm'),
      action_id: makeId('action'),
      tone: 'danger',
      title: 'Delete your account',
      description: 'Your profile and all associated data will be permanently removed. This cannot be reversed.',
      details: [
        { label: 'Affects',   value: 'Your entire profile' },
        { label: 'Recovery',  value: 'Not possible after 24h' },
      ],
      confirm_label: 'Delete permanently',
      cancel_label: 'Keep my account',
      require_checkbox: true,
      checkbox_label: 'I understand this cannot be undone.',
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
      tone: 'info',
      title: 'Confirm your choice',
      description: 'Are you sure you want to continue with the demo?',
      details: [
        { label: 'Action', value: 'Demo confirmation' },
        { label: 'When',   value: 'Immediately' },
      ],
      confirm_label: 'Yes, continue',
      cancel_label: 'Go back',
    },
  }),
})

registerRule({
  match: /^(show )?progress/i,
  build: () => ({
    type: 'progress',
    payload: {
      widget_id: makeId('progress'),
      orientation: 'auto',
      steps: [
        { id: 'a', label: 'Started',    status: 'completed', summary: 'Kicked off on Apr 15.' },
        { id: 'b', label: 'Doc check',  status: 'failed',    summary: 'Missing Aadhaar upload.' },
        { id: 'c', label: 'In review',  status: 'current' },
        { id: 'd', label: 'Decision',   status: 'pending' },
        { id: 'e', label: 'Done',       status: 'pending' },
      ],
    },
  }),
})
