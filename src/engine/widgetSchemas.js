/**
 * Seed map of widget type → human-friendly label + example payload.
 * Extended one entry at a time as new widgets are added in follow-up PRs.
 * The Injector UI uses this to prefill the JSON textarea for the selected type.
 */
export const widgetSchemas = {
  mcq: {
    label: 'MCQ / Quiz',
    examplePayload: {
      widget_id: 'mcq-example-1',
      question_id: 'q-screening-1',
      question: 'Which of the following is a key responsibility of a Delivery Associate in a last-mile logistics role?',
      mode: 'single',
      scored: true,
      correct_answers: ['safe_handling'],
      progress: { index: 3, total: 10 },
      // When true, selection does NOT auto-submit in single-select
      // mode — user must tap the Submit button to commit.
      require_submit: true,
      // When true, the response is delivered to the bot without
      // posting a user-visible message in the chat. The bot's reply
      // still appears normally.
      silent: false,
      options: [
        { label: 'Negotiating supplier contracts',   value: 'supplier_contracts' },
        { label: 'Safe handling and on-time delivery of packages', value: 'safe_handling' },
        { label: 'Managing warehouse inventory systems', value: 'inventory_mgmt' },
        { label: 'Scheduling inter-city freight shipments', value: 'freight_scheduling' },
        { label: 'Operating heavy forklift machinery', value: 'forklift_ops' },
      ],
    },
  },
  text: {
    label: 'Text message',
    examplePayload: { text: 'Hello from the injector.' },
  },
  widget_response: {
    label: 'Widget response (user tap/submit)',
    examplePayload: {
      source_type: 'quick_reply',
      source_widget_id: 'example-qr-1',
      data: { label: 'Yes, proceed', value: 'yes' },
    },
  },
  quick_reply: {
    label: 'Quick Reply Buttons',
    examplePayload: {
      widget_id: 'qr-example-1',
      prompt: 'Are you interested in this opportunity?',
      options: [
        { label: 'Yes', value: 'yes', emoji: '👍' },
        { label: 'No', value: 'no', emoji: '👎' },
        { label: 'Maybe later', value: 'maybe' },
      ],
      allow_multiple: false,
    },
  },
  progress: {
    label: 'Progress Tracker',
    examplePayload: {
      widget_id: 'progress-example-1',
      orientation: 'auto',
      steps: [
        { id: '1', label: 'Apply',       status: 'completed', summary: 'Application received on Apr 10.' },
        { id: '2', label: 'Screen',      status: 'completed', summary: 'Cleared phone screening.' },
        { id: '3', label: 'Assessment',  status: 'failed',    summary: 'Retry required — score below threshold.' },
        { id: '4', label: 'Interview',   status: 'current' },
        { id: '5', label: 'Offer',       status: 'pending' },
        { id: '6', label: 'Onboard',     status: 'pending' },
      ],
    },
  },
  score_card: {
    label: 'Score / Result Card',
    examplePayload: {
      widget_id: 'score-example-1',
      overall: {
        score: 82,
        max_score: 100,
        pass_fail: 'pass',
        label: 'Assessment passed',
      },
      categories: [
        { name: 'Communication',      score: 88, max_score: 100 },
        { name: 'Technical Skills',   score: 74, max_score: 100 },
        { name: 'Problem Solving',    score: 90, max_score: 100 },
        { name: 'Culture Fit',        score: 70, max_score: 100 },
      ],
      recommendation: 'Candidate has demonstrated strong communication and problem-solving skills. Recommended for the next interview round.',
      reasoning: 'The candidate scored above threshold in 3 of 4 categories. Technical skills and culture fit were borderline but within acceptable range for the mid-level role. No red flags were identified during the evaluation.',
      actions: [
        { label: 'Continue to next step', value: 'continue', variant: 'primary' },
        { label: 'View full report',       value: 'view_report', variant: 'secondary' },
      ],
    },
  },
  confirmation: {
    label: 'Confirmation Card',
    examplePayload: {
      widget_id: 'confirm-example-1',
      action_id: 'apply-job-123',
      tone: 'caution', // 'info' | 'caution' | 'danger'
      title: 'Confirm your application',
      description: 'Your profile will be shared with the employer and this action cannot be undone.',
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
  },
}
