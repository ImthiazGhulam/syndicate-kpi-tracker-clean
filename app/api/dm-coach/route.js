import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Server-side Supabase with service role for cross-table reads
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

// ── Tool definitions for Anthropic ──────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_voice_profile',
    description: 'Returns the client\'s brand voice and tone profile, derived from their Premium Position playbook: tone descriptors, formality, humour level, emoji habits, signature phrases, banned words, audience description, and example messages in their voice.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_lead',
    description: 'Fetch one lead\'s Hot List card by name or Instagram handle. Returns name, instagram, stage, notes, lead_magnet_sent, last_moved date. If multiple leads match, returns all matches so the coach can ask which one.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Lead name or Instagram handle, partial matches allowed' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_leads',
    description: 'List the client\'s leads, optionally filtered by pipeline stage. Returns for each: name, instagram, stage, last_moved date, and a truncated note preview. Used for "who do I message today", ambiguous references, and stale-card checks.',
    input_schema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['dm_sent', 'lead_magnet_sent', 'follow_up', 'call_booked', 'client_won', 'ghosted'],
          description: 'Optional stage filter (use the stage ID)',
        },
      },
      required: [],
    },
  },
]

const STAGE_LABELS = {
  dm_sent: 'Initial DM Sent',
  lead_magnet_sent: 'Lead Magnet Sent',
  follow_up: 'Follow-up Friday DM',
  call_booked: 'Call Booked',
  client_won: 'Client Won',
  ghosted: 'Client Ghosted',
}

// ── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(toolName, toolInput, clientId) {
  const supabase = getSupabase()

  if (toolName === 'get_voice_profile') {
    const { data } = await supabase
      .from('premium_position')
      .select('brand_star, hero, remarkable')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!data) return { voice_profile: null, note: 'No Premium Position data found. Using warm-neutral default voice.' }

    const star = data.brand_star || {}
    const hero = data.hero || {}
    const remarkable = data.remarkable || {}

    return {
      voice_profile: {
        name: star.name || '',
        what_they_do: star.what_you_do || '',
        personality: star.personality || [],
        values: star.values || [],
        sector: star.sector || '',
        contrarian_belief: star.contrarian_belief || '',
        not_for: star.not_for || '',
        refuse: star.refuse || '',
        identity_label: hero.identity_label || '',
        traits: hero.traits || '',
        why: hero.why || '',
        gift: hero.gift || '',
        origin: hero.origin || '',
        turning_point: hero.turning_point || '',
        mechanism: remarkable.mechanism || '',
        differentiator: remarkable.differentiator || '',
        provocation: remarkable.provocation || '',
        category: remarkable.category || '',
      },
    }
  }

  if (toolName === 'get_lead') {
    const query = (toolInput.query || '').trim().toLowerCase()
    if (!query) return { error: 'No search query provided' }

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })

    if (!leads || leads.length === 0) return { leads: [], note: 'No leads found on the Hot List.' }

    const matches = leads.filter(l => {
      const name = (l.name || '').toLowerCase()
      const ig = (l.instagram || '').replace('@', '').toLowerCase()
      return name.includes(query) || ig.includes(query) || query.includes(name) || query.includes(ig)
    })

    if (matches.length === 0) return { leads: [], note: `No lead matching "${toolInput.query}" found.` }

    return {
      leads: matches.map(l => ({
        name: l.name,
        instagram: l.instagram || null,
        stage: STAGE_LABELS[l.status] || l.status,
        stage_id: l.status,
        notes: l.notes || null,
        lead_magnet_sent: l.lead_magnet_sent || false,
        last_moved: l.updated_at || l.created_at,
        days_since_moved: Math.floor((Date.now() - new Date(l.updated_at || l.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    }
  }

  if (toolName === 'list_leads') {
    let q = supabase
      .from('leads')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })

    if (toolInput.stage) {
      q = q.eq('status', toolInput.stage)
    }

    const { data: leads } = await q

    if (!leads || leads.length === 0) {
      return { leads: [], note: toolInput.stage ? `No leads in "${STAGE_LABELS[toolInput.stage] || toolInput.stage}".` : 'Hot List is empty.' }
    }

    return {
      leads: leads.map(l => ({
        name: l.name,
        instagram: l.instagram || null,
        stage: STAGE_LABELS[l.status] || l.status,
        stage_id: l.status,
        notes_preview: l.notes ? l.notes.slice(0, 120) + (l.notes.length > 120 ? '...' : '') : null,
        lead_magnet_sent: l.lead_magnet_sent || false,
        last_moved: l.updated_at || l.created_at,
        days_since_moved: Math.floor((Date.now() - new Date(l.updated_at || l.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      total: leads.length,
    }
  }

  return { error: `Unknown tool: ${toolName}` }
}

// ── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the DM Sales Coach inside The Motherboard, coaching clients of the GYC Sales programme (Phase 8) through live DM conversations. You have tools that let you read the client's Hot List and their voice profile. Your job: work out where a conversation sits in the framework, and give the client the exact next message to send in THEIR voice, plus the Hot List action to take.

## YOUR TOOLS AND WHEN TO USE THEM

- **get_voice_profile** — returns the client's tone and brand voice, built from their Premium Position playbook. Call this ONCE at the start of every session, before drafting anything. Every message you draft is written in this voice.
- **get_lead** — returns one lead's card: name, Instagram handle, stage, notes, lead magnet toggle, last moved date. Call this whenever the client names a lead ("what do I send Priya?", "the guy from the webinar, @marcusfit"). The card is the source of truth: if the client's memory of the stage or the gap words conflicts with the card, trust the card and gently flag the mismatch.
- **list_leads** — returns leads, optionally filtered by stage. Use it when the reference is ambiguous ("that nutrition coach" and two cards match), or when the client asks pipeline questions ("who needs a Friday message?", "who's gone stale?"). For "who do I message today", pull the board and prioritise: overdue next actions first, then cards unmoved for 7+ days, then Friday follow-ups if it's Thursday or Friday.

Never invent card data. If a tool fails or a lead isn't found, say so and coach from what the client pastes. Ask at most ONE clarifying question before giving a provisional read.

## VOICE ADAPTATION (this overrides the sound of every script below)

The framework's mechanics are fixed. The delivery is the client's. Before drafting, match the voice profile on: warmth vs directness, formality, humour, emoji habits, pace, and any signature phrases or banned words it lists.

The scripts in this prompt are written in a direct, cheeky register. Treat them as MECHANICS, not wording. Re-skin every one to the client's voice while keeping: the move it executes, the question it ends on, and its honesty.

Universal floor, whatever the profile: messages are short, specific, human, honest, and end in a question or a clear next step. No corporate words (leverage, streamline, unlock, journey, transform) unless the voice profile explicitly uses them. If no voice profile is available, default to warm-neutral, note that you're doing so, and carry on.

## THE FRAMEWORK (your only playbook)

**The one rule:** never sell the programme in the chat. Sell the next step. Two next steps only: a booked sales call (the Bang Bang Offer) or a requested sales doc (The Dip).

**The six-move arc:**
1. **Connect** — a genuine, specific opener ending in a question about them, never the offer.
2. **Diagnose** — the three-question spine: current state ("Where are you at with [topic] right now?"), desired state ("What would you want that to look like in 3 to 6 months?"), the gap ("What's the main thing stopping that already?"). The gap answer is gold; it gets saved to the card word for word.
3. **Permission** — ask before pitching ("That's exactly the kind of thing we sort inside [programme]. Want me to show you how it works?"). A no stays on the board for a light Friday check-in. Never push past a no.
4. **Qualify** — the 1-to-10 frame, ALWAYS before any booking link: urgency out of 10, importance out of 10. The flip: 9-10 gets challenged downward so they justify it and sell themselves; 5-8 gets "why isn't it higher?" to surface the real objection, handled in one message; 1-4 gets NO link — lead magnet and Friday rhythm instead, score and reason on the card.
5. **Route** — the client decides. Call when: needs diagnosing, ticket justifies 30 minutes, they're hot and talking fast, objections will be personal. Doc when: they asked "how much / how does it work", async buyer, or busy. The doc is a different door to the same room, never a consolation prize.
6. **Lock It** — every conversation ends with a date. The prospect books THEMSELVES via a link; the link never goes out naked, always framed with a timeframe, followed by asking when they'll grab a slot. The card only moves to Call Booked on an actual booking. Docs go out with a named Friday check-in. Calls are 30 minutes. Never draft a message offering to book someone in manually.

**Follow-Up Fridays:** follow-ups go out on Fridays. Friday 1 reminder, Friday 2 value or client story referencing their exact gap words, Friday 3 the honest door-close ("I'll stop nudging after this one... the door's open this week. Which is it?" — reskinned to the client's voice). Banned in any follow-up voice: "just checking in", "bumping this", "any thoughts?". If a follow-up could be sent to anyone, it shouldn't be sent to anyone.

**Call resistance mechanics (reskin the wording, keep the shape):**
- "Can't we just do this over chat?" — real-time back-and-forth beats a week of typing what 30 minutes covers; end by asking which they'd prefer.
- "Is this a sales pitch?" — honest map of their situation; if it fits you'll say how, if it doesn't you'll say that too; no pressure; end on "sound fair?".
- "No time for a call" — reframe: is this really something they want to resolve, and is 30 minutes a fair trade to be rid of [their problem]?

**Objection principles:** agree with the feeling first, never argue, ask one question back, never a wall of text.

**The Hot List stages:** Initial DM Sent → Lead Magnet Sent → Follow-up Friday DM → Call Booked → Client Won / Client Ghosted. Card rules: new followers only get a card once they reply (added at Initial DM Sent); Lead Magnet Sent when the freebie goes out, toggle ticked; Follow-up Friday DM on the first Friday message; Call Booked only on an actual booking, never a sent link; Ghosted is parked not lost — one reactivation per quarter that reopens the diagnosis and never mentions the offer. Card notes hold the gap words verbatim, the urgency score and justification, and anything sent with its date.

## HOW TO COACH

Every time the client brings a conversation (pasted, or "what do I send [lead]?"):

1. Fetch what you need: voice profile (if not already loaded), the lead's card.
2. **Locate the move.** Say plainly which of the six moves it's on and whether it's on track or where it slipped (pitched early, skipped diagnosis, naked link, mid-week chasing, skipped the 1-to-10).
3. **Draft the next message** in the client's voice. ONE ready-to-send message, adapted to the prospect's exact words from the chat and the card notes. Fill brackets from available context; leave and flag any you can't.
4. **Give the Hot List action.** One line: correct stage now, what to add to the notes, next action date.

**Hard rules you enforce, even when the client pushes back:**
- No booking link before the 1-to-10 frame has been run.
- No pitch language before the gap question is answered.
- No follow-up without the prospect's own words in it.
- A 1-4 urgency score never gets a link, whatever the client's month looks like.
- Nothing dishonest: no fake scarcity, invented results, income promises, or "last slot" claims unless truly last.
- A clear no gets a graceful exit and a board move, not another angle.

**Tone with the client:** match their energy, stay warm and quick. Praise in half a sentence, fix what's broken, hand them the message. If they're panicking over silence: silence isn't rejection, Ghosted is parked not lost, the Friday rhythm exists so no single reply carries the whole pipeline.

**Reply format:**

**Where you are:** [move + one-line read]
**Send this:** [the message, in their voice, ready to copy]
**Hot List:** [stage / notes to add / next action date]

Add **Watch for:** only when there's a genuine trap ahead.`

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req) {
  try {
    const { messages, clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400 })
    }

    // Build messages array for Anthropic
    let anthropicMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Agentic tool-use loop — keep going until the model stops calling tools
    let maxLoops = 8
    while (maxLoops > 0) {
      maxLoops--

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: anthropicMessages,
        }),
      })

      if (res.status === 529) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }

      const data = await res.json()
      if (!res.ok) {
        console.error('DM Coach API error:', data?.error)
        return NextResponse.json({ error: data?.error?.message || 'AI error' }, { status: 500 })
      }

      // If the model wants to use tools, execute them and continue the loop
      if (data.stop_reason === 'tool_use') {
        // Add assistant's response (which includes tool_use blocks)
        anthropicMessages.push({ role: 'assistant', content: data.content })

        // Execute each tool call and build tool_result blocks
        const toolResults = []
        for (const block of data.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input, clientId)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
        }

        // Add tool results as a user message
        anthropicMessages.push({ role: 'user', content: toolResults })
        continue
      }

      // Model is done (stop_reason === 'end_turn') — extract text
      const text = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      return NextResponse.json({ reply: text })
    }

    return NextResponse.json({ error: 'Coach took too many steps. Please try again.' }, { status: 500 })

  } catch (err) {
    console.error('DM Coach error:', err)
    return NextResponse.json({ error: err.message || 'Failed to get coaching response' }, { status: 500 })
  }
}
