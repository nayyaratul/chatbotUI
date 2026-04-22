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
  match: /^(show )?(score|result)/i,
  build: () => ({
    type: 'score_card',
    payload: {
      widget_id: makeId('score'),
      overall: {
        score: 82,
        max_score: 100,
        pass_fail: 'pass',
        label: 'Assessment passed',
      },
      categories: [
        { name: 'Communication',    score: 88, max_score: 100 },
        { name: 'Technical Skills', score: 74, max_score: 100 },
        { name: 'Problem Solving',  score: 90, max_score: 100 },
        { name: 'Culture Fit',      score: 70, max_score: 100 },
      ],
      recommendation: 'Candidate has demonstrated strong communication and problem-solving skills. Recommended for the next interview round.',
      reasoning: 'The candidate scored above threshold in 3 of 4 categories. Technical skills and culture fit were borderline but within acceptable range for the mid-level role. No red flags were identified during the evaluation.',
      actions: [
        { label: 'Continue to next step', value: 'continue',    variant: 'primary' },
        { label: 'View full report',       value: 'view_report', variant: 'secondary' },
      ],
    },
  }),
})

// Silent / explicit-submit variant — selection is fed to the bot but
// no user bubble is posted. User must tap Submit to commit.
registerRule({
  match: /^(show )?(silent|confidential)[- ]?(mcq|quiz|check)/i,
  build: () => ({
    type: 'mcq',
    payload: {
      widget_id: makeId('mcq'),
      question_id: makeId('q'),
      question: 'How confident are you with this topic so far?',
      options: [
        { label: 'Very confident — ready to move on',              value: 'high' },
        { label: 'Somewhat confident — could use a refresher',     value: 'medium' },
        { label: 'Not confident yet — I need to review',           value: 'low' },
      ],
      mode: 'single',
      scored: false,
      require_submit: true,
      silent: true,
      progress: { index: 5, total: 10 },
    },
  }),
})

registerRule({
  match: /^(show )?(mcq|quiz)/i,
  build: () => ({
    type: 'mcq',
    payload: {
      widget_id: makeId('mcq'),
      question_id: makeId('q'),
      question: 'Which of the following is a key responsibility of a Delivery Associate in a last-mile logistics role?',
      mode: 'single',
      scored: true,
      correct_answers: ['safe_handling'],
      require_submit: true,
      progress: { index: 3, total: 10 },
      options: [
        { label: 'Negotiating supplier contracts',                 value: 'supplier_contracts' },
        { label: 'Safe handling and on-time delivery of packages', value: 'safe_handling' },
        { label: 'Managing warehouse inventory systems',           value: 'inventory_mgmt' },
        { label: 'Scheduling inter-city freight shipments',       value: 'freight_scheduling' },
        { label: 'Operating heavy forklift machinery',             value: 'forklift_ops' },
      ],
    },
  }),
})

registerRule({
  match: /^(show )?multi[- ]?(select|choice|mcq)/i,
  build: () => ({
    type: 'mcq',
    payload: {
      widget_id: makeId('mcq'),
      question_id: makeId('q'),
      question: 'Select all documents you have ready to submit for onboarding. (Select all that apply)',
      mode: 'multi',
      scored: false,
      progress: { index: 1, total: 4 },
      options: [
        { label: 'Aadhaar Card',         value: 'aadhaar' },
        { label: 'PAN Card',             value: 'pan' },
        { label: 'Bank Passbook / IFSC', value: 'bank' },
        { label: 'Passport-size Photo',  value: 'photo' },
        { label: 'Police Verification Certificate', value: 'pvc' },
      ],
    },
  }),
})

// Form widget — basic registration form (name, phone, DOB, city, email)
registerRule({
  match: /^(show )?form/i,
  build: () => ({
    type: 'form',
    payload: {
      widget_id: makeId('form'),
      form_id: 'candidate-registration',
      submit_label: 'Submit details',
      silent: false,
      fields: [
        {
          name: 'full_name',
          label: 'Full name',
          type: 'text',
          required: true,
          placeholder: 'e.g. Priya Sharma',
        },
        {
          name: 'phone',
          label: 'Phone number',
          type: 'phone',
          required: true,
          placeholder: '10-digit mobile number',
        },
        {
          name: 'dob',
          label: 'Date of birth',
          type: 'date',
          required: true,
        },
        {
          name: 'city',
          label: 'City',
          type: 'dropdown',
          required: true,
          placeholder: 'Select your city',
          options: [
            { label: 'Bangalore', value: 'bangalore' },
            { label: 'Mumbai',    value: 'mumbai' },
            { label: 'Delhi',     value: 'delhi' },
            { label: 'Hyderabad', value: 'hyderabad' },
            { label: 'Chennai',   value: 'chennai' },
            { label: 'Pune',      value: 'pune' },
          ],
        },
        {
          name: 'email',
          label: 'Email address',
          type: 'email',
          required: false,
          placeholder: 'Optional — for updates',
        },
      ],
    },
  }),
})

// Form widget — extended KYC / onboarding form
registerRule({
  match: /^(show )?(kyc|onboard(ing)?)/i,
  build: () => ({
    type: 'form',
    payload: {
      widget_id: makeId('form'),
      form_id: 'kyc-onboarding',
      submit_label: 'Submit KYC',
      silent: false,
      fields: [
        {
          name: 'full_name',
          label: 'Full name',
          type: 'text',
          required: true,
          placeholder: 'As per Aadhaar',
        },
        {
          name: 'dob',
          label: 'Date of birth',
          type: 'date',
          required: true,
        },
        {
          name: 'phone',
          label: 'Mobile number',
          type: 'phone',
          required: true,
          placeholder: '10-digit number',
        },
        {
          name: 'email',
          label: 'Email address',
          type: 'email',
          required: false,
          placeholder: 'Optional',
        },
        {
          name: 'pincode',
          label: 'Pincode',
          type: 'pincode',
          required: true,
          placeholder: '6-digit pincode',
        },
        {
          name: 'state',
          label: 'State',
          type: 'dropdown',
          required: true,
          placeholder: 'Select state',
          options: [
            { label: 'Andhra Pradesh',      value: 'ap' },
            { label: 'Delhi',               value: 'dl' },
            { label: 'Gujarat',             value: 'gj' },
            { label: 'Karnataka',           value: 'ka' },
            { label: 'Maharashtra',         value: 'mh' },
            { label: 'Rajasthan',           value: 'rj' },
            { label: 'Tamil Nadu',          value: 'tn' },
            { label: 'Telangana',           value: 'ts' },
            { label: 'Uttar Pradesh',       value: 'up' },
            { label: 'West Bengal',         value: 'wb' },
          ],
        },
        {
          name: 'bank_account',
          label: 'Bank account number',
          type: 'number',
          required: true,
          placeholder: 'Account number',
        },
        {
          name: 'ifsc',
          label: 'IFSC code',
          type: 'text',
          required: true,
          placeholder: 'e.g. SBIN0001234',
        },
      ],
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
