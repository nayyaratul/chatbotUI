import { getVariantPayload } from './widgetSchemas.js'

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

registerRule({
  match: /^(show )?quick[- ]?reply/i,
  build: () => ({ type: 'quick_reply', payload: getVariantPayload('quick_reply', 'default') }),
})

// Confirmation Card — three tone variants reachable by typing.
// "show confirmation" / "show confirm"              → info    (default tone)
// "show caution confirmation" / "show commit"       → caution (high-stakes, e.g. job application)
// "show danger confirmation" / "show delete"        → danger  (irreversible + checkbox)

registerRule({
  match: /^(show )?(caution confirm(ation)?|commit(ment)?)/i,
  build: () => ({ type: 'confirmation', payload: getVariantPayload('confirmation', 'caution') }),
})

registerRule({
  match: /^(show )?(danger confirm(ation)?|delete|destructive)/i,
  build: () => ({ type: 'confirmation', payload: getVariantPayload('confirmation', 'danger') }),
})

registerRule({
  match: /^(show )?confirm(ation)?/i,
  build: () => ({ type: 'confirmation', payload: getVariantPayload('confirmation', 'info') }),
})

registerRule({
  match: /^(show )?(score|result)/i,
  build: () => ({ type: 'score_card', payload: getVariantPayload('score_card', 'default') }),
})

// Silent / explicit-submit variant — selection is fed to the bot but
// no user bubble is posted. User must tap Submit to commit.
registerRule({
  match: /^(show )?(silent|confidential)[- ]?(mcq|quiz|check)/i,
  build: () => ({ type: 'mcq', payload: getVariantPayload('mcq', 'silent') }),
})

registerRule({
  match: /^(show )?(mcq|quiz)/i,
  build: () => ({ type: 'mcq', payload: getVariantPayload('mcq', 'scored') }),
})

registerRule({
  match: /^(show )?multi[- ]?(select|choice|mcq)/i,
  build: () => ({ type: 'mcq', payload: getVariantPayload('mcq', 'multi') }),
})

// Form widget — basic registration form (name, phone, DOB, city, email)
registerRule({
  match: /^(show )?form/i,
  build: () => ({ type: 'form', payload: getVariantPayload('form', 'basic') }),
})

// Form widget — extended KYC / onboarding form
registerRule({
  match: /^(show )?(kyc|onboard(ing)?)/i,
  build: () => ({ type: 'form', payload: getVariantPayload('form', 'kyc') }),
})

// ─── Shift Calendar ────────────────────────────────────────────────
// Trigger: "shifts", "pick shifts", "shift calendar", "my schedule"
registerRule({
  match: /^(shifts|pick (my )?shifts|shift calendar|my schedule|weekly shifts)$/i,
  build: () => ({ type: 'shift_calendar', payload: getVariantPayload('shift_calendar', 'default') }),
})

// ─── Carousel — composed widgets (job cards in a rail) ────────────
// Trigger: "job picks", "recommended jobs", "pick a role"
// Demonstrates the CSV-spec item composition (carousel of job_cards).
// Uses the same richJobs() dataset as the standalone JobCard rule so
// the two presentations show identical data.
registerRule({
  match: /^(job picks|recommended jobs|pick a role|jobs for me|matching jobs)$/i,
  build: () => ({ type: 'carousel', payload: getVariantPayload('carousel', 'job_picks') }),
})

// ─── Carousel — onboarding tips (inline tile variant) ─────────────
// Trigger: "tips", "featured", "carousel"
registerRule({
  match: /^(tips|featured|carousel|show tips|onboarding tips)$/i,
  build: () => ({ type: 'carousel', payload: getVariantPayload('carousel', 'tips') }),
})

// ─── Validated Input — OTP variant ────────────────────────────────
// Trigger: "otp", "verify", "verification code"
registerRule({
  match: /^(otp|verify( otp)?|verification code|enter code)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'otp') }),
})

// ─── Validated Input — PAN variant ────────────────────────────────
// Trigger: "pan", "enter pan", "pan card"
registerRule({
  match: /^(pan( card)?|enter pan)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'pan') }),
})

// ─── Validated Input — Pincode variant ────────────────────────────
// Trigger: "pincode", "enter pincode"
registerRule({
  match: /^(pincode|enter pincode|zip)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'pincode') }),
})

// ─── Validated Input — Phone variant ──────────────────────────────
// Trigger: "phone", "enter phone", "mobile", "phone number"
registerRule({
  match: /^(phone( number)?|enter phone|mobile( number)?|my number)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'phone') }),
})

// ─── Validated Input — Email variant ──────────────────────────────
// Trigger: "email", "enter email"
registerRule({
  match: /^(email|enter email|email address|my email)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'email') }),
})

// ─── Validated Input — Aadhaar variant ────────────────────────────
// Trigger: "aadhaar number", "enter aadhaar" (the plain "aadhaar"
// keyword is already claimed by Image Capture)
registerRule({
  match: /^(aadhaar number|enter aadhaar|aadhaar card number|aadhar number)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'aadhaar') }),
})

// ─── Validated Input — Bank account variant ───────────────────────
// Trigger: "bank account", "account number"
registerRule({
  match: /^(bank account( number)?|account number|bank details)$/i,
  build: () => ({ type: 'validated_input', payload: getVariantPayload('validated_input', 'bank_account') }),
})

// ─── Rating — stars variant ───────────────────────────────────────
// Trigger: "rate", "rating", "feedback", "how was your shift"
registerRule({
  match: /^(rate|rating|feedback|how was (your|my|the) shift)$/i,
  build: () => ({ type: 'rating', payload: getVariantPayload('rating', 'stars') }),
})

// ─── Rating — thumbs variant ──────────────────────────────────────
// Trigger: "thumbs", "rate delivery"
registerRule({
  match: /^(thumbs|rate delivery|delivery feedback)$/i,
  build: () => ({ type: 'rating', payload: getVariantPayload('rating', 'thumbs') }),
})

// ─── Rating — emoji variant ──────────────────────────────────────
// Trigger: "emoji rating", "rate training"
registerRule({
  match: /^(emoji rating|rate training|training feedback)$/i,
  build: () => ({ type: 'rating', payload: getVariantPayload('rating', 'emoji') }),
})

// ─── Rating — NPS variant ────────────────────────────────────────
// Trigger: "nps", "recommend"
registerRule({
  match: /^(nps|recommend|recommend us|would you recommend)$/i,
  build: () => ({ type: 'rating', payload: getVariantPayload('rating', 'nps') }),
})

// ─── Instruction Card ─────────────────────────────────────────────
// Trigger: "how to", "guide", "instructions", "how to capture"
registerRule({
  match: /^(how to|guide|instructions|tutorial|tips)( capture| upload| take)?( aadhaar| photo)?$/i,
  build: () => ({ type: 'instruction_card', payload: getVariantPayload('instruction_card', 'info') }),
})

// ─── Checklist — read-only progress readout ───────────────────────
// Trigger: "my progress", "progress", "status", "my status"
// Matched BEFORE the interactive checklist so "progress" alone
// hits the read-only variant, not the interactive one.
registerRule({
  match: /^(my )?progress$|^(my )?status$|^(onboarding )?progress$/i,
  build: () => ({ type: 'checklist', payload: getVariantPayload('checklist', 'read_only') }),
})

// ─── Checklist — interactive to-do list ───────────────────────────
// Trigger: "checklist", "onboarding", "todo", "to do list"
registerRule({
  match: /^(checklist|to ?do( list)?|onboarding( checklist)?|tasks)$/i,
  build: () => ({ type: 'checklist', payload: getVariantPayload('checklist', 'interactive') }),
})

// ─── QC Evidence Review (task photo + AI annotations — CSV #20) ──
// Trigger: "qc", "qc review", "shelf photo"
registerRule({
  match: /^(qc|qc review|shelf photo|task photo|task qc)$/i,
  build: () => ({ type: 'qc_evidence_review', payload: getVariantPayload('qc_evidence_review', 'admin') }),
})

// ─── Evidence Review (candidate onboarding — multi-item) ─────────
// Trigger: "evidence review", "review evidence", "review docs"
// For task-photo QC with AI annotations, type `qc review` instead.
registerRule({
  match: /^(evidence( review)?|review evidence|review (my )?(submission|docs?))$/i,
  build: () => ({ type: 'evidence_review', payload: getVariantPayload('evidence_review', 'default') }),
})

// ─── Document Preview ──────────────────────────────────────────────
// Trigger: "offer letter", "show offer", "document preview",
// "my offer", "view contract", "show payslip"
// Matched before File Upload so verbs like "show" / "view" don't
// accidentally hit the upload regex.
registerRule({
  match: /^(show |preview |view |my )?(offer ?letter|contract|payslip|document preview|doc preview)$|^(document|doc) ?preview$/i,
  build: () => ({ type: 'document_preview', payload: getVariantPayload('document_preview', 'default') }),
})

// ─── File Upload ───────────────────────────────────────────────────
// Trigger: "upload file", "attach doc", "file upload", "upload pdf"
// Must be matched before Image Capture so the keywords "file"/"doc"/
// "pdf" don't get swallowed by the image-capture trigger.
registerRule({
  match: /^(upload|attach|send)\s+(a |the |your )?(file|doc|docs|document|pdf)|^(file|doc) ?upload$/i,
  build: () => ({ type: 'file_upload', payload: getVariantPayload('file_upload', 'default') }),
})

// ─── Image Capture — document variant (rectangular overlay) ───────
// Trigger: "aadhaar", "pan", "licence", "document", "capture aadhaar"
registerRule({
  match: /^(take |capture |upload )?(aadhaar|pan|photo|licence|license|image|document)$/i,
  build: () => ({ type: 'image_capture', payload: getVariantPayload('image_capture', 'document') }),
})

// ─── Image Capture — selfie variant (circular overlay, front cam) ─
// Trigger: "selfie", "kyc selfie", "verification selfie"
registerRule({
  match: /^(selfie|kyc selfie|verification selfie|liveness)$/i,
  build: () => ({ type: 'image_capture', payload: getVariantPayload('image_capture', 'selfie') }),
})

// ─── Image Capture — evidence variant (crosshair, rear cam) ──────
// Trigger: "task evidence", "shift evidence", "delivery photo"
registerRule({
  match: /^(task evidence|shift evidence|delivery photo|evidence photo|work photo)$/i,
  build: () => ({ type: 'image_capture', payload: getVariantPayload('image_capture', 'evidence') }),
})

// ─── Job Card — single card ────────────────────────────────────────
// Trigger: "job card", "show job card", "show job", "job"
registerRule({
  match: /^(show )?job(s)? ?card$|^(show )?job$/i,
  build: () => ({ type: 'job_card', payload: getVariantPayload('job_card', 'single') }),
})

// ─── Job Card — carousel ───────────────────────────────────────────
// Trigger: "jobs", "show jobs", "show carousel", "job carousel", etc.
// Uses the shared richJobs() dataset so the standalone JobCard
// carousel and the generic Carousel-of-job_cards show identical
// data.
registerRule({
  match: /^(show )?(jobs?|carousel)/i,
  build: () => ({ type: 'job_card', payload: getVariantPayload('job_card', 'carousel') }),
})

registerRule({
  match: /^(show )?progress/i,
  build: () => ({ type: 'progress', payload: getVariantPayload('progress', 'default') }),
})
