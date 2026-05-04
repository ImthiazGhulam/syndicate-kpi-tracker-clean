import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function callClaude(system, user, maxTokens = 2500) {
  let message
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      })
      return message
    } catch (apiErr) {
      if (apiErr.status === 529 && attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
        continue
      }
      throw apiErr
    }
  }
}

export async function POST(req) {
  try {
    const { type, data } = await req.json()

    let systemPrompt = ''
    let userPrompt = ''

    if (type === 'wealth-wired') {
      systemPrompt = 'You are a no-nonsense business and wealth coach. You write direct, raw, actionable plans. No fluff, no motivational filler. Every sentence must be a specific action or a hard truth. Tone: like a mentor who genuinely cares but refuses to sugarcoat anything.'
      userPrompt = `Based on this client's Wealth Wired™ Workbook answers, write a personalised 30-day action plan.

Their answers across 8 financial rewiring frameworks:

THE TRINITY TRAP™
Reflection: ${data.module_1?.reflection || 'Not answered'}
Audit: ${data.module_1?.audit || 'Not answered'}
Go Deeper: ${data.module_1?.go_deeper || 'Not answered'}

THE ASCENSION LADDER™
Reflection: ${data.module_2?.reflection || 'Not answered'}
Audit: ${data.module_2?.audit || 'Not answered'}
Go Deeper: ${data.module_2?.go_deeper || 'Not answered'}

THE BROKIE VENN™
Reflection: ${data.module_3?.reflection || 'Not answered'}
Audit: ${data.module_3?.audit || 'Not answered'}
Go Deeper: ${data.module_3?.go_deeper || 'Not answered'}

THE REWIRE TRIANGLE™
Reflection: ${data.module_4?.reflection || 'Not answered'}
Audit: ${data.module_4?.audit || 'Not answered'}
Go Deeper: ${data.module_4?.go_deeper || 'Not answered'}

THE MATRIX™
Reflection: ${data.module_5?.reflection || 'Not answered'}
Audit: ${data.module_5?.audit || 'Not answered'}
Go Deeper: ${data.module_5?.go_deeper || 'Not answered'}

THE TRANSITION BRIDGE™
Reflection: ${data.module_6?.reflection || 'Not answered'}
Audit: ${data.module_6?.audit || 'Not answered'}
Go Deeper: ${data.module_6?.go_deeper || 'Not answered'}

THE FINANCIAL SABOTAGE LOOP™
Reflection: ${data.module_7?.reflection || 'Not answered'}
Audit: ${data.module_7?.audit || 'Not answered'}
Go Deeper: ${data.module_7?.go_deeper || 'Not answered'}

THE WEALTH CYCLE™
Reflection: ${data.module_8?.reflection || 'Not answered'}
Audit: ${data.module_8?.audit || 'Not answered'}
Go Deeper: ${data.module_8?.go_deeper || 'Not answered'}

Write a 30-day action plan structured as:
- Week 1: 3 specific actions based on their identity and awareness answers
- Week 2: 3 specific actions based on their pattern-breaking answers
- Week 3: 3 specific actions based on their positioning and bridge answers
- Week 4: 3 specific actions based on their systems and wealth cycle answers
- 3 Non-Negotiable Commitments pulled from what they actually wrote

Reference their specific words and situations. Do not give generic advice. Every action must be tied to something they personally revealed. Be direct. Be specific. Be useful.`

    } else if (type === 'unshakeable') {
      const startDate = data.start_date || new Date().toISOString().split('T')[0]
      const duration = data.duration || 7

      systemPrompt = `You are a direct, psychologically sharp performance coach. You create specific, time-bound action plans. No fluff. Every task must be tied to the client's actual answers. Respond ONLY with valid JSON — no markdown, no code fences, no explanation outside the JSON.`
      userPrompt = `Based on this client's Performance Flywheel™ Playbook answers, create a structured ${duration}-day action plan to solve their specific problem.

THE PROBLEM THEY ARE SOLVING:
${data.problem_statement || 'Not specified'}

Their answers across 5 performance rewiring frameworks (in flywheel order):

1. THE IDENTITY SHIFT™
Reflection: ${data.framework_1?.reflection || 'Not answered'}
Audit: ${data.framework_1?.audit || 'Not answered'}
Go Deeper: ${data.framework_1?.go_deeper || 'Not answered'}

2. THE THREE DIALS™ — POSITIVE BEHAVIOURS (Environment)
Reflection: ${data.framework_2?.reflection || 'Not answered'}
Audit: ${data.framework_2?.audit || 'Not answered'}
Go Deeper: ${data.framework_2?.go_deeper || 'Not answered'}

3. THE THREE DIALS™ — NEGATIVE BEHAVIOURS
Reflection: ${data.framework_3?.reflection || 'Not answered'}
Audit: ${data.framework_3?.audit || 'Not answered'}
Go Deeper: ${data.framework_3?.go_deeper || 'Not answered'}

4. THE NEGOTIATOR™
Reflection: ${data.framework_4?.reflection || 'Not answered'}
Audit: ${data.framework_4?.audit || 'Not answered'}
Go Deeper: ${data.framework_4?.go_deeper || 'Not answered'}

5. THE ACTION BRIDGE™
Reflection: ${data.framework_5?.reflection || 'Not answered'}
Audit: ${data.framework_5?.audit || 'Not answered'}
Go Deeper: ${data.framework_5?.go_deeper || 'Not answered'}

The plan starts on ${startDate}. Generate exactly ${duration} days of tasks starting from that date. Each day gets 1-2 tasks. Tasks should be concrete actions they can complete in a single sitting.

Early days: focus on The Identity Shift — who they need to become, and installing the right positive behaviours and environment.
Middle days: focus on removing negative behaviours using The Three Dials and defeating The Negotiator's TFL weapons.
Final days: focus on The Action Bridge — crossing the gap, executing, and locking the flywheel in place with accountability.

Respond with ONLY this JSON structure:
{
  "tasks": [
    {
      "title": "Short task title (max 60 chars)",
      "description": "2-3 sentences explaining what to do and why, referencing their specific answers",
      "day_offset": 0,
      "scheduled_time": "09:00",
      "duration_minutes": 20
    }
  ],
  "summary": "One paragraph summary of what this plan will achieve for them specifically"
}

day_offset is 0 for start date, 1 for next day, etc. scheduled_time in HH:MM 24h format. duration_minutes between 10-45.
Reference their specific words. Every task must tie to something they revealed. Be direct and psychologically sharp.`

    } else if (type === 'ai-accelerator') {
      const level = data.comfort_level || 1
      const levelDesc = level === 1 ? 'Complete newbie — needs a single copy-paste prompt' : level === 2 ? 'Getting started — can follow multi-step workflows' : level === 3 ? 'Comfortable — can use Zapier/Make automations' : 'Ready to build — can use Claude Code'

      systemPrompt = `You build practical AI tools for coaches, consultants, and service providers who have NEVER used AI before. Write instructions so detailed that a child could follow them. No jargon. No assumptions. Every single click, every single action, spelled out. The client's AI comfort level is: ${levelDesc}. Respond ONLY with valid JSON — no markdown, no code fences.`
      userPrompt = `Build an AI tool for this person based on their answers.

THEIR PROBLEM: ${data.problem_statement || 'Not specified'}

WHAT THEY DO MANUALLY RIGHT NOW:
${data.manual_process || 'Not described'}

WHAT THE PERFECT RESULT LOOKS LIKE:
${data.ideal_output || 'Not described'}

WHERE IT CURRENTLY BREAKS:
${data.where_it_breaks || 'Not described'}

AI COMFORT LEVEL: ${level} (${levelDesc})

Generate a complete AI tool. Return this exact JSON structure:
{
  "prompt": "A complete, ready-to-use prompt they can paste into Claude. Include clear Role, Context, and Output sections. Make it hyper-specific to their exact problem using their own words. Include placeholders in [SQUARE BRACKETS] for any information they need to fill in each time they use it (e.g. [CLIENT NAME], [THEIR SPECIFIC PROBLEM]). Add a note at the end of the prompt explaining what each placeholder means.",
  "sop": {
    "tool_recommendation": "Use Claude at claude.ai — it's the most capable AI for this type of task because [specific reason related to their use case].",
    "steps": [
      "EVERY step must be incredibly detailed. Write them as if the person has never used a computer before. Here is the level of detail required:",
      "Step 1: Open your web browser (Safari, Chrome, or whatever you use to go on the internet). In the address bar at the top, type claude.ai and press Enter. If you don't have an account yet, click 'Sign Up' and create one using your email address. If you already have one, click 'Log In'.",
      "Step 2: Once you're logged in, you'll see a text box at the bottom of the screen that says 'Message Claude'. This is where you'll paste your prompt. Click on that box so your cursor is blinking inside it.",
      "Step 3: Now go back to The Motherboard and find your prompt above. Click the 'Copy' button next to it. Go back to the Claude tab in your browser. Right-click inside the text box and select 'Paste' (or press Ctrl+V on Windows / Cmd+V on Mac).",
      "Step 4: Before you press Enter, look for any text in [SQUARE BRACKETS] in the prompt. Replace each one with your actual information. For example, replace [CLIENT NAME] with your client's real name. Delete the square brackets too.",
      "Step 5: Once all brackets are replaced with real information, press Enter (or click the send arrow). Claude will start writing your [specific output type]. Wait for it to finish — it usually takes 10-30 seconds.",
      "Step 6: Read through what Claude wrote. If it's good, copy the whole thing (click and drag to select all the text, then right-click and 'Copy'). If something isn't quite right, type underneath: 'Can you change [what you want different]' and press Enter again — Claude will revise it.",
      "Step 7: Paste the final result into [where they need to use it — be specific, e.g. 'a new email in Gmail', 'a Google Doc', 'your WhatsApp message to the client']. Done."
    ]
  },
  "test_task": {
    "title": "One specific thing to try tomorrow (max 60 chars)",
    "description": "Be extremely specific. Name the exact action: 'Take your next client enquiry that comes in tomorrow. Instead of writing the reply yourself, open Claude, paste in your prompt, fill in the brackets with their details, and let Claude write the reply. Compare it to what you would have written. You'll be shocked how good it is — and how fast it was.'"
  }${level >= 4 ? `,
  "build_guide": {
    "what_to_build": "One sentence describing the tool they'll build",
    "steps": [
      "Step 1 — Get Claude Code: Go to claude.ai/download in your web browser. Download the Claude Code desktop app for your computer (Mac or Windows). Once it downloads, open the file and install it like any other app — drag it to Applications on Mac, or click Install on Windows.",
      "Step 2 — Open it: Find Claude Code in your apps and open it. It looks like a dark window with a text box at the bottom. If it asks you to sign in, use the same account you use for claude.ai. You only need to do this once.",
      "Step 3 — Tell it what to build: Click in the text box at the bottom and describe what you want in plain English. Be specific. For example: 'I want you to build me a simple tool that takes a client's name and their problem, and generates a personalised proposal email in my tone of voice. Here's an example of how I write: [paste an example email].' The more detail you give, the better the result.",
      "Step 4 — Let it work: Claude Code will start building. You'll see it writing code and creating files. Don't panic — you don't need to understand the code. It will ask you questions as it goes, like 'Should I add a button for this?' or 'What colour scheme do you want?' Just answer in plain English. If it asks to create or edit a file, say 'yes'.",
      "Step 5 — Test it: When Claude Code says it's done, it will tell you how to see what it built. Usually it will say something like 'Open your browser and go to localhost:3000'. Just follow what it says. You'll see your tool. Click around. Try it with real information from your business.",
      "Step 6 — Fix and refine: If something isn't quite right — the wording is off, a button is in the wrong place, you want to add something — just type what you want changed. 'Make the heading bigger', 'Change the button colour to gold', 'Add a field for the client's phone number'. Claude Code will make the change instantly. Keep going until it's exactly what you want.",
      "Step 7 — Get help deploying: Once you're happy with it, tell Claude Code: 'Help me deploy this so I can access it from any device.' It will walk you through putting it online. If you get stuck at this step, message your coach — this is the one part that might need a hand the first time."
    ]
  }` : ''}
}

CRITICAL RULES:
- The SOP steps must be so detailed that someone who has NEVER used AI could follow them without asking a single question. Spell out every click, every action, every screen they'll see.
- The prompt must reference their SPECIFIC problem, their SPECIFIC process, their SPECIFIC words. Not generic.
- Include [SQUARE BRACKET] placeholders in the prompt for anything that changes each time they use it, and explain what each placeholder means.
- The test task must name ONE specific real-world scenario they can try tomorrow — not vague, not "try it with a client", but "take your next [specific thing from their process] and run it through Claude instead of doing it manually".
- For the SOP, tell them exactly where to find Claude (claude.ai), exactly where to click, exactly where to paste, exactly what to do with the output.${level >= 3 ? ' For Level 3+, also include automation suggestions (e.g. connecting with Zapier/Make) as additional steps.' : ''}`

    } else if (type === 'premium-position') {
      systemPrompt = 'You are a premium brand positioning strategist. You write sharp, specific, actionable brand plans. No generic marketing advice. Every recommendation must reference the client\'s specific positioning data. Tone: expert, direct, commercially minded.'
      userPrompt = `Based on this client's Premium Position™ Blueprint, write a personalised 30-day positioning action plan.

BRAND BUCKET™ DIAGNOSIS
Gap description: ${data.bucket?.gap_description || 'Not provided'}
Visibility score: ${data.bucket?.vis_score || '?'}/20
Engagement score: ${data.bucket?.eng_score || '?'}/20
Trust score: ${data.bucket?.tru_score || '?'}/20

COLT BRAND STAR™
Brand: ${data.brand_star?.name || 'Not set'}
Who they serve: ${data.brand_star?.specific_description || 'Not set'}
Sector: ${data.brand_star?.sector || 'Not set'}
What they do: ${data.brand_star?.what_you_do || 'Not set'}
Contrarian belief: ${data.brand_star?.contrarian_belief || 'Not set'}
What they refuse: ${data.brand_star?.refuse || 'Not set'}
Values: ${(data.brand_star?.values || []).join(', ') || 'Not set'}
Personality: ${(data.brand_star?.personality || []).join(', ') || 'Not set'}

HERO FRAMEWORK
Origin: ${data.hero?.origin || 'Not set'}
Turning point: ${data.hero?.turning_point || 'Not set'}
Hard way lesson: ${data.hero?.hard_way || 'Not set'}
Gift to clients: ${data.hero?.gift || 'Not set'}
Why they do this: ${data.hero?.why || 'Not set'}
Identity label: ${data.hero?.identity_label || 'Not set'}

REMARKABLE FACTOR
Category: ${data.remarkable?.category || 'Not set'}
Unique mechanism: ${data.remarkable?.mechanism || 'Not set'}
Differentiator: ${data.remarkable?.differentiator || 'Not set'}
Provocation: ${data.remarkable?.provocation || 'Not set'}
Premium signals: ${(data.remarkable?.signals || []).join(', ') || 'None'}
Signal gaps: ${(data.remarkable?.signal_gaps || []).join(', ') || 'None'}

Write a 30-day positioning sprint:
- Week 1: Fix their primary brand leak with 3 specific actions
- Week 2: Launch their brand story with 3 content actions
- Week 3: Deploy their unique mechanism with 3 positioning actions
- Week 4: Close premium signal gaps with 3 specific actions
- 3 key positioning moves they must make this month

Reference their specific data throughout. Not generic. Commercially actionable.`

    } else if (type === 'sold-out') {
      systemPrompt = 'You are a high-ticket offer architect. You write precise, commercially viable launch plans. Every step must move the client closer to revenue. No theory. No fluff. Tone: strategic, direct, results-focused.'
      userPrompt = `Based on this client's Sold Out™ Playbook, write a personalised offer launch plan.

ICP (IDEAL CLIENT PROFILE)
Client type: ${data.icp?.client_type || 'Not set'}
Sector: ${data.icp?.sector || 'Not set'}
Specific description: ${data.icp?.specific_description || 'Not set'}
Dream outcome: ${data.icp?.dream_outcome || 'Not set'}
Trigger moment: ${data.icp?.trigger_moment || 'Not set'}
Emotional state: ${(data.icp?.emotional_state || []).join(', ') || 'Not set'}
Channels: ${(data.icp?.channels || []).join(', ') || 'Not set'}
Top pains: ${(data.icp?.pains || []).filter(Boolean).join('; ') || 'Not set'}

THE DIP (ENTRY OFFER)
Format: ${data.dip?.format || 'Not set'}
Problem: ${data.dip?.problem || 'Not set'}
Outcome: ${data.dip?.outcome || 'Not set'}
Price: £${data.dip?.price || '0'}
Duration: ${data.dip?.duration || 'Not set'}
Bridge to main offer: ${data.dip?.bridge || 'Not set'}
Belief to create: ${data.dip?.belief_to_create || 'Not set'}

BANG BANG OFFER (MAIN OFFER)
Name: ${data.bang_bang?.name || 'Not set'}
Promise: ${data.bang_bang?.promise || 'Not set'}
Price: £${data.bang_bang?.price || '0'}
Stack value: £${data.bang_bang?.stack_value || '0'}
Duration: ${data.bang_bang?.duration || 'Not set'}
Unique mechanism: ${data.bang_bang?.unique_mechanism || 'Not set'}
Guarantees: ${(data.bang_bang?.guarantees || []).join(', ') || 'None'}
Delivery: ${(data.bang_bang?.delivery_model || []).join(', ') || 'Not set'}
Continuity: ${data.bang_bang?.continuity_offer || 'Not set'} at £${data.bang_bang?.continuity_price || '0'}

SIGNATURE FRAMEWORK
Name: ${data.framework?.framework_name || 'Not set'}
Pillars: ${(data.framework?.pillars || []).filter(p => p.name).map(p => p.name).join(', ') || 'Not set'}

Write a 30-day offer launch plan:
- Week 1: Content strategy — 3 specific actions targeting their ICP's pains and trigger moments on their channels
- Week 2: Dip launch — 3 specific actions to get their entry offer live and generating buyers
- Week 3: Bridge sequence — 3 specific actions to nurture Dip buyers toward the main offer
- Week 4: Main offer launch — 3 specific actions to present the Bang Bang Offer
- Revenue projection based on their pricing and a realistic conversion path

Reference their specific offer details, ICP data, and pricing throughout. Make it a plan they can execute immediately.`

    } else if (type === 'bounce-back') {
      systemPrompt = 'You are a direct, no-nonsense resilience coach inspired by David Goggins. You write raw, honest, actionable recovery plans. No fluff, no motivational filler. Every sentence must be a specific action or a hard truth tied to what the client actually wrote. Tone: like a mentor who genuinely cares but refuses to let you stay in the pit. You understand the LARCC framework — Look back, Acknowledge, Recognize, Climb out, Consolidate. IMPORTANT: This framework applies to ANY area of life — business, family, health, relationships, personal crises — whatever the client is dealing with. Tailor your plan to the specific domain of their setback. Do not assume it is business-related unless their answers clearly indicate that.'
      userPrompt = `Based on this client's BounceBackAbility™ LARCC framework answers, write a personalised recovery and growth plan.

Their answers across 5 resilience modules:

LOOK BACK (Were you unlucky or not paying attention?)
Q1 - The situation: ${data.module_1?.q1 || 'Not answered'}
Q2 - Red flags ignored: ${data.module_1?.q2 || 'Not answered'}
Q3 - Where focus slipped: ${data.module_1?.q3 || 'Not answered'}
Q4 - Distractions allowed: ${data.module_1?.q4 || 'Not answered'}
Q5 - Future self advice: ${data.module_1?.q5 || 'Not answered'}

ACKNOWLEDGE (What role did you knowingly play?)
Q1 - Their role: ${data.module_2?.q1 || 'Not answered'}
Q2 - Decisions made/avoided: ${data.module_2?.q2 || 'Not answered'}
Q3 - Warnings dismissed: ${data.module_2?.q3 || 'Not answered'}
Q4 - Story vs truth: ${data.module_2?.q4 || 'Not answered'}
Q5 - Control assessment: ${data.module_2?.q5 || 'Not answered'}

RECOGNIZE (How bad has it got?)
Q1 - Health impact: ${data.module_3?.q1 || 'Not answered'}
Q2 - Productivity impact: ${data.module_3?.q2 || 'Not answered'}
Q3 - Relationship impact: ${data.module_3?.q3 || 'Not answered'}
Q4 - Financial impact: ${data.module_3?.q4 || 'Not answered'}
Q5 - Emotional trigger: ${data.module_3?.q5 || 'Not answered'}

CLIMB OUT (What actions need to be taken?)
Q1 - This week's actions: ${data.module_4?.q1 || 'Not answered'}
Q2 - Systems to restart: ${data.module_4?.q2 || 'Not answered'}
Q3 - Conversations needed: ${data.module_4?.q3 || 'Not answered'}
Q4 - Highest leverage fix: ${data.module_4?.q4 || 'Not answered'}
Q5 - 30-day routine: ${data.module_4?.q5 || 'Not answered'}

CONSOLIDATE (What will you do differently?)
Q1 - Prevention plan: ${data.module_5?.q1 || 'Not answered'}
Q2 - New systems/boundaries: ${data.module_5?.q2 || 'Not answered'}
Q3 - Self-knowledge gained: ${data.module_5?.q3 || 'Not answered'}
Q4 - Weapon forged: ${data.module_5?.q4 || 'Not answered'}
Q5 - Message to future self: ${data.module_5?.q5 || 'Not answered'}

Write a 30-day BounceBackAbility™ recovery plan structured as:
- Week 1 — STABILISE: 3 specific actions to stop the bleeding, based on their Look Back and Acknowledge answers. Address the red flags they identified and the role they played.
- Week 2 — REBUILD: 3 specific actions to repair the damage they identified in Recognize. Hit their health, productivity, relationships, and finances directly.
- Week 3 — ACCELERATE: 3 specific actions from their Climb Out answers. Use the exact systems and conversations they identified. Build on the momentum they named.
- Week 4 — FORTIFY: 3 specific actions from their Consolidate answers. Lock in the new systems, boundaries, and prevention measures so this never happens again.
- 3 Non-Negotiable Commitments pulled from what they actually wrote — the three things that, if they do nothing else, will break the cycle.

End with their own message to their future self (from Consolidate Q5) as a reminder of who they are becoming.

Reference their specific words and situations throughout. Do not give generic advice. Every action must be tied to something they personally revealed. Be direct. Be specific. Be useful. This person needs to bounce back — help them weaponize this setback.`

    } else if (type === 'distinction-pillars') {
      const b = data.brand?.brand_star || {}
      const brandContext = b.name ? `
BRAND VOICE CONTEXT (from their Premium Position™ Blueprint):
Brand: ${b.name || ''}
Personality traits: ${(b.personality || []).join(', ') || 'Not set'}
Values: ${(b.values || []).join(', ') || 'Not set'}
Who they serve: ${b.specific_description || b.client_type || ''}
What they do: ${b.what_you_do || ''}
Contrarian belief: ${b.contrarian_belief || ''}
Sector: ${b.sector || ''}

IMPORTANT: All suggested names MUST align with their brand personality and values above. If they are bold and direct, the names should be bold and direct. If they are warm and nurturing, reflect that. Match the energy of their brand.` : ''

      systemPrompt = 'You are a brand positioning expert who creates premium, memorable pillar names for coaching and consulting frameworks. Respond ONLY with valid JSON — no markdown, no code fences.'
      userPrompt = `A coach/consultant in the "${data.niche || 'coaching'}" space solves three core problems:

1. ${data.problem_1}
2. ${data.problem_2}
3. ${data.problem_3}
${brandContext}

For each problem, suggest 3 branded pillar names. These should be:
- One word or short phrase (1-3 words max)
- Clear, memorable, premium-sounding
- Specific to their niche
- Easy to explain on a sales call
- Aligned with their brand voice and personality

Respond with ONLY this JSON:
{
  "pillar_1": ["Name A", "Name B", "Name C"],
  "pillar_2": ["Name A", "Name B", "Name C"],
  "pillar_3": ["Name A", "Name B", "Name C"]
}`

      const msg = await callClaude(systemPrompt, userPrompt, 500)
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        return NextResponse.json({ suggestions: JSON.parse(cleaned) })
      } catch { return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 }) }

    } else if (type === 'distinction-mechanisms') {
      const b = data.brand?.brand_star || {}
      const brandContext = b.name ? `
BRAND VOICE CONTEXT:
Brand: ${b.name || ''} | Personality: ${(b.personality || []).join(', ') || 'Not set'} | Values: ${(b.values || []).join(', ') || 'Not set'}
Contrarian belief: ${b.contrarian_belief || ''} | Sector: ${b.sector || ''}
IMPORTANT: All mechanism names MUST match this brand's tone and energy.` : ''

      systemPrompt = 'You are a brand positioning expert who creates unique mechanism names — branded, ownable names for specific methods and processes. Respond ONLY with valid JSON — no markdown, no code fences.'
      const solutionLines = data.solutions.map(s => `Pillar "${s.pillarName}" — Solution ${s.slot}: ${s.solution}`).join('\n')
      userPrompt = `A coach/consultant in the "${data.niche || 'coaching'}" space has these solutions under their pillars:

${solutionLines}
${brandContext}

For each solution, suggest 3 unique mechanism names. A unique mechanism is a branded name for a specific method (e.g. "Instagram profile visit ad" becomes "Growth Tax Ads"). They should be:
- 2-4 words
- Memorable and ownable
- Sound like proprietary IP
- Premium and specific
- Aligned with their brand voice

Respond with ONLY this JSON where keys are "pillar_slot" format:
{
  "1_1": ["Name A", "Name B", "Name C"],
  "1_2": ["Name A", "Name B", "Name C"],
  "1_3": ["Name A", "Name B", "Name C"],
  "2_1": ["Name A", "Name B", "Name C"],
  "2_2": ["Name A", "Name B", "Name C"],
  "2_3": ["Name A", "Name B", "Name C"],
  "3_1": ["Name A", "Name B", "Name C"],
  "3_2": ["Name A", "Name B", "Name C"],
  "3_3": ["Name A", "Name B", "Name C"]
}`

      const msg = await callClaude(systemPrompt, userPrompt, 1000)
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        return NextResponse.json({ suggestions: JSON.parse(cleaned) })
      } catch { return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 }) }

    } else if (type === 'distinction-name') {
      const b = data.brand?.brand_star || {}
      const brandCtx = b.name ? `Brand personality: ${(b.personality || []).join(', ')} | Values: ${(b.values || []).join(', ')} | Contrarian belief: ${b.contrarian_belief || ''}. Names MUST match this brand energy.` : ''

      systemPrompt = 'You are a brand naming expert who creates ownable, premium system names for coaches, consultants, and service providers. Respond ONLY with valid JSON — no markdown, no code fences.'
      userPrompt = `A coach/consultant needs a creative name for their complete signature system (their "Distinction Engine").

Their promise: "${data.promise}"
Their three pillars: ${data.pillar_1}, ${data.pillar_2}, ${data.pillar_3}
Their niche: ${data.niche || 'coaching'}
${brandCtx}

Suggest 5 creative names for this system. These should:
- Sound like premium intellectual property
- Be 2-4 words
- Feel ownable and hard to ignore
- Reflect the transformation/promise they deliver
- Work in a sentence like "I use my [NAME] to help clients..."
- End with a power word like System, Method, Engine, Framework, Blueprint, Architecture, Protocol, Code, Formula, Matrix

Respond with ONLY this JSON:
["Name One", "Name Two", "Name Three", "Name Four", "Name Five"]`

      const msg = await callClaude(systemPrompt, userPrompt, 300)
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        return NextResponse.json({ suggestions: JSON.parse(cleaned) })
      } catch { return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 }) }

    } else if (type === 'distinction-engine') {
      const b = data.brand?.brand_star || {}
      const h = data.brand?.hero || {}
      const brandBlock = b.name ? `
BRAND VOICE (from their Premium Position™ Blueprint):
Brand: ${b.name || ''} | Personality: ${(b.personality || []).join(', ') || 'Not set'} | Values: ${(b.values || []).join(', ') || 'Not set'}
Who they serve: ${b.specific_description || ''} | Sector: ${b.sector || ''}
What they do: ${b.what_you_do || ''} | Contrarian belief: ${b.contrarian_belief || ''}
Identity label: ${h.identity_label || ''} | Why they do this: ${h.why || ''}
IMPORTANT: The narrative MUST be written in this person's brand voice. Match their personality traits and values. If they are bold and direct, write bold and direct. If they are warm, write warm. The narrative should sound like THEM, not generic copywriting.
` : ''

      systemPrompt = 'You are a premium brand strategist and copywriter. You create compelling intellectual property frameworks for coaches, consultants, and service providers. You write with clarity, authority, and commercial intent. No fluff.'
      userPrompt = `Build a complete Distinction Engine output for this person based on their framework:
${brandBlock}

ENGINE NAME: ${data.engine_name || 'Distinction Engine'}
THE PROMISE: ${data.promise || 'Not specified'}

PILLAR 1: ${data.pillar_1}
Problem it solves: ${data.problem_1}
Unique Mechanisms:
  - ${data.mechanism_1_1} (solves: ${data.solution_1_1})
  - ${data.mechanism_1_2} (solves: ${data.solution_1_2})
  - ${data.mechanism_1_3} (solves: ${data.solution_1_3})

PILLAR 2: ${data.pillar_2}
Problem it solves: ${data.problem_2}
Unique Mechanisms:
  - ${data.mechanism_2_1} (solves: ${data.solution_2_1})
  - ${data.mechanism_2_2} (solves: ${data.solution_2_2})
  - ${data.mechanism_2_3} (solves: ${data.solution_2_3})

PILLAR 3: ${data.pillar_3}
Problem it solves: ${data.problem_3}
Unique Mechanisms:
  - ${data.mechanism_3_1} (solves: ${data.solution_3_1})
  - ${data.mechanism_3_2} (solves: ${data.solution_3_2})
  - ${data.mechanism_3_3} (solves: ${data.solution_3_3})

Write TWO sections:

SECTION 1 — ${data.engine_name || 'DISTINCTION ENGINE'} (COMPILED)
Title this section with their engine name. Lay out the complete framework in a clean, structured format. Lead with the promise, then show the three pillars with their mechanisms underneath. Make it look like premium intellectual property that belongs on a sales page or keynote slide.

SECTION 2 — NARRATIVE EXPLANATION
Write a compelling narrative they can use in sales calls, bios, webinars, presentations, and content. It should explain what they do, how their ${data.engine_name || 'system'} works, and why their method is different. Write it in first person ("I help..."). Reference the engine name, the promise, all three pillar names, and the mechanism names naturally. Make it sound natural, confident, and commercially powerful — not robotic. Keep it under 300 words.

Use their engine name "${data.engine_name || 'Distinction Engine'}" throughout. This is THEIR framework — make it sound owned, structured, and hard to ignore.`
    }

    // ── Sold Out v2 — Per-Stage AI ────────────────────────────────────────

    else if (type === 'sold-out-niche-research') {
      const sector = data.icp?.sector || 'coaching'
      const desc = data.icp?.specific_description || ''
      const pyramid = data.icp?.pyramid_level || ''
      const target = data.icp?.target_level || ''
      systemPrompt = 'You are a market research expert specialising in coaching, consulting, and service-based businesses. You provide specific, data-informed insights about niche markets — not generic advice. Reference real trends, buyer behaviours, and market dynamics. Be direct and commercially useful.'
      userPrompt = `Research this niche and provide targeted insights for building a premium offer:

NICHE/SECTOR: ${sector}
DESCRIPTION: ${desc || 'Not provided'}
CURRENT CLIENT LEVEL: ${data.icp?.current_clients_level || 'Not specified'}
PYRAMID TARGET: ${target || 'Stalling/Thriving'}

Provide specific, targeted research on:

1. **TYPICAL DEMOGRAPHICS** — Age ranges, gender split, income levels, geography, and life stage of buyers in this niche who are at the ${target || 'stalling/thriving'} level. Be specific to this market.

2. **PSYCHOGRAPHIC PROFILE** — What drives buyers in this space? Their values, beliefs, fears, desires, emotional state, and buying triggers. What's their internal narrative? What do they tell themselves at 2am?

3. **TOP 5 PAIN POINTS** — The specific, non-generic problems people at the ${target || 'stalling/thriving'} level face in this niche. Not "they struggle with mindset" — be precise about what keeps them stuck.

4. **BUYING BEHAVIOUR** — How do people in this niche typically make purchasing decisions? What objections do they have? What social proof do they need? Where do they hang out?

5. **VERTICAL NICHE OPPORTUNITY** — If they're currently working with ${data.icp?.current_clients_level || 'lower-level'} clients, what does the next level up look like? What changes about the service, pricing, and positioning?

6. **MARKET SOPHISTICATION** — How aware is this market of solutions like theirs? What language resonates? What's overused and what's underused?

${pyramid === 'dying' || pyramid === 'surviving' ? '\n7. **LEVEL-UP RECOMMENDATION** — They selected ' + pyramid + ' clients. Explain specifically why targeting stalling/thriving clients would be more profitable and sustainable, and what would need to change about their positioning.\n' : ''}

Be specific to the ${sector} space. No generic coaching advice. Every insight should be something they can act on.`

    } else if (type === 'sold-out-promise-refine') {
      const brand = data.brand?.brand_star || {}
      const brandVoice = brand.personality ? `\nBRAND PERSONALITY: ${(brand.personality || []).join(', ')}\nVALUES: ${(brand.values || []).join(', ')}\nWHAT THEY DO: ${brand.what_you_do || ''}\nCONTRARIAN BELIEF: ${brand.contrarian_belief || ''}` : ''
      systemPrompt = 'You are a premium offer positioning expert. You write promises that are crystal clear, tangible, and impossible to misunderstand. A 6-year-old should be able to understand the transformation. No fluffy mindset language — concrete, measurable outcomes.'
      userPrompt = `Sharpen this promise so it's crystal clear and tangible:

CURRENT PROMISE: ${data.icp?.promise || 'Not written yet'}
SECTOR: ${data.icp?.sector || 'Not specified'}
TARGET CLIENT: ${data.icp?.specific_description || 'Not specified'}
PYRAMID LEVEL: ${data.icp?.target_level || data.icp?.pyramid_level || 'Not specified'}
DREAM OUTCOME: ${data.icp?.dream_outcome || 'Not specified'}
TOP PAINS: ${(data.icp?.pains || []).filter(Boolean).join(', ') || 'Not specified'}
${brandVoice}

Provide:

1. **3 ALTERNATIVE PROMISES** — Each one crystal clear. "He used to be X, now he's Y." Make the before/after undeniable. Match their brand voice if provided.

2. **WHY EACH WORKS** — Brief explanation of what makes each promise compelling for their specific market.

3. **PROMISE FORMULA** — Show them the structure: "I help [specific person] go from [specific pain/before] to [specific result/after] in [timeframe] using [mechanism/method]."

4. **RED FLAGS TO AVOID** — If their current promise uses vague language (mindset, identity, structure, alignment), explain why it doesn't land and what to replace it with.

Be direct. Be specific. Match their energy.`

    } else if (type === 'sold-out-path-suggest') {
      systemPrompt = 'You are a programme design expert for coaches and consultants. You create structured client journeys with clear milestones that build momentum and create quick wins. Think like Taki Moore — tactical first, strategic second, scale third.'
      userPrompt = `Suggest milestones and timelines for this programme:

PROMISE: ${data.icp?.promise || 'Not specified'}
SECTOR: ${data.icp?.sector || 'Not specified'}
TARGET CLIENT: ${data.icp?.specific_description || 'Not specified'}
PYRAMID LEVEL: ${data.icp?.target_level || 'Not specified'}
CURRENT DURATION IDEA: ${data.path_planner?.total_duration || 'Not decided'}

DISTINCTION ENGINE DATA:
${data.distinction_engine ? `Problems: ${data.distinction_engine.problem_1 || ''}, ${data.distinction_engine.problem_2 || ''}, ${data.distinction_engine.problem_3 || ''}
Pillars: ${data.distinction_engine.pillar_1 || ''}, ${data.distinction_engine.pillar_2 || ''}, ${data.distinction_engine.pillar_3 || ''}` : 'Not available'}

Suggest:

1. **RECOMMENDED TOTAL DURATION** — How long should this programme be and why?

2. **ONBOARDING (Day 0-7)** — What should happen between payment and the first call? What boring-but-necessary work gets front-loaded here? Think mindset, setup, assessments.

3. **MILESTONE 1 (First Outcome — becomes The Dip)** — What's the first tangible win? This is critical — it must be achievable in 4-6 weeks and impressive enough to sell as a standalone product. What specific deliverables should they have?

4. **MILESTONE 2 (Mid-term)** — What's the next major checkpoint? What gets launched, tested, or proven here?

5. **EXTENDED PROGRAMME** — What happens after the initial milestones? How do the remaining pillars get covered?

6. **EDUCATION LEVERAGE** — Where can pre-built education (courses, templates, playbooks) do the heavy lifting so coaching time is used for personalisation?

Base this on their specific niche and the problems their Distinction Engine identified. Not generic.`

    } else if (type === 'sold-out-bangbang-draft') {
      const brand = data.brand?.brand_star || {}
      const hero = data.brand?.hero || {}
      const de = data.distinction_engine || {}
      systemPrompt = `You are an expert high-ticket offer copywriter who writes in the style of Taki Moore's Black Belt sales documents. You write compelling, personal, story-driven offer pages that feel like a conversation — not a sales pitch. The tone should be confident, direct, human, and warm. Use short paragraphs. Use bullet points for lists. Create urgency without being pushy.${brand.personality ? ` Match this brand personality: ${(brand.personality || []).join(', ')}.` : ''}`
      userPrompt = `Write a complete Bang Bang Offer document for this coach/consultant. Model it on Taki Moore's Black Belt offer structure.

THE OFFER:
Name: ${data.bang_bang?.name || 'Not named'}
Promise: ${data.bang_bang?.promise || data.icp?.promise || 'Not specified'}

WHO IT'S FOR:
${data.bang_bang?.who_for || 'Not specified'}

WHO IT'S NOT FOR:
${data.bang_bang?.who_not_for || data.icp?.who_not_for || 'Not specified'}

THE PLAN/PHASES:
${(data.bang_bang?.phases || []).filter(p => p.name).map((p, i) => `Phase ${i + 1}: ${p.name} (${p.duration}) — ${p.description}. Outcome: ${p.outcome}`).join('\n') || 'Not specified'}

VALUE STACK:
${(data.bang_bang?.stack || []).filter(s => s.component).map(s => `- ${s.component} (Value: £${s.value || '?'}) — ${s.description}`).join('\n') || 'Not specified'}

PRICING:
Total: £${data.bang_bang?.price || '?'}
Staggered payments: ${(data.bang_bang?.staggered_payments || []).filter(p => p.amount).map(p => `${p.month}: £${p.amount}`).join(', ') || 'Not specified'}
Pay-in-full discount: ${data.bang_bang?.pay_in_full_discount || 'Not specified'}

BONUSES:
${(data.bang_bang?.bonuses || []).filter(b => b.name).map(b => `- ${b.name} (Value: £${b.value || '?'}) — ${b.description}`).join('\n') || 'None'}

GUARANTEE:
Type: ${data.bang_bang?.guarantee_type || 'Not specified'}
Detail: ${data.bang_bang?.guarantee_detail || 'Not specified'}
Duration: ${data.bang_bang?.guarantee_duration || 'Not specified'}

URGENCY & SCARCITY:
Scarcity: ${data.bang_bang?.scarcity || 'Not specified'}
Urgency: ${data.bang_bang?.urgency || 'Not specified'}
Intake model: ${data.bang_bang?.intake_model ? 'Yes' : 'No'}

SOCIAL PROOF:
${data.bang_bang?.big_names || 'Not specified'}
${data.bang_bang?.results_numbers || ''}
Types: ${(data.bang_bang?.social_proof || []).join(', ') || 'None'}

DELIVERY:
Model: ${(data.bang_bang?.delivery_model || []).join(', ') || 'Not specified'}
Touch points: ${(data.bang_bang?.touch_points || []).join(', ') || 'Not specified'}

CONTINUITY:
${data.bang_bang?.continuity_offer || 'Not specified'} — ${data.bang_bang?.continuity_format || ''} at £${data.bang_bang?.continuity_price || '?'}/month

TIERS:
${(data.bang_bang?.tiers || []).filter(t => t.name).map(t => `${t.name}: ${t.range} — ${t.description}`).join('\n') || 'Single tier'}

CTA: ${data.bang_bang?.cta_action || 'Apply'}

DISTINCTION ENGINE:
Engine name: ${de.engine_name || 'Not set'}
Pillars: ${de.pillar_1 || ''}, ${de.pillar_2 || ''}, ${de.pillar_3 || ''}

BRAND VOICE:
${brand.name ? `Brand: ${brand.name}` : ''}
${brand.personality ? `Personality: ${(brand.personality || []).join(', ')}` : ''}
${brand.contrarian_belief ? `Contrarian belief: ${brand.contrarian_belief}` : ''}
${hero.origin ? `Origin story: ${hero.origin}` : ''}
${hero.turning_point ? `Turning point: ${hero.turning_point}` : ''}
${hero.gift ? `Gift to clients: ${hero.gift}` : ''}

COMMUNICATION:
Daily: ${(data.comms?.daily || []).join(', ') || 'Not set'}
1:1 calls: ${data.comms?.calls_1_1 || 'Not set'}
Group calls: ${data.comms?.group_calls || 'Not set'}
Events: ${data.comms?.events || 'Not set'}
Workshops: ${data.comms?.workshops || 'Not set'}

Write the COMPLETE offer document. Structure it like Taki Moore's Black Belt:
1. Personal hook — "I'm going to work with a handful of [their people] to [promise]"
2. "Here's what we're doing..." — overview of the plan
3. Credibility — their story, results, social proof
4. "This won't work for you if..." / "But if you..." lists
5. The plan broken into phases with clear outcomes
6. "We make it easy to get started" — pricing, payment plan
7. Guarantee — make it feel like zero risk
8. QuickFacts™ — tiers if applicable
9. Qualification criteria
10. CTA — "Step 1: [action]. Step 2: We'll review..."
11. P.S. — bonus teaser

Write in first person. Keep it conversational. Use their brand voice. Make it feel like a letter from someone who genuinely wants to help.`

    } else if (type === 'sold-out-dip-draft') {
      const brand = data.brand?.brand_star || {}
      systemPrompt = `You are an expert micro-offer copywriter. You write compelling, short-form sales pages for entry-level offers that bridge to a premium programme. Style: conversational, direct, warm. Like Taki Moore but for the first milestone only.${brand.personality ? ` Match this brand personality: ${(brand.personality || []).join(', ')}.` : ''}`
      userPrompt = `Write a Micro Offer (The Dip) sales document:

THE DIP:
Name: ${data.dip?.name || 'Not named'}
Promise: ${data.dip?.promise || data.path_planner?.milestone_1?.promise || 'Not specified'}
Problem it solves: ${data.dip?.problem || 'Not specified'}
Outcome: ${data.dip?.outcome || 'Not specified'}
Format: ${data.dip?.format || 'Not specified'}
Duration: ${data.dip?.duration || 'Not specified'}
Price: £${data.dip?.price || '?'}

BONUSES:
${(data.dip?.bonuses || []).filter(b => b.name).map(b => `- ${b.name} (£${b.value || '?'}) — ${b.description}`).join('\n') || 'None'}

GUARANTEE:
${data.dip?.guarantee_type || 'Not specified'} — ${data.dip?.guarantee_detail || ''}

BRIDGE TO MAIN OFFER:
${data.dip?.bridge_to_main || 'Not specified'}

BELIEF TO CREATE:
${data.dip?.belief_to_create || 'Not specified'}

MAIN OFFER CONTEXT:
Main offer name: ${data.bang_bang?.name || 'Not named'}
Main offer price: £${data.bang_bang?.price || '?'}
Main offer promise: ${data.bang_bang?.promise || data.icp?.promise || ''}

Write the complete micro offer document:
1. Hook — what specific problem does this solve right now?
2. "Here's the plan for the next [duration]..."
3. What they'll achieve (be specific)
4. What's included
5. Bonuses
6. Price (no payment plan — single price, low barrier)
7. Guarantee
8. Bridge tease — hint at what comes next (the main offer) without hard-selling it
9. CTA

Keep it shorter and punchier than the main offer. This should feel like an easy yes.`

    } else if (type === 'sold-out-comms-suggest') {
      systemPrompt = 'You are a programme delivery expert for coaches and consultants. You design communication plans that are sustainable for the coach and high-value for the client. Be practical and specific.'
      userPrompt = `Suggest a communication and delivery plan for this programme:

OFFER: ${data.bang_bang?.name || 'Not named'}
DURATION: ${data.path_planner?.total_duration || 'Not specified'}
DELIVERY MODEL: ${(data.bang_bang?.delivery_model || []).join(', ') || 'Not specified'}
TOUCH POINTS SELECTED: ${(data.bang_bang?.touch_points || []).join(', ') || 'None'}
SECTOR: ${data.icp?.sector || 'Not specified'}

CURRENT SETUP:
Daily comms: ${(data.comms?.daily || []).join(', ') || 'Not set'}
Async feedback: ${(data.comms?.async_feedback || []).join(', ') || 'Not set'}
1:1 calls: ${data.comms?.calls_1_1 || 'Not set'}
Group calls: ${data.comms?.group_calls || 'Not set'}
Events: ${data.comms?.events || 'Not set'}
Workshops: ${data.comms?.workshops || 'Not set'}
Education platform: ${data.comms?.education_platform || 'Not set'}

Suggest:

1. **DAILY COMMUNICATION** — What should daily touchpoints look like? WhatsApp/Slack? What's the right cadence?

2. **ASYNC FEEDBACK** — When and how should they provide feedback? Loom? Voice notes?

3. **CALL STRUCTURE** — 1:1 frequency and duration. Group call frequency. What format works best?

4. **EVENTS & WORKSHOPS** — How often? Virtual vs in-person? What topics?

5. **EDUCATION LEVERAGE** — Where should education do the heavy lifting? What platform? What content should be pre-built vs live?

6. **SUSTAINABILITY CHECK** — Is this delivery model sustainable at 10, 20, 30+ clients? What breaks first?

Be specific to their niche and offer type.`
    } else if (type === 'content-capture-hooks') {
      systemPrompt = 'You are a content strategist for coaches, consultants, and service providers. You write scroll-stopping hooks. No fluff. Every hook must be specific to what the person actually experienced — never generic.'
      userPrompt = `Based on this person's real story/capture, suggest 5 completed hooks they can use as content openers.

THE CAPTURE (one specific story, win, learning, or insight):
${data.captures}

HOOK TEMPLATES TO DRAW FROM:
${data.templates}

Rules:
- Each hook must be a COMPLETE, ready-to-use sentence (not a template with blanks)
- Each hook must be directly tied to the specific capture above
- Pick the 5 best-fitting templates and fill them in using the person's actual story
- Make them punchy, curiosity-driven, and scroll-stopping
- Return ONLY the 5 hooks, one per line, numbered 1-5. No explanation.`
    } else if (type === 'content-capture') {
      const formatGuides = {
        'yap': 'SHORT-FORM VIDEO SCRIPT (60 seconds max). Write a punchy script with: opening hook (first 3 seconds grab attention), story/context (15-20 seconds), key steps or list (20-25 seconds), payoff/insight (5-10 seconds), CTA (5 seconds). Use short sentences. Conversational tone. Written to be spoken aloud.',
        'carousel': 'CAROUSEL POST (7-10 slides). Structure: Slide 1 = Hook (bold, provocative statement). Slides 2-3 = Story/context. Slides 4-7 = Steps or list (one per slide, concise). Slide 8-9 = Payoff/key insight. Final slide = CTA. Each slide should be 1-2 short sentences max. Use line breaks for readability.',
        'email': 'EMAIL. Structure: Subject line (curiosity-driven, under 50 chars). Opening line hooks the reader personally. Story section (2-3 short paragraphs, conversational). List/steps section (bullet points). Payoff paragraph (the key takeaway). CTA with clear next step. PS line for urgency or personal touch. Keep total length 300-500 words.',
        'youtube': 'YOUTUBE VIDEO INTRO + OUTLINE. The intro is CRITICAL (first 30 seconds). Write: Hook line (pattern interrupt). Problem agitation (why viewer should care). Credibility/proof (why you can help). Promise (what they will learn). Then outline the rest: Story section, Key points/steps, Payoff, CTA for subscribe + link in description.',
        'talking-head': 'TALKING HEAD VIDEO SCRIPT (60-90 seconds, professionally shot). Similar to YAP but slightly more polished tone. Write: Hook (direct to camera, bold statement). Story (brief, personal). Steps/insights (deliver value). Payoff (land the key message). CTA (subtle, professional). Sentences should be short and punchy for delivery.',
        'photo-caption': 'PHOTO CAPTION. Write a compelling caption that works with a photo. Structure: Hook (first line must stop the scroll — use line break after). Story (2-3 short paragraphs, personal and raw). Key insight or steps (use line breaks or bullet points). Payoff (the lesson). CTA (question to drive comments or link direction). Keep under 300 words.',
      }

      systemPrompt = 'You are a content strategist for coaches, consultants, and service providers. You write direct, engaging, scroll-stopping content. No fluff. No corporate speak. Write like a real person who gives genuine value. Match the energy of someone who has been in the trenches and is sharing what actually works.'
      userPrompt = `Create content using this structure:

HOOK: ${data.hook}

SOURCE MATERIAL (from their real week):
${data.captures}

CTA DIRECTION: ${data.cta}

FORMAT: ${formatGuides[data.format] || formatGuides['yap']}

Rules:
- Use the hook provided as the opening
- Weave in the source material as the story/context (make it feel natural, not listed)
- Extract 3-5 actionable steps or insights from the material
- End with a clear payoff (the one thing the reader should take away)
- Include the CTA naturally
- Write in first person
- Be specific — use details from the source material, not generic advice
- Match the tone: confident, direct, slightly raw, real`
    }

    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown plan type' }, { status: 400 })
    }

    const maxTokens = type === 'unshakeable' && Number(data.duration) >= 14 ? 4500
      : (type === 'sold-out-bangbang-draft' || type === 'sold-out-dip-draft') ? 4000
      : (type === 'sold-out-niche-research' || type === 'content-capture') ? 3000
      : 2500

    let message
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })
        break
      } catch (apiErr) {
        if (apiErr.status === 529 && attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
          continue
        }
        throw apiErr
      }
    }

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // For AI accelerator, parse structured JSON tool
    if (type === 'ai-accelerator') {
      try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({ tool: parsed })
      } catch (parseErr) {
        console.error('AI Accelerator JSON parse failed:', parseErr)
        return NextResponse.json({ error: 'Failed to parse tool output' }, { status: 500 })
      }
    }

    // For unshakeable/flywheel, parse structured JSON tasks
    if (type === 'unshakeable') {
      try {
        // Strip any markdown fences the model might add
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({ tasks: parsed.tasks || [], summary: parsed.summary || '', plan: text })
      } catch (parseErr) {
        // If JSON parse fails, return as text plan fallback
        console.error('JSON parse failed, returning as text:', parseErr)
        return NextResponse.json({ plan: text })
      }
    }

    return NextResponse.json({ plan: text })
  } catch (err) {
    console.error('Generate plan error:', err)
    const msg = err.status === 529 ? 'AI is temporarily busy — please try again in a minute' : (err.message || 'Failed to generate plan')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
