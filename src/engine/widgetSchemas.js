/**
 * Seed map of widget type → human-friendly label + example payload.
 * Extended one entry at a time as new widgets are added in follow-up PRs.
 * The Injector UI uses this to prefill the JSON textarea for the selected type.
 */
export const widgetSchemas = {
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
        { id: '1', label: 'Apply',     status: 'completed', summary: 'Application received on Apr 10.' },
        { id: '2', label: 'Screen',    status: 'completed', summary: 'Cleared phone screening.' },
        { id: '3', label: 'Interview', status: 'current' },
        { id: '4', label: 'Offer',     status: 'pending' },
        { id: '5', label: 'Onboard',   status: 'pending' },
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
