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
    title: 'The Trinity Trap',
    recap: 'Most people are trapped in a cycle of trading time for money, chasing status symbols, and never building real wealth. The Trinity Trap shows the three forces that keep you broke: Lifestyle Inflation, Identity Attachment, and Short-Term Thinking.',
    reflection: 'Where in your life are you currently trapped in the Trinity Trap? Which of the three forces — Lifestyle Inflation, Identity Attachment, or Short-Term Thinking — has the strongest hold on you right now?',
    audit: 'Look at your last 3 months of spending. What percentage went to genuine wealth-building vs lifestyle maintenance? Be brutally honest.',
    go_deeper: 'If you removed all status-driven purchases from your life tomorrow, what would change? What would you actually miss — and what would you not even notice?',
  },
  {
    num: 2,
    title: 'The Ascension Ladder',
    recap: 'The Ascension Ladder maps the five levels of financial evolution — from Survival to Sovereignty. Most people are stuck oscillating between levels 1-3, never making the mindset shift needed to ascend.',
    reflection: 'Which level of the Ascension Ladder are you genuinely operating at right now? Not where you want to be — where you actually are based on your daily decisions.',
    audit: 'What specific behaviours and decisions are keeping you at your current level? List at least three things you do regularly that anchor you where you are.',
    go_deeper: 'What would the version of you operating one level higher do differently this week? Not in theory — what three specific actions would they take that you currently aren\'t?',
  },
  {
    num: 3,
    title: 'The Brokie Venn',
    recap: 'The Brokie Venn reveals the overlap between what broke people think, say, and do. It\'s the invisible pattern that keeps people financially stuck — the gap between what they claim to want and what their actions actually reveal.',
    reflection: 'Where do your words and your actions contradict each other when it comes to money? What do you say you want financially that your daily habits directly undermine?',
    audit: 'Map your own Brokie Venn: What do you THINK about money? What do you SAY about money? What do you actually DO with money? Where are the gaps?',
    go_deeper: 'What is the one financial lie you\'ve been telling yourself that you now need to confront? The story you\'ve been hiding behind.',
  },
  {
    num: 4,
    title: 'The Rewire Triangle',
    recap: 'The Rewire Triangle is the three-part framework for reprogramming your financial identity: Awareness (seeing the pattern), Interruption (breaking the loop), and Installation (building the new default). You can\'t build wealth with a broke person\'s operating system.',
    reflection: 'What is the dominant money story running in your subconscious right now? Where did it come from — family, culture, past experience?',
    audit: 'Identify three specific financial decisions you\'ve made in the last year that were driven by old programming rather than strategic thinking.',
    go_deeper: 'Write the new money story you want to install. Not affirmations — a genuine narrative about who you are becoming financially and why it\'s inevitable.',
  },
  {
    num: 5,
    title: 'The Matrix',
    recap: 'The Matrix maps your income streams against your time investment, revealing whether you\'re building an empire or a prison. Most entrepreneurs have accidentally built a high-paying job, not a business that generates wealth.',
    reflection: 'Map your current income: What percentage is truly passive or leveraged, and what percentage requires your direct time and energy to generate?',
    audit: 'If you stopped working completely for 90 days, what would happen to your income? This answer reveals the truth about your wealth position.',
    go_deeper: 'Design your ideal Matrix: What would your income streams look like if you rebuilt from scratch with wealth — not just revenue — as the goal?',
  },
  {
    num: 6,
    title: 'The Transition Bridge',
    recap: 'The Transition Bridge is the gap between where you are financially and where you need to be. Most people try to leap across. The ones who make it build a bridge — systematically, one plank at a time. The bridge has three sections: Stabilise, Optimise, Capitalise.',
    reflection: 'Which section of the Transition Bridge are you in right now — Stabilise, Optimise, or Capitalise? What evidence supports your answer?',
    audit: 'What is the single biggest financial vulnerability in your current setup? The one thing that, if it went wrong, would set you back significantly?',
    go_deeper: 'Write out your Transition Bridge plan: What needs to happen in each section — Stabilise, Optimise, Capitalise — for you specifically?',
  },
  {
    num: 7,
    title: 'The Financial Sabotage Loop',
    recap: 'The Financial Sabotage Loop is the unconscious cycle of earning, spending, and resetting that keeps high-earners broke. You make good money, then something triggers old patterns — and the money disappears. The loop has four stages: Trigger, Behaviour, Consequence, Justification.',
    reflection: 'Identify your most recent Financial Sabotage Loop. What was the trigger? What behaviour did it lead to? What was the consequence? How did you justify it?',
    audit: 'How much money have you lost to sabotage patterns in the last 12 months? Include impulse purchases, abandoned investments, scope creep, and under-charging.',
    go_deeper: 'What is the emotional root of your sabotage pattern? Not the surface trigger — the deeper fear or belief that drives the behaviour.',
  },
  {
    num: 8,
    title: 'The Wealth Cycle',
    recap: 'The Wealth Cycle is the opposite of the Sabotage Loop. It\'s the virtuous cycle where good financial decisions create momentum, confidence grows, and wealth compounds. The four stages: Intention, Discipline, Result, Reinforcement. This is the operating system you\'re installing.',
    reflection: 'Where have you already experienced the Wealth Cycle in action — even briefly? What triggered it, and what broke the cycle?',
    audit: 'Design your personal Wealth Cycle: What specific Intention, Discipline, Result, and Reinforcement pattern will you commit to for the next 90 days?',
    go_deeper: 'Write a letter to yourself 12 months from now. Describe the financial position you\'ll be in if you commit fully to the Wealth Cycle. Make it specific — numbers, assets, lifestyle, and the person you\'ve become.',
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

        )}

        {/* Back navigation */}
        <div className="flex justify-start mt-8">
          <button onClick={() => goToModule(8)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; The Wealth Cycle
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
