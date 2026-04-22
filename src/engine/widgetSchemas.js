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
  confirmation: {
    label: 'Confirmation Card',
    examplePayload: {
      widget_id: 'confirm-example-1',
      action_id: 'apply-job-123',
      title: 'Confirm your application',
      description: 'You are about to apply for this job. This action cannot be undone.',
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
