import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY || ''

  // Test the key directly with fetch
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    const data = await res.json()
    return NextResponse.json({
      key_length: key.length,
      key_prefix: key.slice(0, 12),
      key_suffix: key.slice(-6),
      api_status: res.status,
      api_response: data,
    })
  } catch (err) {
    return NextResponse.json({
      key_length: key.length,
      error: err.message,
    })
  }
}
