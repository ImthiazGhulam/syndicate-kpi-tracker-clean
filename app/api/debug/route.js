import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    hasKey: !!key,
    keyStart: key ? key.slice(0, 10) + '...' : 'NOT SET',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('SUPABASE') || k.includes('APIFY')),
  })
}
