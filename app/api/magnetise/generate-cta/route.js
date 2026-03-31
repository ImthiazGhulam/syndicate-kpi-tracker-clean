import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req) {
  const { hook, build, payoff, ctaType } = await req.json()

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Write a single CTA line for this short-form content piece.

Hook: "${hook}"
Build: "${build}"
Payoff: "${payoff}"
CTA type: "${ctaType}"

Rules:
- One sentence. Natural, not forced.
- The piece should feel incomplete without it.
- No emojis. Return only the CTA line.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('Generate CTA error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate' }, { status: 500 })
  }
}
