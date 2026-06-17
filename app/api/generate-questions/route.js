import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { problem_statement } = await req.json()

    if (!problem_statement?.trim()) {
      return NextResponse.json({ error: 'Problem statement required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You generate coaching questions for The Performance Flywheel™ playbook. Each framework has 3 questions: Reflection (self-awareness), Audit (diagnostic), Go Deeper (commitment/action). Questions must be specific to the client's problem. Write in second person. Be direct, psychologically sharp, no fluff. Respond ONLY with valid JSON — no markdown, no code fences.`,
      messages: [{
        role: 'user',
        content: `Generate tailored questions for each of these 5 frameworks, applied to this specific problem:

PROBLEM: "${problem_statement}"

THE 5 FRAMEWORKS:

1. The Identity Shift™ — Centre of The Performance Flywheel. Identity must shift first. The Identity Paradox: become it before you feel ready.
Questions should dig into: who they've been showing up as regarding this problem, where weak identity slows their flywheel, and who they need to become.

2. The Three Dials™ — Positive Behaviours — Install good behaviours by turning up Cue, removing Start friction, making Stop painful via accountability. This is about environment design.
Questions should dig into: the positive behaviour they keep starting and stopping, where it breaks down on the dials, and their accountability mechanism.

3. The Three Dials™ — Negative Behaviours — Every bad behaviour has Cue, Start, Stop dials. Turn down Cue, make Start harder, limit Stop damage.
Questions should dig into: the specific negative behaviour tied to this problem, mapping it to the three dials, and one change per dial.

4. The Negotiator™ — The internal voice that derails you using TFL: Time ("maybe later"), Feelings ("I'm tired"), Logic ("I'll see how it goes").
Questions should dig into: which TFL weapon hits them hardest with this problem, when they last got derailed, and their non-negotiable rules.

5. The Action Bridge™ — About closing the gap between knowing and doing. The Plank (smallest viable action) and The Struts (external pressure/accountability).
Questions should dig into: what they're avoiding related to this problem, the smallest first step, and who can hold them accountable.

Return this exact JSON structure:
{
  "framework_1": {
    "reflection": "question text",
    "audit": "question text",
    "go_deeper": "question text"
  },
  "framework_2": {
    "reflection": "question text",
    "audit": "question text",
    "go_deeper": "question text"
  },
  "framework_3": {
    "reflection": "question text",
    "audit": "question text",
    "go_deeper": "question text"
  },
  "framework_4": {
    "reflection": "question text",
    "audit": "question text",
    "go_deeper": "question text"
  },
  "framework_5": {
    "reflection": "question text",
    "audit": "question text",
    "go_deeper": "question text"
  }
}

Every question must reference their specific problem. No generic questions. Make them feel seen.`
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return NextResponse.json({ questions: parsed })
    } catch (parseErr) {
      console.error('Question JSON parse failed:', parseErr)
      return NextResponse.json({ error: 'Failed to parse questions' }, { status: 500 })
    }
  } catch (err) {
    console.error('Generate questions error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate questions' }, { status: 500 })
  }
}
