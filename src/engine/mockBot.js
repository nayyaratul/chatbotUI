import { makeId } from './ids.js'

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

/* ─── Shared rich job payloads ───────────────────────────────────
   Used by both the JobCard-internal carousel (`jobs` trigger) and
   the generic Carousel-of-job_cards (`job picks` trigger) so the
   two presentations show identical data. Function (not const) so
   makeId() mints fresh ids per invocation. */
export function richJobs() {
  return [
    {
      job_id: makeId('job'),
      title: 'Delivery Associate',
      company: {
        name: 'Delhivery',
        logo_url: '',
        verified: true,
        about: 'Delhivery is one of India\'s largest logistics companies, moving over 2 billion shipments a year across 18,700+ pin codes.',
      },
      location: {
        name: 'Koramangala, Bangalore',
        distance_km: 4.2,
        full_address: 'Delhivery Hub, Koramangala 5th Block, Bangalore 560095',
      },
      pay: { min: '₹22,000', max: '₹28,000', period: 'month' },
      incentive: 'Earn up to ₹5,000 in weekly incentives',
      timing: '9am – 6pm',
      job_type: 'Full-time',
      work_type: 'Field job',
      shift: 'Day shift',
      education: '10th pass',
      experience: '1+ year preferred',
      languages: ['Hindi', 'English'],
      requirements: ['Valid 2-wheeler driving licence', 'Own bike in good condition', 'Smartphone with data plan'],
      benefits: ['PF', 'Fuel allowance', 'Weekly off', 'Free uniform'],
      description: 'Deliver packages to customers in the Koramangala / HSR Layout zone. Typical day covers 25–35 stops.',
      urgent: true,
      posted_at: 'today',
      applicants_count: 42,
      openings_count: 5,
      phone: '+919876543210',
      recruiter: { name: 'Priya Sharma', role: 'HR Manager' },
      interview_type: 'Face-to-face',
      apply_by: '30 Apr',
      department: 'Logistics / Fleet Operations',
      role_category: 'Last-mile Delivery',
      english_level: 'Basic conversational',
      gender_preference: 'Any gender',
      skills: ['Two-wheeler handling', 'Navigation apps', 'Customer-facing communication'],
      degree_specialisation: 'No specific requirement',
      responsibilities: [
        'Pick up parcels from the Delhivery hub each morning',
        'Deliver 25–35 packages across Koramangala / HSR Layout',
        'Update delivery status in the rider app',
        'Handle cash-on-delivery collection',
      ],
      similar_jobs: [
        { title: 'Delivery Executive', company: 'Zomato', location: 'Indiranagar, Bangalore', pay: '₹20,000 – ₹26,000 /month', chips: ['Field job', 'Full-time'] },
        { title: 'Rider', company: 'Dunzo', location: 'HSR Layout, Bangalore', pay: '₹21,000 – ₹27,000 /month', chips: ['Field job', 'Flexible'] },
      ],
      actions: ['apply', 'save', 'dismiss'],
    },
    {
      job_id: makeId('job'),
      title: 'Warehouse Packer',
      company: {
        name: 'Amazon India',
        logo_url: '',
        verified: true,
        about: 'Amazon India operates a nation-wide fulfilment network across 15+ cities, handling millions of packages a day.',
      },
      location: {
        name: 'Vikhroli, Mumbai',
        distance_km: 8.6,
        full_address: 'Amazon FC, Vikhroli West, Mumbai 400079',
      },
      pay: { min: '₹18,000', max: '₹22,000', period: 'month' },
      incentive: 'Shift bonus of up to ₹2,500/month',
      timing: '7am – 4pm',
      job_type: 'Full-time',
      work_type: 'On-site',
      shift: 'Day shift',
      education: 'Any (10th pass preferred)',
      experience: 'Freshers welcome',
      languages: ['Hindi', 'English', 'Marathi'],
      requirements: ['Ability to lift up to 20 kg', 'Attention to detail for labelling', 'Willing to work weekend shifts'],
      benefits: ['PF', 'ESI', 'Canteen meals', 'Transport assistance'],
      description: 'Sort, label and pack outgoing customer orders at the Amazon Vikhroli fulfilment centre. 8-hour shifts with scheduled breaks.',
      urgent: false,
      posted_at: '2 days ago',
      applicants_count: 27,
      openings_count: 12,
      phone: '+919876543211',
      recruiter: { name: 'Rohan Desai', role: 'Recruiting Lead' },
      interview_type: 'Telephonic',
      apply_by: '5 May',
      department: 'Warehouse Operations',
      role_category: 'Packing & Sorting',
      english_level: 'Basic',
      gender_preference: 'Any gender',
      skills: ['Package sorting', 'Weight lifting up to 20kg', 'Label reading'],
      degree_specialisation: 'No specific requirement',
      responsibilities: [
        'Sort incoming inventory against the day\'s picklist',
        'Label parcels and confirm shipping labels are scannable',
        'Pack orders to Amazon quality standards',
        'Keep the packing station clean and supplied',
      ],
      similar_jobs: [
        { title: 'Inventory Associate', company: 'Flipkart', location: 'Bhiwandi, Mumbai', pay: '₹17,000 – ₹21,000 /month', chips: ['On-site', 'Full-time'] },
        { title: 'Loader', company: 'BigBasket', location: 'Kandivali, Mumbai', pay: '₹16,000 – ₹20,000 /month', chips: ['On-site', 'Night shift'] },
      ],
      actions: ['apply', 'save', 'dismiss'],
    },
    {
      job_id: makeId('job'),
      title: 'Rider',
      company: {
        name: 'Swiggy',
        logo_url: '',
        verified: true,
        about: 'Swiggy is India\'s leading on-demand delivery platform for food, groceries and essentials.',
      },
      location: {
        name: 'Banjara Hills, Hyderabad',
        distance_km: 2.1,
        full_address: 'Swiggy Rider Hub, Banjara Hills Road No. 12, Hyderabad 500034',
      },
      pay: { min: '₹25,000', max: '₹30,000', period: 'month' },
      incentive: 'Peak-hour & weekend bonuses — top earners make ₹40k+',
      timing: '11am – 11pm (flexible)',
      job_type: 'Full-time',
      work_type: 'Field job',
      shift: 'Flexible',
      education: '10th pass',
      experience: 'Freshers welcome',
      languages: ['Hindi', 'English', 'Telugu'],
      requirements: ['Valid driving licence for 2-wheeler', 'Smartphone running Android 8+', 'Good knowledge of local roads', 'Ability to handle peak-hour orders'],
      benefits: ['Accident insurance', 'Fuel card', 'Flexible hours', 'Referral bonus'],
      description: 'Pick up food orders from restaurant partners and deliver to customers across Banjara Hills and Jubilee Hills. Choose your own hours via the Swiggy partner app.',
      urgent: true,
      posted_at: 'yesterday',
      applicants_count: 89,
      openings_count: 30,
      phone: '+919876543212',
      recruiter: { name: 'Meera Iyer', role: 'Fleet Onboarding' },
      interview_type: 'Walk-in',
      apply_by: '28 Apr',
      department: 'Last-mile Delivery',
      role_category: 'Food / Grocery Rider',
      english_level: 'Basic conversational',
      gender_preference: 'Any gender',
      skills: ['App-based navigation', 'Two-wheeler handling', 'Local route knowledge'],
      degree_specialisation: 'No specific requirement',
      responsibilities: [
        'Accept orders via the Swiggy partner app',
        'Pick up orders from restaurant partners',
        'Deliver within the committed SLA window',
        'Maintain a 4.5+ rider rating',
      ],
      similar_jobs: [
        { title: 'Delivery Partner', company: 'Zomato', location: 'Jubilee Hills, Hyderabad', pay: '₹24,000 – ₹29,000 /month', chips: ['Field job', 'Flexible'] },
        { title: 'Rider', company: 'BigBasket', location: 'Kondapur, Hyderabad', pay: '₹22,000 – ₹27,000 /month', chips: ['Field job', 'Day shift'] },
      ],
      actions: ['apply', 'save', 'dismiss'],
    },
  ]
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
      title: 'KYC onboarding',
      description: 'A few last details before we activate your profile. All fields are required for verification.',
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

// ─── Shift Calendar ────────────────────────────────────────────────
// Trigger: "shifts", "pick shifts", "shift calendar", "my schedule"
registerRule({
  match: /^(shifts|pick (my )?shifts|shift calendar|my schedule|weekly shifts)$/i,
  build: () => ({
    type: 'shift_calendar',
    payload: {
      widget_id: makeId('shiftcal'),
      schedule_id: 'week-2026-04-28',
      title: 'Pick your shifts for next week',
      description: 'Pick at least 3 shifts. You can always add more later.',
      min_shifts: 3,
      max_shifts: 7,
      allow_multi_select: true,
      submit_label: 'Confirm shifts',
      days: [
        { date: '2026-04-28', day_label: 'Mon', date_label: 'Apr 28', shifts: [
          { shift_id: 'mon-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', duration: '5 hrs', pay_estimate: '₹600–800', status: 'available' },
          { shift_id: 'mon-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  duration: '5 hrs', pay_estimate: '₹700–900', status: 'available', capacity_left: 2 },
        ]},
        { date: '2026-04-29', day_label: 'Tue', date_label: 'Apr 29', shifts: [
          { shift_id: 'tue-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'available' },
          { shift_id: 'tue-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'full' },
        ]},
        { date: '2026-04-30', day_label: 'Wed', date_label: 'Apr 30', shifts: [
          { shift_id: 'wed-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'booked' },
          { shift_id: 'wed-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'available' },
        ]},
        { date: '2026-05-01', day_label: 'Thu', date_label: 'May 1', shifts: [
          { shift_id: 'thu-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'available' },
          { shift_id: 'thu-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'available' },
        ]},
        { date: '2026-05-02', day_label: 'Fri', date_label: 'May 2', shifts: [
          { shift_id: 'fri-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹700–900', status: 'available' },
          { shift_id: 'fri-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹900–1,200', status: 'available', capacity_left: 1 },
        ]},
        { date: '2026-05-03', day_label: 'Sat', date_label: 'May 3', shifts: [
          { shift_id: 'sat-all', label: 'All-day', start_time: '10am', end_time: '10pm', duration: '12 hrs', pay_estimate: '₹1,400–1,800', status: 'available' },
        ]},
        { date: '2026-05-04', day_label: 'Sun', date_label: 'May 4', shifts: [
          { shift_id: 'sun-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹800–1,000', status: 'available' },
        ]},
      ],
      silent: false,
    },
  }),
})

// ─── Carousel — composed widgets (job cards in a rail) ────────────
// Trigger: "job picks", "recommended jobs", "pick a role"
// Demonstrates the CSV-spec item composition (carousel of job_cards).
// Uses the same richJobs() dataset as the standalone JobCard rule so
// the two presentations show identical data.
registerRule({
  match: /^(job picks|recommended jobs|pick a role|jobs for me|matching jobs)$/i,
  build: () => ({
    type: 'carousel',
    payload: {
      widget_id: makeId('carousel'),
      carousel_id: 'matched-jobs',
      title: 'Jobs matched for you',
      description: 'Swipe to compare — tap Apply on any card to proceed.',
      tone: 'info',
      items: richJobs().map((job) => ({
        type: 'job_card',
        payload: { widget_id: makeId('jc'), ...job },
      })),
      silent: false,
    },
  }),
})

// ─── Carousel — onboarding tips (inline tile variant) ─────────────
// Trigger: "tips", "featured", "carousel"
registerRule({
  match: /^(tips|featured|carousel|show tips|onboarding tips)$/i,
  build: () => ({
    type: 'carousel',
    payload: {
      widget_id: makeId('carousel'),
      carousel_id: 'onboarding-tips',
      title: 'Tips to get started',
      description: 'Swipe through these before your first shift.',
      tone: 'info',
      items: [
        {
          item_id: 'helmet',
          accent_label: 'Safety',
          title: 'Always wear your helmet',
          subtitle: 'No exceptions, any shift',
          description: 'Our accident insurance requires a helmet on every trip. Check the strap before you start.',
          cta_label: 'Learn more',
          tone: 'warn',
        },
        {
          item_id: 'fuel',
          accent_label: 'Logistics',
          title: 'Top up fuel early',
          subtitle: 'Before the peak hours',
          description: 'Peak-hour queues at pumps can kill 20 minutes. Fill up before 11 am to keep earnings steady.',
          cta_label: 'Find nearby pumps',
          tone: 'info',
        },
        {
          item_id: 'earnings',
          accent_label: 'Earnings',
          title: 'Ravi earned ₹45k last month',
          subtitle: 'Across 28 days',
          description: 'Consistent 9-hour shifts + weekend bonuses stacked up. Check his weekly breakdown for tips.',
          cta_label: 'See breakdown',
          tone: 'success',
        },
        {
          item_id: 'app',
          accent_label: 'App',
          title: 'Turn on trip notifications',
          subtitle: 'Never miss an order',
          description: 'Allow Swiggy app notifications so you hear new orders even with the screen off.',
          cta_label: 'Open settings',
          tone: 'learning',
        },
      ],
      silent: false,
    },
  }),
})

// ─── Validated Input — OTP variant ────────────────────────────────
// Trigger: "otp", "verify", "verification code"
registerRule({
  match: /^(otp|verify( otp)?|verification code|enter code)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'otp',
      title: 'Enter the verification code',
      description: 'We sent a 6-digit code to +91 98765 43210.',
      input_type: 'otp',
      max_length: 6,
      submit_label: 'Verify',
      resend: { label: 'Didn\'t get it?', cooldown_seconds: 30 },
      silent: false,
    },
  }),
})

// ─── Validated Input — PAN variant ────────────────────────────────
// Trigger: "pan", "enter pan", "pan card"
registerRule({
  match: /^(pan( card)?|enter pan)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'pan',
      title: 'Enter your PAN',
      description: 'Needed for tax-compliant weekly payouts.',
      input_type: 'pan',
      label: 'PAN number',
      placeholder: 'ABCDE1234F',
      helper_text: '10 characters — 5 letters, 4 digits, 1 letter.',
      submit_label: 'Submit PAN',
      silent: false,
    },
  }),
})

// ─── Validated Input — Pincode variant ────────────────────────────
// Trigger: "pincode", "enter pincode"
registerRule({
  match: /^(pincode|enter pincode|zip)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'pincode',
      title: 'What\'s your home pincode?',
      description: 'We\'ll match you with jobs in your area.',
      input_type: 'pincode',
      label: 'Pincode',
      placeholder: '560095',
      submit_label: 'Find nearby jobs',
      silent: false,
    },
  }),
})

// ─── Validated Input — Phone variant ──────────────────────────────
// Trigger: "phone", "enter phone", "mobile", "phone number"
registerRule({
  match: /^(phone( number)?|enter phone|mobile( number)?|my number)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'phone',
      title: 'Enter your mobile number',
      description: 'We\'ll send an OTP to verify.',
      input_type: 'phone',
      label: 'Mobile number',
      prefix: '+91 ',
      placeholder: '98765 43210',
      submit_label: 'Send OTP',
      silent: false,
    },
  }),
})

// ─── Validated Input — Email variant ──────────────────────────────
// Trigger: "email", "enter email"
registerRule({
  match: /^(email|enter email|email address|my email)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'email',
      title: 'Confirm your email',
      description: 'Payslips and receipts go here.',
      input_type: 'email',
      label: 'Email address',
      placeholder: 'priya@example.com',
      submit_label: 'Confirm',
      silent: false,
    },
  }),
})

// ─── Validated Input — Aadhaar variant ────────────────────────────
// Trigger: "aadhaar number", "enter aadhaar" (the plain "aadhaar"
// keyword is already claimed by Image Capture)
registerRule({
  match: /^(aadhaar number|enter aadhaar|aadhaar card number|aadhar number)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'aadhaar',
      title: 'Enter your Aadhaar number',
      description: '12 digits — auto-formatted with spaces as you type.',
      input_type: 'aadhaar',
      label: 'Aadhaar number',
      placeholder: '1234 5678 9012',
      submit_label: 'Verify Aadhaar',
      silent: false,
    },
  }),
})

// ─── Validated Input — Bank account variant ───────────────────────
// Trigger: "bank account", "account number"
registerRule({
  match: /^(bank account( number)?|account number|bank details)$/i,
  build: () => ({
    type: 'validated_input',
    payload: {
      widget_id: makeId('validated'),
      field_id: 'bank_account',
      title: 'Enter your bank account number',
      description: 'For weekly payouts. We verify with a tiny test credit.',
      input_type: 'bank_account',
      label: 'Account number',
      placeholder: '9–18 digits',
      helper_text: 'We\'ll also ask for your IFSC code next.',
      submit_label: 'Submit account',
      silent: false,
    },
  }),
})

// ─── Rating — stars variant ───────────────────────────────────────
// Trigger: "rate", "rating", "feedback", "how was your shift"
registerRule({
  match: /^(rate|rating|feedback|how was (your|my|the) shift)$/i,
  build: () => ({
    type: 'rating',
    payload: {
      widget_id: makeId('rating'),
      rating_id: 'shift-experience',
      title: 'How was your shift?',
      description: 'Your rating helps us improve and stays anonymous.',
      variant: 'stars',
      scale: 5,
      labels: ['Poor', 'Excellent'],
      allow_comment: true,
      comment_placeholder: 'Anything we should know? (optional)',
      require_comment_below: 3,
      submit_label: 'Submit feedback',
      silent: false,
    },
  }),
})

// ─── Rating — thumbs variant ──────────────────────────────────────
// Trigger: "thumbs", "rate delivery"
registerRule({
  match: /^(thumbs|rate delivery|delivery feedback)$/i,
  build: () => ({
    type: 'rating',
    payload: {
      widget_id: makeId('rating'),
      rating_id: 'delivery-feedback',
      title: 'Was this delivery on time?',
      description: 'One tap and you\'re done.',
      variant: 'thumbs',
      allow_comment: false,
      submit_label: 'Submit',
      silent: false,
    },
  }),
})

// ─── Rating — emoji variant ──────────────────────────────────────
// Trigger: "emoji rating", "rate training"
registerRule({
  match: /^(emoji rating|rate training|training feedback)$/i,
  build: () => ({
    type: 'rating',
    payload: {
      widget_id: makeId('rating'),
      rating_id: 'training-feedback',
      title: 'How was the training module?',
      description: 'Your rating helps us improve the content.',
      variant: 'emoji',
      allow_comment: true,
      comment_placeholder: 'What could be better?',
      require_comment_below: 3,
      submit_label: 'Submit feedback',
      silent: false,
    },
  }),
})

// ─── Rating — NPS variant ────────────────────────────────────────
// Trigger: "nps", "recommend"
registerRule({
  match: /^(nps|recommend|recommend us|would you recommend)$/i,
  build: () => ({
    type: 'rating',
    payload: {
      widget_id: makeId('rating'),
      rating_id: 'nps-q1',
      title: 'Would you recommend BetterPlace to a friend?',
      description: 'Pick a number from 0 to 10.',
      variant: 'nps',
      allow_comment: true,
      comment_placeholder: 'Tell us why (optional)',
      submit_label: 'Submit',
      silent: false,
    },
  }),
})

// ─── Instruction Card ─────────────────────────────────────────────
// Trigger: "how to", "guide", "instructions", "how to capture"
registerRule({
  match: /^(how to|guide|instructions|tutorial|tips)( capture| upload| take)?( aadhaar| photo)?$/i,
  build: () => ({
    type: 'instruction_card',
    payload: {
      widget_id: makeId('instr'),
      instruction_id: 'aadhaar-capture-guide',
      title: 'How to capture your Aadhaar',
      description: 'Follow these three steps for a clear, readable photo.',
      tone: 'info',
      require_acknowledgement: true,
      acknowledge_label: 'Got it',
      steps: [
        { step_id: 'flat',  label: 'Place the card on a flat surface', description: 'A plain table works best — avoid patterned backgrounds that confuse the edge detection.' },
        { step_id: 'frame', label: 'Fill the frame',                  description: 'All four corners of the card should be visible. Don\'t crop any edges.' },
        { step_id: 'light', label: 'Watch for glare',                 description: 'Move the card around if light reflects off the laminate. No shadows across the text.' },
      ],
      silent: false,
    },
  }),
})

// ─── Checklist — read-only progress readout ───────────────────────
// Trigger: "my progress", "progress", "status", "my status"
// Matched BEFORE the interactive checklist so "progress" alone
// hits the read-only variant, not the interactive one.
registerRule({
  match: /^(my )?progress$|^(my )?status$|^(onboarding )?progress$/i,
  build: () => ({
    type: 'checklist',
    payload: {
      widget_id: makeId('checklist'),
      checklist_id: 'onboarding-status',
      title: 'Onboarding progress',
      description: 'Here\'s where you are right now.',
      read_only: true,
      items: [
        { item_id: 'aadhaar',  label: 'Submit Aadhaar card',      description: 'Front and back photos',       status: 'completed' },
        { item_id: 'dl',       label: 'Upload driver\'s licence', description: 'PDF or photo, both sides',    status: 'completed' },
        { item_id: 'training', label: 'Complete safety training', description: '5-minute video',              status: 'pending',
          due: { label: 'Due in 2 days', tone: 'soon' } },
        { item_id: 'bank',     label: 'Add bank details',         description: 'For weekly payouts',          status: 'pending',
          due: { label: 'Overdue · submit today', tone: 'overdue' } },
        { item_id: 'uniform',  label: 'Pick uniform size',        description: 'Collected from the hub',      status: 'skipped' },
      ],
      silent: false,
    },
  }),
})

// ─── Checklist — interactive to-do list ───────────────────────────
// Trigger: "checklist", "onboarding", "todo", "to do list"
registerRule({
  match: /^(checklist|to ?do( list)?|onboarding( checklist)?|tasks)$/i,
  build: () => ({
    type: 'checklist',
    payload: {
      widget_id: makeId('checklist'),
      checklist_id: 'onboarding-basic',
      title: 'Complete your onboarding',
      description: 'Finish these four steps to start your first shift.',
      require_all: true,
      allow_skip: false,
      items: [
        { item_id: 'aadhaar',  label: 'Submit Aadhaar card',     description: 'Front and back photos',        status: 'pending' },
        { item_id: 'dl',       label: 'Upload driver\'s licence', description: 'PDF or photo, both sides',     status: 'pending' },
        { item_id: 'training', label: 'Complete safety training',description: '5-minute video',               status: 'pending' },
        { item_id: 'bank',     label: 'Add bank details',        description: 'For weekly payouts',           status: 'pending' },
      ],
      silent: false,
    },
  }),
})

// ─── QC Evidence Review (task photo + AI annotations — CSV #20) ──
// Trigger: "qc", "qc review", "shelf photo"
registerRule({
  match: /^(qc|qc review|shelf photo|task photo|task qc)$/i,
  build: () => ({
    type: 'qc_evidence_review',
    payload: {
      widget_id: makeId('qcev'),
      submission_id: 'sub-okaygo-782',
      title: 'Shelf arrangement — 3rd aisle',
      description: 'Task ID #782 · OkayGo merchandising · submitted 12 min ago',
      image_url: '',
      overall_verdict: 'borderline',
      confidence: 0.78,
      mode: 'admin',
      actions: ['approve', 'reject', 'resubmit'],
      annotations: [
        { region: { x: 0.08, y: 0.12, w: 0.38, h: 0.60 }, label: 'Top shelf',  verdict: 'pass' },
        { region: { x: 0.50, y: 0.20, w: 0.30, h: 0.45 }, label: 'Signage',    verdict: 'partial' },
        { region: { x: 0.10, y: 0.74, w: 0.78, h: 0.20 }, label: 'Bottom row', verdict: 'fail' },
      ],
      criteria: [
        { name: 'Location match',     verdict: 'pass',    reasoning: 'GPS fix within 12 m of the assigned outlet. Photo timestamp matches the shift window.' },
        { name: 'Shelf arrangement',  verdict: 'fail',    reasoning: 'Bottom row products not aligned to the planogram. Gaps visible between SKU clusters. Expected continuous facing.' },
        { name: 'Product visibility', verdict: 'pass',    reasoning: 'All tracked SKUs visible in the top shelf region with labels facing outward.' },
        { name: 'Signage',            verdict: 'partial', reasoning: 'Promotion tag visible but angled away from the aisle — readability from shopper position is reduced.' },
      ],
      silent: false,
    },
  }),
})

// ─── Evidence Review (candidate onboarding — multi-item) ─────────
// Trigger: "evidence review", "review evidence", "review docs"
// For task-photo QC with AI annotations, type `qc review` instead.
registerRule({
  match: /^(evidence( review)?|review evidence|review (my )?(submission|docs?))$/i,
  build: () => ({
    type: 'evidence_review',
    payload: {
      widget_id: makeId('ev'),
      candidate: { name: 'Ravi Kumar', id: 'cand-123' },
      submission: { id: 'sub-456', submitted_at: Date.now() - 2 * 60 * 60 * 1000 },
      allow_bulk_approve: true,
      items: [
        { item_id: 'aadhaar_front', label: 'Aadhaar (front)',   type: 'image', url: '', size_bytes: 312000, status: 'pending' },
        { item_id: 'aadhaar_back',  label: 'Aadhaar (back)',    type: 'image', url: '', size_bytes: 288000, status: 'pending' },
        { item_id: 'drivers_licence', label: 'Driver\'s licence', type: 'pdf',   url: '', pages: 2, size_bytes: 245000, status: 'pending' },
        { item_id: 'selfie',        label: 'Verification selfie', type: 'image', url: '', size_bytes: 410000, status: 'pending' },
      ],
      silent: false,
    },
  }),
})

// ─── Document Preview ──────────────────────────────────────────────
// Trigger: "offer letter", "show offer", "document preview",
// "my offer", "view contract", "show payslip"
// Matched before File Upload so verbs like "show" / "view" don't
// accidentally hit the upload regex.
registerRule({
  match: /^(show |preview |view |my )?(offer ?letter|contract|payslip|document preview|doc preview)$|^(document|doc) ?preview$/i,
  build: () => ({
    type: 'document_preview',
    payload: {
      widget_id: makeId('doc'),
      document_id: 'offer-letter-delhivery-v1',
      title: 'Offer Letter',
      description: 'Delivery Associate · Delhivery · Bangalore',
      document: {
        name: 'offer_letter_delhivery.pdf',
        type: 'application/pdf',
        size_bytes: 245760,
        url: '',
        thumbnail_url: null,
        pages: 3,
        modified_at: '2026-04-24T10:30:00Z',
      },
      actions: ['view', 'download'],
      status: 'pending_review',
      require_acknowledgement: true,
      silent: false,
    },
  }),
})

// ─── File Upload ───────────────────────────────────────────────────
// Trigger: "upload file", "attach doc", "file upload", "upload pdf"
// Must be matched before Image Capture so the keywords "file"/"doc"/
// "pdf" don't get swallowed by the image-capture trigger.
registerRule({
  match: /^(upload|attach|send)\s+(a |the |your )?(file|doc|docs|document|pdf)|^(file|doc) ?upload$/i,
  build: () => ({
    type: 'file_upload',
    payload: {
      widget_id: makeId('upload'),
      instruction_id: 'drivers_licence',
      title: 'Upload your driver\'s licence',
      description: 'PDF or image scan. Make sure both sides are included.',
      accept: 'image/*,application/pdf',
      max_files: 2,
      max_size_mb: 10,
      guidelines: [
        'Clear, unedited scan or photo',
        'Both sides if your card is two-sided',
        'PDF preferred for multi-page documents',
      ],
      required: true,
      silent: false,
    },
  }),
})

// ─── Image Capture — document variant (rectangular overlay) ───────
// Trigger: "aadhaar", "pan", "licence", "document", "capture aadhaar"
registerRule({
  match: /^(take |capture |upload )?(aadhaar|pan|photo|licence|license|image|document)$/i,
  build: () => ({
    type: 'image_capture',
    payload: {
      widget_id: makeId('imgcap'),
      instruction_id: 'aadhaar_front',
      title: 'Capture Aadhaar (front side)',
      description:
        'Hold the card flat and fill the frame. Make sure all 4 corners '
        + 'are visible and the text is readable.',
      capture_type: 'document',
      overlay_guide: true,
      guidelines: [
        'All 4 corners of the card visible',
        'No glare or shadow on the text',
        'Text clearly readable',
      ],
      required: true,
      silent: false,
    },
  }),
})

// ─── Image Capture — selfie variant (circular overlay, front cam) ─
// Trigger: "selfie", "kyc selfie", "verification selfie"
registerRule({
  match: /^(selfie|kyc selfie|verification selfie|liveness)$/i,
  build: () => ({
    type: 'image_capture',
    payload: {
      widget_id: makeId('imgcap'),
      instruction_id: 'kyc_selfie',
      title: 'KYC selfie',
      description: 'Hold the phone at eye level, face centered in the circle. Good lighting on your face.',
      capture_type: 'selfie',
      overlay_guide: true,
      require_face_detection: true,
      guidelines: [
        'Face clearly visible',
        'No masks, hats, or sunglasses',
        'Neutral expression',
      ],
      required: true,
      silent: false,
    },
  }),
})

// ─── Image Capture — evidence variant (crosshair, rear cam) ──────
// Trigger: "task evidence", "shift evidence", "delivery photo"
registerRule({
  match: /^(task evidence|shift evidence|delivery photo|evidence photo|work photo)$/i,
  build: () => ({
    type: 'image_capture',
    payload: {
      widget_id: makeId('imgcap'),
      instruction_id: 'delivery_proof',
      title: 'Proof-of-delivery photo',
      description: 'Capture the package at the drop-off location. Include the door number if possible.',
      capture_type: 'evidence',
      overlay_guide: true,
      guidelines: [
        'Package visible',
        'Door number or landmark in frame',
        'Good lighting',
      ],
      required: true,
      silent: false,
    },
  }),
})

// ─── Job Card — single card ────────────────────────────────────────
// Trigger: "job card", "show job card", "show job", "job"
registerRule({
  match: /^(show )?job(s)? ?card$|^(show )?job$/i,
  build: () => ({
    type: 'job_card',
    payload: {
      widget_id: makeId('jc'),
      job_id: 'job-delivery-associate-blr',
      title: 'Delivery Associate',
      company: {
        name: 'Delhivery',
        logo_url: '',
        verified: true,
        about:
          'Delhivery is one of India\'s largest fully-integrated logistics '
          + 'companies, moving over 2 billion shipments a year across 18,700+ '
          + 'pin codes. Riders at Delhivery handle last-mile delivery for '
          + 'e-commerce and hyperlocal partners.',
      },
      location: {
        name: 'Koramangala, Bangalore',
        distance_km: 4.2,
        full_address: 'Delhivery Hub, Koramangala 5th Block, Bangalore 560095',
      },
      pay: { min: '₹22,000', max: '₹28,000', period: 'month' },
      incentive: 'Earn up to ₹5,000 in weekly incentives',
      timing: '9am – 6pm',
      job_type: 'Full-time',
      work_type: 'Field job',
      shift: 'Day shift',
      education: '10th pass',
      experience: '1+ year preferred',
      languages: ['Hindi', 'English'],
      requirements: [
        'Valid 2-wheeler driving licence',
        'Own bike in good condition',
        'Smartphone with data plan',
        'Comfortable riding in Bangalore traffic',
      ],
      benefits: ['PF', 'Fuel allowance', 'Weekly off', 'Free uniform'],
      description:
        'Deliver packages to customers in the Koramangala / HSR Layout zone. '
        + 'Pick-ups at the Delhivery hub every morning, drop-offs throughout '
        + 'the day. Typical day covers 25–35 stops. Training on the Delhivery '
        + 'rider app provided.',
      urgent: true,
      posted_at: 'today',
      applicants_count: 42,
      openings_count: 5,
      phone: '+919876543210',
      recruiter: { name: 'Priya Sharma', role: 'HR Manager' },
      interview_type: 'Face-to-face',
      apply_by: '30 Apr',
      department: 'Logistics / Fleet Operations',
      role_category: 'Last-mile Delivery',
      english_level: 'Basic conversational',
      gender_preference: 'Any gender',
      skills: ['Two-wheeler handling', 'Navigation apps (Maps)', 'Customer-facing communication'],
      degree_specialisation: 'No specific requirement',
      responsibilities: [
        'Pick up parcels from the Delhivery hub at the start of each shift',
        'Deliver 25–35 packages to customers across the assigned zone',
        'Update delivery status in the Delhivery rider app',
        'Handle cash-on-delivery collection where applicable',
        'Coordinate with the hub team for re-attempts and returns',
      ],
      similar_jobs: [
        {
          title: 'Delivery Executive',
          company: 'Zomato',
          location: 'Indiranagar, Bangalore',
          pay: '₹20,000 – ₹26,000 /month',
          chips: ['Field job', 'Full-time'],
        },
        {
          title: 'Rider',
          company: 'Swiggy',
          location: 'Banjara Hills, Hyderabad',
          pay: '₹25,000 – ₹30,000 /month',
          chips: ['Field job', 'Flexible'],
        },
      ],
      actions: ['apply', 'save', 'dismiss'],
      silent: false,
    },
  }),
})

// ─── Job Card — carousel ───────────────────────────────────────────
// Trigger: "jobs", "show jobs", "show carousel", "job carousel", etc.
// Uses the shared richJobs() dataset so the standalone JobCard
// carousel and the generic Carousel-of-job_cards show identical
// data.
registerRule({
  match: /^(show )?(jobs?|carousel)/i,
  build: () => ({
    type: 'job_card',
    payload: {
      widget_id: makeId('jc'),
      silent: false,
      items: richJobs(),
    },
  }),
})

/* ─── __unused_legacy_jobs — remove me ─────────────────────────────
   Old inline job list, kept out of the module flow. Next edit trims
   the block entirely. */
const _UNUSED_OLD_JOBS = {
  items: [
        {
          job_id: makeId('job'),
          title: 'Delivery Associate',
          company: {
            name: 'Delhivery',
            logo_url: '',
            verified: true,
            about: 'Delhivery is one of India\'s largest logistics companies, moving over 2 billion shipments a year across 18,700+ pin codes.',
          },
          location: {
            name: 'Koramangala, Bangalore',
            distance_km: 4.2,
            full_address: 'Delhivery Hub, Koramangala 5th Block, Bangalore 560095',
          },
          pay: { min: '₹22,000', max: '₹28,000', period: 'month' },
          incentive: 'Earn up to ₹5,000 in weekly incentives',
          timing: '9am – 6pm',
          job_type: 'Full-time',
          work_type: 'Field job',
          shift: 'Day shift',
          education: '10th pass',
          experience: '1+ year preferred',
          languages: ['Hindi', 'English'],
          requirements: [
            'Valid 2-wheeler driving licence',
            'Own bike in good condition',
            'Smartphone with data plan',
          ],
          benefits: ['PF', 'Fuel allowance', 'Weekly off', 'Free uniform'],
          description: 'Deliver packages to customers in the Koramangala / HSR Layout zone. Typical day covers 25–35 stops.',
          urgent: true,
          posted_at: 'today',
          applicants_count: 42,
          openings_count: 5,
          phone: '+919876543210',
          recruiter: { name: 'Priya Sharma', role: 'HR Manager' },
          interview_type: 'Face-to-face',
          apply_by: '30 Apr',
          department: 'Logistics / Fleet Operations',
          role_category: 'Last-mile Delivery',
          english_level: 'Basic conversational',
          gender_preference: 'Any gender',
          skills: ['Two-wheeler handling', 'Navigation apps', 'Customer-facing communication'],
          degree_specialisation: 'No specific requirement',
          responsibilities: [
            'Pick up parcels from the Delhivery hub each morning',
            'Deliver 25–35 packages across Koramangala / HSR Layout',
            'Update delivery status in the rider app',
            'Handle cash-on-delivery collection',
          ],
          similar_jobs: [
            { title: 'Delivery Executive', company: 'Zomato', location: 'Indiranagar, Bangalore', pay: '₹20,000 – ₹26,000 /month', chips: ['Field job', 'Full-time'] },
            { title: 'Rider', company: 'Dunzo', location: 'HSR Layout, Bangalore', pay: '₹21,000 – ₹27,000 /month', chips: ['Field job', 'Flexible'] },
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: makeId('job'),
          title: 'Warehouse Packer',
          company: {
            name: 'Amazon India',
            logo_url: '',
            verified: true,
            about: 'Amazon India operates a nation-wide fulfilment network across 15+ cities, handling millions of packages a day.',
          },
          location: {
            name: 'Vikhroli, Mumbai',
            distance_km: 8.6,
            full_address: 'Amazon FC, Vikhroli West, Mumbai 400079',
          },
          pay: { min: '₹18,000', max: '₹22,000', period: 'month' },
          incentive: 'Shift bonus of up to ₹2,500/month',
          timing: '7am – 4pm',
          job_type: 'Full-time',
          work_type: 'On-site',
          shift: 'Day shift',
          education: 'Any (10th pass preferred)',
          experience: 'Freshers welcome',
          languages: ['Hindi', 'English', 'Marathi'],
          requirements: [
            'Ability to lift up to 20 kg',
            'Attention to detail for labelling',
            'Willing to work weekend shifts',
          ],
          benefits: ['PF', 'ESI', 'Canteen meals', 'Transport assistance'],
          description: 'Sort, label and pack outgoing customer orders at the Amazon Vikhroli fulfilment centre. 8-hour shifts with scheduled breaks.',
          urgent: false,
          posted_at: '2 days ago',
          applicants_count: 27,
          openings_count: 12,
          phone: '+919876543211',
          recruiter: { name: 'Rohan Desai', role: 'Recruiting Lead' },
          interview_type: 'Telephonic',
          apply_by: '5 May',
          department: 'Warehouse Operations',
          role_category: 'Packing & Sorting',
          english_level: 'Basic',
          gender_preference: 'Any gender',
          skills: ['Package sorting', 'Weight lifting up to 20kg', 'Label reading'],
          degree_specialisation: 'No specific requirement',
          responsibilities: [
            'Sort incoming inventory against the day\'s picklist',
            'Label parcels and confirm shipping labels are scannable',
            'Pack orders to Amazon quality standards',
            'Keep the packing station clean and supplied',
          ],
          similar_jobs: [
            { title: 'Inventory Associate', company: 'Flipkart', location: 'Bhiwandi, Mumbai', pay: '₹17,000 – ₹21,000 /month', chips: ['On-site', 'Full-time'] },
            { title: 'Loader', company: 'BigBasket', location: 'Kandivali, Mumbai', pay: '₹16,000 – ₹20,000 /month', chips: ['On-site', 'Night shift'] },
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: makeId('job'),
          title: 'Rider',
          company: {
            name: 'Swiggy',
            logo_url: '',
            verified: true,
            about: 'Swiggy is India\'s leading on-demand delivery platform for food, groceries and essentials.',
          },
          location: {
            name: 'Banjara Hills, Hyderabad',
            distance_km: 2.1,
            full_address: 'Swiggy Rider Hub, Banjara Hills Road No. 12, Hyderabad 500034',
          },
          pay: { min: '₹25,000', max: '₹30,000', period: 'month' },
          incentive: 'Peak-hour & weekend bonuses — top earners make ₹40k+',
          timing: '11am – 11pm (flexible)',
          job_type: 'Full-time',
          work_type: 'Field job',
          shift: 'Flexible',
          education: '10th pass',
          experience: 'Freshers welcome',
          languages: ['Hindi', 'English', 'Telugu'],
          requirements: [
            'Valid driving licence for 2-wheeler',
            'Smartphone running Android 8+',
            'Good knowledge of local roads',
            'Ability to handle peak-hour orders',
          ],
          benefits: ['Accident insurance', 'Fuel card', 'Flexible hours', 'Referral bonus'],
          description: 'Pick up food orders from restaurant partners and deliver to customers across Banjara Hills and Jubilee Hills. Choose your own hours via the Swiggy partner app.',
          urgent: true,
          posted_at: 'yesterday',
          applicants_count: 89,
          openings_count: 30,
          phone: '+919876543212',
          recruiter: { name: 'Meera Iyer', role: 'Fleet Onboarding' },
          interview_type: 'Walk-in',
          apply_by: '28 Apr',
          department: 'Last-mile Delivery',
          role_category: 'Food / Grocery Rider',
          english_level: 'Basic conversational',
          gender_preference: 'Any gender',
          skills: ['App-based navigation', 'Two-wheeler handling', 'Local route knowledge'],
          degree_specialisation: 'No specific requirement',
          responsibilities: [
            'Accept orders via the Swiggy partner app',
            'Pick up orders from restaurant partners',
            'Deliver within the committed SLA window',
            'Maintain a 4.5+ rider rating',
          ],
          similar_jobs: [
            { title: 'Delivery Partner', company: 'Zomato', location: 'Jubilee Hills, Hyderabad', pay: '₹24,000 – ₹29,000 /month', chips: ['Field job', 'Flexible'] },
            { title: 'Rider', company: 'BigBasket', location: 'Kondapur, Hyderabad', pay: '₹22,000 – ₹27,000 /month', chips: ['Field job', 'Day shift'] },
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
      ],
}
void _UNUSED_OLD_JOBS  // suppress "unused" warnings; remove in a cleanup pass
/* ─── end __unused_legacy_jobs ─────────────────────────────────── */

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
