/* A small, offline "intelligence" layer for the mock bot.
 *
 * Not a real model — a curated intent base for the betterplace gig-work
 * domain (shifts, earnings, payouts, KYC, attendance, support, …) matched
 * by keyword scoring. It catches free-text questions that the exact-trigger
 * widget rules in mockBot.js don't, and replaces the old "You said: …"
 * echo with a helpful answer (or an actionable fallback). Answers are kept
 * short and conversational so they read well AND speak well via TTS.
 *
 * To extend: add an entry with `keys` (lowercase; multi-word phrases score
 * higher) and a one-to-three sentence `answer`.
 */

const KNOWLEDGE = [
  {
    keys: ['how much', 'earn', 'my pay', 'salary', 'income', 'wage', 'take home', 'how much money'],
    answer:
      "Your pay depends on the shifts you complete. This week you're at about ₹4,200 across five shifts. Say 'earnings' for the full breakdown.",
  },
  {
    keys: ['when do i get paid', 'payout', 'payday', 'salary credit', 'when is my payment', 'when will i be paid', 'payment date'],
    answer:
      "Payouts run every Monday for the previous week's completed shifts, and usually reach your bank within a day. Need it sooner? Say 'advance'.",
  },
  {
    keys: ['advance', 'withdraw early', 'money now', 'salary advance', 'early pay', 'earned wage'],
    answer:
      "You can withdraw part of what you've already earned before payday. Say 'advance' and I'll show how much is available right now.",
  },
  {
    keys: ['how do i apply', 'find jobs', 'find work', 'get a job', 'get work', 'looking for work', 'apply for', 'new job'],
    answer:
      "Tell me the kind of work and the area you want, or just say 'jobs' and I'll show what's open near you.",
  },
  {
    keys: ['attendance', 'check in', 'clock in', 'mark present', 'punch in', 'checked in'],
    answer:
      "You check in from the shift screen once you reach the site — I confirm you're inside the location. Say 'map check-in' to see how it works.",
  },
  {
    keys: ['take leave', 'cancel shift', 'cant come', 'can not make', 'miss a shift', 'sick', 'day off', 'wont make it'],
    answer:
      "If you can't make a shift, cancel it at least four hours ahead from your schedule so it doesn't hurt your reliability score. Want me to open your shifts?",
  },
  {
    keys: ['kyc', 'documents', 'verify', 'verification', 'what documents', 'aadhaar', 'pan card', 'onboarding'],
    answer:
      "For verification you'll need your Aadhaar, PAN, and a bank account. Say 'kyc' and I'll take you through it step by step.",
  },
  {
    keys: ['reliability', 'my score', 'my rating', 'performance score', 'how am i rated'],
    answer:
      "Your reliability score tracks on-time check-ins and completed shifts. You're at ninety-four percent this month — stay above ninety for premium shifts.",
  },
  {
    keys: ['support', 'help me', 'contact', 'customer care', 'talk to someone', 'complaint', 'grievance', 'call hr', 'human'],
    answer:
      "I can connect you with a person — just say 'call HR'. Or tell me what's wrong and I'll try to sort it first.",
  },
  {
    keys: ['bonus', 'incentive', 'extra money', 'reward', 'weekly target'],
    answer:
      "You earn bonuses for hitting weekly shift targets and for high ratings. You're about ₹200 from this week's bonus. Say 'incentives' to track it.",
  },
  {
    keys: ['training', 'learn', 'how to do the job', 'practice', 'how does this work'],
    answer:
      "Each role has a short training. Say 'training' for a practice scenario, or 'video' for the safety modules.",
  },
  {
    keys: ['working hours', 'shift timing', 'how many hours', 'what time', 'shift duration'],
    answer:
      "Shift hours vary by role — most run six to eight hours. Say 'shifts' to see this week's slots and their timings.",
  },
  {
    keys: ['where is', 'how far', 'location of', 'directions', 'how do i get there', 'route'],
    answer:
      "I can show the site on a map with directions. Say 'map directions' and I'll plot the route from where you are.",
  },
  {
    keys: ['what can you do', 'what do you do', 'options', 'what can i ask', 'how can you help'],
    answer:
      "I can find shifts, check your earnings and payouts, run your KYC, handle attendance, and more. What would you like to do?",
  },
  {
    keys: ['who are you', 'your name', 'what are you', 'are you a bot', 'are you human'],
    answer:
      "I'm Ada, your work assistant. I help with shifts, earnings, and getting set up. What do you need?",
  },
  {
    keys: ['thank', 'thanks', 'appreciate', 'cheers'],
    answer: 'Anytime! Anything else I can help with?',
  },
]

const FALLBACK =
  "I'm not totally sure on that one yet — but I can help with finding shifts, your earnings and payouts, KYC, attendance, or training. Which of those would you like?"

function normalize(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-effort answer to a free-text question. Returns the matched answer,
 * or a helpful fallback when nothing scores. Multi-word keys count double
 * so a specific phrase outranks an incidental single-word hit.
 */
export function answerQuestion(rawText) {
  const q = normalize(rawText)
  if (!q) return FALLBACK

  let best = null
  let bestScore = 0
  for (const entry of KNOWLEDGE) {
    let score = 0
    for (const key of entry.keys) {
      if (q.includes(key)) score += key.includes(' ') ? 2 : 1
    }
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return bestScore > 0 ? best.answer : FALLBACK
}
