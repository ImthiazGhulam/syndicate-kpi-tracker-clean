'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes ─────────────────────────────────────────────────────

const defaultBucket = () => ({
  likerts: {
    v1: 0, v2: 0, v3: 0, v4: 0,
    e1: 0, e2: 0, e3: 0, e4: 0,
    t1: 0, t2: 0, t3: 0, t4: 0,
  },
  gap_description: '',
})

const defaultStar = () => ({
  name: '',
  personality: [],
  specific_description: '',
  client_type: '',
  contrarian_belief: '',
  values: [],
  what_you_do: '',
  sector: '',
  refuse: '',
  not_for: '',
})

const defaultHero = () => ({
  origin: '',
  lack: '',
  turning_point: '',
  decision: '',
  hard_way: '',
  failures: '',
  lesson: '',
  understanding: '',
  gift: '',
  why: '',
  traits: '',
  identity_label: '',
})

const defaultRemarkable = () => ({
  category: '',
  mechanism: '',
  differentiator: '',
  provocation: '',
  belief_premium: '',
  signals: [],
  signal_gaps: [],
  competitors: [''],
  opportunity: '',
  build: '',
})

// ── Option Arrays ───────────────────────────────────────────────────────────

const PERSONALITY_OPTIONS = ['Bold', 'Warm', 'Provocative', 'Analytical', 'Nurturing', 'Direct', 'Playful', 'Authoritative', 'Understated', 'Intense']
const VALUES_OPTIONS = ['Freedom', 'Mastery', 'Impact', 'Integrity', 'Excellence', 'Adventure', 'Security', 'Community', 'Innovation', 'Legacy']

const PREMIUM_SIGNALS = [
  'High visible price',
  'Application process',
  'Limited access',
  'Strong public POV',
  'Known in a niche',
  'Strong social proof',
  'Named method',
  'Turns away bad-fit clients',
]

const SIGNAL_GAPS = [
  'No vetting process',
  'Still discounting',
  'Weak public POV',
  'Too broad / not niched',
  'Generic brand language',
  'Little social proof',
  'No named method',
  'Competing on price',
]

const VISIBILITY_QUESTIONS = [
  { key: 'v1', text: 'People in my target market know I exist and what I do' },
  { key: 'v2', text: 'I show up consistently where my ideal clients spend their attention' },
  { key: 'v3', text: 'When I post or share content, new people discover me as a result' },
  { key: 'v4', text: 'My niche is specific enough that I am known for something in particular' },
]

const ENGAGEMENT_QUESTIONS = [
  { key: 'e1', text: 'People respond to, share, or comment on my content and ideas' },
  { key: 'e2', text: 'My message is distinct enough that people would miss it if I stopped' },
  { key: 'e3', text: 'When people visit my profile or website they immediately understand who I help and how' },
  { key: 'e4', text: 'I have a clear point of view that attracts some people and repels others' },
]

const TRUST_QUESTIONS = [
  { key: 't1', text: 'Prospective clients tell me they\'ve followed me for a while before reaching out' },
  { key: 't2', text: 'I have visible social proof — results, testimonials, case studies — that backs my claims' },
  { key: 't3', text: 'My price feels justified to prospects — I rarely face price objections' },
  { key: 't4', text: 'My personal story and background are clear — people know why I do what I do' },
]

// ── Reusable Sub-components (outside main component to prevent remounting) ──

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
    />
  )
}

function SingleSelectTags({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition border ${value === opt ? 'bg-gold/10 text-gold border-gold/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}>{opt}</button>
      ))}
    </div>
  )
}

function MultiSelectTags({ options, value = [], onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onToggle(opt)} className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition border ${(value || []).includes(opt) ? 'bg-gold/10 text-gold border-gold/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}>{opt}</button>
      ))}
    </div>
  )
}

function LikertScale({ value, onChange, question }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-zinc-300 mb-2">{question}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition border ${value === n ? 'bg-gold/20 text-gold border-gold/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function DynamicList({ items = [''], onUpdate, onAdd, onRemove, placeholder }) {
  return (
    <div className="space-y-2">
      {(items || ['']).map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item || ''}
            onChange={e => onUpdate(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
          />
          <button onClick={() => onRemove(i)} className="text-zinc-700 hover:text-red-400 transition px-2 text-lg">&#10005;</button>
        </div>
      ))}
      <button onClick={onAdd} className="text-xs text-gold hover:text-gold-light transition">+ Add</button>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

// ── Reusable Sub-components (outside main component for mobile performance) ──

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
  if (pct >= 0.82) color = '#C9A84C'
  else if (pct >= 0.62) color = '#22c55e'
  else if (pct >= 0.42) color = '#eab308'
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

export default function PremiumPositionPage() {
  const router = useRouter()

  // Auth & client
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Premium Position
  const [record, setRecord] = useState(null)
  const [currentStage, setCurrentStage] = useState(1)
  const [bucketData, setBucketData] = useState(defaultBucket())
  const [starData, setStarData] = useState(defaultStar())
  const [heroData, setHeroData] = useState(defaultHero())
  const [remarkableData, setRemarkableData] = useState(defaultRemarkable())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const saveTimerRef = useRef(null)
  const toastRef = useRef(null)
  const toastTimerRef = useRef(null)

  // Toast via DOM ref (not setState — performance critical)
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

      // fetch or create premium_position
      const { data: existing } = await supabase.from('premium_position').select('*').eq('client_id', client.id).maybeSingle()
      if (existing) {
        setRecord(existing)
        setCurrentStage(existing.current_stage || 1)
        setBucketData({ ...defaultBucket(), ...(existing.bucket || {}) })
        setStarData({ ...defaultStar(), ...(existing.brand_star || {}) })
        setHeroData({ ...defaultHero(), ...(existing.hero || {}) })
        setRemarkableData({ ...defaultRemarkable(), ...(existing.remarkable || {}) })
      } else {
        const { data: newRec } = await supabase
          .from('premium_position')
          .insert({
            client_id: client.id,
            current_stage: 1,
            bucket: defaultBucket(),
            brand_star: defaultStar(),
            hero: defaultHero(),
            remarkable: defaultRemarkable(),
            scores: {},
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
    await supabase.from('premium_position').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    flash()
  }, [record, flash])

  const debouncedSave = useCallback((fields) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveToSupabase(fields), 2000)
  }, [saveToSupabase])

  // Auto-save watchers
  // Save on blur (not on every keystroke) + on stage change
  const saveAll = useCallback(() => {
    if (!record) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveToSupabase({ bucket: bucketData, brand_star: starData, hero: heroData, remarkable: remarkableData, current_stage: currentStage })
    }, 500)
  }, [record, saveToSupabase, bucketData, starData, heroData, remarkableData, currentStage])

  useEffect(() => { if (!record) return; saveToSupabase({ current_stage: currentStage }) }, [currentStage])

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateBucket = (key, val) => setBucketData(prev => ({ ...prev, [key]: val }))
  const updateLikert = (key, val) => setBucketData(prev => ({ ...prev, likerts: { ...prev.likerts, [key]: val } }))

  const updateStar = (key, val) => setStarData(prev => ({ ...prev, [key]: val }))
  const toggleStarMulti = (key, val) => {
    setStarData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  const updateHero = (key, val) => setHeroData(prev => ({ ...prev, [key]: val }))

  const updateRemarkable = (key, val) => setRemarkableData(prev => ({ ...prev, [key]: val }))
  const toggleRemarkableMulti = (key, val) => {
    setRemarkableData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  // ── Scoring Engine ────────────────────────────────────────────────────────

  const computeScores = () => {
    const flags = []

    // ── Stage 1: Brand Bucket (out of 10) ──
    let bucketScore = 0
    const likerts = bucketData.likerts || {}
    const answered = Object.values(likerts).filter(v => v > 0).length
    bucketScore += (answered / 12) * 6
    if (bucketData.gap_description && bucketData.gap_description.trim().split(/\s+/).length > 10) bucketScore += 2
    const visScore = (likerts.v1 || 0) + (likerts.v2 || 0) + (likerts.v3 || 0) + (likerts.v4 || 0)
    const engScore = (likerts.e1 || 0) + (likerts.e2 || 0) + (likerts.e3 || 0) + (likerts.e4 || 0)
    const trustScore = (likerts.t1 || 0) + (likerts.t2 || 0) + (likerts.t3 || 0) + (likerts.t4 || 0)
    if (visScore > 0 && engScore > 0 && trustScore > 0) bucketScore += 2
    bucketScore = Math.min(Math.round(bucketScore * 10) / 10, 10)

    // ── Stage 2: Brand Star (out of 10) ──
    let starScore = 0
    if (starData.name) starScore += 1
    if (starData.specific_description && starData.specific_description.trim().split(/\s+/).length >= 4) starScore += 2
    else if (starData.specific_description) starScore += 1
    if (starData.contrarian_belief && starData.contrarian_belief.trim().split(/\s+/).length >= 12) starScore += 2
    else if (starData.contrarian_belief) starScore += 1
    if (starData.what_you_do && starData.what_you_do.trim().split(/\s+/).length >= 6) starScore += 2
    else if (starData.what_you_do) starScore += 1
    if (starData.refuse) starScore += 1
    if (starData.values && starData.values.length >= 2) starScore += 1
    if (starData.personality && starData.personality.length >= 1) starScore += 1
    starScore = Math.min(Math.round(starScore * 10) / 10, 10)

    // ── Stage 3: Hero Framework (out of 15) ──
    let heroScore = 0
    const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
    if (wc(heroData.origin) >= 10) heroScore += 2; else if (heroData.origin) heroScore += 1
    if (wc(heroData.turning_point) >= 8) heroScore += 2; else if (heroData.turning_point) heroScore += 1
    if (heroData.decision) heroScore += 1
    if (wc(heroData.hard_way) >= 8) heroScore += 2; else if (heroData.hard_way) heroScore += 1
    if (heroData.failures) heroScore += 1
    if (wc(heroData.gift) >= 8) heroScore += 2; else if (heroData.gift) heroScore += 1
    if (heroData.why) heroScore += 1
    if (heroData.traits) heroScore += 1
    if (heroData.identity_label) heroScore += 1
    heroScore = Math.min(Math.round(heroScore * 10) / 10, 15)

    // ── Stage 4: Remarkable Factor (out of 15) ──
    let remarkableScore = 0
    if (wc(remarkableData.category) >= 4) remarkableScore += 2; else if (remarkableData.category) remarkableScore += 1
    if (wc(remarkableData.mechanism) >= 8) remarkableScore += 2; else if (remarkableData.mechanism) remarkableScore += 1
    if (remarkableData.differentiator) remarkableScore += 2
    if (wc(remarkableData.provocation) >= 8) remarkableScore += 2; else if (remarkableData.provocation) remarkableScore += 1
    if (remarkableData.signals && remarkableData.signals.length >= 2) remarkableScore += 2
    if (remarkableData.signal_gaps && remarkableData.signal_gaps.length >= 1) remarkableScore += 1
    if (remarkableData.opportunity) remarkableScore += 1
    remarkableScore = Math.min(Math.round(remarkableScore * 10) / 10, 15)

    // ── Total ──
    const total = Math.round((bucketScore + starScore + heroScore + remarkableScore) * 10) / 10

    let band = 'Needs Work'
    let bandDescription = 'You have significant gaps to address before your premium positioning is ready.'
    if (total >= 41) { band = 'Offer-Ready'; bandDescription = 'Your premium positioning is strong. You are ready to go to market with confidence.' }
    else if (total >= 31) { band = 'Strong Foundation'; bandDescription = 'Your core positioning is solid. Refine the remaining gaps and you are nearly there.' }
    else if (total >= 21) { band = 'Getting There'; bandDescription = 'Good progress. Focus on the flagged areas to strengthen your position.' }

    // ── Flags ──
    if (answered < 12) flags.push({ severity: 'warning', message: 'Brand Bucket audit incomplete — answer all 12 Likert questions', stage: 1 })
    const lowestLayer = Math.min(visScore, engScore, trustScore)
    if (answered === 12 && lowestLayer <= 8) {
      const layerName = lowestLayer === visScore ? 'Visibility' : lowestLayer === engScore ? 'Engagement' : 'Trust'
      flags.push({ severity: 'critical', message: `Critical leak in ${layerName} — score ${lowestLayer}/20. This is your biggest bottleneck.`, stage: 1 })
    }
    if (!starData.contrarian_belief || wc(starData.contrarian_belief) < 5) flags.push({ severity: 'critical', message: 'Contrarian belief is missing or too vague — this is the engine of differentiation', stage: 2 })
    if (!starData.specific_description) flags.push({ severity: 'warning', message: 'Client description missing from Brand Star', stage: 2 })
    if (!heroData.turning_point) flags.push({ severity: 'critical', message: 'Hero turning point is empty — this is the emotional anchor of your brand story', stage: 3 })
    if (!heroData.gift) flags.push({ severity: 'warning', message: 'Hero gift (what your story gives clients) is not defined', stage: 3 })
    if (!heroData.identity_label) flags.push({ severity: 'warning', message: 'No identity label set — this shapes how people remember you', stage: 3 })
    if (!remarkableData.mechanism || wc(remarkableData.mechanism) < 5) flags.push({ severity: 'critical', message: 'No named mechanism — you need a proprietary method to command premium pricing', stage: 4 })
    if (!remarkableData.differentiator) flags.push({ severity: 'critical', message: 'Differentiator is missing — what do you do that nobody else does?', stage: 4 })
    if (remarkableData.signal_gaps && remarkableData.signal_gaps.length >= 3) flags.push({ severity: 'warning', message: `${remarkableData.signal_gaps.length} premium signal gaps identified — address these to justify higher pricing`, stage: 4 })
    if (!remarkableData.provocation || wc(remarkableData.provocation) < 5) flags.push({ severity: 'warning', message: 'Provocation is weak — a strong honest take builds authority', stage: 4 })

    return {
      bucket: { total: bucketScore, max: 10, vis: visScore, eng: engScore, trust: trustScore },
      star: { total: starScore, max: 10 },
      hero: { total: heroScore, max: 15 },
      remarkable: { total: remarkableScore, max: 15 },
      overall: { total, max: 50, band, bandDescription },
      flags,
    }
  }

  const scores = computeScores()

  // ── Stage Navigation ──────────────────────────────────────────────────────

  const goToStage = (stage) => {
    saveAll()
    setCurrentStage(stage)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    { num: 1, label: 'Brand Bucket', icon: '1' },
    { num: 2, label: 'Brand Star', icon: '2' },
    { num: 3, label: 'Hero Framework', icon: '3' },
    { num: 4, label: 'Remarkable Factor', icon: '4' },
    { num: 5, label: 'Blueprint', icon: '5' },
  ]

  const stageComplete = (num) => {
    if (num === 1) return scores.bucket.total >= 7
    if (num === 2) return scores.star.total >= 7
    if (num === 3) return scores.hero.total >= 10
    if (num === 4) return scores.remarkable.total >= 10
    if (num === 5) return scores.overall.total >= 41
    return false
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

  // All reusable sub-components (Label, GoldLabel, SectionHeading, FieldGroup,
  // ScoreRing, ProgressBar, TextInput, TextArea, etc.) are defined OUTSIDE
  // the main component to prevent mobile focus loss on re-render

  // ── Bucket Layer Helpers ──────────────────────────────────────────────────

  const getLayerVerdict = (score) => {
    if (score >= 15) return { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-400' }
    if (score >= 9) return { label: 'Needs attention', color: 'text-yellow-400', bg: 'bg-yellow-400' }
    return { label: 'Critical leak', color: 'text-red-400', bg: 'bg-red-400' }
  }

  const getLeakDiagnosis = () => {
    const likerts = bucketData.likerts || {}
    const answered = Object.values(likerts).filter(v => v > 0).length
    if (answered < 12) return null
    const vis = (likerts.v1 || 0) + (likerts.v2 || 0) + (likerts.v3 || 0) + (likerts.v4 || 0)
    const eng = (likerts.e1 || 0) + (likerts.e2 || 0) + (likerts.e3 || 0) + (likerts.e4 || 0)
    const trust = (likerts.t1 || 0) + (likerts.t2 || 0) + (likerts.t3 || 0) + (likerts.t4 || 0)
    const lowest = Math.min(vis, eng, trust)
    if (lowest === vis) return { layer: 'Visibility', score: vis, message: 'Your audience cannot buy from you if they do not know you exist. Visibility is your primary bottleneck. Focus on showing up consistently and narrowing your niche before anything else.' }
    if (lowest === eng) return { layer: 'Engagement', score: eng, message: 'People see you but are not stopping. Your message is not distinct enough to hold attention. Sharpen your point of view and make your content impossible to scroll past.' }
    return { layer: 'Trust', score: trust, message: 'You have attention but not enough credibility to convert it. Invest in social proof, share your story, and make your results visible. Trust is the final gate before a sale.' }
  }

  // ── Generate AI Prompt ────────────────────────────────────────────────────

  const generateAIPrompt = () => {
    const lines = []
    lines.push('=== PREMIUM POSITION BLUEPRINT DATA ===\n')

    lines.push('--- BRAND BUCKET (Visibility / Engagement / Trust Audit) ---')
    const likerts = bucketData.likerts || {}
    lines.push(`Visibility Score: ${(likerts.v1||0)+(likerts.v2||0)+(likerts.v3||0)+(likerts.v4||0)}/20`)
    lines.push(`Engagement Score: ${(likerts.e1||0)+(likerts.e2||0)+(likerts.e3||0)+(likerts.e4||0)}/20`)
    lines.push(`Trust Score: ${(likerts.t1||0)+(likerts.t2||0)+(likerts.t3||0)+(likerts.t4||0)}/20`)
    const diagnosis = getLeakDiagnosis()
    if (diagnosis) lines.push(`Primary Leak: ${diagnosis.layer} (${diagnosis.score}/20)`)
    lines.push(`Gap Description: ${bucketData.gap_description}`)

    lines.push('\n--- COLT BRAND STAR ---')
    lines.push(`Name: ${starData.name}`)
    lines.push(`Personality: ${(starData.personality || []).join(', ')}`)
    lines.push(`Client Description: ${starData.specific_description}`)
    lines.push(`Client Type: ${starData.client_type}`)
    lines.push(`Contrarian Belief: ${starData.contrarian_belief}`)
    lines.push(`Values: ${(starData.values || []).join(', ')}`)
    lines.push(`What You Do: ${starData.what_you_do}`)
    lines.push(`Sector: ${starData.sector}`)
    lines.push(`What You Refuse: ${starData.refuse}`)
    lines.push(`Not For: ${starData.not_for}`)

    lines.push('\n--- HERO FRAMEWORK ---')
    lines.push(`Origin: ${heroData.origin}`)
    lines.push(`Lack: ${heroData.lack}`)
    lines.push(`Turning Point: ${heroData.turning_point}`)
    lines.push(`Decision: ${heroData.decision}`)
    lines.push(`Hard Way: ${heroData.hard_way}`)
    lines.push(`Failures: ${heroData.failures}`)
    lines.push(`Lesson: ${heroData.lesson}`)
    lines.push(`Understanding: ${heroData.understanding}`)
    lines.push(`Gift: ${heroData.gift}`)
    lines.push(`Why: ${heroData.why}`)
    lines.push(`Character Traits: ${heroData.traits}`)
    lines.push(`Identity Label: ${heroData.identity_label}`)

    lines.push('\n--- REMARKABLE FACTOR ---')
    lines.push(`Category: ${remarkableData.category}`)
    lines.push(`Unique Mechanism: ${remarkableData.mechanism}`)
    lines.push(`Differentiator: ${remarkableData.differentiator}`)
    lines.push(`Provocation: ${remarkableData.provocation}`)
    lines.push(`Belief Premium: ${remarkableData.belief_premium}`)
    lines.push(`Premium Signals: ${(remarkableData.signals || []).join(', ')}`)
    lines.push(`Signal Gaps: ${(remarkableData.signal_gaps || []).join(', ')}`)
    lines.push(`Competitors: ${(remarkableData.competitors || []).filter(x => x).join(', ')}`)
    lines.push(`Opportunity: ${remarkableData.opportunity}`)
    lines.push(`Build: ${remarkableData.build}`)

    lines.push('\n--- SCORES ---')
    lines.push(`Brand Bucket: ${scores.bucket.total}/${scores.bucket.max}`)
    lines.push(`Brand Star: ${scores.star.total}/${scores.star.max}`)
    lines.push(`Hero Framework: ${scores.hero.total}/${scores.hero.max}`)
    lines.push(`Remarkable Factor: ${scores.remarkable.total}/${scores.remarkable.max}`)
    lines.push(`Total: ${scores.overall.total}/${scores.overall.max} (${scores.overall.band})`)

    if (scores.flags.length > 0) {
      lines.push('\n--- FLAGS ---')
      scores.flags.forEach(f => lines.push(`[${f.severity.toUpperCase()}] ${f.message}`))
    }

    lines.push('\n=== END BLUEPRINT DATA ===')
    lines.push('\nUsing this Premium Position Blueprint data, help me refine my personal brand positioning. Identify the biggest gaps, suggest specific improvements to my messaging and differentiation, and give me actionable next steps to command premium pricing.')

    navigator.clipboard.writeText(lines.join('\n'))
    flash('Copied to clipboard')
  }

  // ── Stage 1: Brand Bucket ─────────────────────────────────────────────────

  const renderStage1 = () => {
    const likerts = bucketData.likerts || {}
    const visScore = (likerts.v1 || 0) + (likerts.v2 || 0) + (likerts.v3 || 0) + (likerts.v4 || 0)
    const engScore = (likerts.e1 || 0) + (likerts.e2 || 0) + (likerts.e3 || 0) + (likerts.e4 || 0)
    const trustScore = (likerts.t1 || 0) + (likerts.t2 || 0) + (likerts.t3 || 0) + (likerts.t4 || 0)
    const visVerdict = getLayerVerdict(visScore)
    const engVerdict = getLayerVerdict(engScore)
    const trustVerdict = getLayerVerdict(trustScore)
    const diagnosis = getLeakDiagnosis()

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">The Brand Bucket</h1>
          <p className="text-zinc-500 text-sm">Audit your visibility, engagement, and trust. Rate each statement from 1 (strongly disagree) to 5 (strongly agree).</p>
        </div>

        {/* Visibility */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Visibility" description="Can your target market find you?" />
          {VISIBILITY_QUESTIONS.map(q => (
            <LikertScale key={q.key} value={likerts[q.key] || 0} onChange={v => updateLikert(q.key, v)} question={q.text} />
          ))}
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Visibility Score</span>
              <span className={`text-xs font-semibold ${visVerdict.color}`}>{visScore}/20 — {visVerdict.label}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${visVerdict.bg}`} style={{ width: `${(visScore / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Engagement" description="Does your audience stop scrolling?" />
          {ENGAGEMENT_QUESTIONS.map(q => (
            <LikertScale key={q.key} value={likerts[q.key] || 0} onChange={v => updateLikert(q.key, v)} question={q.text} />
          ))}
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Engagement Score</span>
              <span className={`text-xs font-semibold ${engVerdict.color}`}>{engScore}/20 — {engVerdict.label}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${engVerdict.bg}`} style={{ width: `${(engScore / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <SectionHeading title="Trust" description="Do prospects believe you can deliver?" />
          {TRUST_QUESTIONS.map(q => (
            <LikertScale key={q.key} value={likerts[q.key] || 0} onChange={v => updateLikert(q.key, v)} question={q.text} />
          ))}
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Trust Score</span>
              <span className={`text-xs font-semibold ${trustVerdict.color}`}>{trustScore}/20 — {trustVerdict.label}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${trustVerdict.bg}`} style={{ width: `${(trustScore / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Leak Diagnosis */}
        {diagnosis && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
            <SectionHeading title="Leak Diagnosis" />
            <div className={`rounded-lg p-4 border ${diagnosis.score <= 8 ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
              <p className={`text-sm font-semibold mb-1 ${diagnosis.score <= 8 ? 'text-red-400' : 'text-yellow-400'}`}>
                Primary leak: {diagnosis.layer} ({diagnosis.score}/20)
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">{diagnosis.message}</p>
            </div>
          </div>
        )}

        {/* Gap Description */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <FieldGroup label="In your own words — where do you feel the biggest gap is right now?">
            <TextArea value={bucketData.gap_description} onChange={v => updateBucket('gap_description', v)} placeholder="Describe honestly where you think your brand leaks the most attention, trust, or engagement..." rows={4} />
            <p className="text-zinc-600 text-xs mt-1">Write at least 10 words for full scoring credit</p>
          </FieldGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-end mt-8">
          <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
            Next: Brand Star &rarr;
          </button>
        </div>
      </div>
    )
  }

  // ── Stage 2: Brand Star ───────────────────────────────────────────────────

  const renderStage2 = () => {
    const diagnosis = getLeakDiagnosis()

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">The Colt Brand Star</h1>
          <p className="text-zinc-500 text-sm">Define the five points of your personal brand. Each shapes how the market sees and remembers you.</p>
        </div>

        {/* Leak diagnosis pill */}
        {diagnosis && (
          <div className={`mb-6 rounded-lg px-4 py-3 border ${diagnosis.score <= 8 ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <p className={`text-xs font-semibold ${diagnosis.score <= 8 ? 'text-red-400' : 'text-yellow-400'}`}>
              From your Brand Bucket: Primary leak is {diagnosis.layer} ({diagnosis.score}/20)
            </p>
          </div>
        )}

        {/* 2x2 Grid — Points 1-4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Point 1: Identity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Point 1 — Identity</GoldLabel>
            <FieldGroup label="Your name / brand name">
              <TextInput value={starData.name} onChange={v => updateStar('name', v)} placeholder="e.g. Jane Smith / The Growth Lab" />
            </FieldGroup>
            <FieldGroup label="Brand personality traits">
              <MultiSelectTags options={PERSONALITY_OPTIONS} value={starData.personality} onToggle={v => toggleStarMulti('personality', v)} />
            </FieldGroup>
          </div>

          {/* Point 2: Audience */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Point 2 — Audience</GoldLabel>
            <FieldGroup label="Describe your ideal client">
              <TextArea value={starData.specific_description} onChange={v => updateStar('specific_description', v)} placeholder="Who do you serve? Be specific about their situation, not just demographics." rows={3} />
              <p className="text-zinc-600 text-xs mt-1">4+ words for full credit</p>
            </FieldGroup>
            <FieldGroup label="Client type">
              <SingleSelectTags options={['B2B', 'B2C', 'Both']} value={starData.client_type} onChange={v => updateStar('client_type', v)} />
            </FieldGroup>
          </div>

          {/* Point 3: Position */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Point 3 — Position</GoldLabel>
            <FieldGroup label="Your contrarian belief">
              <TextArea value={starData.contrarian_belief} onChange={v => updateStar('contrarian_belief', v)} placeholder="What do you believe that most people in your industry would disagree with?" rows={3} />
              <p className="text-zinc-600 text-xs mt-1">12+ words for full credit</p>
            </FieldGroup>
            <FieldGroup label="Core values">
              <MultiSelectTags options={VALUES_OPTIONS} value={starData.values} onToggle={v => toggleStarMulti('values', v)} />
              <p className="text-zinc-600 text-xs mt-1">Select at least 2</p>
            </FieldGroup>
          </div>

          {/* Point 4: Expertise */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Point 4 — Expertise</GoldLabel>
            <FieldGroup label="What you do — in one sentence">
              <TextArea value={starData.what_you_do} onChange={v => updateStar('what_you_do', v)} placeholder="I help [who] achieve [what] through [how]" rows={2} />
              <p className="text-zinc-600 text-xs mt-1">6+ words for full credit</p>
            </FieldGroup>
            <FieldGroup label="Sector">
              <TextInput value={starData.sector} onChange={v => updateStar('sector', v)} placeholder="e.g. Health & Fitness, SaaS, Personal Development" />
            </FieldGroup>
          </div>
        </div>

        {/* Point 5: Boundaries — full width */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <GoldLabel>Point 5 — Boundaries</GoldLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="What you refuse to do">
              <TextArea value={starData.refuse} onChange={v => updateStar('refuse', v)} placeholder="What will you never compromise on? What shortcuts do you refuse to take?" rows={3} />
            </FieldGroup>
            <FieldGroup label="Who this is NOT for">
              <TextArea value={starData.not_for} onChange={v => updateStar('not_for', v)} placeholder="Describe the people you actively turn away and why." rows={3} />
            </FieldGroup>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; Brand Bucket
          </button>
          <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
            Next: Hero Framework &rarr;
          </button>
        </div>
      </div>
    )
  }

  // ── Stage 3: Hero Framework ───────────────────────────────────────────────

  const renderStage3 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">The Hero Framework</h1>
        <p className="text-zinc-500 text-sm">Build your personal brand story. The hero is YOU — the service provider. This is the narrative that makes clients choose you over everyone else.</p>
      </div>

      {/* Chapter 1 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <GoldLabel>Chapter 1 — The Ordinary World</GoldLabel>
        <p className="text-zinc-600 text-xs mb-4">Where you came from</p>

        <FieldGroup label="Where did you start — what was your background before all of this?">
          <TextArea value={heroData.origin} onChange={v => updateHero('origin', v)} placeholder="Describe your background, where you grew up, what you did before this path..." rows={4} />
          <p className="text-zinc-600 text-xs mt-1">10+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="What did you struggle with or lack that most people in your position would have had?">
          <TextArea value={heroData.lack} onChange={v => updateHero('lack', v)} placeholder="What was missing — resources, support, knowledge, connections?" rows={3} />
        </FieldGroup>
      </div>

      {/* Chapter 2 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <GoldLabel>Chapter 2 — The Turning Point</GoldLabel>
        <p className="text-zinc-600 text-xs mb-4">The moment everything changed</p>

        <FieldGroup label="What was the moment — or the realisation — that changed everything for you?">
          <TextArea value={heroData.turning_point} onChange={v => updateHero('turning_point', v)} placeholder="Describe the specific moment, event, or realisation..." rows={4} />
          <p className="text-zinc-600 text-xs mt-1">8+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="What did you decide, commit to, or walk away from at that point?">
          <TextArea value={heroData.decision} onChange={v => updateHero('decision', v)} placeholder="What changed in your actions or commitments?" rows={3} />
        </FieldGroup>
      </div>

      {/* Chapter 3 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <GoldLabel>Chapter 3 — The Road</GoldLabel>
        <p className="text-zinc-600 text-xs mb-4">What you went through to get here</p>

        <FieldGroup label="What did you have to figure out the hard way — that nobody taught you?">
          <TextArea value={heroData.hard_way} onChange={v => updateHero('hard_way', v)} placeholder="The lessons you earned through experience, not education..." rows={4} />
          <p className="text-zinc-600 text-xs mt-1">8+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="What failures, setbacks, or wrong turns made you who you are?">
          <TextArea value={heroData.failures} onChange={v => updateHero('failures', v)} placeholder="The things that went wrong and shaped you..." rows={3} />
        </FieldGroup>

        <FieldGroup label="What did those experiences teach you that someone without that background would never know?">
          <TextArea value={heroData.lesson} onChange={v => updateHero('lesson', v)} placeholder="The hard-won wisdom from your specific journey..." rows={3} />
        </FieldGroup>
      </div>

      {/* Chapter 4 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <GoldLabel>Chapter 4 — The Gift</GoldLabel>
        <p className="text-zinc-600 text-xs mb-4">What your journey gives your clients</p>

        <FieldGroup label="What do you understand about your clients' situation that someone without your background never could?">
          <TextArea value={heroData.understanding} onChange={v => updateHero('understanding', v)} placeholder="The empathy and insight your story gives you..." rows={3} />
        </FieldGroup>

        <FieldGroup label="What does your specific story give your clients that a more conventional provider cannot?">
          <TextArea value={heroData.gift} onChange={v => updateHero('gift', v)} placeholder="The unique advantage your background creates for your clients..." rows={4} />
          <p className="text-zinc-600 text-xs mt-1">8+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="Why do you do this work — what is the deeper reason beyond income?">
          <TextArea value={heroData.why} onChange={v => updateHero('why', v)} placeholder="Your purpose, mission, or driving force..." rows={3} />
        </FieldGroup>
      </div>

      {/* Chapter 5 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <GoldLabel>Chapter 5 — The Character</GoldLabel>
        <p className="text-zinc-600 text-xs mb-4">Who you are now</p>

        <FieldGroup label="What are the 3 character traits that most define how you show up — backed by your story?">
          <TextArea value={heroData.traits} onChange={v => updateHero('traits', v)} placeholder="e.g. Relentless, honest, unconventional..." rows={2} />
        </FieldGroup>

        <FieldGroup label="What label do you wear proudly that others in your industry might shy away from?">
          <TextInput value={heroData.identity_label} onChange={v => updateHero('identity_label', v)} placeholder="e.g. The Anti-Coach, The Disruptor, The Straight-Talker" />
        </FieldGroup>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Brand Star
        </button>
        <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          Next: Remarkable Factor &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 4: Remarkable Factor ────────────────────────────────────────────

  const renderStage4 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">The Remarkable Factor</h1>
        <p className="text-zinc-500 text-sm">Define what makes you genuinely different — not just better, but impossible to compare.</p>
      </div>

      {/* Core fields */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <SectionHeading title="Your Unique Position" />

        <FieldGroup label="Category you own or create">
          <TextInput value={remarkableData.category} onChange={v => updateRemarkable('category', v)} placeholder="e.g. Premium Mindset Architecture, Anti-Diet Nutrition" />
          <p className="text-zinc-600 text-xs mt-1">4+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="Unique mechanism — your named method or approach">
          <TextArea value={remarkableData.mechanism} onChange={v => updateRemarkable('mechanism', v)} placeholder="Describe your proprietary framework, system, or methodology..." rows={3} />
          <p className="text-zinc-600 text-xs mt-1">8+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="What you do that nobody else does or is willing to do">
          <TextArea value={remarkableData.differentiator} onChange={v => updateRemarkable('differentiator', v)} placeholder="What makes you genuinely different — not just better?" rows={3} />
        </FieldGroup>

        <FieldGroup label="Your provocation — the most honest, uncomfortable truth about your industry">
          <TextArea value={remarkableData.provocation} onChange={v => updateRemarkable('provocation', v)} placeholder="What would make people uncomfortable but nodding in agreement?" rows={3} />
          <p className="text-zinc-600 text-xs mt-1">8+ words for full credit</p>
        </FieldGroup>

        <FieldGroup label="What would a client need to believe to pay 3x your current price?">
          <TextArea value={remarkableData.belief_premium} onChange={v => updateRemarkable('belief_premium', v)} placeholder="What belief shift justifies premium pricing?" rows={3} />
        </FieldGroup>
      </div>

      {/* Premium Signal Audit */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <SectionHeading title="Premium Signal Audit" description="Which signals are you sending — and which are you missing?" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Signals you already send</Label>
            <MultiSelectTags options={PREMIUM_SIGNALS} value={remarkableData.signals} onToggle={v => toggleRemarkableMulti('signals', v)} />
            <p className="text-zinc-600 text-xs mt-2">Select 2+ for full credit</p>
          </div>
          <div>
            <Label>Signal gaps — what you are missing</Label>
            <MultiSelectTags options={SIGNAL_GAPS} value={remarkableData.signal_gaps} onToggle={v => toggleRemarkableMulti('signal_gaps', v)} />
          </div>
        </div>
      </div>

      {/* Competitive Landscape */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <SectionHeading title="Competitive Landscape" />

        <FieldGroup label="Your actual competitors">
          <DynamicList
            items={remarkableData.competitors}
            onUpdate={(i, v) => {
              setRemarkableData(prev => {
                const arr = [...(prev.competitors || [''])]
                arr[i] = v
                return { ...prev, competitors: arr }
              })
            }}
            onAdd={() => setRemarkableData(prev => ({ ...prev, competitors: [...(prev.competitors || ['']), ''] }))}
            onRemove={(i) => setRemarkableData(prev => ({ ...prev, competitors: prev.competitors.filter((_, idx) => idx !== i) }))}
            placeholder="Competitor name or brand"
          />
        </FieldGroup>

        <FieldGroup label="Where competitors fall short — and what is your opportunity?">
          <TextArea value={remarkableData.opportunity} onChange={v => updateRemarkable('opportunity', v)} placeholder="What gaps exist in the market that you can own?" rows={3} />
        </FieldGroup>

        <FieldGroup label="What do you need to build to close your biggest premium gap?">
          <TextArea value={remarkableData.build} onChange={v => updateRemarkable('build', v)} placeholder="The specific thing you need to create, prove, or communicate next..." rows={3} />
        </FieldGroup>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Hero Framework
        </button>
        <button onClick={() => goToStage(5)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          View Blueprint &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 5: Blueprint Summary ────────────────────────────────────────────

  const renderStage5 = () => {
    const diagnosis = getLeakDiagnosis()
    const likerts = bucketData.likerts || {}

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Blueprint Summary</h1>
          <p className="text-zinc-500 text-sm">Your complete Premium Position at a glance. Review scores, fix flags, and export.</p>
        </div>

        {/* Overall Score Ring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5 flex flex-col items-center">
          <ScoreRing score={scores.overall.total} max={scores.overall.max} size={140} strokeWidth={10} />
          <p className={`text-sm font-bold mt-3 ${scores.overall.band === 'Offer-Ready' ? 'text-gold' : scores.overall.band === 'Strong Foundation' ? 'text-emerald-400' : scores.overall.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>
            {scores.overall.band}
          </p>
          <p className="text-zinc-500 text-xs text-center mt-1 max-w-md">{scores.overall.bandDescription}</p>
        </div>

        {/* Section Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ProgressBar score={scores.bucket.total} max={scores.bucket.max} label="Brand Bucket" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ProgressBar score={scores.star.total} max={scores.star.max} label="Brand Star" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ProgressBar score={scores.hero.total} max={scores.hero.max} label="Hero Framework" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ProgressBar score={scores.remarkable.total} max={scores.remarkable.max} label="Remarkable Factor" />
          </div>
        </div>

        {/* Diagnostic Flags */}
        {scores.flags.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Diagnostic Flags</h3>
            <div className="space-y-2">
              {scores.flags.map((flag, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-4 border flex items-start justify-between gap-3 ${
                    flag.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`text-xs font-bold uppercase mt-0.5 shrink-0 ${flag.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {flag.severity}
                    </span>
                    <p className="text-sm text-zinc-300">{flag.message}</p>
                  </div>
                  <button
                    onClick={() => goToStage(flag.stage)}
                    className="shrink-0 px-3 py-1 text-xs font-semibold text-gold border border-gold/30 rounded hover:bg-gold/10 transition"
                  >
                    Fix it
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blueprint Data Sections */}
        <div className="space-y-5">

          {/* Brand Bucket Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Brand Bucket</GoldLabel>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{(likerts.v1||0)+(likerts.v2||0)+(likerts.v3||0)+(likerts.v4||0)}</p>
                <p className="text-xs text-zinc-500">/20 Visibility</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{(likerts.e1||0)+(likerts.e2||0)+(likerts.e3||0)+(likerts.e4||0)}</p>
                <p className="text-xs text-zinc-500">/20 Engagement</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{(likerts.t1||0)+(likerts.t2||0)+(likerts.t3||0)+(likerts.t4||0)}</p>
                <p className="text-xs text-zinc-500">/20 Trust</p>
              </div>
            </div>
            {diagnosis && (
              <p className={`text-sm ${diagnosis.score <= 8 ? 'text-red-400' : 'text-yellow-400'}`}>
                Primary leak: {diagnosis.layer} ({diagnosis.score}/20)
              </p>
            )}
            {bucketData.gap_description && (
              <div className="mt-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Gap Description</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{bucketData.gap_description}</p>
              </div>
            )}
          </div>

          {/* Brand Star Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Colt Brand Star</GoldLabel>
            <div className="space-y-3">
              {starData.name && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Name</p><p className="text-sm text-zinc-300">{starData.name}</p></div>}
              {starData.personality?.length > 0 && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Personality</p><p className="text-sm text-zinc-300">{starData.personality.join(', ')}</p></div>}
              {starData.specific_description && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ideal Client</p><p className="text-sm text-zinc-300">{starData.specific_description}</p></div>}
              {starData.contrarian_belief && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Contrarian Belief</p><p className="text-sm text-zinc-300">{starData.contrarian_belief}</p></div>}
              {starData.values?.length > 0 && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Values</p><p className="text-sm text-zinc-300">{starData.values.join(', ')}</p></div>}
              {starData.what_you_do && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">What You Do</p><p className="text-sm text-zinc-300">{starData.what_you_do}</p></div>}
              {starData.sector && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sector</p><p className="text-sm text-zinc-300">{starData.sector}</p></div>}
              {starData.refuse && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Refuse</p><p className="text-sm text-zinc-300">{starData.refuse}</p></div>}
              {starData.not_for && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Not For</p><p className="text-sm text-zinc-300">{starData.not_for}</p></div>}
            </div>
          </div>

          {/* Hero Framework Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Hero Framework</GoldLabel>
            <div className="space-y-3">
              {heroData.origin && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Origin</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.origin}</p></div>}
              {heroData.lack && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Lack</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.lack}</p></div>}
              {heroData.turning_point && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Turning Point</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.turning_point}</p></div>}
              {heroData.decision && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Decision</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.decision}</p></div>}
              {heroData.hard_way && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hard Way</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.hard_way}</p></div>}
              {heroData.failures && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Failures</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.failures}</p></div>}
              {heroData.lesson && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Lesson</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.lesson}</p></div>}
              {heroData.understanding && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Understanding</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.understanding}</p></div>}
              {heroData.gift && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Gift</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.gift}</p></div>}
              {heroData.why && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Why</p><p className="text-sm text-zinc-300 leading-relaxed">{heroData.why}</p></div>}
              {heroData.traits && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Character Traits</p><p className="text-sm text-zinc-300">{heroData.traits}</p></div>}
              {heroData.identity_label && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Identity Label</p><p className="text-sm text-zinc-300">{heroData.identity_label}</p></div>}
            </div>
          </div>

          {/* Remarkable Factor Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <GoldLabel>Remarkable Factor</GoldLabel>
            <div className="space-y-3">
              {remarkableData.category && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Category</p><p className="text-sm text-zinc-300">{remarkableData.category}</p></div>}
              {remarkableData.mechanism && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Unique Mechanism</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.mechanism}</p></div>}
              {remarkableData.differentiator && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Differentiator</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.differentiator}</p></div>}
              {remarkableData.provocation && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Provocation</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.provocation}</p></div>}
              {remarkableData.belief_premium && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Belief Premium</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.belief_premium}</p></div>}
              {remarkableData.signals?.length > 0 && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Premium Signals</p><p className="text-sm text-zinc-300">{remarkableData.signals.join(', ')}</p></div>}
              {remarkableData.signal_gaps?.length > 0 && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Signal Gaps</p><p className="text-sm text-zinc-300">{remarkableData.signal_gaps.join(', ')}</p></div>}
              {remarkableData.competitors?.filter(x => x).length > 0 && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Competitors</p><p className="text-sm text-zinc-300">{remarkableData.competitors.filter(x => x).join(', ')}</p></div>}
              {remarkableData.opportunity && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Opportunity</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.opportunity}</p></div>}
              {remarkableData.build && <div><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Build</p><p className="text-sm text-zinc-300 leading-relaxed">{remarkableData.build}</p></div>}
            </div>
          </div>
        </div>

        {/* Generate AI Prompt */}
        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={generateAIPrompt}
            className="px-8 py-3 bg-gold text-black font-bold text-sm rounded-lg hover:bg-gold-light transition uppercase tracking-wider"
          >
            Generate AI Prompt
          </button>
          <p className="text-zinc-600 text-xs mt-2">Copies all blueprint data to clipboard for use with AI</p>
        </div>

        {/* Back navigation */}
        <div className="flex justify-start mt-8">
          <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; Remarkable Factor
          </button>
        </div>
      </div>
    )
  }

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
        <p className="px-5 pb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Stages</p>
        {stages.map(stage => (
          <button
            key={stage.num}
            onClick={() => goToStage(stage.num)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition ${
              currentStage === stage.num
                ? 'text-gold bg-gold/[0.08] border-r-2 border-gold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
              stageComplete(stage.num)
                ? 'bg-gold/20 text-gold border-gold/40'
                : currentStage === stage.num
                  ? 'border-gold/40 text-gold'
                  : 'border-zinc-700 text-zinc-600'
            }`}>
              {stageComplete(stage.num) ? (
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
          <p className="text-lg font-bold text-white">{scores.overall.total}<span className="text-zinc-600 text-sm"> / {scores.overall.max}</span></p>
          <p className={`text-xs font-semibold mt-0.5 ${scores.overall.band === 'Offer-Ready' ? 'text-gold' : scores.overall.band === 'Strong Foundation' ? 'text-emerald-400' : scores.overall.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.overall.band}</p>
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
          {currentStage === 1 && renderStage1()}
          {currentStage === 2 && renderStage2()}
          {currentStage === 3 && renderStage3()}
          {currentStage === 4 && renderStage4()}
          {currentStage === 5 && renderStage5()}
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
