import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req) {
  const { hook, format, inputs, contrarian, niche } = await req.json()

  let formatInstructions = ''
  if (format === 'story') {
    formatInstructions = 'First person narrative. Specific and conversational. 3–5 sentences that pull the reader through a real moment. Do not generalise — use the exact details they gave you.'
  } else if (format === 'list') {
    formatInstructions = '3–5 punchy bullet points. Each one is a standalone insight that lands on its own. Start each with a dash. No padding, no filler.'
  } else if (format === 'steps') {
    formatInstructions = "3–5 numbered steps. Each is one clear, specific action. Outcome-focused. Write it like you're telling someone exactly what to do."
  }

  let rawInputs = ''
  if (format === 'story') {
    rawInputs = `Moment/situation: "${inputs.moment || ''}"\nWhat they noticed: "${inputs.realise || ''}"\nPersonal connection: "${inputs.connect || ''}"`
  } else if (format === 'list') {
    rawInputs = `Points: "${inputs.points || ''}"\nConnecting belief: "${inputs.thread || ''}"`
  } else if (format === 'steps') {
    rawInputs = `Desired outcome: "${inputs.outcome || ''}"\nSteps: "${inputs.steps || ''}"`
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are writing the BUILD section of a short-form content piece for a coach, consultant or service provider.

Hook: "${hook}"
Their niche context: "${niche}"
Their contrarian angle: "${contrarian}"
Format: ${format}
Their raw inputs:
${rawInputs}

Instructions:
- Write ONLY the build section. No hook, no payoff, no CTA.
- Use their raw inputs as the substance — do not invent. Shape and sharpen what they gave you.
- ${formatInstructions}
- Tone: direct, human, conversational. No corporate speak, no emojis.
- Return only the build text. Nothing else.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('Generate build error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate' }, { status: 500 })
  }
}
