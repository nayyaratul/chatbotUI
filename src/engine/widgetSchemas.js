import { makeId } from './ids.js'

/**
 * Single source of truth for widget example payloads.
 *
 * Each entry: { label, category, variants: [{ id, label, payload: () => object }] }
 *   - `category` drives grouping in the Studio Injector palette.
 *   - `payload` is a FUNCTION so makeId() mints fresh ids on every call.
 *
 * Consumed by:
 *   - src/studio/Injector.jsx (picker + payload preview)
 *   - src/engine/mockBot.js   (rule payloads, via getVariantPayload)
 */

/* ─── Shared rich job payloads ────────────────────────────────────
   Used by the `job_card` carousel variant and the `carousel` job-picks
   variant. Function (not const) so makeId() mints fresh ids per
   invocation. */
function richJobs() {
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

/* ─── Shared approval payload builder ─────────────────────────────
   Returns a representative payload per variant for the Approval
   widget (#23). Used by both widgetSchemas variants and any mockBot
   rule, so a single call site keeps the fixtures in one place. */
function buildApprovalPayload(variant) {
  const base = {
    widget_id: makeId('ap'),
    variant,
    actions: ['approve', 'reject', 'more_info', 'escalate'],
  }

  if (variant === 'bgv') {
    return {
      ...base,
      case_id: 'case-bgv-4821',
      summary: { title: 'Priya Sharma',    subtitle: 'Aadhaar verification' },
      recommendation: { verdict: 'approve', confidence: 0.87, tone: 'success' },
      reasoning:
        'Cross-match between submitted Aadhaar and PAN fields passed on name, DOB, and address. Phone verification succeeded on the first attempt. No discrepancies flagged.',
      evidence: [
        { id: 'ev-aadhaar', kind: 'document',  label: 'Aadhaar front', meta: '92% match',          meta_tone: 'success', body: { thumbnail_url: '', name: 'aadhaar-front.jpg', subtitle: 'Captured 2 min ago · 2.1 MB' } },
        { id: 'ev-pan',     kind: 'document',  label: 'PAN card',       meta: '98% match',         meta_tone: 'success', body: { thumbnail_url: '', name: 'pan-front.jpg',     subtitle: 'Captured 2 min ago · 1.8 MB' } },
        { id: 'ev-score',   kind: 'score',     label: 'Cross-match score', meta: '4 of 4 checks',  meta_tone: 'success', body: { rows: [
          { label: 'Name match',    value: 1.00 },
          { label: 'DOB match',     value: 1.00 },
          { label: 'Address match', value: 0.88 },
          { label: 'Phone verified', value: 1.00 },
        ] } },
      ],
    }
  }

  if (variant === 'interview') {
    return {
      ...base,
      case_id: 'case-iv-2039',
      summary: { title: 'Rahul Kumar', subtitle: 'Interview — Ops Lead' },
      recommendation: { verdict: 'borderline', confidence: 0.62, tone: 'warning' },
      reasoning:
        'Strong domain answers but weak on stakeholder-management scenarios. Communication is clear; culture fit is acceptable. Panel split — this is a borderline call that warrants a second round.',
      evidence: [
        { id: 'ev-transcript', kind: 'transcript', label: 'Key excerpts',   meta: '3 moments',    meta_tone: 'info',    body: { excerpts: [
          { timestamp: '04:12', text: 'When the merchandiser pushed back on the SLA, I told him the target was non-negotiable. The conversation got tense but he agreed eventually.' },
          { timestamp: '12:47', text: 'I have not personally run a P0 outage post-mortem — I have only shadowed one.' },
          { timestamp: '23:05', text: 'I think the hardest part of this role is going to be the cross-team coordination, honestly.' },
        ] } },
        { id: 'ev-scores',     kind: 'score',      label: 'Panel scorecard', meta: '62% overall', meta_tone: 'warning', body: { rows: [
          { label: 'Domain depth',          value: 0.78 },
          { label: 'Stakeholder handling',  value: 0.45 },
          { label: 'Communication clarity', value: 0.72 },
          { label: 'Culture fit',           value: 0.66 },
        ] } },
      ],
    }
  }

  if (variant === 'qc_flagged') {
    return {
      ...base,
      case_id: 'case-qc-4812',
      summary: { title: 'Audit #4812', subtitle: 'Shelf layout — Reliance Fresh, Indiranagar' },
      recommendation: { verdict: 'reject', confidence: 0.78, tone: 'error' },
      reasoning:
        'Two of five criteria failed. Shelf products are not aligned to the planogram; front-facing signage is obscured by a stack of cartons on aisle 4. Recommend resubmission with corrections.',
      evidence: [
        { id: 'ev-photo',    kind: 'document', label: 'Submitted photo',    meta: '4.2 MB',       meta_tone: 'info',  body: { thumbnail_url: '', name: 'audit-4812.jpg', subtitle: 'Captured 18 min ago · GPS verified' } },
        { id: 'ev-criteria', kind: 'criteria', label: 'Criteria checklist', meta: '2 / 5 failed', meta_tone: 'error', body: { items: [
          { label: 'Location verified',         pass: true },
          { label: 'Product alignment',         pass: false },
          { label: 'Price tags visible',        pass: true },
          { label: 'Signage unobstructed',      pass: false },
          { label: 'Aisle clear of obstructions', pass: true },
        ] } },
      ],
    }
  }

  if (variant === 'offer') {
    return {
      ...base,
      case_id: 'case-off-7701',
      summary: { title: 'Priya Sharma', subtitle: 'Offer — Ops Lead, Bangalore' },
      recommendation: { verdict: 'approve', confidence: 0.94, tone: 'success' },
      reasoning:
        'Panel scored 88% overall. Compensation package is within the approved band for this role + location. All references cleared. Recommended to send offer.',
      evidence: [
        { id: 'ev-comp',   kind: 'compensation', label: 'Compensation',  meta: 'Within band', meta_tone: 'success', body: { rows: [
          { label: 'Base',           value: '₹ 18,00,000 / year' },
          { label: 'Variable',       value: '₹ 3,00,000 / year (20%)' },
          { label: 'Joining bonus',  value: '₹ 2,00,000' },
          { label: 'Notice period',  value: '60 days' },
        ] } },
        { id: 'ev-scores', kind: 'score',        label: 'Panel summary',  meta: '88% overall', meta_tone: 'success', body: { rows: [
          { label: 'Interview panel',     value: 0.88 },
          { label: 'Reference check',     value: 0.92 },
          { label: 'Assessment score',    value: 0.85 },
        ] } },
      ],
    }
  }

  throw new Error(`buildApprovalPayload: unknown variant "${variant}"`)
}

/* ─── Shared comparison payload builder ────────────────────────────
   Three variants for the Comparison widget (#22). Each returns a
   canonical item_a/item_b pair, 4–6 criteria with a variant-appropriate
   status mix, 1–2 notes for expandable detail rows, and an optional
   action (display-only for qc_spec). Status is communicated by the
   tone dot + left stripe in v2.1 — no more status_copy. */
function buildComparisonPayload(variant) {
  const base = {
    widget_id: makeId('cmp'),
    variant,
  }

  if (variant === 'candidate_match') {
    return {
      ...base,
      item_a: { label: 'Candidate',  subtitle: 'Ravi Kumar' },
      item_b: { label: 'Role needs', subtitle: 'Shipping Assistant · Delhivery' },
      criteria: [
        { name: 'Experience',  a_value: '3 yrs',   b_value: '2+ yrs',          status: 'match' },
        { name: 'Languages',   a_value: 'Hi, En',  b_value: 'Hi + regional',   status: 'partial', note: 'You cover Hindi and English; Delhivery prefers Hindi plus one regional language (Kannada or Telugu) for customer calls in the Koramangala zone.' },
        { name: 'Shift',       a_value: 'Evening', b_value: 'Evening',         status: 'match' },
        { name: 'Own vehicle', a_value: 'No',      b_value: 'Yes (2-wheeler)', status: 'gap',     note: 'Role requires an own 2-wheeler in good condition. Company provides a fuel allowance but not the vehicle itself.' },
      ],
      action: { label: 'Apply now', intent: 'primary' },
    }
  }

  if (variant === 'skills_gap') {
    return {
      ...base,
      item_a: { label: 'Your skills',  subtitle: 'From your last 6 months' },
      item_b: { label: 'Target level', subtitle: 'Team Lead — Logistics' },
      criteria: [
        { name: 'Route planning',      a_value: 'Intermediate', b_value: 'Advanced',     status: 'partial', note: 'You plan routes independently but have not yet optimised for multi-rider groups. Advanced requires 30+ rider coordination.' },
        { name: 'Customer escalation', a_value: 'Beginner',     b_value: 'Intermediate', status: 'gap',     note: 'Handled 4 escalations last quarter; target is 15+ with documented resolution. Enrol in the Escalation Handling track.' },
        { name: 'Rider communication', a_value: 'Advanced',     b_value: 'Advanced',     status: 'match' },
        { name: 'Data literacy',       a_value: 'None',         b_value: 'Intermediate', status: 'gap',     note: 'Reading rider-productivity dashboards and drawing conclusions is the biggest gap to close for this role.' },
        { name: 'Shift planning',      a_value: 'Intermediate', b_value: 'Intermediate', status: 'match' },
      ],
      action: { label: 'Close gaps with training', intent: 'primary' },
    }
  }

  if (variant === 'qc_spec') {
    return {
      ...base,
      item_a: { label: 'Submitted', subtitle: 'Audit #4812 — Indiranagar' },
      item_b: { label: 'Expected',  subtitle: 'Reliance Fresh planogram v3' },
      criteria: [
        { name: 'SKU coverage',         a_value: '18 / 20',     b_value: '20 / 20',     status: 'partial', note: 'Missing SKUs: Amul Taaza 500ml, Mother Dairy Classic 1L. Re-photograph the dairy shelf with all facings visible.' },
        { name: 'Facing alignment',     a_value: '85%',         b_value: '≥ 95%',       status: 'gap',     note: 'Aisle 4 shelf has 3 mis-faced units. Straighten before resubmission.' },
        { name: 'Price tag visibility', a_value: 'All visible', b_value: 'All visible', status: 'match' },
        { name: 'Signage placement',    a_value: 'Correct',     b_value: 'Correct',     status: 'match' },
      ],
      /* display-only — no CTA on QC spec variant */
    }
  }

  throw new Error(`buildComparisonPayload: unknown variant "${variant}"`)
}

/* ─── Shared earnings payload builder ──────────────────────────────
   Three variants for the Earnings widget (#28). paycheck = completed
   weekly payout; incentive = bonus tracker with processing rows;
   advance = brand-tinted available-to-withdraw balance with a primary
   CTA. */
function buildEarningsPayload(variant) {
  const base = {
    widget_id: makeId('pay'),
    variant,
  }

  if (variant === 'paycheck') {
    return {
      ...base,
      period: { start: '2026-04-19', end: '2026-04-25', label: "This week's earnings" },
      total:  { amount: 12450, currency: 'INR' },
      status: 'completed',
      breakdown: [
        { label: 'Mon · Morning',   meta: '4 hrs',             amount: 1800, status: 'completed' },
        { label: 'Tue · Evening',   meta: '6 hrs · overtime',  amount: 2450, status: 'completed' },
        { label: 'Wed · Morning',   meta: '4 hrs',             amount: 1800, status: 'completed' },
        { label: 'Thu · Full day',  meta: '8 hrs',             amount: 2200, status: 'completed' },
        { label: 'Fri · Evening',   meta: '6 hrs',             amount: 2000, status: 'completed' },
        { label: 'Sat · Morning',   meta: '4 hrs',             amount: 1200, status: 'completed' },
        { label: 'Sun · Evening',   meta: '4 hrs · holiday',   amount: 1000, status: 'completed' },
      ],
      trend: { percent: 8, direction: 'up', label: 'vs last week' },
    }
  }

  if (variant === 'incentive') {
    return {
      ...base,
      period: { start: '2026-04-01', end: '2026-04-30', label: "April incentives" },
      total:  { amount: 2800, currency: 'INR' },
      status: 'processing',
      breakdown: [
        { label: 'Attendance bonus',     meta: '26 of 30 days',       amount: 1500, status: 'completed' },
        { label: 'Volume target',        meta: 'Target 80%, hit 92%', amount:  800, status: 'completed' },
        { label: 'Quality bonus',        meta: 'Pending review',      amount:  400, status: 'processing' },
        { label: 'Peer referral',        meta: '1 hire',              amount:  100, status: 'processing' },
      ],
      trend: { percent: 12, direction: 'up', label: 'vs last month' },
    }
  }

  if (variant === 'advance') {
    return {
      ...base,
      period: { start: '2026-04-19', end: '2026-04-25', label: "Available advance" },
      total:  { amount: 8200, currency: 'INR' },
      status: 'completed',
      breakdown: [
        { label: 'Shifts worked',   meta: '5 shifts · cleared',        amount: 8200, status: 'completed' },
        { label: 'In progress',     meta: '2 shifts · clears Fri',     amount: 3100, status: 'processing' },
        { label: 'Advance fee',     meta: '1% processing',             amount:  -82, status: 'completed' },
      ],
      trend: { percent: 3, direction: 'down', label: 'vs last period' },
      action: { label: 'Request advance', intent: 'primary' },
    }
  }

  throw new Error(`buildEarningsPayload: unknown variant "${variant}"`)
}

/* ─── Shared profile payload builder ──────────────────────────────
   Two variants for the Profile Card widget (#29). Worker = self-view
   with a single primary "Update profile" CTA. Admin = recruiter review
   with a 3-button action bar (Reject / View full / Shortlist). */
function buildProfilePayload(variant) {
  const base = {
    widget_id: makeId('pcd'),
    variant,
  }

  if (variant === 'worker') {
    return {
      ...base,
      worker_id: 'w-1042',
      name: 'Priya Sharma',
      headline: 'Shipping Assistant · 3 yrs',
      availability: 'available',
      stats: [
        { icon: 'star',        label: 'Rating',       value: '4.8 / 5' },
        { icon: 'target',      label: 'Tasks done',   value: '147' },
        { icon: 'globe',       label: 'Languages',    value: 'Hi, En, Ka' },
        { icon: 'clock',       label: 'Experience',   value: '3 yrs' },
      ],
      skills: ['Navigation', 'Field ops', 'COD handling', 'Bike handling', 'Customer comms', 'Route planning', 'English'],
      score: { value: 82, max: 100 },
      actions: [
        { id: 'update', label: 'Update profile', intent: 'primary' },
      ],
    }
  }

  if (variant === 'admin') {
    return {
      ...base,
      worker_id: 'c-2198',
      name: 'Rahul Verma',
      headline: 'Candidate · Applied for Delivery Executive',
      availability: 'available',
      stats: [
        { icon: 'briefcase',   label: 'Experience',   value: '2 yrs' },
        { icon: 'award',       label: 'Prior roles',  value: 'Swiggy, Zomato' },
        { icon: 'trending-up', label: 'Match score',  value: '74 %' },
        { icon: 'globe',       label: 'Languages',    value: 'Hi, En' },
      ],
      skills: ['Two-wheeler', 'Customer comms', 'Navigation apps', 'Light lifting', 'Punctual'],
      score: { value: 74, max: 100 },
      actions: [
        { id: 'reject',    label: 'Reject',             intent: 'destructive' },
        { id: 'view_full', label: 'View full profile',  intent: 'neutral' },
        { id: 'shortlist', label: 'Shortlist',          intent: 'primary' },
      ],
    }
  }

  throw new Error(`buildProfilePayload: unknown variant "${variant}"`)
}

/* ─── Incentive / Leaderboard (#30) — payload builder ────────────
   `personal` ships ring + breakdown + tier; `leaderboard` ships a
   top-5 list with the user landing at #4 so the §8 ledger-stripe
   signature beat fires by default. Use-case framing (Reliance shift
   incentive) carried as period/metric copy on the payload, not a
   variant. */
function buildLeaderboardPayload(variant) {
  const base = {
    widget_id: makeId('lb'),
    variant,
    period_label: 'April · Week 3',
    metric_label: 'Shifts completed',
    unit: '',
    links: [
      { id: 'view_full',      label: 'View full leaderboard' },
      { id: 'how_calculated', label: 'How is this calculated?' },
    ],
  }

  if (variant === 'personal') {
    return {
      ...base,
      target: { target_value: 24, current_value: 18 },
      breakdown: [
        { label: 'Attendance',        current: 18, target: 22 },
        { label: 'On-time arrivals',  current: 16, target: 18 },
        { label: 'Hours logged',      current: 142, target: 168 },
        { label: 'QC pass rate',      current: 92, target: 95, unit: '%' },
      ],
      leaderboard: null,
      user_position: {
        rank: 16,
        out_of: 184,
        delta: 4,
        delta_label: 'vs last week',
      },
    }
  }

  if (variant === 'leaderboard') {
    return {
      ...base,
      target: null,
      breakdown: null,
      leaderboard: [
        { rank: 1, name: 'Worker 4821', score: 28, is_user: false, delta: 3 },
        { rank: 2, name: 'Worker 6133', score: 26, is_user: false, delta: -1 },
        { rank: 3, name: 'Worker 2087', score: 24, is_user: false, delta: 2 },
        { rank: 4, name: 'You',         score: 22, is_user: true,  delta: 4 },
        { rank: 5, name: 'Worker 7702', score: 21, is_user: false, delta: 0 },
      ],
      user_position: null,
    }
  }

  throw new Error(`buildLeaderboardPayload: unknown variant "${variant}"`)
}

/* ─── Shared video payload builder ────────────────────────────────
   Returns a representative payload per variant for the Video Player
   widget (#16). Both variants point at MDN's flower.mp4 sample —
   stable Mozilla CDN, ~10s clip. Critically, the host returns
   `206 Partial Content` for Range requests (samplelib's video host
   does not), which is required for HTML5 <video> to seek without
   downloading the entire file first. Audio doesn't need Range
   because MP3 can seek by frame without the moov-atom dance MP4
   needs.

   The `enforced` variant differs from `standard` only in (a) the
   subtitle copy, (b) the absence of a speed picker at render time
   (driven by the variant flag in the component, not payload). */
function buildVideoPayload(variant) {
  const base = {
    widget_id: makeId('vid'),
    variant,
    video_id: `vid-${variant === 'enforced' ? 'harass-2026' : 'onboard-welcome'}`,
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnail_url: null,
    duration_seconds: 10,
    playback_speeds: [0.5, 1, 1.5, 2],
    silent: false,
  }

  if (variant === 'enforced') {
    return {
      ...base,
      title: 'Harassment prevention — annual',
      subtitle: 'Required viewing',
    }
  }

  if (variant === 'standard') {
    return {
      ...base,
      title: 'Welcome to the platform',
      subtitle: 'Onboarding',
    }
  }

  throw new Error(`buildVideoPayload: unknown variant "${variant}"`)
}

/* ─── Signature Capture (#14) — payload builder ──────────────────────
   Two structural variants share one shell. `document` mounts a
   thumbnail preview band that hands off to JobDetailsModal; `text`
   mounts an inline scrollable agreement body. Use-case (offer /
   contract / completion) drives the header icon + default copy and
   travels as a payload field, not a variant. */
function buildSignaturePayload(variant) {
  const base = {
    widget_id: makeId('sg'),
    variant,
    signer_name: 'Atul Nayyar',
    silent: false,
  }

  if (variant === 'document') {
    return {
      ...base,
      use_case: 'offer',
      document_id: 'doc-offer-2026-04-25',
      document_ref: {
        label: 'Offer letter — Riders Operations',
        version: 'v3.2',
        pages: 3,
        updated_at: '2026-04-22',
      },
    }
  }

  if (variant === 'text') {
    return {
      ...base,
      use_case: 'contract',
      title: 'Sign the NDA',
      subtitle: 'Vendor onboarding · 2026-04',
      agreement_text:
        "This Non-Disclosure Agreement (\"Agreement\") is entered into between the Company and the Recipient as of the date of signing below.\n\n"
        + "1. Confidential Information. The Recipient acknowledges that during the engagement they may be exposed to non-public information about the Company's operations, customers, vendors, technology, and business strategy. All such information is treated as confidential.\n\n"
        + "2. Use of Information. The Recipient agrees to use confidential information solely for the purpose of performing the engagement and not for any personal benefit or third-party advantage.\n\n"
        + "3. Term. The obligations under this Agreement remain in force for a period of three (3) years from the date of last disclosure, after which the obligations expire automatically.\n\n"
        + "4. Return of Materials. Upon completion of the engagement or earlier on request, the Recipient shall return or destroy all materials containing confidential information.\n\n"
        + "5. Governing Law. This Agreement is governed by the laws of India and any disputes shall be resolved in the courts of Bengaluru.\n\n"
        + "By signing below, the Recipient acknowledges that they have read this Agreement, understand its terms, and agree to be bound by them.",
    }
  }

  throw new Error(`buildSignaturePayload: unknown variant "${variant}"`)
}

/* ─── Embedded Webview (#27) — payload builder ────────────────────────
   Four variants: partner_form / training / reader / preview. Each
   ships its own preset for icon/eyebrow/completion. URL fixtures live
   under /public/embed-fixtures/ so the postMessage variants can be
   demoed end-to-end without external dependencies. */
function buildEmbeddedWebviewPayload(variant) {
  const base = {
    widget_id: makeId('webv'),
    variant,
    sandbox: null,                                  // null → component default
    allow: null,
    silent: false,
  }

  if (variant === 'partner_form') {
    return {
      ...base,
      url: '/embed-fixtures/partner-form.html',
      allowed_origin: window.location.origin,
      domain_label: 'partners.bgv-co.in',
      favicon_url: null,
      title: 'Background verification — vendor portal',
      description: 'Submit your details on the partner page',
      category: 'Onboarding',
      poster_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1024&q=70',
      estimated_minutes: 4,
    }
  }

  if (variant === 'training') {
    return {
      ...base,
      url: '/embed-fixtures/training.html',
      allowed_origin: window.location.origin,
      domain_label: 'learn.example.com',
      favicon_url: null,
      title: 'Anti-bribery refresher',
      description: 'Annual compliance training — 4 short modules',
      category: 'Compliance',
      poster_url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1024&q=70',
      estimated_minutes: 8,
    }
  }

  if (variant === 'reader') {
    return {
      ...base,
      url: 'https://example.com/',
      allowed_origin: 'https://example.com',
      domain_label: 'example.com',
      favicon_url: null,
      title: 'Updated leave policy — April 2026',
      description: 'Three changes effective from May 1st',
      category: 'Policy',
      poster_url: null,
      estimated_minutes: 3,
    }
  }

  if (variant === 'preview') {
    return {
      ...base,
      url: 'https://example.com/',
      allowed_origin: 'https://example.com',
      domain_label: 'example.com',
      favicon_url: null,
      title: 'Reference site',
      description: 'A quick look — close when you\'re done',
      category: 'Reference',
      poster_url: null,
      estimated_minutes: null,
    }
  }

  throw new Error(`buildEmbeddedWebviewPayload: unknown variant "${variant}"`)
}

/* ─── Location Map (#13) — variant payload builder ────────────────
   Bengaluru-anchored fixtures across all five palette entries.
   Sandbox-only; production callers ship real-world payloads.
                                                                      */

const LM_SEARCH_FIXTURES = [
  {
    lat: 12.9716, lng: 77.5946,
    address: '14, Lavelle Road, Bengaluru 560001',
    address_components: { street: 'Lavelle Road', locality: 'Lavelle Road', city: 'Bengaluru', postal: '560001', state: 'Karnataka', country: 'India' },
    score: 0.95,
  },
  {
    lat: 12.9784, lng: 77.6408,
    address: '100 Ft Road, Indiranagar, Bengaluru 560038',
    address_components: { street: '100 Ft Road', locality: 'Indiranagar', city: 'Bengaluru', postal: '560038', state: 'Karnataka', country: 'India' },
    score: 0.92,
  },
  {
    lat: 12.9698, lng: 77.7500,
    address: 'EPIP Zone, Whitefield, Bengaluru 560066',
    address_components: { street: 'EPIP Zone', locality: 'Whitefield', city: 'Bengaluru', postal: '560066', state: 'Karnataka', country: 'India' },
    score: 0.88,
  },
  {
    lat: 12.9116, lng: 77.6473,
    address: '27th Main Road, HSR Layout, Bengaluru 560102',
    address_components: { street: '27th Main Road', locality: 'HSR Layout', city: 'Bengaluru', postal: '560102', state: 'Karnataka', country: 'India' },
    score: 0.86,
  },
  {
    lat: 12.9352, lng: 77.6245,
    address: '80 Feet Road, Koramangala 4 Block, Bengaluru 560034',
    address_components: { street: '80 Feet Road', locality: 'Koramangala', city: 'Bengaluru', postal: '560034', state: 'Karnataka', country: 'India' },
    score: 0.84,
  },
  {
    lat: 12.8456, lng: 77.6603,
    address: 'Phase 1, Electronic City, Bengaluru 560100',
    address_components: { street: 'Hosur Road', locality: 'Electronic City', city: 'Bengaluru', postal: '560100', state: 'Karnataka', country: 'India' },
    score: 0.78,
  },
]

function buildLocationMapPayload(variant) {
  const common = {
    widget_id: makeId('lmap'),
    variant,
    center_lat: 12.9716,
    center_lng: 77.5946,
    initial_zoom: 15,
  }

  if (variant === 'pin_drop') {
    return {
      ...common,
      title: 'Confirm your address',
      description: 'Tap to open the map and adjust if needed.',
      category: 'Home address',
      initial_location: {
        lat: 12.9716,
        lng: 77.5946,
        address: '14, Lavelle Road, Bengaluru 560001',
        address_components: {
          street: 'Lavelle Road',
          locality: 'Lavelle Road',
          city: 'Bengaluru',
          postal: '560001',
          state: 'Karnataka',
          country: 'India',
        },
        accuracy_m: 12,
      },
      search_fixtures: LM_SEARCH_FIXTURES,
      enable_gps: true,
    }
  }

  if (variant === 'pin_drop_cold') {
    return {
      ...common,
      title: 'Set your location',
      description: 'Open the map to drop a pin or search for an address.',
      category: 'Location',
      initial_location: null,
      search_fixtures: LM_SEARCH_FIXTURES,
      enable_gps: true,
    }
  }

  if (variant === 'nearby_jobs') {
    return {
      ...common,
      center_lat: 12.9500,
      center_lng: 77.6300,
      initial_zoom: 12,
      title: 'Jobs near you',
      description: 'Closest three shown. Open the map for the full set.',
      category: '12 jobs within 5 km',
      jobs: [
        { id: 'j-rid-indir',  label: 'Riders Op · Indiranagar',     sublabel: 'Mon–Sat · ₹680/shift', lat: 12.9784, lng: 77.6408, distance_m_hint:   800 },
        { id: 'j-wh-whfld',   label: 'Warehouse · Whitefield',      sublabel: 'Tue–Sat · ₹720/shift', lat: 12.9698, lng: 77.7500, distance_m_hint:  2400 },
        { id: 'j-del-hsr',    label: 'Delivery hub · HSR',          sublabel: 'Mon–Fri · ₹650/shift', lat: 12.9116, lng: 77.6473, distance_m_hint:  4100 },
        { id: 'j-rid-kor',    label: 'Riders Op · Koramangala',     sublabel: 'Mon–Sat · ₹700/shift', lat: 12.9352, lng: 77.6245, distance_m_hint:  1900 },
        { id: 'j-ret-mg',     label: 'Retail · MG Road store',      sublabel: 'Wed–Sun · ₹580/shift', lat: 12.9756, lng: 77.6065, distance_m_hint:   600 },
        { id: 'j-del-jpn',    label: 'Delivery · Jayanagar',        sublabel: 'Mon–Sat · ₹620/shift', lat: 12.9279, lng: 77.5824, distance_m_hint:  5200 },
        { id: 'j-rid-bnsh',   label: 'Riders Op · Banashankari',    sublabel: 'Tue–Sun · ₹680/shift', lat: 12.9248, lng: 77.5566, distance_m_hint:  6100 },
        { id: 'j-wh-bom',     label: 'Warehouse · Bommanahalli',    sublabel: 'Mon–Sat · ₹740/shift', lat: 12.8980, lng: 77.6225, distance_m_hint:  7400 },
        { id: 'j-ret-orion',  label: 'Retail · Orion Mall',         sublabel: 'Thu–Mon · ₹600/shift', lat: 13.0160, lng: 77.5547, distance_m_hint:  7100 },
        { id: 'j-del-yel',    label: 'Delivery hub · Yelahanka',    sublabel: 'Mon–Fri · ₹650/shift', lat: 13.1007, lng: 77.5963, distance_m_hint: 14400 },
        { id: 'j-rid-hbr',    label: 'Riders Op · Hebbal',          sublabel: 'Mon–Sat · ₹700/shift', lat: 13.0358, lng: 77.5970, distance_m_hint:  7100 },
        { id: 'j-wh-ec',      label: 'Warehouse · Electronic City', sublabel: 'Mon–Sun · ₹780/shift', lat: 12.8456, lng: 77.6603, distance_m_hint: 14000 },
      ],
      filters: [
        { id: 'all',          label: 'All',          predicate_id: 'all' },
        { id: 'within_2km',   label: 'Within 2 km',  predicate_id: 'within_2km' },
        { id: 'today',        label: 'Today',        predicate_id: 'today' },
        { id: 'riders',       label: 'Riders',       predicate_id: 'riders' },
      ],
    }
  }

  if (variant === 'geofence') {
    return {
      ...common,
      center_lat: 12.9700,
      center_lng: 77.7505,
      initial_zoom: 16,
      title: 'Check in to start your shift',
      description: 'You\'re inside the zone — ready to clock in.',
      category: 'Warehouse 4',
      geofence: {
        id: 'wh4',
        label: 'Warehouse 4',
        polygon: [
          [12.9712, 77.7488],
          [12.9718, 77.7515],
          [12.9710, 77.7530],
          [12.9692, 77.7528],
          [12.9686, 77.7505],
          [12.9695, 77.7488],
        ],
      },
      accuracy_gate_m: 50,
      watch_position: true,
    }
  }

  if (variant === 'directions') {
    /* Polyline traces a plausible Indiranagar → Whitefield path —
       100 Ft Road → CMH Road → Old Madras Road → Whitefield Main
       Road. Sample points spaced so the stroke-dashoffset draw
       reads smoothly. */
    return {
      ...common,
      center_lat: 12.9740,
      center_lng: 77.6950,
      initial_zoom: 12,
      title: 'Indiranagar → Whitefield',
      description: '12.4 km · Approx. 25 min by car.',
      category: 'On the way',
      origin:      { lat: 12.9784, lng: 77.6408, label: 'Indiranagar' },
      destination: { lat: 12.9698, lng: 77.7500, label: 'Whitefield' },
      polyline: [
        [12.9784, 77.6408],
        [12.9788, 77.6440],
        [12.9790, 77.6478],
        [12.9785, 77.6520],
        [12.9778, 77.6562],
        [12.9772, 77.6604],
        [12.9764, 77.6646],
        [12.9756, 77.6688],
        [12.9748, 77.6730],
        [12.9740, 77.6772],
        [12.9734, 77.6814],
        [12.9728, 77.6856],
        [12.9722, 77.6898],
        [12.9718, 77.6940],
        [12.9714, 77.6982],
        [12.9712, 77.7024],
        [12.9710, 77.7066],
        [12.9708, 77.7108],
        [12.9706, 77.7150],
        [12.9704, 77.7192],
        [12.9702, 77.7234],
        [12.9700, 77.7276],
        [12.9700, 77.7318],
        [12.9700, 77.7360],
        [12.9700, 77.7402],
        [12.9700, 77.7444],
        [12.9698, 77.7480],
        [12.9698, 77.7500],
      ],
      distance_m: 12400,
      duration_s: 1500,
      steps: [
        { instruction: 'Head east on 100 Ft Road for 600 m',          distance_m:  600, turn_type: 'straight' },
        { instruction: 'Turn right onto CMH Road, continue 1.4 km',   distance_m: 1400, turn_type: 'right' },
        { instruction: 'Continue straight onto Old Madras Road',      distance_m: 4200, turn_type: 'straight' },
        { instruction: 'Stay on Old Madras Road past KR Puram',       distance_m: 2800, turn_type: 'straight' },
        { instruction: 'Turn left at Hoodi Junction',                 distance_m:  500, turn_type: 'left' },
        { instruction: 'Continue onto Whitefield Main Road',          distance_m: 1900, turn_type: 'straight' },
        { instruction: 'Turn right onto EPIP Zone Road',              distance_m:  700, turn_type: 'right' },
        { instruction: 'Arrive at destination',                       distance_m:  300, turn_type: 'arrive' },
      ],
      deep_link_template: null,
    }
  }

  throw new Error(`buildLocationMapPayload: unknown variant "${variant}"`)
}

export const widgetSchemas = {

  // ─── engine ──────────────────────────────────────────────────────

  text: {
    label: 'Text',
    category: 'engine',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          text: 'Hello from the injector.',
        }),
      },
    ],
  },

  widget_response: {
    label: 'Widget Response',
    category: 'engine',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          source_type: 'quick_reply',
          source_widget_id: 'example-qr-1',
          data: { label: 'Yes, proceed', value: 'yes' },
        }),
      },
    ],
  },

  // ─── action ──────────────────────────────────────────────────────

  quick_reply: {
    label: 'Quick Reply',
    category: 'action',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          widget_id: makeId('qr'),
          prompt: 'Pick one:',
          options: [
            { label: 'Yes', value: 'yes', emoji: '👍' },
            { label: 'No', value: 'no', emoji: '👎' },
            { label: 'Maybe', value: 'maybe' },
          ],
        }),
      },
    ],
  },

  confirmation: {
    label: 'Confirmation',
    category: 'action',
    variants: [
      {
        id: 'info',
        label: 'Info',
        payload: () => ({
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
        }),
      },
      {
        id: 'caution',
        label: 'Caution',
        payload: () => ({
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
        }),
      },
      {
        id: 'danger',
        label: 'Danger',
        payload: () => ({
          widget_id: makeId('confirm'),
          action_id: makeId('action'),
          tone: 'danger',
          title: 'Delete your account',
          description: 'Your profile and all associated data will be permanently removed. This cannot be reversed.',
          details: [
            { label: 'Affects',  value: 'Your entire profile' },
            { label: 'Recovery', value: 'Not possible after 24h' },
          ],
          confirm_label: 'Delete permanently',
          cancel_label: 'Keep my account',
          require_checkbox: true,
          checkbox_label: 'I understand this cannot be undone.',
        }),
      },
    ],
  },

  checklist: {
    label: 'Checklist',
    category: 'action',
    variants: [
      {
        id: 'interactive',
        label: 'Interactive',
        payload: () => ({
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
        }),
      },
      {
        id: 'read_only',
        label: 'Read-only',
        payload: () => ({
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
        }),
      },
    ],
  },

  shift_calendar: {
    label: 'Shifts',
    category: 'action',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
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
        }),
      },
    ],
  },

  // ─── input ───────────────────────────────────────────────────────

  mcq: {
    label: 'MCQ',
    category: 'input',
    variants: [
      {
        id: 'scored',
        label: 'Scored (single)',
        payload: () => ({
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
        }),
      },
      {
        id: 'multi',
        label: 'Multi-select',
        payload: () => ({
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
        }),
      },
      {
        id: 'silent',
        label: 'Silent (submit required)',
        payload: () => ({
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
        }),
      },
    ],
  },

  form: {
    label: 'Form',
    category: 'input',
    variants: [
      {
        id: 'basic',
        label: 'Basic registration',
        payload: () => ({
          widget_id: makeId('form'),
          form_id: 'candidate-registration',
          title: 'Tell us about yourself',
          description: "We’ll use this to match you with open roles in your area. Takes about a minute.",
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
        }),
      },
      {
        id: 'kyc',
        label: 'KYC onboarding',
        payload: () => ({
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
        }),
      },
    ],
  },

  rating: {
    label: 'Rating',
    category: 'input',
    variants: [
      {
        id: 'stars',
        label: 'Stars',
        payload: () => ({
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
        }),
      },
      {
        id: 'thumbs',
        label: 'Thumbs',
        payload: () => ({
          widget_id: makeId('rating'),
          rating_id: 'delivery-feedback',
          title: 'Was this delivery on time?',
          description: 'One tap and you\'re done.',
          variant: 'thumbs',
          allow_comment: false,
          submit_label: 'Submit',
          silent: false,
        }),
      },
      {
        id: 'emoji',
        label: 'Emoji',
        payload: () => ({
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
        }),
      },
      {
        id: 'nps',
        label: 'NPS',
        payload: () => ({
          widget_id: makeId('rating'),
          rating_id: 'nps-q1',
          title: 'Would you recommend BetterPlace to a friend?',
          description: 'Pick a number from 0 to 10.',
          variant: 'nps',
          allow_comment: true,
          comment_placeholder: 'Tell us why (optional)',
          submit_label: 'Submit',
          silent: false,
        }),
      },
    ],
  },

  validated_input: {
    label: 'Validated Input',
    category: 'input',
    variants: [
      {
        id: 'otp',
        label: 'OTP',
        payload: () => ({
          widget_id: makeId('validated'),
          field_id: 'otp',
          title: 'Enter the verification code',
          description: 'We sent a 6-digit code to +91 98765 43210.',
          input_type: 'otp',
          max_length: 6,
          submit_label: 'Verify',
          resend: { label: 'Didn\'t get it?', cooldown_seconds: 30 },
          silent: false,
        }),
      },
      {
        id: 'pan',
        label: 'PAN',
        payload: () => ({
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
        }),
      },
      {
        id: 'pincode',
        label: 'Pincode',
        payload: () => ({
          widget_id: makeId('validated'),
          field_id: 'pincode',
          title: 'What\'s your home pincode?',
          description: 'We\'ll match you with jobs in your area.',
          input_type: 'pincode',
          label: 'Pincode',
          placeholder: '560095',
          submit_label: 'Find nearby jobs',
          silent: false,
        }),
      },
      {
        id: 'phone',
        label: 'Phone',
        payload: () => ({
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
        }),
      },
      {
        id: 'email',
        label: 'Email',
        payload: () => ({
          widget_id: makeId('validated'),
          field_id: 'email',
          title: 'Confirm your email',
          description: 'Payslips and receipts go here.',
          input_type: 'email',
          label: 'Email address',
          placeholder: 'priya@example.com',
          submit_label: 'Confirm',
          silent: false,
        }),
      },
      {
        id: 'aadhaar',
        label: 'Aadhaar',
        payload: () => ({
          widget_id: makeId('validated'),
          field_id: 'aadhaar',
          title: 'Enter your Aadhaar number',
          description: '12 digits — auto-formatted with spaces as you type.',
          input_type: 'aadhaar',
          label: 'Aadhaar number',
          placeholder: '1234 5678 9012',
          submit_label: 'Verify Aadhaar',
          silent: false,
        }),
      },
      {
        id: 'bank_account',
        label: 'Bank account',
        payload: () => ({
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
        }),
      },
    ],
  },

  image_capture: {
    label: 'Image Capture',
    category: 'input',
    variants: [
      {
        id: 'document',
        label: 'Document',
        payload: () => ({
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
        }),
      },
      {
        id: 'selfie',
        label: 'Selfie',
        payload: () => ({
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
        }),
      },
      {
        id: 'evidence',
        label: 'Evidence',
        payload: () => ({
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
        }),
      },
    ],
  },

  voice_recording: {
    label: 'Voice',
    category: 'input',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          widget_id: makeId('vrc'),
          prompt_id: 'difficult_delivery',
          title: 'Record your answer',
          description: 'Speak clearly. You can review the clip before submitting.',
          prompt: 'Describe a time you handled a difficult delivery situation and how you resolved it.',
          max_duration_seconds: 60,
          min_duration_seconds: 2,
          auto_transcribe: false,
          silent: false,
        }),
      },
    ],
  },

  audio: {
    label: 'Audio Player',
    category: 'display',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          widget_id: makeId('apw'),
          audio_id: 'training_hindi_safety_brief',
          title: 'Voice instruction',
          description: 'Hindi · safety brief',
          /* Stable samplelib CDN — CORS-friendly 15s MP3. The
             prior URL (storage.googleapis.com/media-session/...) was
             a guess that 404'd, which is why the widget kept entering
             the "Unable to load audio" state on mount. Demo content
             is generic; the title framing carries the "voice
             instruction" semantic the audience cares about. */
          url: 'https://samplelib.com/lib/preview/mp3/sample-15s.mp3',
          duration_seconds: 15,
          /* Speech-shaped fallback peaks (32 normalized). The widget
             also generates these inline if waveform_data is omitted. */
          waveform_data: [
            0.18, 0.32, 0.55, 0.78, 0.62, 0.40, 0.28, 0.48,
            0.72, 0.85, 0.66, 0.45, 0.30, 0.50, 0.74, 0.58,
            0.38, 0.22, 0.42, 0.68, 0.82, 0.70, 0.52, 0.36,
            0.48, 0.64, 0.78, 0.60, 0.42, 0.28, 0.20, 0.14,
          ],
          speeds: [1, 1.5, 2],
          silent: false,
        }),
      },
    ],
  },

  signature: {
    label: 'Signature',
    category: 'input',
    variants: [
      {
        id: 'document',
        label: 'Document',
        payload: () => buildSignaturePayload('document'),
      },
      {
        id: 'text',
        label: 'Agreement',
        payload: () => buildSignaturePayload('text'),
      },
    ],
  },

  embedded_webview: {
    label: 'Webview',
    category: 'advanced',
    variants: [
      { id: 'partner_form', label: 'Partner form', payload: () => buildEmbeddedWebviewPayload('partner_form') },
      { id: 'training',     label: 'Training',     payload: () => buildEmbeddedWebviewPayload('training') },
      { id: 'reader',       label: 'Reader',       payload: () => buildEmbeddedWebviewPayload('reader') },
      { id: 'preview',      label: 'Preview',      payload: () => buildEmbeddedWebviewPayload('preview') },
    ],
  },

  file_upload: {
    label: 'File Upload',
    category: 'input',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
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
        }),
      },
    ],
  },

  datetime_picker: {
    label: 'Date / Time Picker',
    category: 'input',
    variants: [
      {
        id: 'date',
        label: 'Date only',
        payload: () => ({
          widget_id: makeId('dtp'),
          appointment_id: 'onboarding-start-2026',
          title: 'When can you start?',
          description: 'Pick a date within the next three weeks. You can change this later.',
          mode: 'date',
          timezone: 'Asia/Kolkata',
          timezone_label: 'IST',
          min_date: '2026-04-28',
          max_date: '2026-05-18',
          submit_label: 'Confirm start date',
          silent: false,
        }),
      },
      {
        id: 'time',
        label: 'Time only',
        payload: () => ({
          widget_id: makeId('dtp'),
          appointment_id: 'quick-call-a42',
          title: 'Pick a time today',
          description: '15-minute check-in with the recruiter. Just pick a slot.',
          mode: 'time',
          date: '2026-04-24',
          timezone: 'Asia/Kolkata',
          timezone_label: 'IST',
          times: [
            { slot_id: 'apr24-1400', time: '14:00', remaining: 3 },
            { slot_id: 'apr24-1430', time: '14:30', remaining: 2 },
            { slot_id: 'apr24-1500', time: '15:00', remaining: 1 },
            { slot_id: 'apr24-1600', time: '16:00', remaining: 5 },
            { slot_id: 'apr24-1630', time: '16:30', remaining: 4 },
            { slot_id: 'apr24-1730', time: '17:30', remaining: 2 },
          ],
          submit_label: 'Confirm time',
          silent: false,
        }),
      },
      {
        id: 'datetime',
        label: 'Date + time',
        payload: () => ({
          widget_id: makeId('dtp'),
          appointment_id: 'interview-okaygo-9021',
          title: 'Pick an interview slot',
          description: 'Morning slots fill up fastest — book early.',
          mode: 'datetime',
          timezone: 'Asia/Kolkata',
          timezone_label: 'IST',
          min_date: '2026-04-27',
          max_date: '2026-05-09',
          available_slots: [
            { date: '2026-04-28', times: [
              { slot_id: 'apr28-0930', time: '09:30', remaining: 3 },
              { slot_id: 'apr28-1100', time: '11:00', remaining: 1 },
              { slot_id: 'apr28-1400', time: '14:00', remaining: 5 },
              { slot_id: 'apr28-1630', time: '16:30', remaining: 2 },
            ] },
            { date: '2026-04-29', times: [
              { slot_id: 'apr29-1000', time: '10:00', remaining: 4 },
              { slot_id: 'apr29-1530', time: '15:30', remaining: 3 },
            ] },
            { date: '2026-04-30', times: [
              { slot_id: 'apr30-0930', time: '09:30', remaining: 2 },
              { slot_id: 'apr30-1200', time: '12:00', remaining: 6 },
              { slot_id: 'apr30-1630', time: '16:30', remaining: 1 },
            ] },
            { date: '2026-05-04', times: [
              { slot_id: 'may04-1000', time: '10:00', remaining: 4 },
              { slot_id: 'may04-1400', time: '14:00', remaining: 2 },
            ] },
            { date: '2026-05-05', times: [
              { slot_id: 'may05-1100', time: '11:00', remaining: 3 },
              { slot_id: 'may05-1500', time: '15:00', remaining: 2 },
              { slot_id: 'may05-1730', time: '17:30', remaining: 5 },
            ] },
            { date: '2026-05-06', times: [
              { slot_id: 'may06-0930', time: '09:30', remaining: 1 },
              { slot_id: 'may06-1330', time: '13:30', remaining: 4 },
            ] },
          ],
          submit_label: 'Confirm slot',
          silent: false,
        }),
      },
    ],
  },

  // ─── display ─────────────────────────────────────────────────────

  progress: {
    label: 'Progress',
    category: 'display',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
          widget_id: makeId('progress'),
          orientation: 'auto',
          steps: [
            { id: 'a', label: 'Started',    status: 'completed', summary: 'Kicked off on Apr 15.' },
            { id: 'b', label: 'Doc check',  status: 'failed',    summary: 'Missing Aadhaar upload.' },
            { id: 'c', label: 'In review',  status: 'current' },
            { id: 'd', label: 'Decision',   status: 'pending' },
            { id: 'e', label: 'Done',       status: 'pending' },
          ],
        }),
      },
    ],
  },

  score_card: {
    label: 'Score Card',
    category: 'display',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
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
        }),
      },
    ],
  },

  job_card: {
    label: 'Job Card',
    category: 'display',
    variants: [
      {
        id: 'single',
        label: 'Single card',
        payload: () => ({
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
        }),
      },
      {
        id: 'carousel',
        label: 'Carousel',
        payload: () => ({
          widget_id: makeId('jc'),
          silent: false,
          items: richJobs(),
        }),
      },
    ],
  },

  carousel: {
    label: 'Carousel',
    category: 'display',
    variants: [
      {
        id: 'job_picks',
        label: 'Job picks',
        payload: () => ({
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
        }),
      },
      {
        id: 'tips',
        label: 'Onboarding tips',
        payload: () => ({
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
        }),
      },
    ],
  },

  document_preview: {
    label: 'Document Preview',
    category: 'display',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
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
        }),
      },
    ],
  },

  instruction_card: {
    label: 'Instruction Card',
    category: 'display',
    variants: [
      {
        id: 'info',
        label: 'Info',
        payload: () => ({
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
        }),
      },
      {
        id: 'warn',
        label: 'Warn',
        payload: () => ({
          widget_id: makeId('instr'),
          instruction_id: 'helmet-safety-warn',
          title: 'Wear your helmet on every trip',
          description: 'Required on every shift — accident insurance depends on it.',
          tone: 'warn',
          require_acknowledgement: true,
          acknowledge_label: 'Got it',
          steps: [
            { step_id: 'strap',    label: 'Clip and tighten the strap',        description: 'A loose strap gives no protection in a fall.' },
            { step_id: 'fit',      label: 'Check the fit',                     description: 'Two fingers between strap and chin. No gap at the back.' },
            { step_id: 'visor',    label: 'Lower the visor before you start',  description: 'Protects your eyes from dust and insects at speed.' },
          ],
          silent: false,
        }),
      },
      {
        id: 'success',
        label: 'Success',
        payload: () => ({
          widget_id: makeId('instr'),
          instruction_id: 'first-payout-success',
          title: 'You\'re all set for your first payout',
          description: 'Here is what happens next so you know when to expect the money.',
          tone: 'success',
          require_acknowledgement: false,
          steps: [
            { step_id: 'cutoff', label: 'Weekly cut-off is Sunday 11:59 pm', description: 'Anything delivered before then counts toward this week.' },
            { step_id: 'review', label: 'Review on Monday morning',          description: 'The hub verifies rider logs and applies incentives.' },
            { step_id: 'payout', label: 'Payout lands by Tuesday 6 pm',      description: 'Directly to the bank account you added during onboarding.' },
          ],
          silent: false,
        }),
      },
    ],
  },

  // ─── advanced ────────────────────────────────────────────────────

  qc_evidence_review: {
    label: 'QC Review',
    category: 'advanced',
    variants: [
      {
        id: 'admin',
        label: 'Admin',
        payload: () => ({
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
        }),
      },
      {
        id: 'worker',
        label: 'Worker',
        payload: () => ({
          widget_id: makeId('qcev'),
          submission_id: 'sub-okaygo-782',
          title: 'Shelf arrangement — 3rd aisle',
          description: 'Task #782 · Submitted 12 min ago',
          image_url: '',
          overall_verdict: 'borderline',
          confidence: 0.78,
          mode: 'worker',
          annotations: [
            { region: { x: 0.08, y: 0.12, w: 0.38, h: 0.60 }, label: 'Top shelf',  verdict: 'pass' },
            { region: { x: 0.50, y: 0.20, w: 0.30, h: 0.45 }, label: 'Signage',    verdict: 'partial' },
            { region: { x: 0.10, y: 0.74, w: 0.78, h: 0.20 }, label: 'Bottom row', verdict: 'fail' },
          ],
          criteria: [
            { name: 'Location match',    verdict: 'pass',    reasoning: 'GPS fix within 12 m of the assigned outlet.' },
            { name: 'Shelf arrangement', verdict: 'fail',    reasoning: 'Bottom row products not aligned to the planogram. Re-stack with continuous facing and re-submit.' },
            { name: 'Product visibility', verdict: 'pass',   reasoning: 'All tracked SKUs visible in the top shelf region with labels facing outward.' },
            { name: 'Signage',           verdict: 'partial', reasoning: 'Rotate the promotion tag to face the aisle so shoppers can read it.' },
          ],
          silent: false,
        }),
      },
    ],
  },

  evidence_review: {
    label: 'Evidence Review',
    category: 'advanced',
    variants: [
      {
        id: 'default',
        label: 'Default',
        payload: () => ({
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
        }),
      },
    ],
  },

  video: {
    label: 'Video Player',
    category: 'display',
    variants: [
      { id: 'standard', label: 'Standard', payload: () => buildVideoPayload('standard') },
      { id: 'enforced', label: 'Enforced', payload: () => buildVideoPayload('enforced') },
    ],
  },

  approval: {
    label: 'Approval',
    category: 'advanced',
    variants: [
      { id: 'bgv',        label: 'BGV',       payload: () => buildApprovalPayload('bgv') },
      { id: 'interview',  label: 'Interview', payload: () => buildApprovalPayload('interview') },
      { id: 'qc_flagged', label: 'QC',        payload: () => buildApprovalPayload('qc_flagged') },
      { id: 'offer',      label: 'Offer',     payload: () => buildApprovalPayload('offer') },
    ],
  },

  comparison: {
    label: 'Comparison',
    category: 'display',
    variants: [
      { id: 'candidate_match', label: 'Candidate',  payload: () => buildComparisonPayload('candidate_match') },
      { id: 'skills_gap',      label: 'Skills gap', payload: () => buildComparisonPayload('skills_gap') },
      { id: 'qc_spec',         label: 'QC spec',    payload: () => buildComparisonPayload('qc_spec') },
    ],
  },

  earnings: {
    label: 'Earnings',
    category: 'display',
    variants: [
      { id: 'paycheck',  label: 'Paycheck',  payload: () => buildEarningsPayload('paycheck') },
      { id: 'incentive', label: 'Incentive', payload: () => buildEarningsPayload('incentive') },
      { id: 'advance',   label: 'Advance',   payload: () => buildEarningsPayload('advance') },
    ],
  },

  profile: {
    label: 'Profile',
    category: 'display',
    variants: [
      { id: 'worker', label: 'Worker', payload: () => buildProfilePayload('worker') },
      { id: 'admin',  label: 'Admin',  payload: () => buildProfilePayload('admin') },
    ],
  },

  leaderboard: {
    label: 'Leaderboard',
    category: 'display',
    variants: [
      { id: 'personal',    label: 'Personal', payload: () => buildLeaderboardPayload('personal') },
      { id: 'leaderboard', label: 'Top 5',    payload: () => buildLeaderboardPayload('leaderboard') },
    ],
  },

  location_map: {
    label: 'Map',
    category: 'input',
    variants: [
      { id: 'pin_drop',      label: 'Pin · confirm', payload: () => buildLocationMapPayload('pin_drop') },
      { id: 'pin_drop_cold', label: 'Pin · cold',    payload: () => buildLocationMapPayload('pin_drop_cold') },
      { id: 'nearby_jobs',   label: 'Nearby jobs',   payload: () => buildLocationMapPayload('nearby_jobs') },
      { id: 'geofence',      label: 'Geofence',      payload: () => buildLocationMapPayload('geofence') },
      { id: 'directions',    label: 'Directions',    payload: () => buildLocationMapPayload('directions') },
    ],
  },

  training_scenario: {
    label: 'Training Scenario',
    category: 'advanced',
    variants: [
      {
        id: 'pre_practice',
        label: 'Pre-practice (brief)',
        payload: () => ({
          widget_id: makeId('scen'),
          scenario_id: 'reliance-price-objection',
          mode: 'pre',
          title: 'Handling a price objection',
          subtitle: 'Enterprise sales · 10-minute role-play',
          context: 'You are pitching our platform to a decision-maker at a Mumbai-based logistics firm. They have expressed interest but are pushing back on pricing. Your goal is to understand the real concern, reframe the value, and move toward a next step — without dropping price on the first call.',
          role: {
            title: 'Senior Sales Executive',
            description: 'Product pitch lead for the Reliance account. You know the product cold and have closed two similar deals in the region this quarter.',
          },
          persona: {
            name: 'Rohan Mehta',
            title: 'Head of Operations, Prime Logistics',
            description: 'Data-driven, skeptical of vendor claims. Budget owner. Has used a competitor (ShipRocket) for 3 years and is hesitant to switch.',
          },
          criteria: [
            { name: 'Probe the concern',     description: 'Ask open-ended questions to surface the underlying objection before responding.' },
            { name: 'Reframe value',         description: 'Articulate ROI in their context — cost per shipment, onboarding time saved, switching pain offset.' },
            { name: 'Hold the line',         description: 'Avoid discounting on the first pass. Anchor the conversation to value before commercials.' },
            { name: 'Commit to a next step', description: 'Close on a concrete follow-up that moves the deal forward (pilot, deck review, stakeholder intro).' },
          ],
          start_label: 'Start practice',
          silent: false,
        }),
      },
      {
        id: 'post_practice',
        label: 'Post-practice (results)',
        payload: () => ({
          widget_id: makeId('scen'),
          scenario_id: 'reliance-price-objection',
          mode: 'post',
          title: 'Handling a price objection',
          subtitle: 'Enterprise sales · completed 2 min ago',
          results: {
            session_id: 'sess-2026-04-24-prime',
            overall_score: 74,
            criteria_scores: [
              { name: 'Probe the concern',     score: 82, feedback: 'Good discovery — "What\'s driving the timing pressure?" landed well and surfaced their Q4 board review.' },
              { name: 'Reframe value',         score: 78, feedback: 'Strong ROI framing, but you missed linking it back to their stated competitor-switching pain.' },
              { name: 'Hold the line',         score: 54, feedback: 'You offered a 12% discount at 8:42 without being asked. Anchor the commercial conversation to value first.' },
              { name: 'Commit to a next step', score: 82, feedback: 'Clean close — "Let\'s pilot with one route for 30 days" got a verbal yes on the call.' },
            ],
          },
          retry_label: 'Try again',
          silent: false,
        }),
      },
    ],
  },

}

/**
 * Look up a variant's payload. Returns an empty object if the type
 * or variantId is unknown — logs a warning so developer errors are
 * visible without crashing the Studio.
 */
export function getVariantPayload(type, variantId) {
  const schema = widgetSchemas[type]
  if (!schema) {
    console.warn(`[widgetSchemas] unknown type: ${type}`)
    return {}
  }
  const variant = schema.variants?.find((v) => v.id === variantId)
  if (!variant) {
    console.warn(`[widgetSchemas] unknown variant for ${type}: ${variantId}`)
    return {}
  }
  return variant.payload()
}
