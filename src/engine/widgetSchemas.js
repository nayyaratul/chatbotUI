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
  form: {
    label: 'Form (multi-field)',
    examplePayload: {
      widget_id: 'form-example-1',
      form_id: 'candidate-registration',
      title: 'Tell us about yourself',
      description: 'We’ll use this to match you with open roles in your area. Takes about a minute.',
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
  },
  job_card: {
    label: 'Job Card (carousel)',
    examplePayload: {
      widget_id: 'jc-carousel-example-1',
      silent: false,
      items: [
        {
          job_id: 'job-delivery-associate-blr',
          title: 'Delivery Associate',
          company: { name: 'Delhivery', logo_url: '' },
          location: { name: 'Koramangala, Bangalore', distance_km: 3.2 },
          pay: { amount: '₹850', period: 'day' },
          timing: '9am – 6pm',
          requirements: [
            'Valid 2-wheeler driving licence',
            'Own bike in good condition',
            'Smartphone with data plan',
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: 'job-warehouse-packer-mum',
          title: 'Warehouse Packer',
          company: { name: 'Amazon India', logo_url: '' },
          location: { name: 'Vikhroli, Mumbai', distance_km: 7.8 },
          pay: { amount: '₹700', period: 'day' },
          timing: '7am – 4pm',
          requirements: [
            'Ability to lift up to 20 kg',
            'Attention to detail for labelling',
            'Willing to work weekend shifts',
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: 'job-rider-hyd',
          title: 'Rider',
          company: { name: 'Swiggy', logo_url: '' },
          location: { name: 'Banjara Hills, Hyderabad', distance_km: 5.4 },
          pay: { amount: '₹950', period: 'day' },
          timing: '11am – 11pm (flexible)',
          requirements: [
            'Valid driving licence for 2-wheeler',
            'Smartphone running Android 8+',
            'Good knowledge of local roads',
            'Ability to handle peak-hour orders',
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
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
