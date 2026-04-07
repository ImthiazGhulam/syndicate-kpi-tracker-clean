'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes ─────────────────────────────────────────────────────

const defaultFramework = () => ({
  reflection: '',
  audit: '',
  go_deeper: '',
})

// ── Framework Definitions ──────────────────────────────────────────────────

const FRAMEWORKS = [
  {
    num: 1,
    title: 'The Identity Shift™',
    recap: 'This is the centre of The Performance Flywheel™. You can fix your actions, your decisions, and your environment — but if your identity hasn\'t shifted, the flywheel will always slow down. The Identity Paradox is this: becoming the person requires you to back yourself before you feel ready. The top performers don\'t wait until they feel like it. They become it first. Identity isn\'t the result of the work. It\'s the foundation of it.',
    reflection: 'Who have you been being — honestly — up to this point? Not who you want to be. Who have you actually been showing up as in your business and your life?',
    audit: 'Where specifically has a weak or unexamined identity been slowing your flywheel down — in your decisions, your actions, your environment, or all three?',
    go_deeper: 'In one sentence — who do you need to become for The Performance Flywheel™ to spin at full capacity? And what is the single identity shift you are committing to making from today?',
  },
  {
    num: 2,
    title: 'The Three Dials™ — Positive Behaviours',
    recap: 'Installing a positive behaviour works the opposite way. You turn the Cue dial up — make the trigger louder and more present. You make it easier to Start — remove all friction between you and the behaviour. And you make it hard to Stop — build in external accountability so quitting becomes more painful than continuing. The issue is never starting. The issue is always keeping it going.',
    reflection: 'What is the one positive behaviour — in your business or your life — that you keep starting and stopping, and what has that cycle cost you?',
    audit: 'Using the three dials — where is the behaviour currently breaking down? Is the Cue weak, is Starting too hard, or is there nothing making it difficult to Stop?',
    go_deeper: 'What specific accountability mechanism are you going to put in place to make this behaviour hard to stop — and who is going to hold you to it?',
  },
  {
    num: 3,
    title: 'The Three Dials™ — Negative Behaviours',
    recap: 'Every negative behaviour has three points of control — Cue, Start, Stop. The Cue is what triggers the behaviour. Start is how easy it is to begin. Stop is how hard it is to end once you\'ve started. To remove a negative behaviour you turn the Cue dial down, make it harder to Start, and limit the damage once it\'s begun. You don\'t need more willpower. You need better design.',
    reflection: 'What is the one negative behaviour that is costing you the most right now — in your business, your health, or your focus — and how long has it been running?',
    audit: 'Map that behaviour to the three dials. What is the Cue that triggers it? How easy is it to Start? And once you\'ve started — how hard is it to Stop?',
    go_deeper: 'What is one specific change you can make to each dial this week — turning down the Cue, increasing friction to Start, and limiting the damage when Stop fails?',
  },
  {
    num: 4,
    title: 'The Negotiator™',
    recap: 'The Negotiator™ is the internal voice that pulls you off course the moment life gets hard. He\'s charismatic, logical, and he sounds like he cares about you. But his only job is to slow the flywheel down. He uses three weapons — The TFL Framework™. Time: maybe later, maybe tomorrow. Feelings: I\'m tired, I deserve this. Logic: I\'ll see how the week goes. Once you know his weapons, you can defeat them.',
    reflection: 'Which of the three TFL weapons — Time, Feelings, or Logic — does The Negotiator™ use on you most consistently, and what does that conversation actually sound like in your head?',
    audit: 'Think about the last time you fell off course. Which weapon did The Negotiator™ use — and what was the exact moment you stopped and went down the wrong path?',
    go_deeper: 'What is your non-negotiable rule for each weapon — your personal response to Time, Feelings, and Logic — that you are committing to from this point forward?',
  },
  {
    num: 5,
    title: 'The Action Bridge™',
    recap: 'Most people don\'t have an execution problem — they have a gap problem. The gap between knowing and doing feels like the Grand Canyon. The Action Bridge™ gives you two tools to cross it. The Plank — the smallest viable action that gets you moving. The Struts — external pressure and time constraints that hold the bridge in place so you actually cross it.',
    reflection: 'What is the one thing you have been procrastinating on that you know needs to happen — and how long have you been avoiding it?',
    audit: 'When you think about crossing the gap on that thing, what is the smallest single action you could take today — not the whole thing, just the first step onto the bridge?',
    go_deeper: 'Who in your life could you use as a Strut right now — someone who creates external pressure and accountability — and what specific commitment are you going to make to them and by when?',
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

export default function UnshakeablePage() {
  const router = useRouter()

  // Auth & client
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Problem selection
  const [allEntries, setAllEntries] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null) // null = problem picker view

  // Un-Shakeable
  const [record, setRecord] = useState(null)
  const [currentFramework, setCurrentFramework] = useState(1)
  const [frameworkData, setFrameworkData] = useState({
    framework_1: defaultFramework(),
    framework_2: defaultFramework(),
    framework_3: defaultFramework(),
    framework_4: defaultFramework(),
    framework_5: defaultFramework(),
  })
  const [generatedPlan, setGeneratedPlan] = useState('')
  const [customQuestions, setCustomQuestions] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newProblem, setNewProblem] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creatingEntry, setCreatingEntry] = useState(false)

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

      // Fetch all existing entries for this client
      const { data: entries } = await supabase.from('unshakeable_playbook').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      setAllEntries(entries || [])
      setLoading(false)
    }
    init()
  }, [])

  // ── Select / Create Entry ─────────────────────────────────────────────────

  const selectEntry = (entry) => {
    setRecord(entry)
    setSelectedEntry(entry.id)
    setCurrentFramework(entry.current_framework || 1)
    setFrameworkData({
      framework_1: { ...defaultFramework(), ...(entry.framework_1 || {}) },
      framework_2: { ...defaultFramework(), ...(entry.framework_2 || {}) },
      framework_3: { ...defaultFramework(), ...(entry.framework_3 || {}) },
      framework_4: { ...defaultFramework(), ...(entry.framework_4 || {}) },
      framework_5: { ...defaultFramework(), ...(entry.framework_5 || {}) },
    })
    setCustomQuestions(entry.custom_questions || {})
    // Try to parse structured tasks from generated_plan
    const plan = entry.generated_plan || ''
    try {
      const parsed = JSON.parse(plan)
      if (parsed.tasks) {
        setGeneratedTasks(parsed.tasks)
        setPlanSummary(parsed.summary || '')
        setGeneratedPlan(parsed.summary || '')
      } else {
        setGeneratedPlan(plan)
        setGeneratedTasks([])
      }
    } catch {
      setGeneratedPlan(plan)
      setGeneratedTasks([])
    }
  }

  const createNewEntry = async () => {
    if (!newProblem.trim()) return
    setCreatingEntry(true)
    const title = newTitle.trim() || newProblem.trim().slice(0, 60)

    // Generate tailored questions for this problem
    let questions = {}
    try {
      const qRes = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_statement: newProblem.trim() }),
      })
      const qResult = await qRes.json()
      if (qResult.questions) questions = qResult.questions
    } catch (e) { console.error('Failed to generate questions:', e) }

    const initFrameworks = {
      framework_1: defaultFramework(),
      framework_2: defaultFramework(),
      framework_3: defaultFramework(),
      framework_4: defaultFramework(),
      framework_5: defaultFramework(),
    }
    const { data: newRec } = await supabase
      .from('unshakeable_playbook')
      .insert({
        client_id: clientData.id,
        current_framework: 1,
        problem_statement: newProblem.trim(),
        title: title,
        custom_questions: questions,
        ...initFrameworks,
        scores: {},
        generated_plan: '',
      })
      .select()
      .single()
    if (newRec) {
      setAllEntries(prev => [newRec, ...prev])
      selectEntry(newRec)
      setNewProblem('')
      setNewTitle('')
    }
    setCreatingEntry(false)
  }

  const backToProblems = async () => {
    // Save synchronously before clearing state (bypassing debounce so record is still available)
    if (record) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const s = computeScores()
      await saveToSupabase({
        ...frameworkData,
        current_framework: currentFramework,
        scores: {
          total_score: s.total,
          band: s.band,
          framework_scores: s.frameworkScores,
        },
      })
    }
    setSelectedEntry(null)
    setRecord(null)
    // Refresh entries list
    supabase.from('unshakeable_playbook').select('*').eq('client_id', clientData.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllEntries(data) })
  }

  // ── Save Functions ──────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!record) return
    const { error } = await supabase.from('unshakeable_playbook').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    if (error) { console.error('unshakeable_playbook save error:', error); return }
    flash()
  }, [record, flash])

  const saveAll = useCallback(() => {
    if (!record) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const s = computeScores()
      saveToSupabase({
        ...frameworkData,
        current_framework: currentFramework,
        scores: {
          total_score: s.total,
          band: s.band,
          framework_scores: s.frameworkScores,
        },
      })
    }, 500)
  }, [record, saveToSupabase, frameworkData, currentFramework])

  useEffect(() => { if (!record) return; saveToSupabase({ current_framework: currentFramework }) }, [currentFramework])

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateFramework = (frameworkKey, field, value) => {
    setFrameworkData(prev => ({
      ...prev,
      [frameworkKey]: {
        ...prev[frameworkKey],
        [field]: value,
      },
    }))
  }

  // ── Scoring Engine ────────────────────────────────────────────────────────

  const computeScores = () => {
    const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
    let total = 0
    const frameworkScores = {}

    for (let i = 1; i <= 5; i++) {
      const key = `framework_${i}`
      const fw = frameworkData[key] || {}
      let fwScore = 0

      if (fw.reflection && fw.reflection.trim()) fwScore += 1
      if (fw.audit && fw.audit.trim()) fwScore += 1
      if (fw.go_deeper && fw.go_deeper.trim()) {
        if (wc(fw.go_deeper) >= 15) fwScore += 2
        else fwScore += 1
      }

      frameworkScores[key] = fwScore
      total += fwScore
    }

    let band = 'Needs Work'
    let bandDescription = 'You have significant gaps in your playbook. Go back and complete more frameworks with depth.'
    if (total >= 18) { band = 'Flywheel'; bandDescription = 'Outstanding. You have done the deep work. Your performance rewiring is well underway.' }
    else if (total >= 15) { band = 'Strong'; bandDescription = 'Solid progress. You are building real self-awareness. Go deeper on the frameworks that challenge you most.' }
    else if (total >= 9) { band = 'Getting There'; bandDescription = 'Good start. You are engaging with the material but some answers need more depth and honesty.' }

    return { total, max: 20, band, bandDescription, frameworkScores }
  }

  const scores = computeScores()

  // ── Action Plan Generator ──────────────────────────────────────────────────

  const [planLoading, setPlanLoading] = useState(false)
  const [planDuration, setPlanDuration] = useState(7)
  const [generatedTasks, setGeneratedTasks] = useState([])
  const [planSummary, setPlanSummary] = useState('')
  const [deployedToCalendar, setDeployedToCalendar] = useState(false)
  const [identityAffirmation, setIdentityAffirmation] = useState('')

  const generateActionPlan = async () => {
    setPlanLoading(true)
    setDeployedToCalendar(false)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 1) // Start tomorrow
      const startStr = startDate.toISOString().split('T')[0]

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'unshakeable',
          data: {
            ...frameworkData,
            problem_statement: record?.problem_statement || '',
            start_date: startStr,
            duration: planDuration,
          },
        }),
      })
      const result = await res.json()
      if (result.error) { alert('Failed to generate: ' + result.error); setPlanLoading(false); return }

      if (result.tasks && result.tasks.length > 0) {
        // Structured tasks — compute actual dates from day_offset
        const tasksWithDates = result.tasks.map(t => {
          const d = new Date(startStr + 'T12:00:00')
          d.setDate(d.getDate() + (t.day_offset || 0))
          return { ...t, scheduled_date: d.toISOString().split('T')[0] }
        })
        setGeneratedTasks(tasksWithDates)
        setPlanSummary(result.summary || '')
        setGeneratedPlan(result.summary || '')
        const { error: planErr } = await supabase.from('unshakeable_playbook').update({
          generated_plan: JSON.stringify({ tasks: tasksWithDates, summary: result.summary }),
          updated_at: new Date().toISOString(),
        }).eq('id', record.id)
        if (planErr) console.error('unshakeable_playbook save error:', planErr)
      } else {
        // Fallback to text plan
        setGeneratedPlan(result.plan || '')
        setGeneratedTasks([])
        const { error: fallbackErr } = await supabase.from('unshakeable_playbook').update({ generated_plan: result.plan, updated_at: new Date().toISOString() }).eq('id', record.id)
        if (fallbackErr) console.error('unshakeable_playbook save error:', fallbackErr)
      }
    } catch (e) { alert('Failed: ' + e.message) }
    setPlanLoading(false)
  }

  const deployToCalendar = async () => {
    if (!generatedTasks.length || !clientData) return
    setPlanLoading(true)

    // Create a project
    const projectTitle = record?.title || 'Performance Flywheel™'
    const firstDate = generatedTasks[0]?.scheduled_date
    const lastDate = generatedTasks[generatedTasks.length - 1]?.scheduled_date

    const { data: project } = await supabase.from('projects').insert([{
      client_id: clientData.id,
      name: `🔥 ${projectTitle}`,
      description: record?.problem_statement || '',
      status: 'in_progress',
      priority: 'high',
      start_date: firstDate,
      end_date: lastDate,
    }]).select().single()

    if (!project) { alert('Failed to create project'); setPlanLoading(false); return }

    // Create all tasks
    const taskInserts = generatedTasks.map(t => ({
      project_id: project.id,
      client_id: clientData.id,
      title: t.title,
      description: t.description || '',
      scheduled_date: t.scheduled_date,
      scheduled_time: t.scheduled_time || null,
      duration_minutes: t.duration_minutes || null,
      completed: false,
    }))

    const { error: tasksErr } = await supabase.from('project_tasks').insert(taskInserts)
    if (tasksErr) console.error('project_tasks save error:', tasksErr)

    // Auto-populate Identity Chamber from The Identity Shift™ (framework_1) go_deeper answer
    const identityAnswer = frameworkData.framework_1?.go_deeper?.trim()
    if (identityAnswer) {
      // Paraphrase into an "I am" affirmation
      const affirmation = identityAnswer.startsWith('I ') ? identityAnswer : `I am ${identityAnswer.charAt(0).toLowerCase()}${identityAnswer.slice(1)}`
      // Clean it up — remove trailing period, ensure it reads as a statement
      const cleanAffirmation = affirmation.replace(/\.$/, '').trim()
      const marker = `\n\n— Performance Flywheel™: ${record?.title || 'My Commitment'} —\n${cleanAffirmation}`

      // Fetch existing affirmations and append
      const { data: existing } = await supabase.from('identity_change').select('affirmations').eq('client_id', clientData.id).maybeSingle()
      const currentAffirmations = existing?.affirmations || ''
      const updated = currentAffirmations.trim() ? `${currentAffirmations.trim()}${marker}` : cleanAffirmation

      const { error: identityErr } = await supabase.from('identity_change').upsert({
        client_id: clientData.id,
        affirmations: updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })
      if (identityErr) console.error('identity_change save error:', identityErr)

      setIdentityAffirmation(cleanAffirmation)
    }

    setDeployedToCalendar(true)
    setPlanLoading(false)
  }

  // ── Framework Navigation ──────────────────────────────────────────────────

  const goToFramework = (num) => {
    saveAll()
    setCurrentFramework(num)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    ...FRAMEWORKS.map(f => ({ num: f.num, label: f.title, icon: String(f.num) })),
    { num: 6, label: 'Generate Plan', icon: '6' },
  ]

  const frameworkComplete = (num) => {
    if (num === 6) return scores.total >= 18
    const key = `framework_${num}`
    const fw = frameworkData[key] || {}
    return !!(fw.reflection && fw.reflection.trim() && fw.audit && fw.audit.trim() && fw.go_deeper && fw.go_deeper.trim())
  }

  // ── Render Framework ─────────────────────────────────────────────────────

  const renderFramework = (frameworkNum) => {
    const frameworkDef = FRAMEWORKS[frameworkNum - 1]
    const key = `framework_${frameworkNum}`
    const fw = frameworkData[key] || defaultFramework()
    const prevFramework = frameworkNum > 1 ? FRAMEWORKS[frameworkNum - 2] : null
    const nextFramework = frameworkNum < 5 ? FRAMEWORKS[frameworkNum] : null

    // Use custom questions if available, fall back to static
    const cq = customQuestions[key] || {}
    const reflectionQ = cq.reflection || frameworkDef.reflection
    const auditQ = cq.audit || frameworkDef.audit
    const goQ = cq.go_deeper || frameworkDef.go_deeper

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">{frameworkDef.title}</h1>
          <div className="bg-zinc-900 border border-gold/20 rounded-lg px-4 py-2.5 mt-3">
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Your Problem</p>
            <p className="text-sm text-zinc-300">{record?.problem_statement}</p>
          </div>
        </div>

        {/* Recap */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Framework Recap" />
          <p className="text-sm text-zinc-300 leading-relaxed">{frameworkDef.recap}</p>
        </div>

        {/* Reflection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Reflection" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{reflectionQ}</p>
            <TextArea
              value={fw.reflection}
              onChange={v => updateFramework(key, 'reflection', v)}
              onBlur={saveAll}
              placeholder="Write your reflection here..."
              rows={4}
            />
          </FieldGroup>
        </div>

        {/* Audit */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Audit" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{auditQ}</p>
            <TextArea
              value={fw.audit}
              onChange={v => updateFramework(key, 'audit', v)}
              onBlur={saveAll}
              placeholder="Write your audit here..."
              rows={4}
            />
          </FieldGroup>
        </div>

        {/* Go Deeper */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="Go Deeper" gold>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{goQ}</p>
            <TextArea
              value={fw.go_deeper}
              onChange={v => updateFramework(key, 'go_deeper', v)}
              onBlur={saveAll}
              placeholder="Go deeper here... (15+ words for full scoring credit)"
              rows={5}
            />
            <p className="text-zinc-600 text-xs mt-1">Write at least 15 words for full scoring credit</p>
          </FieldGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {prevFramework ? (
            <button onClick={() => goToFramework(frameworkNum - 1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
              &larr; {prevFramework.title}
            </button>
          ) : <div />}
          {nextFramework ? (
            <button onClick={() => goToFramework(frameworkNum + 1)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
              Next: {nextFramework.title} &rarr;
            </button>
          ) : (
            <button onClick={() => goToFramework(6)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
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
          <p className="text-zinc-500 text-sm">Review all your answers, see your score, and generate a personalised 30-day action plan.</p>
          <div className="bg-zinc-900 border border-gold/20 rounded-lg px-4 py-2.5 mt-3">
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Your Problem</p>
            <p className="text-sm text-zinc-300">{record?.problem_statement}</p>
          </div>
        </div>

        {/* Overall Score Ring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5 flex flex-col items-center">
          <ScoreRing score={scores.total} max={scores.max} size={140} strokeWidth={10} />
          <p className={`text-sm font-bold mt-3 ${scores.band === 'Flywheel' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>
            {scores.band}
          </p>
          <p className="text-zinc-500 text-xs text-center mt-1 max-w-md">{scores.bandDescription}</p>
        </div>

        {/* Framework Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {FRAMEWORKS.map(f => {
            const key = `framework_${f.num}`
            const fwScore = scores.frameworkScores[key] || 0
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <ProgressBar score={fwScore} max={4} label={f.title} />
              </div>
            )
          })}
        </div>

        {/* All Answers Summary */}
        <div className="space-y-5 mb-8">
          {FRAMEWORKS.map(f => {
            const key = `framework_${f.num}`
            const fw = frameworkData[key] || {}
            const hasContent = fw.reflection || fw.audit || fw.go_deeper
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <GoldLabel>{f.title}</GoldLabel>
                  <button
                    onClick={() => goToFramework(f.num)}
                    className="shrink-0 px-3 py-1 text-xs font-semibold text-gold border border-gold/30 rounded hover:bg-gold/10 transition"
                  >
                    Edit
                  </button>
                </div>
                {hasContent ? (
                  <div className="space-y-3">
                    {fw.reflection && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reflection</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{fw.reflection}</p>
                      </div>
                    )}
                    {fw.audit && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Audit</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{fw.audit}</p>
                      </div>
                    )}
                    {fw.go_deeper && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Go Deeper</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{fw.go_deeper}</p>
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
          {scores.total >= 16 ? (
            <>
              {/* Duration picker */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Plan Duration:</span>
                {[7, 14].map(d => (
                  <button key={d} onClick={() => setPlanDuration(d)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                      planDuration === d ? 'bg-gold/10 text-gold border border-gold/30' : 'text-zinc-500 hover:text-white border border-zinc-700'
                    }`}>
                    {d} Days
                  </button>
                ))}
              </div>

              <div className="text-center mb-6">
                <button onClick={generateActionPlan} disabled={planLoading} className={`px-8 py-4 ${generatedTasks.length > 0 || generatedPlan ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30' : 'bg-gold hover:bg-gold-light text-zinc-950'} disabled:opacity-50 font-bold text-xs uppercase tracking-widest rounded-lg transition`}>
                  {planLoading ? 'Generating...' : generatedTasks.length > 0 || generatedPlan ? 'Regenerate Plan' : 'Generate Action Plan'}
                </button>
                {(generatedTasks.length > 0 || generatedPlan) && <p className="text-zinc-600 text-xs mt-2">Updated your answers? Hit regenerate to refresh your plan.</p>}
              </div>

              {/* Structured Tasks View */}
              {generatedTasks.length > 0 && (
                <div>
                  {planSummary && (
                    <div className="bg-zinc-900 border border-gold/20 rounded-xl p-5 mb-5">
                      <p className="text-sm text-zinc-300 leading-relaxed">{planSummary}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-6">
                    {generatedTasks.map((task, i) => {
                      const d = new Date(task.scheduled_date + 'T12:00:00')
                      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                      return (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-start gap-4">
                          <div className="flex-shrink-0 text-center w-16">
                            <p className="text-xs font-bold text-gold uppercase">{dayLabel}</p>
                            {task.scheduled_time && <p className="text-[10px] text-zinc-500 mt-0.5">{task.scheduled_time}</p>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{task.title}</p>
                            {task.description && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{task.description}</p>}
                          </div>
                          {task.duration_minutes && <span className="text-xs text-zinc-600 flex-shrink-0">{task.duration_minutes}min</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Deploy button */}
                  <div className="text-center">
                    {deployedToCalendar ? (
                      <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-left">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">Plan Deployed</h3>
                            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Your flywheel is in motion</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                            <span className="text-lg">📋</span>
                            <div>
                              <p className="text-sm font-bold text-white">Project Created</p>
                              <p className="text-xs text-zinc-400 mt-0.5">{generatedTasks.length} tasks added to your <span className="text-gold font-semibold">Projects</span> tab with scheduled dates</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                            <span className="text-lg">☀️</span>
                            <div>
                              <p className="text-sm font-bold text-white">Morning Ops Updated</p>
                              <p className="text-xs text-zinc-400 mt-0.5">Your tasks will appear in <span className="text-gold font-semibold">Today's Schedule</span> every morning</p>
                            </div>
                          </div>

                          {identityAffirmation && (
                            <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                              <span className="text-lg">🪞</span>
                              <div>
                                <p className="text-sm font-bold text-white">Identity Chamber Updated</p>
                                <p className="text-xs text-zinc-400 mt-0.5">Your identity shift has been added to your <span className="text-gold font-semibold">Identity Chamber</span> affirmations:</p>
                                <p className="text-sm text-gold font-semibold mt-2 italic">"{identityAffirmation}"</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                            <span className="text-lg">📅</span>
                            <div>
                              <p className="text-sm font-bold text-white">Calendar</p>
                              <p className="text-xs text-zinc-400 mt-0.5">Tasks run from <span className="text-white font-medium">{generatedTasks[0]?.scheduled_date && new Date(generatedTasks[0].scheduled_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> to <span className="text-white font-medium">{generatedTasks[generatedTasks.length - 1]?.scheduled_date && new Date(generatedTasks[generatedTasks.length - 1].scheduled_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> — check your <span className="text-gold font-semibold">War Map</span> calendar</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={deployToCalendar} disabled={planLoading}
                        className="px-8 py-4 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                        {planLoading ? 'Deploying...' : 'Deploy to Calendar'}
                      </button>
                    )}
                    {!deployedToCalendar && <p className="text-zinc-600 text-xs mt-2">This will create a project with all these tasks on your calendar and update your Identity Chamber.</p>}
                  </div>
                </div>
              )}

              {/* Fallback text plan */}
              {generatedTasks.length === 0 && generatedPlan && (
                <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Your Performance Flywheel™ Action Plan</h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{generatedPlan}</div>
                </div>
              )}
            </>
          ) : (() => {
            const improvements = []
            const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
            FRAMEWORKS.forEach(f => {
              const fw = frameworkData[`framework_${f.num}`] || {}
              if (!fw.reflection) improvements.push({ framework: f.num, title: f.title, field: 'Reflection', msg: 'Answer the reflection question' })
              if (!fw.audit) improvements.push({ framework: f.num, title: f.title, field: 'Audit', msg: 'Complete the audit' })
              if (!fw.go_deeper) improvements.push({ framework: f.num, title: f.title, field: 'Go Deeper', msg: 'Answer the Go Deeper question' })
              else if (wc(fw.go_deeper) < 15) improvements.push({ framework: f.num, title: f.title, field: 'Go Deeper', msg: 'Add more depth — needs 15+ words for full marks' })
            })
            return (
            <div>
              <div className="text-center mb-6">
                <p className="text-zinc-400 text-sm font-medium mb-1">Score {scores.total}/20 — you need 16 to unlock your action plan</p>
                <div className="w-full max-w-xs mx-auto h-3 bg-zinc-800 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(scores.total / 16) * 100}%` }} />
                </div>
                <p className="text-zinc-600 text-xs mt-2">{16 - scores.total} points to go</p>
              </div>
              {improvements.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Improve these to unlock your plan</h3>
                  <div className="space-y-2">
                    {improvements.slice(0, 8).map((imp, i) => (
                      <button key={i} onClick={() => goToFramework(imp.framework)}
                        className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left hover:border-gold/30 active:border-gold/30 transition">
                        <span className="text-amber-400 text-lg flex-shrink-0">&#9888;&#65039;</span>
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
          <button onClick={() => goToFramework(5)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; The Action Bridge™
          </button>
        </div>
      </div>
    )
  }

  // ── Problem Picker View ──────────────────────────────────────────────────

  const renderProblemPicker = () => {
    return (
      <div className="min-h-screen bg-zinc-950">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="The Syndicate" className="h-10 w-auto" />
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-widest">Performance Flywheel™</h1>
              <p className="text-zinc-600 text-xs">Pick a problem. Apply the frameworks. Get a plan.</p>
            </div>
          </div>
          <button onClick={() => router.push('/client')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline tracking-wide">Back to App</span>
          </button>
        </header>

        <div className="max-w-2xl mx-auto p-4 md:px-8 md:py-8">
          {/* New Problem */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <h2 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">New Problem</h2>
            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Give it a short title</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Content consistency, Underpricing, Morning routine"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Describe the problem you want to solve</label>
              <textarea
                rows={4}
                value={newProblem}
                onChange={e => setNewProblem(e.target.value)}
                placeholder="Be specific. What's the problem? How is it showing up? What has it cost you?"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
              />
            </div>
            <button
              onClick={createNewEntry}
              disabled={!newProblem.trim() || creatingEntry}
              className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-30 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition"
            >
              {creatingEntry ? 'Generating your personalised frameworks...' : 'Start Performance Flywheel™'}
            </button>
          </div>

          {/* Existing Entries */}
          {allEntries.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Your Problems</h2>
              <div className="space-y-3">
                {allEntries.map(entry => {
                  const s = entry.scores || {}
                  const total = s.total_score || 0
                  const hasPlan = !!entry.generated_plan
                  const completedFrameworks = [1,2,3,4,5].filter(i => {
                    const fw = entry[`framework_${i}`] || {}
                    return fw.reflection?.trim() && fw.audit?.trim() && fw.go_deeper?.trim()
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
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{entry.problem_statement}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-zinc-600">{completedFrameworks}/5 frameworks</span>
                            <span className="text-xs text-zinc-700">·</span>
                            <span className="text-xs text-zinc-600">{total}/20 score</span>
                            {hasPlan && (
                              <>
                                <span className="text-xs text-zinc-700">·</span>
                                <span className="text-xs text-emerald-400 font-semibold">Plan generated</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-3">
                        <div className={`h-full rounded-full transition-all ${hasPlan ? 'bg-emerald-500' : 'bg-gold'}`} style={{ width: `${(completedFrameworks / 5) * 100}%` }} />
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

  // ── If no entry selected, show problem picker ────────────────────────────

  if (!selectedEntry) return renderProblemPicker()

  // ── Sidebar Content ───────────────────────────────────────────────────────

  const sidebarNav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 pb-4 border-b border-zinc-800">
        <img src="/logo.png" alt="The Syndicate" className="h-12 w-auto" />
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <button onClick={backToProblems} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="tracking-wide">All Problems</span>
        </button>
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-white text-sm font-semibold truncate">{record?.title || 'Untitled'}</p>
        <p className="text-zinc-600 text-xs mt-0.5 line-clamp-2">{record?.problem_statement}</p>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 pb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Frameworks</p>
        {stages.map(stage => (
          <button
            key={stage.num}
            onClick={() => goToFramework(stage.num)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition ${
              currentFramework === stage.num
                ? 'text-gold bg-gold/[0.08] border-r-2 border-gold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
              frameworkComplete(stage.num)
                ? 'bg-gold/20 text-gold border-gold/40'
                : currentFramework === stage.num
                  ? 'border-gold/40 text-gold'
                  : 'border-zinc-700 text-zinc-600'
            }`}>
              {frameworkComplete(stage.num) ? (
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
          <p className={`text-xs font-semibold mt-0.5 ${scores.band === 'Flywheel' ? 'text-gold' : scores.band === 'Strong' ? 'text-emerald-400' : scores.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.band}</p>
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
          {currentFramework >= 1 && currentFramework <= 5 && renderFramework(currentFramework)}
          {currentFramework === 6 && renderPlanStage()}
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
