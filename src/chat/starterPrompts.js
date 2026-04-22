/**
 * Conversation starters — shown as right-aligned outlined bubbles
 * stacked from the bottom of the chat area when a new conversation
 * begins. Tapping a bubble prefills the input textarea (does not
 * send), so the user can edit before committing.
 *
 * Order matters: the FIRST entry renders closest to the input
 * (bottom of the stack) because the container uses
 * flex-direction: column-reverse.
 *
 * `label` shows on the bubble. `text` is the prefill value (falls
 * back to label if omitted).
 */
export const STARTER_PROMPTS = [
  { label: 'Tell me my payroll for this month.' },
  { label: 'How much money did I lose because of absence this month?' },
  { label: 'Teach me a sales course.' },
  { label: 'Show me upcoming shifts.' },
]
