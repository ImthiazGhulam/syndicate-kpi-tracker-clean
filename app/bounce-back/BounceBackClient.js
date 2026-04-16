'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes ─────────────────────────────────────────────────────

const defaultModule = () => ({
  q1: '',
  q2: '',
  q3: '',
  q4: '',
  q5: '',
})

// ── Module Definitions (LARCC Framework) ────────────────────────────────────

const MODULES = [
  {
    num: 1,
    title: 'Look Back',
    letter: 'L',
    recap: 'The first step in the LARCC framework is ownership. When something knocks you off course, you have two options — call it unfortunate (which strips you of ownership) or ask yourself: was I unlucky, or was I not paying attention? 99.9% of the time, there were red flags. You saw them. You ignored them. You told yourself it would be fine. This step is about going back and finding those red flags — because the lesson lives there.',
    questions: [
      'What specific event or situation has knocked you off course? Describe it in detail — what happened, when, and how it hit you.',
      'Looking back honestly — were you genuinely unlucky, or were there red flags you ignored? List any warning signs you can now see.',
      'What were you not paying attention to? Your health, your relationships, your routine, your finances, your time management — where did your focus slip?',
      'Who or what did you allow to distract you from what mattered most during this period?',
      'If your future self could go back to the week before this happened — what would they tell you to pay attention to?',
    ],
  },
  {
    num: 2,
    title: 'Acknowledge',
    letter: 'A',
    recap: 'Instead of blaming other people, circumstances, or bad luck — ask yourself one question: what role did I knowingly play? This is the hardest step because it requires radical honesty. Neglect, avoidance, laziness, fear — whatever it was, name it. The moment you own your role in what happened, you take back the power to change it. Blaming keeps you stuck. Acknowledging sets you free.',
    questions: [
      'What role did you knowingly play in this situation happening? Be brutally honest — neglect, avoidance, laziness, fear — name it.',
      'What decisions did you make (or avoid making) that contributed directly to where you are now?',
      'Were there people who tried to warn you or point things out that you dismissed? What did they say?',
      'What story have you been telling yourself to avoid taking full ownership of this? Write it out — then write the truth underneath.',
      'On a scale of 1-10, how much of this was within your control? Whatever number you gave — what specifically was in your control that you didn\'t act on?',
    ],
  },
  {
    num: 3,
    title: 'Recognize',
    letter: 'R',
    recap: 'Recognize how bad it has actually got. Not how bad you think it is, not the version you tell other people — the truth. Your health, your productivity, your relationships, your finances. When you are in a downward spiral, it bleeds into everything. You get snappy with the missus. Your finances slip. Your energy tanks. You stop doing the basics. This step forces you to take an honest audit of the real damage — because you cannot fix what you refuse to see.',
    questions: [
      'How has this situation affected your health — sleep, energy, fitness, eating habits? Be specific about what\'s changed.',
      'How has it affected your productivity and output? What\'s dropped, stalled, or been neglected in your life or work?',
      'How has it affected your relationships — partner, family, friends, clients? Are you snappy, withdrawn, distant?',
      'How has it affected your finances — cash flow, savings, spending habits, debt? What\'s the real damage?',
      'What is the single biggest thing that\'s been triggered emotionally — and how is that emotion driving your current behaviour?',
    ],
  },
  {
    num: 4,
    title: 'Climb Out',
    letter: 'C',
    recap: 'Now you know what happened, you own your role in it, and you can see the real damage. This is where you build the ladder out of the pit. What actions need to be taken right now? Not next month, not when you feel ready — now. Maybe you need to restart a habit you dropped. Maybe you need to set a boundary. Maybe you need to have a difficult conversation. The climb out is about identifying the specific, concrete actions that will create momentum.',
    questions: [
      'What are the three most important actions you need to take THIS WEEK to start climbing out of this situation?',
      'What habits, routines, or systems did you stop doing that you need to restart immediately?',
      'Who do you need to have a conversation with — and what needs to be said? Be specific about the person and the message.',
      'What is the ONE thing that, if you fixed it first, would create the most momentum for everything else to follow?',
      'What does your daily routine need to look like for the next 30 days to rebuild? Map out your non-negotiable schedule.',
    ],
  },
  {
    num: 5,
    title: 'Consolidate',
    letter: 'C',
    recap: 'This is where the blip becomes a weapon for growth. The difference between the person who stays stuck, the person who flatlines, and the person whose capability keeps climbing — is what they do with the lesson. Consolidate means locking in what you have learned so that this specific situation never takes you down again. Your setbacks are not punishments. They are data. Weaponize them.',
    questions: [
      'What are you going to do differently next time so this specific situation doesn\'t happen again? Be precise — not vague promises.',
      'What new system, boundary, or rule are you putting in place as a direct result of this experience?',
      'What has this setback taught you about yourself that you didn\'t know (or were avoiding) before?',
      'How has this experience made you stronger or more capable? What\'s the weapon you\'ve forged from this setback?',
      'Write a message to your future self for the next time life throws a punch. What do they need to hear from you right now?',
    ],
  },
]

// ── Reusable Sub-components (outside main component for mobile performance) ──

function TextArea({ value, onChange, onBlur, placeholder, rows = 4 }) {
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

export default function BounceBackPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Multi-entry state
  const [allEntries, setAllEntries] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newSetback, setNewSetback] = useState('')
  const [creatingEntry, setCreatingEntry] = useState(false)

  // Active entry state
  const [record, setRecord] = useState(null)
  const [currentModule, setCurrentModule] = useState(1)
  const [moduleData, setModuleData] = useState({
    module_1: defaultModule(),
    module_2: defaultModule(),
    module_3: defaultModule(),
    module_4: defaultModule(),
    module_5: defaultModule(),
  })
  const [generatedPlan, setGeneratedPlan] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const saveTimerRef = useRef(null)
  const toastRef = useRef(null)
  const toastTimerRef = useRef(null)

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

      const { data: entries } = await supabase
        .from('bounce_back')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
      setAllEntries(entries || [])
      setLoading(false)
    }
    init()
  }, [])

  // ── Entry Selection ─────────────────────────────────────────────────────────

  const selectEntry = (entry) => {
    setRecord(entry)
    setSelectedEntry(entry.id)
    setCurrentModule(entry.current_module || 1)
    setModuleData({
      module_1: { ...defaultModule(), ...(entry.module_1 || {}) },
      module_2: { ...defaultModule(), ...(entry.module_2 || {}) },
      module_3: { ...defaultModule(), ...(entry.module_3 || {}) },
      module_4: { ...defaultModule(), ...(entry.module_4 || {}) },
      module_5: { ...defaultModule(), ...(entry.module_5 || {}) },
    })
    setGeneratedPlan(entry.generated_plan || '')
  }

  const backToSetbacks = async () => {
    if (record) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const s = computeScores()
      await saveToSupabase({
        ...moduleData,
        current_module: currentModule,
        generated_plan: generatedPlan,
        scores: {
          total_score: s.total,
          band: s.band,
          module_scores: s.moduleScores,
        },
      })
    }
    setSelectedEntry(null)
    setRecord(null)
    supabase.from('bounce_back').select('*').eq('client_id', clientData.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllEntries(data) })
  }

  // ── Create New Entry ────────────────────────────────────────────────────────

  const createNewEntry = async () => {
    if (!newSetback.trim()) return
    setCreatingEntry(true)
    const title = newTitle.trim() || newSetback.trim().slice(0, 60)
    const initModules = {
      module_1: defaultModule(),
      module_2: defaultModule(),
      module_3: defaultModule(),
      module_4: defaultModule(),
      module_5: defaultModule(),
    }
    const { data: newRec } = await supabase
      .from('bounce_back')
      .insert({
        client_id: clientData.id,
        current_module: 1,
        title: title,
        setback_description: newSetback.trim(),
        ...initModules,
        scores: {},
        generated_plan: '',
      })
      .select()
      .single()
    if (newRec) {
      setAllEntries(prev => [newRec, ...prev])
      selectEntry(newRec)
      setNewTitle('')
      setNewSetback('')
    }
    setCreatingEntry(false)
  }

  // ── Save Functions ──────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!record) return
    const { error } = await supabase.from('bounce_back').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    if (error) { console.error('bounce_back save error:', error); return }
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

    for (let i = 1; i <= 5; i++) {
      const key = `module_${i}`
      const mod = moduleData[key] || {}
      let modScore = 0

      for (let q = 1; q <= 5; q++) {
        const answer = mod[`q${q}`] || ''
        if (answer.trim()) {
          if (wc(answer) >= 15) modScore += 2
          else modScore += 1
        }
      }

      moduleScores[key] = modScore
      total += modScore
    }

    let band = 'Needs Work'
    let bandDescription = 'You have significant gaps. Go back and answer each question with real depth and honesty.'
    if (total >= 41) { band = 'Resilient'; bandDescription = 'Outstanding. You have done the deep work. Your BounceBackAbility is locked in — this setback is now a weapon.' }
    else if (total >= 31) { band = 'Strong'; bandDescription = 'Solid progress. You are building real self-awareness. Go deeper on the modules that challenge you most.' }
    else if (total >= 21) { band = 'Getting There'; bandDescription = 'Good start. You are engaging with the material but some answers need more depth and honesty.' }

    return { total, max: 50, band, bandDescription, moduleScores }
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
        body: JSON.stringify({ type: 'bounce-back', data: moduleData }),
      })
      const result = await res.json()
      if (result.error) { alert('Failed to generate: ' + result.error); setPlanLoading(false); return }
      setGeneratedPlan(result.plan)
      const { error: planError } = await supabase.from('bounce_back').update({ generated_plan: result.plan, updated_at: new Date().toISOString() }).eq('id', record.id)
      if (planError) { console.error('bounce_back save error:', planError); alert('Failed to save plan'); return }
    } catch (e) { alert('Failed: ' + e.message) }
    setPlanLoading(false)
  }

  // ── Module Navigation ──────────────────────────────────────────────────────

  const goToModule = (num) => {
    saveAll()
    setCurrentModule(num)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    ...MODULES.map(m => ({ num: m.num, label: m.title, icon: m.letter })),
    { num: 6, label: 'Generate Plan', icon: '\u26A1' },
  ]

  const moduleComplete = (num) => {
    if (num === 6) return scores.total >= 41
    const key = `module_${num}`
    const mod = moduleData[key] || {}
    return !!(mod.q1 && mod.q1.trim() && mod.q2 && mod.q2.trim() && mod.q3 && mod.q3.trim() && mod.q4 && mod.q4.trim() && mod.q5 && mod.q5.trim())
  }

  // ── Render Setback Picker ─────────────────────────────────────────────────

  const renderSetbackPicker = () => {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-2xl mx-auto p-4 md:px-8 md:py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.push('/client')} className="text-zinc-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto" />
          </div>
          <h1 className="text-lg font-black text-white uppercase tracking-widest mt-6 mb-1">BounceBackAbility&trade;</h1>
          <p className="text-zinc-500 text-sm mb-8">The LARCC Framework. Use it every time life throws a punch — business, family, health, anything. Each setback gets its own playbook.</p>

          {/* New Setback Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
            <GoldLabel>New Setback</GoldLabel>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Give it a title (e.g. 'Lost biggest client', 'Health scare', 'Family fallout')"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm mb-3"
            />
            <TextArea
              value={newSetback}
              onChange={setNewSetback}
              onBlur={() => {}}
              placeholder="Briefly describe what happened — what knocked you off course?"
              rows={3}
            />
            <button
              onClick={createNewEntry}
              disabled={!newSetback.trim() || creatingEntry}
              className="mt-4 w-full px-6 py-3 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gold-light transition disabled:opacity-50"
            >
              {creatingEntry ? 'Creating...' : 'Start LARCC Framework'}
            </button>
          </div>

          {/* Existing Setbacks */}
          {allEntries.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Your Setbacks</h2>
              <div className="space-y-3">
                {allEntries.map(entry => {
                  const s = entry.scores || {}
                  const total = s.total_score || 0
                  const hasPlan = !!entry.generated_plan
                  const completedModules = [1,2,3,4,5].filter(i => {
                    const mod = entry[`module_${i}`] || {}
                    return mod.q1?.trim() && mod.q2?.trim() && mod.q3?.trim() && mod.q4?.trim() && mod.q5?.trim()
                  }).length

                  return (
                    <button
                      key={entry.id}
                      onClick={() => selectEntry(entry)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 active:border-gold/30 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{entry.title || 'Untitled'}</p>
                          {entry.setback_description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{entry.setback_description}</p>}
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className="text-xs text-zinc-600">{completedModules}/5 modules</span>
                            <span className="text-xs text-zinc-700">&middot;</span>
                            <span className="text-xs text-zinc-600">{total}/50 score</span>
                            {hasPlan && (
                              <>
                                <span className="text-xs text-zinc-700">&middot;</span>
                                <span className="text-xs text-emerald-400 font-semibold">Plan generated</span>
                              </>
                            )}
                            <span className="text-xs text-zinc-700">&middot;</span>
                            <span className="text-xs text-zinc-600">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-3">
                        <div className={`h-full rounded-full transition-all ${hasPlan ? 'bg-emerald-500' : 'bg-gold'}`} style={{ width: `${(completedModules / 5) * 100}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render Module ─────────────────────────────────────────────────────────

  const renderModule = (moduleNum) => {
    const moduleDef = MODULES[moduleNum - 1]
    const key = `module_${moduleNum}`
    const mod = moduleData[key] || defaultModule()
    const prevModule = moduleNum > 1 ? MODULES[moduleNum - 2] : null
    const nextModule = moduleNum < 5 ? MODULES[moduleNum] : null

    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-black">{moduleDef.letter}</span>
            <h1 className="text-base font-bold text-white uppercase tracking-widest">Module {moduleDef.num}: {moduleDef.title}</h1>
          </div>
        </div>

        {/* Recap */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Framework Recap" />
          <p className="text-sm text-zinc-300 leading-relaxed">{moduleDef.recap}</p>
        </div>

        {/* Questions */}
        {moduleDef.questions.map((question, qi) => (
          <div key={qi} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
            <FieldGroup label={`Question ${qi + 1}`} gold>
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{question}</p>
              <TextArea
                value={mod[`q${qi + 1}`]}
                onChange={v => updateModule(key, `q${qi + 1}`, v)}
                onBlur={saveAll}
                placeholder="Write your answer here..."
                rows={4}
              />
              <p className="text-zinc-600 text-xs mt-1">Write at least 15 words for full scoring credit</p>
            </FieldGroup>
          </div>
        ))}

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
            <button onClick={() => goToModule(6)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
              Generate Plan &rarr;
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Stage 6: Generate Plan & Summary ──────────────────────────────────────

  const renderPlanStage = () => {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Generate Plan &amp; Summary</h1>
          <p className="text-zinc-500 text-sm">Review all your answers, see your score, and generate a personalised BounceBackAbility&trade; action plan.</p>
        </div>

        {/* Overall Score Ring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5 flex flex-col items-center">
          <ScoreRing score={scores.total} max={scores.max} size={140} strokeWidth={10} />
          <p className={`text-sm font-bold mt-3 ${scores.band === 'Resilient' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>
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
                <ProgressBar score={modScore} max={10} label={`${m.letter}: ${m.title}`} />
              </div>
            )
          })}
        </div>

        {/* All Answers Summary */}
        <div className="space-y-5 mb-8">
          {MODULES.map(m => {
            const key = `module_${m.num}`
            const mod = moduleData[key] || {}
            const hasContent = mod.q1 || mod.q2 || mod.q3 || mod.q4 || mod.q5
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
                    {m.questions.map((question, qi) => {
                      const answer = mod[`q${qi + 1}`]
                      if (!answer) return null
                      return (
                        <div key={qi}>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Q{qi + 1}</p>
                          <p className="text-zinc-600 text-xs mb-1 leading-relaxed">{question}</p>
                          <p className="text-sm text-zinc-300 leading-relaxed">{answer}</p>
                        </div>
                      )
                    })}
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
          {scores.total >= 35 ? (
            <>
              <div className="text-center mb-6">
                <button onClick={generateActionPlan} disabled={planLoading} className={`px-8 py-4 ${generatedPlan ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30' : 'bg-gold hover:bg-gold-light text-zinc-950'} disabled:opacity-50 font-bold text-xs uppercase tracking-widest rounded-lg transition`}>
                  {planLoading ? 'Generating your plan...' : generatedPlan ? 'Regenerate My BounceBack Plan' : 'Generate My BounceBack Plan'}
                </button>
                {generatedPlan && <p className="text-zinc-600 text-xs mt-2">Updated your answers? Hit regenerate to refresh your plan.</p>}
              </div>
              {generatedPlan && (
                <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Your BounceBackAbility&trade; Action Plan</h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{generatedPlan}</div>
                </div>
              )}
            </>
          ) : (() => {
            const improvements = []
            const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
            MODULES.forEach(m => {
              const mod = moduleData[`module_${m.num}`] || {}
              for (let qi = 0; qi < 5; qi++) {
                const answer = mod[`q${qi + 1}`] || ''
                if (!answer.trim()) {
                  improvements.push({ module: m.num, title: m.title, field: `Q${qi + 1}`, msg: `Answer question ${qi + 1}` })
                } else if (wc(answer) < 15) {
                  improvements.push({ module: m.num, title: m.title, field: `Q${qi + 1}`, msg: 'Add more depth \u2014 needs 15+ words for full marks' })
                }
              }
            })
            return (
              <div>
                <div className="text-center mb-6">
                  <p className="text-zinc-400 text-sm font-medium mb-1">Score {scores.total}/50 \u2014 you need 35 to unlock your action plan</p>
                  <div className="w-full max-w-xs mx-auto h-3 bg-zinc-800 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(scores.total / 35) * 100}%` }} />
                  </div>
                  <p className="text-zinc-600 text-xs mt-2">{35 - scores.total} points to go</p>
                </div>
                {improvements.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Improve these to unlock your plan</h3>
                    <div className="space-y-2">
                      {improvements.slice(0, 10).map((imp, i) => (
                        <button key={i} onClick={() => goToModule(imp.module)}
                          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left hover:border-gold/30 active:border-gold/30 transition">
                          <span className="text-amber-400 text-lg flex-shrink-0">{'\u26A0\uFE0F'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{imp.title}</p>
                            <p className="text-xs text-zinc-500">{imp.field} \u2014 {imp.msg}</p>
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
          <button onClick={() => goToModule(5)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; Consolidate
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

  // ── Setback Picker (no entry selected) ────────────────────────────────────

  if (!selectedEntry) return renderSetbackPicker()

  // ── Sidebar Content (entry selected) ──────────────────────────────────────

  const sidebarNav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 pb-4 border-b border-zinc-800">
        <img src="/logo.png" alt="The Syndicate" className="h-12 w-auto" />
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <button onClick={backToSetbacks} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="tracking-wide">All Setbacks</span>
        </button>
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-white text-sm font-semibold truncate">{record?.title || 'Untitled'}</p>
        {record?.setback_description && <p className="text-zinc-600 text-xs mt-0.5 line-clamp-2">{record.setback_description}</p>}
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 pb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">LARCC Framework</p>
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
          <p className={`text-xs font-semibold mt-0.5 ${scores.band === 'Resilient' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.band}</p>
        </div>
      </div>
    </nav>
  )

  // ── Render (entry selected) ───────────────────────────────────────────────

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
          {currentModule >= 1 && currentModule <= 5 && renderModule(currentModule)}
          {currentModule === 6 && renderPlanStage()}
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
