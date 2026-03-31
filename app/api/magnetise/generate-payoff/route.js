import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req) {
  const { hook, build, contrarian } = await req.json()

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `You are writing the PAYOFF section of a short-form content piece for a coach, consultant or service provider.

Hook: "${hook}"
Build: "${build}"
Contrarian angle: "${contrarian}"

Write ONLY the payoff — 1–3 sentences.
- This is the landing. The insight or shift the viewer walks away with.
- It should make the whole piece feel worth watching.
- Do NOT include a CTA. No emojis. No preamble.
- Return only the payoff text.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('Generate payoff error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate' }, { status: 500 })
  }
}
