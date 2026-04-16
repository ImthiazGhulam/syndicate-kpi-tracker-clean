import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
    }

    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown plan type' }, { status: 400 })
    }

    const maxTokens = type === 'unshakeable' && Number(data.duration) >= 14 ? 4500 : 2500

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
