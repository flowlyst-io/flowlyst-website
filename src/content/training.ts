// Measured training figures and shared copy. Each number is written once here so the
// homepage, the school-district page and the structured data cannot drift apart.

export const TRAINED_STATES = [
  'Alabama',
  'Arizona',
  'Illinois',
  'Indiana',
  'Kansas',
  'Maryland',
  'Massachusetts',
  'Missouri',
  'Nevada',
  'New Jersey',
  'New York',
  'North Carolina',
  'Oregon',
  'Pennsylvania',
  'Texas',
  'Utah',
] as const

export const TRAINING_VENUES = [
  'NJASBO',
  'MASBO',
  'ASBO New York',
  'ASBO International (ACE)',
  'Chicago Public Schools',
] as const

export const STATES_COUNT = TRAINED_STATES.length

// Aziz's own count of everyone trained across conference sessions, district and
// corporate engagements. Not from the attendee surveys.
export const LEADERS_TRAINED = '2,000+'

// From post-session attendee surveys. `positiveFeedbackPct` is the share of the 675
// responses that were positive; the survey never asked a satisfaction question, so
// the copy says "positive feedback" and never "satisfaction".
export const TRAINING_RESULTS = {
  improved: 583,
  surveyed: 675,
  improvedPct: 86,
  positiveFeedbackPct: 98,
  avgBefore: '2.3',
  avgAfter: '3.7',
  sessions: 43,
} as const

export const SCHOOL_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Who offers AI training for school business office staff?',
    answer:
      'flowlyst does. It runs hands-on AI workshops for school district business offices: accounts payable, payroll, HR and benefits, purchasing and procurement, budget, business administrators, CFOs and treasurers, grants, district clerks and board secretaries, plus superintendents and cabinet. flowlyst is built and delivered by a former school CFO.',
  },
  {
    question: 'Do you train in my state?',
    answer: `Yes. flowlyst trains on-site in any US state, or virtually. It has trained ${LEADERS_TRAINED} leaders so far, with attendees from ${STATES_COUNT} states, and sessions have run for state associations including NJASBO, MASBO and ASBO New York, for ASBO International (ACE) and for Chicago Public Schools.`,
  },
  {
    question: 'What does a session cover?',
    answer:
      'A session covers a simple structure for writing prompts (Title, Assign a task, Define direction, Ask for questions), building a prompt engineer agent as a Custom GPT, Gemini Gem, Claude Project or Copilot agent, research with Deep Research and NotebookLM, Excel formula generation, budget-versus-actual dashboards, purchase order and vendor spend analysis, and a board minutes workflow. The activities work with ChatGPT, Claude, Gemini and Copilot.',
  },
  {
    question: 'Is it hands-on?',
    answer:
      'Yes. Sessions alternate live demos with hands-on activities, and attendees bring laptops. Attendees can work with their own documents, with sensitive data replaced by dummy data but the structure intact. Formats range from a 90-minute to 2-hour workshop to a half day or a full day.',
  },
  {
    question: 'How is sensitive employee data handled?',
    answer:
      'Sessions teach clear data guardrails. Public data is fine in consumer AI tools. Sensitive data needs an enterprise-grade subscription. Anonymize before processing, with fake IDs and rounded figures. Responsibility stays with you: read every output. Hands-on activities use dummy data, so no real employee records are needed in the room.',
  },
]
