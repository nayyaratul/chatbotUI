/**
 * Conversation starters — shown in a horizontally-scrollable strip above
 * the chat input whenever the chat is empty. Tapping a pill prefills the
 * input (does not send), so the user can edit before committing.
 *
 * `label` is what shows on the pill. `text` is what gets prefilled into
 * the textarea (falls back to label). `emoji` is optional.
 *
 * These labels intentionally match the mockBot rule triggers so tapping
 * + sending demonstrates the widget each starter hints at. Users can
 * edit freely before sending.
 */
export const STARTER_PROMPTS = [
  { label: 'Quick reply',           emoji: '👆', text: 'show quick reply' },
  { label: 'Confirmation',          emoji: '✅', text: 'show confirmation' },
  { label: 'Job application',       emoji: '📝', text: 'show caution confirmation' },
  { label: 'Account deletion',      emoji: '⚠️', text: 'show danger confirmation' },
]
