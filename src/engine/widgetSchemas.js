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
          english_level: 'Basic conversational',
          gender_preference: 'Any gender',
          skills: ['Two-wheeler handling', 'Navigation apps', 'Customer-facing communication'],
          degree_specialisation: 'No specific requirement',
          department: 'Logistics / Fleet Operations',
          role_category: 'Last-mile Delivery',
          interview_type: 'Face-to-face',
          apply_by: '30 Apr',
          urgent: true,
          posted_at: 'today',
          applicants_count: 42,
          openings_count: 5,
          phone: '+919876543210',
          recruiter: { name: 'Priya Sharma', role: 'HR Manager' },
          requirements: [
            'Valid 2-wheeler driving licence',
            'Own bike in good condition',
            'Smartphone with data plan',
          ],
          responsibilities: [
            'Pick up parcels from the Delhivery hub each morning',
            'Deliver 25–35 packages across Koramangala / HSR Layout',
            'Update delivery status in the rider app',
            'Handle cash-on-delivery collection',
          ],
          benefits: ['PF', 'Fuel allowance', 'Weekly off', 'Free uniform'],
          description: 'Deliver packages to customers in the Koramangala / HSR Layout zone. Typical day covers 25–35 stops.',
          similar_jobs: [
            { title: 'Delivery Executive', company: 'Zomato', location: 'Indiranagar, Bangalore', pay: '₹20,000 – ₹26,000 /month', chips: ['Field job', 'Full-time'] },
            { title: 'Rider', company: 'Dunzo', location: 'HSR Layout, Bangalore', pay: '₹21,000 – ₹27,000 /month', chips: ['Field job', 'Flexible'] },
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: 'job-warehouse-packer-mum',
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
          english_level: 'Basic',
          gender_preference: 'Any gender',
          skills: ['Package sorting', 'Weight lifting up to 20kg', 'Label reading'],
          degree_specialisation: 'No specific requirement',
          department: 'Warehouse Operations',
          role_category: 'Packing & Sorting',
          interview_type: 'Telephonic',
          apply_by: '5 May',
          urgent: false,
          posted_at: '2 days ago',
          applicants_count: 27,
          openings_count: 12,
          phone: '+919876543211',
          recruiter: { name: 'Rohan Desai', role: 'Recruiting Lead' },
          requirements: [
            'Ability to lift up to 20 kg',
            'Attention to detail for labelling',
            'Willing to work weekend shifts',
          ],
          responsibilities: [
            'Sort incoming inventory against the day\'s picklist',
            'Label parcels and confirm shipping labels are scannable',
            'Pack orders to Amazon quality standards',
            'Keep the packing station clean and supplied',
          ],
          benefits: ['PF', 'ESI', 'Canteen meals', 'Transport assistance'],
          description: 'Sort, label and pack outgoing customer orders at the Amazon Vikhroli fulfilment centre. 8-hour shifts with scheduled breaks.',
          similar_jobs: [
            { title: 'Inventory Associate', company: 'Flipkart', location: 'Bhiwandi, Mumbai', pay: '₹17,000 – ₹21,000 /month', chips: ['On-site', 'Full-time'] },
            { title: 'Loader', company: 'BigBasket', location: 'Kandivali, Mumbai', pay: '₹16,000 – ₹20,000 /month', chips: ['On-site', 'Night shift'] },
          ],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: 'job-rider-hyd',
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
          english_level: 'Basic conversational',
          gender_preference: 'Any gender',
          skills: ['App-based navigation', 'Two-wheeler handling', 'Local route knowledge'],
          degree_specialisation: 'No specific requirement',
          department: 'Last-mile Delivery',
          role_category: 'Food / Grocery Rider',
          interview_type: 'Walk-in',
          apply_by: '28 Apr',
          urgent: true,
          posted_at: 'yesterday',
          applicants_count: 89,
          openings_count: 30,
          phone: '+919876543212',
          recruiter: { name: 'Meera Iyer', role: 'Fleet Onboarding' },
          requirements: [
            'Valid driving licence for 2-wheeler',
            'Smartphone running Android 8+',
            'Good knowledge of local roads',
            'Ability to handle peak-hour orders',
          ],
          responsibilities: [
            'Accept orders via the Swiggy partner app',
            'Pick up orders from restaurant partners',
            'Deliver within the committed SLA window',
            'Maintain a 4.5+ rider rating',
          ],
          benefits: ['Accident insurance', 'Fuel card', 'Flexible hours', 'Referral bonus'],
          description: 'Pick up food orders from restaurant partners and deliver to customers across Banjara Hills and Jubilee Hills. Choose your own hours via the Swiggy partner app.',
          similar_jobs: [
            { title: 'Delivery Partner', company: 'Zomato', location: 'Jubilee Hills, Hyderabad', pay: '₹24,000 – ₹29,000 /month', chips: ['Field job', 'Flexible'] },
            { title: 'Rider', company: 'BigBasket', location: 'Kondapur, Hyderabad', pay: '₹22,000 – ₹27,000 /month', chips: ['Field job', 'Day shift'] },
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
  image_capture: {
    label: 'Image Capture (live camera)',
    /*  Live getUserMedia camera capture — no gallery / file picker.
     *  capture_type ∈ 'document' | 'selfie' | 'evidence' drives the
     *  overlay guide (rect with corner brackets / dashed circle /
     *  crosshair) and which camera to request (rear vs front). */
    examplePayload: {
      widget_id: 'imgcap-example-1',
      instruction_id: 'aadhaar_front',
      title: 'Capture Aadhaar (front side)',
      description: 'Hold the card flat and fill the frame. Make sure all 4 corners are visible and text is readable.',
      capture_type: 'document',
      overlay_guide: true,
      require_face_detection: false,
      guidelines: [
        'All 4 corners of the card visible',
        'No glare or shadow on the text',
        'Text clearly readable',
      ],
      required: true,
      silent: false,
    },
  },
  file_upload: {
    label: 'File Upload',
    examplePayload: {
      widget_id: 'upload-example-1',
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
  },
  shift_calendar: {
    label: 'Shift Calendar',
    /*  Day-grouped shift picker. Each day lists its shifts; a shift's
     *  `status` controls whether it's interactive:
     *    • 'available' — tappable, starts unselected
     *    • 'selected'  — tappable, starts selected (from payload)
     *    • 'booked'    — already committed, non-interactive (green)
     *    • 'full'      — out of capacity, non-interactive (striped)
     *  `capacity_left` ≤ 3 surfaces a "3 left" amber chip on the row.
     */
    examplePayload: {
      widget_id: 'shiftcal-example-1',
      schedule_id: 'week-2026-04-28',
      title: 'Pick your shifts for next week',
      description: 'Pick at least 3 shifts. You can always add more later.',
      min_shifts: 3,
      max_shifts: 7,
      allow_multi_select: true,
      submit_label: 'Confirm shifts',
      days: [
        {
          date: '2026-04-28', day_label: 'Mon', date_label: 'Apr 28',
          shifts: [
            { shift_id: 'mon-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', duration: '5 hrs', pay_estimate: '₹600–800', status: 'available' },
            { shift_id: 'mon-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  duration: '5 hrs', pay_estimate: '₹700–900', status: 'available', capacity_left: 2 },
          ],
        },
        {
          date: '2026-04-29', day_label: 'Tue', date_label: 'Apr 29',
          shifts: [
            { shift_id: 'tue-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'available' },
            { shift_id: 'tue-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'full' },
          ],
        },
        {
          date: '2026-04-30', day_label: 'Wed', date_label: 'Apr 30',
          shifts: [
            { shift_id: 'wed-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'booked' },
            { shift_id: 'wed-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'available' },
          ],
        },
        {
          date: '2026-05-01', day_label: 'Thu', date_label: 'May 1',
          shifts: [
            { shift_id: 'thu-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹600–800', status: 'available' },
            { shift_id: 'thu-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹700–900', status: 'available' },
          ],
        },
        {
          date: '2026-05-02', day_label: 'Fri', date_label: 'May 2',
          shifts: [
            { shift_id: 'fri-am', label: 'Morning',  start_time: '7am',  end_time: '12pm', pay_estimate: '₹700–900', status: 'available' },
            { shift_id: 'fri-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹900–1,200', status: 'available', capacity_left: 1 },
          ],
        },
        {
          date: '2026-05-03', day_label: 'Sat', date_label: 'May 3',
          shifts: [
            { shift_id: 'sat-all', label: 'All-day', start_time: '10am', end_time: '10pm', duration: '12 hrs', pay_estimate: '₹1,400–1,800', status: 'available' },
          ],
        },
        {
          date: '2026-05-04', day_label: 'Sun', date_label: 'May 4',
          shifts: [
            { shift_id: 'sun-pm', label: 'Evening',  start_time: '4pm',  end_time: '9pm',  pay_estimate: '₹800–1,000', status: 'available' },
          ],
        },
      ],
      silent: false,
    },
  },
  carousel: {
    label: 'Carousel (tile + widget composition)',
    /*  Items can be either:
     *    • composed widgets: { type, payload } — rendered from the
     *      registry inside a slide (matches CSV #19: "each card is
     *      a mini version of another widget type")
     *    • inline tiles: { title, subtitle, description, tone,
     *      cta_label, hero_icon, image_url? } — lightweight content
     *      tiles (tips, announcements, learning blurbs)
     *  Items can be mixed in the same rail.
     *  tone ∈ 'info' | 'warn' | 'success' | 'announcement' | 'learning' */
    examplePayload: {
      widget_id: 'carousel-example-1',
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
          hero_icon: 'warn',
        },
        {
          item_id: 'fuel',
          accent_label: 'Logistics',
          title: 'Top up fuel early',
          subtitle: 'Before the peak hours',
          description: 'Peak-hour queues at pumps can kill 20 minutes. Fill up before 11 am to keep earnings steady.',
          cta_label: 'Find nearby pumps',
          hero_icon: 'info',
        },
        {
          item_id: 'earnings',
          accent_label: 'Earnings',
          title: 'Ravi earned ₹45k last month',
          subtitle: 'Across 28 days',
          description: 'Consistent 9-hour shifts + weekend bonuses stacked up. Check his weekly breakdown for tips.',
          cta_label: 'See breakdown',
          hero_icon: 'success',
        },
        {
          item_id: 'app',
          accent_label: 'App',
          title: 'Turn on trip notifications',
          subtitle: 'Never miss an order',
          description: 'Allow Swiggy app notifications so you hear new orders even with the screen off.',
          cta_label: 'Open settings',
          hero_icon: 'learning',
        },
      ],
      silent: false,
    },
  },
  validated_input: {
    label: 'Validated Input (OTP / PAN / phone / …)',
    /*  input_type ∈ 'otp' | 'phone' | 'pincode' | 'email' | 'aadhaar' |
     *  'pan' | 'ifsc' | 'text' | 'number'. Each has a built-in validator
     *  + auto-formatter. OTP renders as N split-digit boxes; everything
     *  else renders as a single input with inline validity glyph.
     *  For 'text', provide `pattern` (regex string) + `pattern_message`
     *  to drive custom validation. */
    examplePayload: {
      widget_id: 'validated-example-1',
      field_id: 'otp',
      title: 'Enter the verification code',
      description: 'We sent a 6-digit code to +91 98765 43210.',
      input_type: 'otp',
      max_length: 6,
      submit_label: 'Verify',
      resend: { label: 'Didn\'t get it?', cooldown_seconds: 30 },
      silent: false,
    },
  },
  rating: {
    label: 'Rating',
    /*  variant ∈ 'stars' | 'thumbs'
     *  For stars: scale (default 5), optional labels = [low, high]
     *  require_comment_below: if the user's rating is ≤ this value,
     *  the optional comment becomes required before submit.
     */
    examplePayload: {
      widget_id: 'rating-example-1',
      rating_id: 'shift-experience-apr24',
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
  },
  instruction_card: {
    label: 'Instruction Card',
    /*  tone ∈ 'info' | 'warn' | 'success' — drives the header icon
     *  badge, step number color, and guide-rail tint.
     *  Each step may carry an optional image_url rendered inline. */
    examplePayload: {
      widget_id: 'instr-example-1',
      instruction_id: 'aadhaar-capture-guide',
      title: 'How to capture your Aadhaar',
      description: 'Follow these three steps for a clear, readable photo.',
      tone: 'info',
      require_acknowledgement: true,
      acknowledge_label: 'Got it',
      steps: [
        {
          step_id: 'flat',
          label: 'Place the card on a flat surface',
          description: 'A plain table works best — avoid patterned backgrounds that confuse the edge detection.',
        },
        {
          step_id: 'frame',
          label: 'Fill the frame',
          description: 'All four corners of the card should be visible. Don\'t crop any edges.',
        },
        {
          step_id: 'light',
          label: 'Watch for glare',
          description: 'Move the card around if light reflects off the laminate. No shadows across the text.',
        },
      ],
      silent: false,
    },
  },
  checklist: {
    label: 'Checklist (interactive + read-only)',
    /*  Two variants share the same widget type:
     *    • default (this example) — user checks off items, submits
     *    • read-only — set `read_only: true`; items may carry
     *      `status: 'skipped'` and optional `due: { label, tone }`
     *      where tone ∈ 'overdue' | 'soon' | 'ok'. Submit is hidden.
     */
    examplePayload: {
      widget_id: 'checklist-example-1',
      checklist_id: 'onboarding-basic',
      title: 'Complete your onboarding',
      description: 'Finish these four steps to start your first shift.',
      read_only: false,
      require_all: true,
      allow_skip: false,
      items: [
        {
          item_id: 'aadhaar',
          label: 'Submit Aadhaar card',
          description: 'Front and back photos',
          status: 'pending',
        },
        {
          item_id: 'dl',
          label: 'Upload driver\'s licence',
          description: 'PDF or photo, both sides',
          status: 'pending',
        },
        {
          item_id: 'training',
          label: 'Complete safety training',
          description: '5-minute video',
          status: 'pending',
        },
        {
          item_id: 'bank',
          label: 'Add bank details',
          description: 'For weekly payouts',
          status: 'pending',
        },
      ],
      silent: false,
    },
  },
  qc_evidence_review: {
    label: 'QC Evidence Review (task photo + AI annotations)',
    /*  Single-image task-photo QC with AI-generated bounding boxes
     *  and per-criterion verdicts. Matches CSV #20 exactly.
     *
     *  annotations[].region: {x, y, w, h} — all values 0..1, normalised
     *  to the image container. `verdict` ∈ 'pass' | 'fail' | 'partial'.
     *  mode: 'admin' shows Approve/Reject/Resubmit. 'worker' is
     *  read-only feedback. */
    examplePayload: {
      widget_id: 'qcev-example-1',
      submission_id: 'sub-okaygo-782',
      title: 'Shelf arrangement — 3rd aisle',
      description: 'Task ID #782 · OkayGo merchandising · submitted 12 min ago',
      image_url: '',
      overall_verdict: 'borderline',
      confidence: 0.78,
      mode: 'admin',
      actions: ['approve', 'reject', 'resubmit'],
      annotations: [
        { region: { x: 0.08, y: 0.12, w: 0.38, h: 0.60 }, label: 'Top shelf', verdict: 'pass' },
        { region: { x: 0.50, y: 0.20, w: 0.30, h: 0.45 }, label: 'Signage',   verdict: 'partial' },
        { region: { x: 0.10, y: 0.74, w: 0.78, h: 0.20 }, label: 'Bottom row', verdict: 'fail' },
      ],
      criteria: [
        { name: 'Location match',      verdict: 'pass',    reasoning: 'GPS fix within 12 m of the assigned outlet. Photo timestamp matches the shift window.' },
        { name: 'Shelf arrangement',   verdict: 'fail',    reasoning: 'Bottom row products not aligned to the planogram. Gaps visible between SKU clusters. Expected continuous facing.' },
        { name: 'Product visibility',  verdict: 'pass',    reasoning: 'All tracked SKUs visible in the top shelf region with labels facing outward.' },
        { name: 'Signage',             verdict: 'partial', reasoning: 'Promotion tag visible but angled away from the aisle — readability from shopper position is reduced.' },
      ],
      silent: false,
    },
  },
  evidence_review: {
    label: 'Evidence Review (candidate onboarding)',
    examplePayload: {
      widget_id: 'qc-example-1',
      candidate: { name: 'Ravi Kumar', id: 'cand-123' },
      submission: { id: 'sub-456', submitted_at: Date.now() - 2 * 60 * 60 * 1000 },
      allow_bulk_approve: true,
      items: [
        {
          item_id: 'aadhaar_front',
          label: 'Aadhaar (front)',
          type: 'image',
          url: '',
          size_bytes: 312000,
          status: 'pending',
        },
        {
          item_id: 'aadhaar_back',
          label: 'Aadhaar (back)',
          type: 'image',
          url: '',
          size_bytes: 288000,
          status: 'pending',
        },
        {
          item_id: 'drivers_licence',
          label: 'Driver\'s licence',
          type: 'pdf',
          url: '',
          pages: 2,
          size_bytes: 245000,
          status: 'pending',
        },
        {
          item_id: 'selfie',
          label: 'Verification selfie',
          type: 'image',
          url: '',
          size_bytes: 410000,
          status: 'pending',
        },
      ],
      silent: false,
    },
  },
  document_preview: {
    label: 'Document Preview',
    examplePayload: {
      widget_id: 'docpreview-example-1',
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
  },
}
