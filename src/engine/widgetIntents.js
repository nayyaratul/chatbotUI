import { getVariantPayload } from './widgetSchemas.js'

/* Natural-language widget launcher for the intelligence layer.
 *
 * The exact-trigger rules in mockBot.js only fire on tight phrases
 * ("earnings", "show job card"). This catches looser requests — "show me
 * the earnings", "can you open the shift calendar", "bring up KYC" — by
 * detecting a show-intent verb + a widget name (with synonyms) and
 * returning the matching widget. Types/variants mirror the registry and
 * the mockBot rules so they render real widgets.
 *
 * To add one: an entry with `type`, a valid `variant`, and `keys`
 * (lowercase synonyms; multi-word phrases score double).
 */

const SHOW_INTENT =
  /\b(show|open|display|launch|render|bring up|pull up|give me|get me|take me to|go to|jump to|let me see|i want to see|i wanna see|can i see|see the|view the|open the)\b/

const WIDGETS = [
  { type: 'job_card', variant: 'single', keys: ['job card', 'job details', 'single job', 'a job'] },
  { type: 'carousel', variant: 'job_picks', keys: ['carousel', 'job carousel', 'job picks', 'recommended jobs', 'swipe jobs', 'matching jobs'] },
  { type: 'earnings', variant: 'paycheck', keys: ['earnings', 'earning card', 'paycheck', 'payout card', 'pay card'] },
  { type: 'shift_calendar', variant: 'default', keys: ['shift calendar', 'schedule', 'weekly shifts', 'my shifts', 'shifts', 'calendar'] },
  { type: 'leaderboard', variant: 'personal', keys: ['leaderboard', 'rankings', 'standings', 'my rank', 'ranking'] },
  { type: 'profile', variant: 'worker', keys: ['profile', 'my profile', 'worker profile', 'profile card'] },
  { type: 'checklist', variant: 'interactive', keys: ['checklist', 'to do list', 'todo list', 'task list', 'onboarding checklist'] },
  { type: 'form', variant: 'basic', keys: ['form', 'registration form', 'sign up form', 'signup form', 'input form'] },
  { type: 'mcq', variant: 'scored', keys: ['mcq', 'quiz', 'multiple choice', 'question quiz'] },
  { type: 'rating', variant: 'stars', keys: ['rating', 'rating widget', 'star rating', 'rate widget', 'feedback stars'] },
  { type: 'confirmation', variant: 'info', keys: ['confirmation', 'confirmation card', 'confirm dialog', 'confirm box'] },
  { type: 'score_card', variant: 'default', keys: ['score card', 'scorecard', 'result card', 'score widget'] },
  { type: 'datetime_picker', variant: 'datetime', keys: ['date time picker', 'datetime picker', 'date picker', 'time picker', 'pick a slot', 'interview slot'] },
  { type: 'validated_input', variant: 'otp', keys: ['validated input', 'otp', 'verification code', 'otp input', 'input validation'] },
  { type: 'image_capture', variant: 'document', keys: ['image capture', 'camera', 'take a photo', 'capture photo', 'document capture', 'capture document'] },
  { type: 'file_upload', variant: 'default', keys: ['file upload', 'upload file', 'attach file', 'upload document', 'file picker'] },
  { type: 'document_preview', variant: 'default', keys: ['document preview', 'document viewer', 'preview document', 'offer letter', 'payslip', 'view contract'] },
  { type: 'evidence_review', variant: 'default', keys: ['evidence review', 'review evidence', 'document review'] },
  { type: 'qc_evidence_review', variant: 'admin', keys: ['qc review', 'quality check', 'qc evidence', 'shelf photo', 'task qc'] },
  { type: 'instruction_card', variant: 'info', keys: ['instruction card', 'instructions', 'how to card', 'guide card'] },
  { type: 'training_scenario', variant: 'pre_practice', keys: ['training scenario', 'practice scenario', 'role play', 'mission brief'] },
  { type: 'approval', variant: 'bgv', keys: ['approval', 'approval card', 'approve case', 'bgv review', 'admin review'] },
  { type: 'video', variant: 'standard', keys: ['video', 'video player', 'play video', 'training video'] },
  { type: 'audio', variant: 'default', keys: ['audio player', 'audio', 'play audio', 'voice note', 'listen'] },
  { type: 'voice_recording', variant: 'default', keys: ['voice recording', 'voice recorder', 'record voice', 'audio recording'] },
  { type: 'signature', variant: 'document', keys: ['signature', 'signature capture', 'signature pad', 'sign here', 'e sign'] },
  { type: 'comparison', variant: 'candidate_match', keys: ['comparison', 'compare', 'side by side', 'match comparison'] },
  { type: 'embedded_webview', variant: 'partner_form', keys: ['webview', 'embedded webview', 'web view', 'partner form', 'embedded page'] },
  { type: 'location_map', variant: 'pin_drop', keys: ['location map', 'map', 'show location', 'pin drop', 'drop a pin'] },
  { type: 'quick_reply', variant: 'default', keys: ['quick reply', 'quick replies', 'reply options', 'option buttons'] },
  { type: 'progress', variant: 'default', keys: ['progress tracker', 'progress bar', 'stepper'] },
]

function normalize(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns a widget `{ type, payload }` when the text reads as a request to
 * show a specific widget, else null (so the caller can try the text
 * knowledge layer). Fires when there's a show-intent verb, OR when a
 * multi-word widget name is named outright (score ≥ 2) — e.g. just saying
 * "shift calendar" is unambiguous, but a bare "map" needs "show".
 */
export function matchWidgetIntent(rawText) {
  const q = normalize(rawText)
  if (!q) return null

  const showIntent = SHOW_INTENT.test(q)
  let best = null
  let bestScore = 0
  for (const widget of WIDGETS) {
    let score = 0
    for (const key of widget.keys) {
      if (q.includes(key)) score += key.includes(' ') ? 2 : 1
    }
    if (score > bestScore) {
      bestScore = score
      best = widget
    }
  }

  if (best && (showIntent || bestScore >= 2)) {
    return { type: best.type, payload: getVariantPayload(best.type, best.variant) }
  }
  return null
}
