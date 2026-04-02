'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes ─────────────────────────────────────────────────────

const defaultModule = () => ({
  reflection: '',
  audit: '',
  go_deeper: '',
})

// ── Module Definitions ──────────────────────────────────────────────────────

const MODULES = [
  {
    num: 1,
    title: 'The Trinity Trap™',
    recap: 'The system operates on three layers designed to keep you broke, docile and obedient: Financial Slavery (worker bee programming, false ownership, scarcity mindset), Social Conditioning (the lies handed to you about money, ambition and masculinity), and Isolation (guilt attached to your ambition the moment you try to break free). The Trinity Trap™ only works if you believe in it.',
    reflection: 'Which of the three layers — Financial Slavery, Social Conditioning, or Isolation — has had the biggest grip on you, and how has it shown up in your business decisions?',
    audit: 'Where is scarcity programming actively showing up in your life right now? Think about your pricing, your spending, the conversations you\'re having with people in your circle.',
    go_deeper: 'What specific belief about money did you inherit from your upbringing — and has that belief been serving you or limiting you?',
  },
  {
    num: 2,
    title: 'The Ascension Ladder™',
    recap: 'There are two pyramids. The broken pyramid — low-skilled worker, high-skilled worker, freedom fighter — keeps you stuck, lonely and stressed. The Syndicate pyramid — Personal Development, Power Network, Legacy Building — is the one you should actually be climbing. The Ascension Ladder™ isn\'t about how hard you\'re climbing. It\'s about whether you\'re on the right mountain.',
    reflection: 'Which level of the broken pyramid have you been operating from — and be honest about how long you\'ve been stuck there?',
    audit: 'Looking at the Syndicate pyramid — Personal Development, Power Network, Legacy Building — which of these three areas is weakest in your life right now and why?',
    go_deeper: 'If you\'re completely honest, are you currently a student, a contributor, or a legacy builder — and what is the single thing stopping you from moving to the next level?',
  },
  {
    num: 3,
    title: 'The Brokie Venn™',
    recap: 'There are three psychological patterns keeping men financially stuck — and when they overlap, they create something far more dangerous. Survival Gambling — chasing shortcuts instead of building real value. Luck Delusion — taking credit for wins and blaming luck for losses, which kills your ability to grow. Familiarity Over Freedom — sticking with what you know even when it stopped working. Where all three meet in The Brokie Venn™ sits the Death Spiral: total financial self-sabotage.',
    reflection: 'Which of the three patterns — Survival Gambling, Luck Delusion, or Familiarity Over Freedom — is most dominant in how you currently operate your business, and where has it cost you most?',
    audit: 'Think about your last three significant business decisions. Were they driven by genuine strategy — or by one of these three patterns? Be specific about which pattern and which decision.',
    go_deeper: 'What is the story you tell yourself when things aren\'t working — and how much of that story is protecting your ego rather than helping you learn and adapt?',
  },
  {
    num: 4,
    title: 'The Rewire Triangle™',
    recap: 'The Rewire Triangle™ is the antidote to the Brokie Venn™. Survival Gambling is replaced by Value Building — asking how you become more valuable, not how you make money faster. Luck Delusion is replaced by Radical Humility — after every win and loss, asking what was skill and what was luck. Familiarity is replaced by Strategic Adaptation — asking what the current environment demands, not what feels safe.',
    reflection: 'Of the three rewires — Value Building, Radical Humility, Strategic Adaptation — which one would create the biggest shift in your business if you committed to it fully right now, and why?',
    audit: 'What is the one skill that — if you committed 90 days of deliberate practice to it — would create the most leverage in your business? And why haven\'t you committed to it yet?',
    go_deeper: 'What strategy or approach are you currently clinging to that the market is telling you isn\'t working — and what would Strategic Adaptation actually look like for you specifically right now?',
  },
  {
    num: 5,
    title: 'The Matrix™',
    recap: 'The Matrix™ is a diagnostic tool — four quadrants based on whether you are money-focused or impact-focused, and whether you are winning or losing. The Trapped (chasing money, broke). The Hustler (making money, empty). The Dreamer (impact-driven, broke). The Icon (money and meaning — rich and fulfilled). Most men either stay trapped or climb to hustler and realise the ladder was against the wrong building. The goal is Icon — and there is a faster route.',
    reflection: 'Which quadrant of The Matrix™ are you currently in — and be honest. Not where you want to be, not where you were. Where are you operating from right now, and how did you get there?',
    audit: 'If you stripped away the money tomorrow — would you still be doing what you\'re doing? What does your answer tell you about whether you are genuinely money-driven or impact-driven?',
    go_deeper: 'What does becoming an Icon actually look like for you specifically — what impact do you want to create, for who, and how does that change the decisions you need to make right now?',
  },
  {
    num: 6,
    title: 'The Transition Bridge™',
    recap: 'You can\'t just decide to shift from money-focused to impact-driven. The Transition Bridge™ is the process. Phase 1 — Identity Shift: define your mission, identify your impact metrics, audit whether your decisions are money or impact driven. Phase 2 — Priority Realignment: change your qualification filter, audit your client portfolio, stop upgrading lifestyle and start building infrastructure. Phase 3 — Legacy Building: create your 10-year vision, commit to content, invest in a brotherhood.',
    reflection: 'Which phase of The Transition Bridge™ are you currently at — Identity Shift, Priority Realignment, or Legacy Building — and what is the specific thing blocking you from moving to the next phase?',
    audit: 'Look at your last five client decisions. Were you taking those clients because they aligned with your mission — or because you needed the money? What does that pattern tell you?',
    go_deeper: 'Write your mission statement in one sentence. Not what you do — why you do it and who it\'s for. If you can\'t do that clearly right now, what does that tell you about where you are on The Transition Bridge™?',
  },
  {
    num: 7,
    title: 'The Financial Sabotage Loop™',
    recap: 'The Financial Sabotage Loop™ is why you stay broke even when you\'re making money. Good month → upgrade lifestyle → keep up appearances → confusion → downturn → desperate decisions → bad loans → grind → good month → repeat. The loop always starts with a good month. And the upgrade is what triggers everything that follows. Most business owners don\'t even realise they\'re in it.',
    reflection: 'Be honest — have you been in The Financial Sabotage Loop™? Which stage of the loop have you found yourself stuck in most repeatedly, and what has it cost you?',
    audit: 'Think about the last time you had a strong month in business. What did you do with that money — and did those decisions move you forward or pull you back into The Financial Sabotage Loop™?',
    go_deeper: 'What does keeping up appearances actually cost you — financially, mentally, and in terms of the desperate decisions it forces you to make when things inevitably slow down?',
  },
  {
    num: 8,
    title: 'The Wealth Cycle™',
    recap: 'The Wealth Cycle™ is the alternative. Same start — good month. But this time you don\'t upgrade. You create a buffer using the three-account system: operating account, tax account (30% untouched), growth account (10-20% reinvestment). You manage the frequency of indulgence. You separate business and personal money. You prepare for fluctuation. You weather storms from strength, not desperation. You build momentum. And when the next good month comes — you upgrade your investments, not your lifestyle.',
    reflection: 'Do you currently have a three-account system in place — and if not, what has the real cost of not having that separation been over the last 12 months?',
    audit: 'Are you currently making business decisions from a position of strength or desperation — and what specifically needs to change structurally for you to operate from strength consistently?',
    go_deeper: 'What is the one financial habit — the single structural change — that would have the biggest impact on breaking The Financial Sabotage Loop™ and entering The Wealth Cycle™ for good?',
  },
]

// ── Reusable Sub-components (outside main component to prevent mobile keyboard drop) ──

function TextArea({ value, onChange, onBlur, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
    />
  )
}

function Label({ children }) {
  return <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{children}</label>
}

function GoldLabel({ children }) {
  return <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">{children}</label>
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">{title}</h3>
      {description && <p className="text-zinc-600 text-xs">{description}</p>}
    </div>
  )
}

function FieldGroup({ label, children, className = '', gold = false }) {
  return (
    <div className={`mb-5 ${className}`}>
      {gold ? <GoldLabel>{label}</GoldLabel> : <Label>{label}</Label>}
      {children}
    </div>
  )
}

function ScoreRing({ score, max, size = 120, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? score / max : 0
  const offset = circumference * (1 - pct)
  let color = '#ef4444'
  if (pct >= 0.875) color = '#C9A84C'
  else if (pct >= 0.65) color = '#22c55e'
  else if (pct >= 0.4) color = '#eab308'
  return (
    <div className="flex flex-col items-center relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-xs text-zinc-500">/ {max}</span>
      </div>
      {label && <p className="text-xs text-zinc-400 mt-2 font-semibold uppercase tracking-wider">{label}</p>}
    </div>
  )
}

function ProgressBar({ score, max, label, color = 'bg-gold' }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-xs text-zinc-500">{score} / {max}</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function WealthWiredPage() {
  const router = useRouter()

  // Auth & client
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Wealth Wired
  const [record, setRecord] = useState(null)
  const [currentModule, setCurrentModule] = useState(1)
  const [moduleData, setModuleData] = useState({
    module_1: defaultModule(),
    module_2: defaultModule(),
    module_3: defaultModule(),
    module_4: defaultModule(),
    module_5: defaultModule(),
    module_6: defaultModule(),
    module_7: defaultModule(),
    module_8: defaultModule(),
  })
  const [generatedPlan, setGeneratedPlan] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const saveTimerRef = useRef(null)
  const toastRef = useRef(null)
  const toastTimerRef = useRef(null)

  // Toast via DOM ref (not useState — performance critical)
  const flash = useCallback((msg = 'Saved') => {
    if (toastRef.current) {
      toastRef.current.textContent = msg
      toastRef.current.style.opacity = '1'
      toastRef.current.style.transform = 'translateY(0)'
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => {
        if (toastRef.current) {
          toastRef.current.style.opacity = '0'
          toastRef.current.style.transform = 'translateY(1rem)'
        }
      }, 2000)
    }
  }, [])

  // ── Auth Init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)

      // fetch or create wealth_wired record
      const { data: existing } = await supabase.from('wealth_wired').select('*').eq('client_id', client.id).maybeSingle()
      if (existing) {
        setRecord(existing)
        setCurrentModule(existing.current_module || 1)
        setModuleData({
          module_1: { ...defaultModule(), ...(existing.module_1 || {}) },
          module_2: { ...defaultModule(), ...(existing.module_2 || {}) },
          module_3: { ...defaultModule(), ...(existing.module_3 || {}) },
          module_4: { ...defaultModule(), ...(existing.module_4 || {}) },
          module_5: { ...defaultModule(), ...(existing.module_5 || {}) },
          module_6: { ...defaultModule(), ...(existing.module_6 || {}) },
          module_7: { ...defaultModule(), ...(existing.module_7 || {}) },
          module_8: { ...defaultModule(), ...(existing.module_8 || {}) },
        })
        setGeneratedPlan(existing.generated_plan || '')
      } else {
        const initModules = {
          module_1: defaultModule(),
          module_2: defaultModule(),
          module_3: defaultModule(),
          module_4: defaultModule(),
          module_5: defaultModule(),
          module_6: defaultModule(),
          module_7: defaultModule(),
          module_8: defaultModule(),
        }
        const { data: newRec } = await supabase
          .from('wealth_wired')
          .insert({
            client_id: client.id,
            current_module: 1,
            ...initModules,
            scores: {},
            generated_plan: '',
          })
          .select()
          .single()
        if (newRec) setRecord(newRec)
      }
      setLoading(false)
    }
    init()
  }, [])

  // ── Save Functions ──────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!record) return
    await supabase.from('wealth_wired').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    flash()
  }, [record, flash])

  const saveAll = useCallback(() => {
    if (!record) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const s = computeScores()
      saveToSupabase({
        ...moduleData,
        current_module: currentModule,
        generated_plan: generatedPlan,
        scores: {
          total_score: s.total,
          band: s.band,
          module_scores: s.moduleScores,
        },
      })
    }, 500)
  }, [record, saveToSupabase, moduleData, currentModule, generatedPlan])

  useEffect(() => { if (!record) return; saveToSupabase({ current_module: currentModule }) }, [currentModule])

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateModule = (moduleKey, field, value) => {
    setModuleData(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [field]: value,
      },
    }))
  }

  // ── Scoring Engine ────────────────────────────────────────────────────────

  const computeScores = () => {
    const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
    let total = 0
    const moduleScores = {}

    for (let i = 1; i <= 8; i++) {
      const key = `module_${i}`
      const mod = moduleData[key] || {}
      let modScore = 0

      // +1 per filled reflection (max 1 per module, 8 total)
      if (mod.reflection && mod.reflection.trim()) modScore += 1

      // +1 per filled audit (max 1 per module, 8 total)
      if (mod.audit && mod.audit.trim()) modScore += 1

      // +2 per filled go_deeper that's 15+ words, +1 if filled but shorter (max 2 per module, 16 total)
      if (mod.go_deeper && mod.go_deeper.trim()) {
        if (wc(mod.go_deeper) >= 15) modScore += 2
        else modScore += 1
      }

      moduleScores[key] = modScore
      total += modScore
    }

    // Score bands: 0-15 Needs Work, 16-25 Getting There, 26-34 Strong, 35-40 Wealth Ready
    let band = 'Needs Work'
    let bandDescription = 'You have significant gaps in your workbook. Go back and complete more modules with depth.'
    if (total >= 35) { band = 'Wealth Ready'; bandDescription = 'Outstanding. You have done the deep work. Your financial rewiring is well underway.' }
    else if (total >= 26) { band = 'Strong'; bandDescription = 'Solid progress. You are building real self-awareness. Go deeper on the modules that challenge you most.' }
    else if (total >= 16) { band = 'Getting There'; bandDescription = 'Good start. You are engaging with the material but some answers need more depth and honesty.' }

    return { total, max: 40, band, bandDescription, moduleScores }
  }

  const scores = computeScores()

  // ── Action Plan Generator ──────────────────────────────────────────────────

  const [planLoading, setPlanLoading] = useState(false)

  const generateActionPlan = async () => {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wealth-wired', data: moduleData }),
      })
      const result = await res.json()
      if (result.error) { alert('Failed to generate: ' + result.error); setPlanLoading(false); return }
      setGeneratedPlan(result.plan)
      await supabase.from('wealth_wired').update({ generated_plan: result.plan, updated_at: new Date().toISOString() }).eq('client_id', clientData.id)
    } catch (e) { alert('Failed: ' + e.message) }
    setPlanLoading(false)
  }

  const OLD_generateActionPlan = async () => {
    const m = (n) => moduleData[`module_${n}`] || {}
    const extract = (text, maxLen = 80) => {
      if (!text) return ''
      const trimmed = text.trim()
      return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '...' : trimmed
    }

    const plan = `YOUR 30-DAY WEALTH WIRED™ ACTION PLAN
Generated from your personal workbook answers.

═══════════════════════════════════════
WEEK 1 — AWARENESS & IDENTITY
Based on The Trinity Trap™ & The Ascension Ladder™
═══════════════════════════════════════

Your biggest grip: ${extract(m(1).reflection, 200)}

Action 1: Write down the top 3 ways scarcity programming shows up in your daily decisions. You identified: "${extract(m(1).audit, 150)}" — now catch yourself doing it this week and document every instance.

Action 2: Based on your position on the broken pyramid, your task is to take one concrete step toward the Syndicate pyramid this week. You said your weakest area is: "${extract(m(2).audit, 150)}" — commit 30 minutes daily to strengthening it.

Action 3: The belief you inherited about money — "${extract(m(1).go_deeper, 150)}" — write the opposite belief and read it every morning this week.

═══════════════════════════════════════
WEEK 2 — PATTERN BREAKING
Based on The Brokie Venn™ & The Rewire Triangle™
═══════════════════════════════════════

Your dominant pattern: ${extract(m(3).reflection, 200)}

Action 4: You identified that your decisions have been driven by "${extract(m(3).audit, 150)}" — this week, before every financial decision, pause and ask: "Is this strategy or pattern?"

Action 5: The rewire you committed to — "${extract(m(4).reflection, 150)}" — define 3 specific daily actions that embody this rewire and do them every day this week.

Action 6: The skill you identified as highest-leverage — "${extract(m(4).audit, 150)}" — block 1 hour daily this week for deliberate practice. No excuses.

═══════════════════════════════════════
WEEK 3 — POSITIONING & BRIDGE-BUILDING
Based on The Matrix™ & The Transition Bridge™
═══════════════════════════════════════

Your current quadrant: ${extract(m(5).reflection, 200)}

Action 7: Your vision of becoming an Icon — "${extract(m(5).go_deeper, 150)}" — write your Icon statement and share it with one person you trust this week.

Action 8: You're at the "${extract(m(6).reflection, 100)}" phase of The Transition Bridge™. Your biggest vulnerability is "${extract(m(6).audit, 150)}" — create a specific plan to address it this week.

Action 9: Your mission statement — "${extract(m(6).go_deeper, 150)}" — if it's not clear yet, that IS your week 3 task. Write it, refine it, live it.

═══════════════════════════════════════
WEEK 4 — SYSTEMS & MOMENTUM
Based on The Financial Sabotage Loop™ & The Wealth Cycle™
═══════════════════════════════════════

Your sabotage pattern: ${extract(m(7).reflection, 200)}

Action 10: The cost of keeping up appearances — "${extract(m(7).go_deeper, 150)}" — cut one appearance-driven expense this week and redirect it to your growth account.

Action 11: Set up your three-account system this week if you haven't already. You identified the structural change needed: "${extract(m(8).go_deeper, 150)}" — do it before the week ends.

Action 12: Your Wealth Cycle commitment for 90 days — "${extract(m(8).audit, 150)}" — write it on paper, put it where you see it daily, and start the first cycle this week.

═══════════════════════════════════════
YOUR 3 NON-NEGOTIABLE COMMITMENTS
═══════════════════════════════════════

1. ${extract(m(4).go_deeper, 200) || 'Complete your Rewire Triangle™ Go Deeper response to unlock this commitment.'}

2. ${extract(m(6).go_deeper, 200) || 'Complete your Transition Bridge™ Go Deeper response to unlock this commitment.'}

3. ${extract(m(8).go_deeper, 200) || 'Complete your Wealth Cycle™ Go Deeper response to unlock this commitment.'}

═══════════════════════════════════════
This plan was built from YOUR answers. Not generic advice.
Review it weekly. Adjust as you grow. Stay in The Wealth Cycle™.
═══════════════════════════════════════`

    setGeneratedPlan(plan)
    // Save to Supabase
    await supabase.from('wealth_wired').update({ generated_plan: plan, updated_at: new Date().toISOString() }).eq('client_id', clientData.id)
  }

  // ── Module Navigation ──────────────────────────────────────────────────────

  const goToModule = (num) => {
    saveAll()
    setCurrentModule(num)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    ...MODULES.map(m => ({ num: m.num, label: m.title, icon: String(m.num) })),
    { num: 9, label: 'Generate Plan', icon: '9' },
  ]

  const moduleComplete = (num) => {
    if (num === 9) return scores.total >= 35
    const key = `module_${num}`
    const mod = moduleData[key] || {}
    return !!(mod.reflection && mod.reflection.trim() && mod.audit && mod.audit.trim() && mod.go_deeper && mod.go_deeper.trim())
  }

  // ── Generate AI Prompt ────────────────────────────────────────────────────

  const generateAIPrompt = () => {
    const lines = []
    lines.push('=== WEALTH WIRED WORKBOOK DATA ===\n')

    MODULES.forEach(m => {
      const key = `module_${m.num}`
      const mod = moduleData[key] || {}
      lines.push(`--- MODULE ${m.num}: ${m.title.toUpperCase()} ---`)
      lines.push(`Reflection: ${mod.reflection || '(not answered)'}`)
      lines.push(`Audit: ${mod.audit || '(not answered)'}`)
      lines.push(`Go Deeper: ${mod.go_deeper || '(not answered)'}`)
      lines.push('')
    })

    lines.push('--- SCORES ---')
    lines.push(`Total: ${scores.total}/${scores.max} (${scores.band})`)
    for (let i = 1; i <= 8; i++) {
      const key = `module_${i}`
      lines.push(`Module ${i} (${MODULES[i - 1].title}): ${scores.moduleScores[key]}/4`)
    }

    lines.push('\n=== END WORKBOOK DATA ===')
    lines.push('\nUsing this Wealth Wired Workbook data, create a personalised 30-day action plan broken down week by week. For each week, provide:')
    lines.push('1. A specific financial behaviour to implement')
    lines.push('2. A mindset exercise tied to the workbook answers')
    lines.push('3. A measurable outcome to track')
    lines.push('\nAlso identify three non-negotiable commitments this person must make based on their answers — the three things that, if they do nothing else, will move the needle most.')
    lines.push('\nBe direct, specific, and reference their actual answers. Do not be generic.')

    navigator.clipboard.writeText(lines.join('\n'))
    flash('Copied to clipboard')
  }

  // ── Render Module ─────────────────────────────────────────────────────────

  const renderModule = (moduleNum) => {
    const moduleDef = MODULES[moduleNum - 1]
    const key = `module_${moduleNum}`
    const mod = moduleData[key] || defaultModule()
    const prevModule = moduleNum > 1 ? MODULES[moduleNum - 2] : null
    const nextModule = moduleNum < 8 ? MODULES[moduleNum] : null

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Module {moduleDef.num}: {moduleDef.title}</h1>
        </div>

        {/* Recap */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Framework Recap" />
          <p className="text-sm text-zinc-300 leading-relaxed">{moduleDef.recap}</p>
        </div>

        {/* Reflection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Reflection" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{moduleDef.reflection}</p>
            <TextArea
              value={mod.reflection}
              onChange={v => updateModule(key, 'reflection', v)}
              onBlur={saveAll}
              placeholder="Write your reflection here..."
              rows={4}
            />
          </FieldGroup>
        </div>

        {/* Audit */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Audit" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{moduleDef.audit}</p>
            <TextArea
              value={mod.audit}
              onChange={v => updateModule(key, 'audit', v)}
              onBlur={saveAll}
              placeholder="Write your audit here..."
              rows={4}
            />
          </FieldGroup>
        </div>

        {/* Go Deeper */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Go Deeper" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{moduleDef.go_deeper}</p>
            <TextArea
              value={mod.go_deeper}
              onChange={v => updateModule(key, 'go_deeper', v)}
              onBlur={saveAll}
              placeholder="Go deeper here... (15+ words for full scoring credit)"
              rows={5}
            />
            <p className="text-zinc-600 text-xs mt-1">Write at least 15 words for full scoring credit</p>
          </FieldGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {prevModule ? (
            <button onClick={() => goToModule(moduleNum - 1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
              &larr; {prevModule.title}
            </button>
          ) : <div />}
          {nextModule ? (
            <button onClick={() => goToModule(moduleNum + 1)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
              Next: {nextModule.title} &rarr;
            </button>
          ) : (
            <button onClick={() => goToModule(9)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
              Generate Plan &rarr;
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Stage 9: Generate Plan & Summary ──────────────────────────────────────

  const renderPlanStage = () => {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Generate Plan &amp; Summary</h1>
          <p className="text-zinc-500 text-sm">Review all your answers, see your score, and generate a personalised 30-day action plan.</p>
        </div>

        {/* Overall Score Ring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5 flex flex-col items-center">
          <ScoreRing score={scores.total} max={scores.max} size={140} strokeWidth={10} />
          <p className={`text-sm font-bold mt-3 ${scores.band === 'Wealth Ready' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>
            {scores.band}
          </p>
          <p className="text-zinc-500 text-xs text-center mt-1 max-w-md">{scores.bandDescription}</p>
        </div>

        {/* Module Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {MODULES.map(m => {
            const key = `module_${m.num}`
            const modScore = scores.moduleScores[key] || 0
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <ProgressBar score={modScore} max={4} label={`M${m.num}: ${m.title}`} />
              </div>
            )
          })}
        </div>

        {/* All Answers Summary */}
        <div className="space-y-5 mb-8">
          {MODULES.map(m => {
            const key = `module_${m.num}`
            const mod = moduleData[key] || {}
            const hasContent = mod.reflection || mod.audit || mod.go_deeper
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <GoldLabel>Module {m.num}: {m.title}</GoldLabel>
                  <button
                    onClick={() => goToModule(m.num)}
                    className="shrink-0 px-3 py-1 text-xs font-semibold text-gold border border-gold/30 rounded hover:bg-gold/10 transition"
                  >
                    Edit
                  </button>
                </div>
                {hasContent ? (
                  <div className="space-y-3">
                    {mod.reflection && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reflection</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{mod.reflection}</p>
                      </div>
                    )}
                    {mod.audit && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Audit</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{mod.audit}</p>
                      </div>
                    )}
                    {mod.go_deeper && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Go Deeper</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{mod.go_deeper}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 italic">Not started yet</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Plan */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          {scores.total >= 32 ? (
            <>
              <div className="text-center mb-6">
                <button onClick={generateActionPlan} disabled={planLoading} className={`px-8 py-4 ${generatedPlan ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30' : 'bg-gold hover:bg-gold-light text-zinc-950'} disabled:opacity-50 font-bold text-xs uppercase tracking-widest rounded-lg transition`}>
                  {planLoading ? 'Generating your plan...' : generatedPlan ? 'Regenerate My 30-Day Action Plan' : 'Generate My 30-Day Action Plan'}
                </button>
                {generatedPlan && <p className="text-zinc-600 text-xs mt-2">Updated your answers? Hit regenerate to refresh your plan.</p>}
              </div>
              {generatedPlan && (
                <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Your 30-Day Wealth Wired™ Action Plan</h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{generatedPlan}</div>
                </div>
              )}
            </>
          ) : (() => {
            // Build specific improvement actions
            const improvements = []
            const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
            MODULES.forEach(m => {
              const mod = moduleData[`module_${m.num}`] || {}
              if (!mod.reflection) improvements.push({ module: m.num, title: m.title, field: 'Reflection', msg: 'Answer the reflection question' })
              if (!mod.audit) improvements.push({ module: m.num, title: m.title, field: 'Audit', msg: 'Complete the audit' })
              if (!mod.go_deeper) improvements.push({ module: m.num, title: m.title, field: 'Go Deeper', msg: 'Answer the Go Deeper question' })
              else if (wc(mod.go_deeper) < 15) improvements.push({ module: m.num, title: m.title, field: 'Go Deeper', msg: 'Add more depth — needs 15+ words for full marks' })
            })
            return (
            <div>
              <div className="text-center mb-6">
                <p className="text-zinc-400 text-sm font-medium mb-1">Score {scores.total}/40 — you need 32 to unlock your action plan</p>
                <div className="w-full max-w-xs mx-auto h-3 bg-zinc-800 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(scores.total / 32) * 100}%` }} />
                </div>
                <p className="text-zinc-600 text-xs mt-2">{32 - scores.total} points to go</p>
              </div>
              {improvements.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Improve these to unlock your plan</h3>
                  <div className="space-y-2">
                    {improvements.slice(0, 8).map((imp, i) => (
                      <button key={i} onClick={() => goToModule(imp.module)}
                        className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left hover:border-gold/30 active:border-gold/30 transition">
                        <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{imp.title}</p>
                          <p className="text-xs text-zinc-500">{imp.field} — {imp.msg}</p>
                        </div>
                        <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )
          })()}
        </div>

        {/* Back navigation */}
        <div className="flex justify-start mt-8">
          <button onClick={() => goToModule(8)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; The Wealth Cycle™
          </button>
        </div>
      </div>
    )
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  )

  if (!clientData) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center max-w-sm">
        <h2 className="text-white font-semibold mb-2">Account Not Found</h2>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">Your email is not linked to a client account. Please contact your coach.</p>
      </div>
    </div>
  )

  // ── Sidebar Content ───────────────────────────────────────────────────────

  const sidebarNav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 pb-4 border-b border-zinc-800">
        <img src="/logo.png" alt="The Syndicate" className="h-12 w-auto" />
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <button onClick={() => router.push('/client')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="tracking-wide">Back to App</span>
        </button>
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-white text-sm font-semibold truncate">{clientData.name}</p>
        <p className="text-zinc-600 text-xs truncate mt-0.5">{clientData.business}</p>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 pb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Modules</p>
        {stages.map(stage => (
          <button
            key={stage.num}
            onClick={() => goToModule(stage.num)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition ${
              currentModule === stage.num
                ? 'text-gold bg-gold/[0.08] border-r-2 border-gold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
              moduleComplete(stage.num)
                ? 'bg-gold/20 text-gold border-gold/40'
                : currentModule === stage.num
                  ? 'border-gold/40 text-gold'
                  : 'border-zinc-700 text-zinc-600'
            }`}>
              {moduleComplete(stage.num) ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : stage.icon}
            </span>
            <span className="tracking-wide">{stage.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="text-center">
          <p className="text-xs text-zinc-600 mb-1">Overall Score</p>
          <p className="text-lg font-bold text-white">{scores.total}<span className="text-zinc-600 text-sm"> / {scores.max}</span></p>
          <p className={`text-xs font-semibold mt-0.5 ${scores.band === 'Wealth Ready' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.band}</p>
        </div>
      </div>
    </nav>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-zinc-950 border-r border-zinc-800">
        {sidebarNav}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 h-full bg-zinc-950 border-r border-zinc-800">
            {sidebarNav}
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto" />
          <div className="w-6" />
        </header>

        <div className="max-w-4xl mx-auto p-4 md:px-8 md:py-7" onBlur={saveAll}>
          {currentModule >= 1 && currentModule <= 8 && renderModule(currentModule)}
          {currentModule === 9 && renderPlanStage()}
        </div>
      </div>

      {/* Toast (DOM ref, no setState) */}
      <div
        ref={toastRef}
        className="fixed bottom-6 right-6 z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-xl text-sm text-zinc-300 transition-all duration-300"
        style={{ opacity: 0, transform: 'translateY(1rem)' }}
      >
        Saved
      </div>
    </div>
  )
}
