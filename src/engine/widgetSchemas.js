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
}
