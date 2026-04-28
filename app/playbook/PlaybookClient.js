'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes (v2) ───────────────────────────────────────────────

const defaultIcpSniper = () => ({
  // Person — Pyramid
  pyramid_level: '',
  current_clients_level: '',
  target_level: '',
  vertical_niche: '',
  niche_criteria: { like_them: false, qualified: false, can_afford: false },

  // Person — Demographics
  client_type: '', sector: '', specific_description: '',
  age_from: '', age_to: '', gender_focus: '', geography: [],
  life_stage: [], income_level: '', prior_coaching: '',

  // Person — Psychographics
  current_self_perception: '', desired_identity: '', identity_label: '',
  values: [], current_beliefs: '', investment_relationship: '',
  scepticism_level: '', buying_behaviour: [], personality: [],
  emotional_state: [], trigger_moment: '', influences: '',
  buying_influencers: [], real_objections: [], cost_of_inaction: '',

  // Market Context
  dream_outcome: '', already_tried: [''], pains: [''],
  sophistication_level: '', channels: [], who_not_for: '',

  // Promise
  promise: '',

  // Problem + Path (auto-populated from Distinction Engine)
  problems: ['', '', ''],
  pillar_names: ['', '', ''],
  solutions: [['', '', ''], ['', '', ''], ['', '', '']],
  mechanisms: [['', '', ''], ['', '', ''], ['', '', '']],
  engine_name: '',

  // AI Research
  ai_niche_research: '',
  ai_suggestions: {},
})

const defaultPathPlanner = () => ({
  total_duration: '',
  onboarding: { duration: '', activities: '', boring_stuff: '' },
  milestone_1: { timeframe: '', promise: '', deliverables: '' },
  milestone_2: { timeframe: '', promise: '', deliverables: '' },
  extended: { description: '', milestones: [{ timeframe: '', outcome: '' }] },
  ai_suggestions: '',
})

const defaultBangBang = () => ({
  name: '', promise: '', who_for: '', who_not_for: '',
  phases: [{ name: '', duration: '', description: '', outcome: '' }],
  stack: [{ component: '', value: '', description: '' }],
  stack_value: '',
  price: '',
  staggered_payments: [{ month: '', amount: '' }],
  pay_in_full_discount: '',
  bonuses: [{ name: '', description: '', value: '' }],
  guarantee_type: '', guarantee_detail: '', guarantee_duration: '',
  scarcity: '', urgency: '', intake_model: true,
  social_proof: [], big_names: '', results_numbers: '',
  delivery_model: [], touch_points: [],
  continuity_offer: '', continuity_format: '', continuity_price: '',
  tiers: [{ name: '', range: '', description: '' }],
  cta_action: '', cta_url: '',
  ai_draft: '',
})

const defaultDip = () => ({
  name: '', promise: '', problem: '', outcome: '',
  format: '', delivery: [], duration: '', price: '',
  bonuses: [{ name: '', description: '', value: '' }],
  guarantee_type: '', guarantee_detail: '',
  bridge_to_main: '', belief_to_create: '',
  ai_draft: '',
})

const defaultComms = () => ({
  daily: [], async_feedback: [],
  calls_1_1: '', group_calls: '',
  events: '', workshops: '',
  education_platform: '',
  custom_items: [{ name: '', frequency: '' }],
  ai_suggestions: '',
})

// ── Option Arrays ───────────────────────────────────────────────────────────

const PYRAMID_LEVELS = [
  { id: 'dying', label: 'Dying', desc: 'Struggling, just starting out', motivation: 'Safety', color: 'red' },
  { id: 'surviving', label: 'Surviving', desc: 'Hanging on, getting by', motivation: 'Structure', color: 'orange' },
  { id: 'stalling', label: 'Stalling', desc: 'Got to a level but can\'t break through', motivation: 'Scale', color: 'yellow' },
  { id: 'thriving', label: 'Thriving', desc: 'Winning, want to go faster', motivation: 'Speed', color: 'emerald' },
]

const CLIENT_TYPES = ['B2B', 'B2C', 'Both']
const GENDER_OPTIONS = ['All genders', 'Predominantly male', 'Predominantly female', 'Non-binary inclusive']
const GEOGRAPHY_OPTIONS = ['Local', 'National', 'International', 'Remote/online only']
const LIFE_STAGE_OPTIONS = ['Student', 'Early career', 'Career transition', 'Building a business', 'Scaling a business', 'Pre-exit', 'Semi-retired', 'Retired', 'Personal life transition']
const PRIOR_COACHING_OPTIONS = ['Never', 'Once or twice', 'Regularly', 'Repeat buyer type']
const VALUES_OPTIONS = ['Freedom', 'Financial security', 'Status & recognition', 'Impact & legacy', 'Time with family', 'Adventure', 'Mastery & expertise', 'Community & belonging', 'Health & longevity', 'Stability']
const INVESTMENT_OPTIONS = ['Never done it', 'Felt burned', 'Comfortable', 'Regular investor']
const SCEPTICISM_OPTIONS = ['High sceptic', 'Moderate', 'Believer']
const BUYING_BEHAVIOUR_OPTIONS = ['Researches weeks', 'Buys on emotion', 'Needs social proof', 'Needs peer approval', 'Impulse buyer', 'Values exclusivity']
const PERSONALITY_OPTIONS = ['Lone wolf', 'Community-driven', 'Competitive', 'Collaborative', 'Analytical', 'Creative', 'Action-taker', 'Overthinker']
const EMOTIONAL_STATE_OPTIONS = ['Frustrated', 'Desperate', 'Ambitious', 'Fearful', 'Excited', 'Burnt out', 'Confused', 'Ready to change']
const BUYING_INFLUENCERS_OPTIONS = ['Decides alone', 'Partner/spouse', 'Business partner', 'Accountant/advisor', 'Peers/mastermind']
const REAL_OBJECTIONS_OPTIONS = [
  "I've been burned before", "I can't afford it right now", "I don't have time",
  "My partner won't agree", "I need to think about it", "I'm not sure it'll work for me",
  "I've tried something similar", "I don't trust online programmes", "I want to but I'm scared", "What if I fail again?",
]
const SOPHISTICATION_OPTIONS = ['Unaware', 'Problem-aware', 'Solution-aware', 'Product-aware', 'Most-aware']
const CHANNELS_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X/Twitter', 'Email', 'Podcast', 'SEO/Blog', 'Referrals', 'Paid ads', 'Events/speaking', 'Webinars', 'Communities']
const SECTOR_SUGGESTIONS = ['Health & Fitness', 'Business Coaching', 'Life Coaching', 'Financial Services', 'Real Estate', 'E-commerce', 'SaaS', 'Education', 'Marketing Agency', 'Consulting', 'Creative Services', 'Personal Development', 'Wellness', 'Mindset', 'Relationships']

const DIP_FORMAT_OPTIONS = ['Workshop', 'Audit', 'Mini-course', 'Template', 'Challenge', 'Strategy Session', 'Done-for-you Starter', 'Masterclass']
const DIP_DELIVERY_OPTIONS = ['Live online', 'Pre-recorded', 'In person', 'Async', 'Hybrid']
const TOUCH_POINTS_OPTIONS = ['1:1 calls', 'Group calls', 'Slack/community', 'Email support', 'Voxer access', 'In-person meetups', 'Video feedback', 'Templates/worksheets', 'Portal/course', 'WhatsApp group']
const DELIVERY_MODEL_OPTIONS = ['1:1 only', 'Group only', 'Hybrid (1:1 + group)', 'Self-paced + support', 'Done with you', 'Done for you']
const GUARANTEE_OPTIONS = ['Money-back guarantee', 'Results guarantee', 'Conditional guarantee', 'Love it or leave it', 'Trial period', 'No guarantee (premium positioning)']
const SOCIAL_PROOF_OPTIONS = ['Case studies', 'Video testimonials', 'Screenshots/DMs', 'Before/after', 'Revenue numbers', 'Media features', 'Certifications', 'Years experience']
const CONTINUITY_FORMAT_OPTIONS = ['Monthly membership', 'Quarterly retainer', 'Annual programme', 'Pay-per-session', 'Lifetime access']
const DAILY_COMMS_OPTIONS = ['WhatsApp messages', 'Slack', 'Telegram', 'Email', 'Voxer']
const ASYNC_FEEDBACK_OPTIONS = ['Loom as needed', 'Written feedback', 'Voice notes', 'Video review']

// ── Reusable Sub-components (outside main component for mobile perf) ────────

function TextInput({ value, onChange, placeholder, type = 'text', step, onBlur }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      step={step}
      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3, onBlur }) {
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

function Label({ children }) {
  return <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{children}</label>
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">{title}</h3>
      {description && <p className="text-zinc-600 text-xs">{description}</p>}
    </div>
  )
}

function FieldGroup({ label, children, className = '' }) {
  return (
    <div className={`mb-5 ${className}`}>
      <Label>{label}</Label>
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
  else if (pct >= 0.725) color = '#22c55e'
  else if (pct >= 0.525) color = '#eab308'
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

function AIButton({ loading, onClick, label = 'AI Research & Suggest', regenerateLabel = 'Regenerate' , hasOutput = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${
        hasOutput
          ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30'
          : 'bg-gold hover:bg-gold-light text-zinc-950'
      } disabled:opacity-50`}
    >
      {loading ? (
        <>
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          {hasOutput ? regenerateLabel : label}
        </>
      )}
    </button>
  )
}

function AIOutput({ content, title = 'AI Suggestions' }) {
  if (!content) return null
  return (
    <div className="bg-zinc-900 border border-gold/20 rounded-xl p-5 mt-4">
      <h4 className="text-xs font-bold text-gold uppercase tracking-widest mb-3">{title}</h4>
      <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  )
}

function AutoPopBanner({ source, onDismiss }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-xs text-emerald-300 font-semibold">Auto-populated from your {source}</span>
      </div>
      {onDismiss && <button onClick={onDismiss} className="text-zinc-500 hover:text-white text-xs">Dismiss</button>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const router = useRouter()

  // Auth & client
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Playbook data
  const [playbook, setPlaybook] = useState(null)
  const [currentStage, setCurrentStage] = useState(1)
  const [icpData, setIcpData] = useState(defaultIcpSniper())
  const [pathData, setPathData] = useState(defaultPathPlanner())
  const [bangBangData, setBangBangData] = useState(defaultBangBang())
  const [dipData, setDipData] = useState(defaultDip())
  const [commsData, setCommsData] = useState(defaultComms())

  // External data
  const [brandData, setBrandData] = useState(null)
  const [deData, setDeData] = useState(null)
  const [dePopulated, setDePopulated] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [icpSection, setIcpSection] = useState('pyramid')
  const [aiLoading, setAiLoading] = useState({})

  const saveTimerRef = useRef(null)
  const localSaveTimerRef = useRef(null)
  const toastRef = useRef(null)

  const flash = () => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setShowToast(true)
    toastRef.current = setTimeout(() => setShowToast(false), 2000)
  }

  // ── Auth Init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)
      await fetchPlaybook(client.id)
      await fetchExternalData(client.id)
    }
    init()
  }, [])

  const fetchExternalData = async (clientId) => {
    // Fetch Premium Position (brand voice)
    const { data: pp } = await supabase
      .from('premium_position')
      .select('brand_star, hero, remarkable')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (pp) setBrandData(pp)

    // Fetch Distinction Engine (problems, solutions, mechanisms)
    const { data: de } = await supabase
      .from('distinction_engine')
      .select('engine_data')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (de?.engine_data) setDeData(de.engine_data)
  }

  const fetchPlaybook = async (clientId) => {
    const { data, error } = await supabase
      .from('offer_playbooks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data && data.version === 2) {
      setPlaybook(data)
      setCurrentStage(data.current_stage || 1)
      setIcpData({ ...defaultIcpSniper(), ...(data.icp || {}) })
      setPathData({ ...defaultPathPlanner(), ...(data.path_planner || {}) })
      setBangBangData({ ...defaultBangBang(), ...(data.bang_bang || {}) })
      setDipData({ ...defaultDip(), ...(data.dip || {}) })
      setCommsData({ ...defaultComms(), ...(data.comms || {}) })
    } else {
      // Create new v2 playbook (clean slate)
      const { data: newPb } = await supabase
        .from('offer_playbooks')
        .insert({
          client_id: clientId,
          name: 'Sold Out™ Playbook',
          status: 'draft',
          current_stage: 1,
          version: 2,
          icp: defaultIcpSniper(),
          path_planner: defaultPathPlanner(),
          bang_bang: defaultBangBang(),
          dip: defaultDip(),
          comms: defaultComms(),
          scores: {},
        })
        .select()
        .single()
      if (newPb) {
        setPlaybook(newPb)
        setCurrentStage(1)
      }
    }
    setLoading(false)
  }

  // Auto-populate from Distinction Engine
  useEffect(() => {
    if (!deData || dePopulated) return
    if (icpData.problems[0] && icpData.problems[1] && icpData.problems[2]) return // Already has data

    const problems = [deData.problem_1, deData.problem_2, deData.problem_3].filter(Boolean)
    if (problems.length === 0) return

    setIcpData(prev => ({
      ...prev,
      problems: [deData.problem_1 || '', deData.problem_2 || '', deData.problem_3 || ''],
      pillar_names: [deData.pillar_1 || '', deData.pillar_2 || '', deData.pillar_3 || ''],
      solutions: [
        [deData.solution_1_1 || '', deData.solution_1_2 || '', deData.solution_1_3 || ''],
        [deData.solution_2_1 || '', deData.solution_2_2 || '', deData.solution_2_3 || ''],
        [deData.solution_3_1 || '', deData.solution_3_2 || '', deData.solution_3_3 || ''],
      ],
      mechanisms: [
        [deData.mechanism_1_1 || '', deData.mechanism_1_2 || '', deData.mechanism_1_3 || ''],
        [deData.mechanism_2_1 || '', deData.mechanism_2_2 || '', deData.mechanism_2_3 || ''],
        [deData.mechanism_3_1 || '', deData.mechanism_3_2 || '', deData.mechanism_3_3 || ''],
      ],
      engine_name: deData.engine_name || '',
      promise: prev.promise || deData.promise || '',
    }))
    setDePopulated(true)
  }, [deData, dePopulated, icpData.problems])

  // ── Save Functions ─────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!playbook) return
    await supabase.from('offer_playbooks').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', playbook.id)
  }, [playbook])

  const saveAll = useCallback(() => {
    if (!playbook) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const s = computeScores()
      saveToSupabase({
        icp: icpData, path_planner: pathData, bang_bang: bangBangData, dip: dipData, comms: commsData,
        current_stage: currentStage,
        scores: {
          icp_score: s.icp.total, path_score: s.path.total, bb_score: s.bangBang.total,
          dip_score: s.dip.total, comms_score: s.comms.total, de_score: s.de.total,
          total_score: s.overall.total, band: s.overall.band, flags: s.flags,
        },
      })
      flash()
    }, 500)
  }, [playbook, saveToSupabase, icpData, pathData, bangBangData, dipData, commsData, currentStage])

  useEffect(() => {
    if (!playbook) return
    saveToSupabase({ current_stage: currentStage })
  }, [currentStage])

  useEffect(() => {
    localSaveTimerRef.current = setInterval(() => {
      if (playbook) {
        localStorage.setItem(`playbook_v2_${playbook.id}`, JSON.stringify({
          icp: icpData, path_planner: pathData, bang_bang: bangBangData, dip: dipData, comms: commsData,
          current_stage: currentStage, saved_at: new Date().toISOString(),
        }))
      }
    }, 30000)
    return () => clearInterval(localSaveTimerRef.current)
  }, [playbook, icpData, pathData, bangBangData, dipData, commsData, currentStage])

  // ── Updaters ───────────────────────────────────────────────────────────────

  const updateIcp = (key, val) => setIcpData(prev => ({ ...prev, [key]: val }))
  const toggleIcpMulti = (key, val) => {
    setIcpData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const updateIcpNested = (key, subKey, val) => {
    setIcpData(prev => ({ ...prev, [key]: { ...prev[key], [subKey]: val } }))
  }
  const addIcpListItem = (key) => setIcpData(prev => ({ ...prev, [key]: [...(prev[key] || []), ''] }))
  const removeIcpListItem = (key, idx) => setIcpData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
  const updateIcpListItem = (key, idx, val) => {
    setIcpData(prev => { const arr = [...prev[key]]; arr[idx] = val; return { ...prev, [key]: arr } })
  }

  const updatePath = (key, val) => setPathData(prev => ({ ...prev, [key]: val }))
  const updatePathNested = (key, subKey, val) => {
    setPathData(prev => ({ ...prev, [key]: { ...prev[key], [subKey]: val } }))
  }
  const addExtendedMilestone = () => {
    setPathData(prev => ({
      ...prev,
      extended: { ...prev.extended, milestones: [...prev.extended.milestones, { timeframe: '', outcome: '' }] }
    }))
  }
  const removeExtendedMilestone = (idx) => {
    setPathData(prev => ({
      ...prev,
      extended: { ...prev.extended, milestones: prev.extended.milestones.filter((_, i) => i !== idx) }
    }))
  }
  const updateExtendedMilestone = (idx, key, val) => {
    setPathData(prev => {
      const milestones = [...prev.extended.milestones]
      milestones[idx] = { ...milestones[idx], [key]: val }
      return { ...prev, extended: { ...prev.extended, milestones } }
    })
  }

  const updateBB = (key, val) => setBangBangData(prev => ({ ...prev, [key]: val }))
  const toggleBBMulti = (key, val) => {
    setBangBangData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const updateBBPhase = (idx, key, val) => {
    setBangBangData(prev => { const phases = [...prev.phases]; phases[idx] = { ...phases[idx], [key]: val }; return { ...prev, phases } })
  }
  const addBBPhase = () => setBangBangData(prev => ({ ...prev, phases: [...prev.phases, { name: '', duration: '', description: '', outcome: '' }] }))
  const removeBBPhase = (idx) => setBangBangData(prev => ({ ...prev, phases: prev.phases.filter((_, i) => i !== idx) }))
  const updateBBStack = (idx, key, val) => {
    setBangBangData(prev => { const stack = [...prev.stack]; stack[idx] = { ...stack[idx], [key]: val }; return { ...prev, stack } })
  }
  const addBBStack = () => setBangBangData(prev => ({ ...prev, stack: [...prev.stack, { component: '', value: '', description: '' }] }))
  const removeBBStack = (idx) => setBangBangData(prev => ({ ...prev, stack: prev.stack.filter((_, i) => i !== idx) }))
  const updateBBBonus = (idx, key, val) => {
    setBangBangData(prev => { const bonuses = [...prev.bonuses]; bonuses[idx] = { ...bonuses[idx], [key]: val }; return { ...prev, bonuses } })
  }
  const addBBBonus = () => setBangBangData(prev => ({ ...prev, bonuses: [...prev.bonuses, { name: '', description: '', value: '' }] }))
  const removeBBBonus = (idx) => setBangBangData(prev => ({ ...prev, bonuses: prev.bonuses.filter((_, i) => i !== idx) }))
  const updateBBPayment = (idx, key, val) => {
    setBangBangData(prev => { const sp = [...prev.staggered_payments]; sp[idx] = { ...sp[idx], [key]: val }; return { ...prev, staggered_payments: sp } })
  }
  const addBBPayment = () => setBangBangData(prev => ({ ...prev, staggered_payments: [...prev.staggered_payments, { month: '', amount: '' }] }))
  const removeBBPayment = (idx) => setBangBangData(prev => ({ ...prev, staggered_payments: prev.staggered_payments.filter((_, i) => i !== idx) }))
  const updateBBTier = (idx, key, val) => {
    setBangBangData(prev => { const tiers = [...prev.tiers]; tiers[idx] = { ...tiers[idx], [key]: val }; return { ...prev, tiers } })
  }
  const addBBTier = () => setBangBangData(prev => ({ ...prev, tiers: [...prev.tiers, { name: '', range: '', description: '' }] }))
  const removeBBTier = (idx) => setBangBangData(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== idx) }))

  const updateDip = (key, val) => setDipData(prev => ({ ...prev, [key]: val }))
  const toggleDipMulti = (key, val) => {
    setDipData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const updateDipBonus = (idx, key, val) => {
    setDipData(prev => { const bonuses = [...prev.bonuses]; bonuses[idx] = { ...bonuses[idx], [key]: val }; return { ...prev, bonuses } })
  }
  const addDipBonus = () => setDipData(prev => ({ ...prev, bonuses: [...prev.bonuses, { name: '', description: '', value: '' }] }))
  const removeDipBonus = (idx) => setDipData(prev => ({ ...prev, bonuses: prev.bonuses.filter((_, i) => i !== idx) }))

  const updateComms = (key, val) => setCommsData(prev => ({ ...prev, [key]: val }))
  const toggleCommsMulti = (key, val) => {
    setCommsData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const addCommsItem = () => setCommsData(prev => ({ ...prev, custom_items: [...prev.custom_items, { name: '', frequency: '' }] }))
  const removeCommsItem = (idx) => setCommsData(prev => ({ ...prev, custom_items: prev.custom_items.filter((_, i) => i !== idx) }))
  const updateCommsItem = (idx, key, val) => {
    setCommsData(prev => { const items = [...prev.custom_items]; items[idx] = { ...items[idx], [key]: val }; return { ...prev, custom_items: items } })
  }

  const computedStackValue = (bangBangData.stack || []).reduce((sum, s) => sum + (Number(s.value) || 0), 0)

  // ── AI Calls ───────────────────────────────────────────────────────────────

  const callAI = async (type, extraData = {}) => {
    setAiLoading(prev => ({ ...prev, [type]: true }))
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data: {
            icp: icpData,
            path_planner: pathData,
            bang_bang: bangBangData,
            dip: dipData,
            comms: commsData,
            brand: brandData,
            distinction_engine: deData,
            ...extraData,
          },
        }),
      })
      const result = await res.json()
      if (result.error) { alert('AI generation failed: ' + result.error); return null }
      return result
    } catch (e) { alert('AI generation failed: ' + e.message); return null }
    finally { setAiLoading(prev => ({ ...prev, [type]: false })) }
  }

  const runNicheResearch = async () => {
    const result = await callAI('sold-out-niche-research')
    if (result?.plan) {
      updateIcp('ai_niche_research', result.plan)
      saveAll()
    }
  }

  const runPromiseRefine = async () => {
    const result = await callAI('sold-out-promise-refine')
    if (result?.plan) {
      updateIcp('ai_suggestions', { ...icpData.ai_suggestions, promise: result.plan })
      saveAll()
    }
  }

  const runPathSuggest = async () => {
    const result = await callAI('sold-out-path-suggest')
    if (result?.plan) {
      updatePath('ai_suggestions', result.plan)
      saveAll()
    }
  }

  const runBangBangDraft = async () => {
    const result = await callAI('sold-out-bangbang-draft')
    if (result?.plan) {
      updateBB('ai_draft', result.plan)
      await saveToSupabase({ bang_bang: { ...bangBangData, ai_draft: result.plan }, generated_plan: result.plan })
      flash()
    }
  }

  const runDipDraft = async () => {
    const result = await callAI('sold-out-dip-draft')
    if (result?.plan) {
      updateDip('ai_draft', result.plan)
      await saveToSupabase({ dip: { ...dipData, ai_draft: result.plan }, generated_dip: result.plan })
      flash()
    }
  }

  const runCommsSuggest = async () => {
    const result = await callAI('sold-out-comms-suggest')
    if (result?.plan) {
      updateComms('ai_suggestions', result.plan)
      saveAll()
    }
  }

  // ── Scoring Engine ─────────────────────────────────────────────────────────

  const computeScores = () => {
    const flags = []
    let icpScore = 0
    let pathScore = 0
    let bbScore = 0
    let dipScore = 0
    let commsScore = 0
    let deScore = 0

    // ICP Sniper (12 points)
    if (icpData.pyramid_level) icpScore += 1
    if (icpData.target_level) icpScore += 0.5
    if (icpData.vertical_niche) icpScore += 1
    if (icpData.client_type) icpScore += 0.5
    if (icpData.sector) icpScore += 0.5
    if (icpData.specific_description && icpData.specific_description.length > 10) icpScore += 1
    if (icpData.age_from && icpData.age_to) icpScore += 0.5
    if (icpData.life_stage && icpData.life_stage.length > 0) icpScore += 0.5
    if (icpData.income_level) icpScore += 0.5
    if (icpData.current_self_perception && icpData.current_self_perception.length > 10) icpScore += 0.5
    if (icpData.desired_identity && icpData.desired_identity.length > 10) icpScore += 0.5
    if (icpData.values && icpData.values.length >= 2) icpScore += 0.5
    if (icpData.emotional_state && icpData.emotional_state.length > 0) icpScore += 0.5
    if (icpData.trigger_moment && icpData.trigger_moment.length > 10) icpScore += 0.5
    if (icpData.cost_of_inaction && icpData.cost_of_inaction.length > 10) icpScore += 0.5
    if (icpData.promise && icpData.promise.length > 10) icpScore += 1.5
    if (icpData.dream_outcome) icpScore += 0.5
    if (icpData.pains && icpData.pains.filter(x => x).length >= 2) icpScore += 0.5
    if (icpData.channels && icpData.channels.length > 0) icpScore += 0.5
    icpScore = Math.min(Math.round(icpScore * 10) / 10, 12)

    // Path Planner (8 points)
    if (pathData.total_duration) pathScore += 1
    if (pathData.onboarding.duration) pathScore += 1
    if (pathData.onboarding.activities && pathData.onboarding.activities.length > 10) pathScore += 1
    if (pathData.milestone_1.timeframe) pathScore += 1
    if (pathData.milestone_1.promise && pathData.milestone_1.promise.length > 10) pathScore += 1
    if (pathData.milestone_1.deliverables && pathData.milestone_1.deliverables.length > 10) pathScore += 1
    if (pathData.milestone_2.timeframe) pathScore += 0.5
    if (pathData.milestone_2.promise) pathScore += 0.5
    if (pathData.extended.description) pathScore += 1
    pathScore = Math.min(Math.round(pathScore * 10) / 10, 8)

    // Bang Bang (12 points)
    if (bangBangData.name) bbScore += 1
    if (bangBangData.promise && bangBangData.promise.length > 10) bbScore += 1
    if (bangBangData.who_for && bangBangData.who_for.length > 10) bbScore += 0.5
    if (bangBangData.who_not_for && bangBangData.who_not_for.length > 10) bbScore += 0.5
    if (bangBangData.phases && bangBangData.phases.filter(p => p.name).length > 0) bbScore += 1
    if (bangBangData.stack && bangBangData.stack.filter(s => s.component).length > 0) bbScore += 1
    if (bangBangData.price) bbScore += 1
    if (bangBangData.staggered_payments && bangBangData.staggered_payments.filter(p => p.amount).length > 0) bbScore += 1
    if (bangBangData.bonuses && bangBangData.bonuses.filter(b => b.name).length > 0) bbScore += 1
    if (bangBangData.guarantee_type) bbScore += 1
    if (bangBangData.guarantee_detail && bangBangData.guarantee_detail.length > 10) bbScore += 0.5
    if (bangBangData.scarcity || bangBangData.urgency) bbScore += 1
    if (bangBangData.social_proof && bangBangData.social_proof.length > 0) bbScore += 0.5
    if (bangBangData.delivery_model && bangBangData.delivery_model.length > 0) bbScore += 0.5
    if (bangBangData.touch_points && bangBangData.touch_points.length > 0) bbScore += 0.5
    bbScore = Math.min(Math.round(bbScore * 10) / 10, 12)

    // Dip (6 points)
    if (dipData.name) dipScore += 0.5
    if (dipData.promise && dipData.promise.length > 5) dipScore += 1
    if (dipData.problem && dipData.problem.length > 5) dipScore += 1
    if (dipData.format) dipScore += 0.5
    if (dipData.duration) dipScore += 0.5
    if (dipData.price) dipScore += 0.5
    if (dipData.bridge_to_main && dipData.bridge_to_main.length > 10) dipScore += 1
    if (dipData.guarantee_type) dipScore += 0.5
    if (dipData.bonuses && dipData.bonuses.filter(b => b.name).length > 0) dipScore += 0.5
    dipScore = Math.min(Math.round(dipScore * 10) / 10, 6)

    // Comms (4 points)
    if (commsData.daily && commsData.daily.length > 0) commsScore += 1
    if (commsData.calls_1_1) commsScore += 1
    if (commsData.group_calls) commsScore += 1
    if (commsData.workshops || commsData.events) commsScore += 0.5
    if (commsData.education_platform) commsScore += 0.5
    commsScore = Math.min(Math.round(commsScore * 10) / 10, 4)

    // Distinction Engine auto-populated (8 points)
    if (icpData.problems && icpData.problems.filter(Boolean).length >= 3) deScore += 2
    if (icpData.pillar_names && icpData.pillar_names.filter(Boolean).length >= 3) deScore += 2
    const filledSolutions = icpData.solutions ? icpData.solutions.flat().filter(Boolean).length : 0
    if (filledSolutions >= 9) deScore += 2
    else if (filledSolutions >= 6) deScore += 1
    if (icpData.mechanisms && icpData.mechanisms.flat().filter(Boolean).length >= 6) deScore += 1
    if (icpData.engine_name) deScore += 1
    deScore = Math.min(Math.round(deScore * 10) / 10, 8)

    // Flags
    if (!icpData.promise || icpData.promise.length < 15) flags.push({ severity: 'high', message: 'Your promise needs to be crystal clear — a 6-year-old should understand the transformation' })
    if (icpData.pyramid_level === 'dying' || icpData.pyramid_level === 'surviving') flags.push({ severity: 'medium', message: 'Consider targeting Stalling or Thriving clients — they buy for growth, not survival' })
    if (!icpData.specific_description || icpData.specific_description.length < 20) flags.push({ severity: 'high', message: 'ICP description is too vague — get specific about who you serve' })
    if (!pathData.milestone_1.promise) flags.push({ severity: 'high', message: 'First milestone promise is missing — this becomes your Dip offer' })
    if (!bangBangData.guarantee_type) flags.push({ severity: 'medium', message: 'No guarantee selected — reduces risk for buyers' })
    if (bangBangData.price && bangBangData.price < 500) flags.push({ severity: 'medium', message: 'Price may be too low for a premium offer' })
    if (!bangBangData.scarcity && !bangBangData.urgency) flags.push({ severity: 'low', message: 'No scarcity or urgency — consider running intakes' })
    if (icpData.problems.filter(Boolean).length < 3) flags.push({ severity: 'high', message: 'Complete your Distinction Engine to populate the 3 problems and 9 solutions' })

    const total = Math.round((icpScore + pathScore + bbScore + dipScore + commsScore + deScore) * 10) / 10

    let band = 'Needs Work'
    if (total >= 42) band = 'Offer-Ready'
    else if (total >= 34) band = 'Strong Foundation'
    else if (total >= 24) band = 'Getting There'

    return {
      icp: { total: icpScore, max: 12 },
      path: { total: pathScore, max: 8 },
      bangBang: { total: bbScore, max: 12 },
      dip: { total: dipScore, max: 6 },
      comms: { total: commsScore, max: 4 },
      de: { total: deScore, max: 8 },
      overall: { total, max: 50, band },
      flags,
    }
  }

  const scores = computeScores()

  // ── Stage Navigation ───────────────────────────────────────────────────────

  const goToStage = (stage) => {
    saveAll()
    setCurrentStage(stage)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    { num: 1, label: 'ICP Sniper', icon: '1' },
    { num: 2, label: 'Path Planner', icon: '2' },
    { num: 3, label: 'Bang Bang Offer', icon: '3' },
    { num: 4, label: 'The Dip', icon: '4' },
    { num: 5, label: 'Communication', icon: '5' },
    { num: 6, label: 'Blueprint', icon: '6' },
  ]

  const stageComplete = (num) => {
    if (num === 1) return scores.icp.total >= 8
    if (num === 2) return scores.path.total >= 5
    if (num === 3) return scores.bangBang.total >= 8
    if (num === 4) return scores.dip.total >= 4
    if (num === 5) return scores.comms.total >= 3
    return false
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

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

  // ── Stage 1: ICP Sniper ────────────────────────────────────────────────────

  const renderStage1 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">ICP Sniper</h1>
        <p className="text-zinc-500 text-sm">The 4 Ps: Person, Promise, Problem, Path. Define who you serve and how you transform them.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-8 bg-zinc-900 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'pyramid', label: 'Person' },
          { id: 'demographics', label: 'Demographics' },
          { id: 'psychographics', label: 'Psychographics' },
          { id: 'market', label: 'Market' },
          { id: 'promise', label: 'Promise' },
          { id: 'path', label: 'Path' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setIcpSection(tab.id)} className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${icpSection === tab.id ? 'bg-zinc-800 text-gold' : 'text-zinc-500 hover:text-zinc-300'}`}>{tab.label}</button>
        ))}
      </div>

      {/* Person — Pyramid */}
      {icpSection === 'pyramid' && (
        <div>
          <SectionHeading title="The Pyramid" description="Within every niche, there are four types of people. The bottom two are driven by pain (moving away), the top two by gain (moving toward). Ideally, you want to work with people at the Stalling or Thriving level." />

          <FieldGroup label="Where do your ideal clients sit on the pyramid?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PYRAMID_LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => updateIcp('pyramid_level', level.id)}
                  className={`p-4 rounded-lg border text-left transition ${
                    icpData.pyramid_level === level.id
                      ? level.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : level.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/40 ring-1 ring-yellow-500/20'
                        : level.color === 'orange' ? 'bg-orange-500/10 border-orange-500/40 ring-1 ring-orange-500/20'
                        : 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/20'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${
                      level.color === 'emerald' ? 'text-emerald-400'
                        : level.color === 'yellow' ? 'text-yellow-400'
                        : level.color === 'orange' ? 'text-orange-400'
                        : 'text-red-400'
                    }`}>{level.label}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Buys for {level.motivation}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{level.desc}</p>
                </button>
              ))}
            </div>
          </FieldGroup>

          {(icpData.pyramid_level === 'dying' || icpData.pyramid_level === 'surviving') && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-5">
              <p className="text-sm text-orange-300 font-medium mb-1">Consider niching up</p>
              <p className="text-xs text-orange-400/70">People at the Dying and Surviving levels buy out of desperation, not aspiration. They often can't afford premium services and are harder to get results for. Think about who sits one level above your current clients.</p>
            </div>
          )}

          <FieldGroup label="Where do your CURRENT clients sit?">
            <SingleSelectTags options={['Dying', 'Surviving', 'Stalling', 'Thriving']} value={icpData.current_clients_level} onChange={v => updateIcp('current_clients_level', v)} />
          </FieldGroup>

          <FieldGroup label="Where do you WANT to move? (target level)">
            <SingleSelectTags options={['Stalling', 'Thriving']} value={icpData.target_level} onChange={v => updateIcp('target_level', v)} />
          </FieldGroup>

<SectionHeading title="Niche Criteria" description="Three things must be true about the people you choose to work with." />

          <div className="space-y-3 mb-5">
            {[
              { key: 'like_them', label: 'You genuinely like and connect with them' },
              { key: 'qualified', label: 'You are qualified to help them (even one level up)' },
              { key: 'can_afford', label: 'They have the money to afford your service' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => updateIcpNested('niche_criteria', key, !icpData.niche_criteria[key])}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                  icpData.niche_criteria[key] ? 'bg-gold/10 border-gold/30' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                  icpData.niche_criteria[key] ? 'bg-gold/20 border-gold/40' : 'border-zinc-700'
                }`}>
                  {icpData.niche_criteria[key] && <svg className="w-3 h-3 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${icpData.niche_criteria[key] ? 'text-gold' : 'text-zinc-400'}`}>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <button onClick={() => setIcpSection('demographics')} className="px-6 py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
              Next: Demographics &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Demographics */}
      {icpSection === 'demographics' && (
        <div>
          <SectionHeading title="Demographics" description="Who is your ideal client on paper?" />

          <FieldGroup label="Client Type">
            <SingleSelectTags options={CLIENT_TYPES} value={icpData.client_type} onChange={v => updateIcp('client_type', v)} />
          </FieldGroup>

          <FieldGroup label="Sector / Industry">
            <div className="relative">
              <input
                value={icpData.sector || ''}
                onChange={e => updateIcp('sector', e.target.value)}
                list="sector-suggestions"
                placeholder="e.g. Health & Fitness, SaaS, Coaching"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
              />
              <datalist id="sector-suggestions">
                {SECTOR_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </FieldGroup>

          <FieldGroup label="Specific Description">
            <TextArea value={icpData.specific_description} onChange={v => updateIcp('specific_description', v)} placeholder="Describe your ideal client in detail. Who are they? What do they do? What's their situation right now?" rows={4} />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <FieldGroup label="Age From" className="mb-0">
              <TextInput type="number" value={icpData.age_from} onChange={v => updateIcp('age_from', v)} placeholder="25" />
            </FieldGroup>
            <FieldGroup label="Age To" className="mb-0">
              <TextInput type="number" value={icpData.age_to} onChange={v => updateIcp('age_to', v)} placeholder="55" />
            </FieldGroup>
          </div>

          <FieldGroup label="Gender Focus">
            <SingleSelectTags options={GENDER_OPTIONS} value={icpData.gender_focus} onChange={v => updateIcp('gender_focus', v)} />
          </FieldGroup>

          <FieldGroup label="Geography">
            <MultiSelectTags options={GEOGRAPHY_OPTIONS} value={icpData.geography} onToggle={v => toggleIcpMulti('geography', v)} />
          </FieldGroup>

          <FieldGroup label="Life Stage">
            <MultiSelectTags options={LIFE_STAGE_OPTIONS} value={icpData.life_stage} onToggle={v => toggleIcpMulti('life_stage', v)} />
          </FieldGroup>

          <FieldGroup label="Income Level">
            <TextInput value={icpData.income_level} onChange={v => updateIcp('income_level', v)} placeholder="e.g. 50k-100k, 6-figure, 7-figure" />
          </FieldGroup>

          <FieldGroup label="Prior Coaching Experience">
            <SingleSelectTags options={PRIOR_COACHING_OPTIONS} value={icpData.prior_coaching} onChange={v => updateIcp('prior_coaching', v)} />
          </FieldGroup>

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('pyramid')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Person
            </button>
            <button onClick={() => setIcpSection('psychographics')} className="px-6 py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
              Next: Psychographics &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Psychographics */}
      {icpSection === 'psychographics' && (
        <div>
          <SectionHeading title="Psychographics" description="What drives your ideal client? Their beliefs, fears, and motivations." />

          <FieldGroup label="Current Self-Perception">
            <TextArea value={icpData.current_self_perception} onChange={v => updateIcp('current_self_perception', v)} placeholder="How do they see themselves right now? What's their internal narrative?" rows={3} />
          </FieldGroup>

          <FieldGroup label="Desired Identity">
            <TextArea value={icpData.desired_identity} onChange={v => updateIcp('desired_identity', v)} placeholder="Who do they want to become? What does their ideal future self look like?" rows={3} />
          </FieldGroup>

          <FieldGroup label="Identity Label">
            <TextInput value={icpData.identity_label} onChange={v => updateIcp('identity_label', v)} placeholder="e.g. The 7-Figure CEO, The Freedom Entrepreneur" />
          </FieldGroup>

          <FieldGroup label="Core Values">
            <MultiSelectTags options={VALUES_OPTIONS} value={icpData.values} onToggle={v => toggleIcpMulti('values', v)} />
          </FieldGroup>

          <FieldGroup label="Current Beliefs">
            <TextArea value={icpData.current_beliefs} onChange={v => updateIcp('current_beliefs', v)} placeholder="What do they currently believe about their situation, the market, or themselves?" rows={3} />
          </FieldGroup>

          <FieldGroup label="Investment Relationship">
            <SingleSelectTags options={INVESTMENT_OPTIONS} value={icpData.investment_relationship} onChange={v => updateIcp('investment_relationship', v)} />
          </FieldGroup>

          <FieldGroup label="Scepticism Level">
            <SingleSelectTags options={SCEPTICISM_OPTIONS} value={icpData.scepticism_level} onChange={v => updateIcp('scepticism_level', v)} />
          </FieldGroup>

          <FieldGroup label="Buying Behaviour">
            <MultiSelectTags options={BUYING_BEHAVIOUR_OPTIONS} value={icpData.buying_behaviour} onToggle={v => toggleIcpMulti('buying_behaviour', v)} />
          </FieldGroup>

          <FieldGroup label="Personality Traits">
            <MultiSelectTags options={PERSONALITY_OPTIONS} value={icpData.personality} onToggle={v => toggleIcpMulti('personality', v)} />
          </FieldGroup>

          <FieldGroup label="Emotional State">
            <MultiSelectTags options={EMOTIONAL_STATE_OPTIONS} value={icpData.emotional_state} onToggle={v => toggleIcpMulti('emotional_state', v)} />
          </FieldGroup>

          <FieldGroup label="Trigger Moment">
            <TextArea value={icpData.trigger_moment} onChange={v => updateIcp('trigger_moment', v)} placeholder="What specific event or realisation makes them finally take action?" rows={3} />
          </FieldGroup>

          <FieldGroup label="Influences">
            <TextArea value={icpData.influences} onChange={v => updateIcp('influences', v)} placeholder="Who do they follow, listen to, or look up to?" rows={3} />
          </FieldGroup>

          <FieldGroup label="Buying Influencers">
            <MultiSelectTags options={BUYING_INFLUENCERS_OPTIONS} value={icpData.buying_influencers} onToggle={v => toggleIcpMulti('buying_influencers', v)} />
          </FieldGroup>

          <FieldGroup label="Real Objections">
            <MultiSelectTags options={REAL_OBJECTIONS_OPTIONS} value={icpData.real_objections} onToggle={v => toggleIcpMulti('real_objections', v)} />
          </FieldGroup>

          <FieldGroup label="Cost of Inaction">
            <TextArea value={icpData.cost_of_inaction} onChange={v => updateIcp('cost_of_inaction', v)} placeholder="What happens if they do nothing? What's the real cost of staying where they are?" rows={3} />
          </FieldGroup>

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('demographics')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Demographics
            </button>
            <button onClick={() => setIcpSection('market')} className="px-6 py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
              Next: Market &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Market Context */}
      {icpSection === 'market' && (
        <div>
          <SectionHeading title="Market Context" description="Understand the landscape your client exists in." />

          <FieldGroup label="Dream Outcome">
            <TextInput value={icpData.dream_outcome} onChange={v => updateIcp('dream_outcome', v)} placeholder="What's the #1 result they dream about achieving?" />
          </FieldGroup>

          <FieldGroup label="What They've Already Tried">
            <DynamicList
              items={icpData.already_tried}
              onUpdate={(i, v) => updateIcpListItem('already_tried', i, v)}
              onAdd={() => addIcpListItem('already_tried')}
              onRemove={(i) => removeIcpListItem('already_tried', i)}
              placeholder="e.g. DIY courses, another coach, YouTube tutorials"
            />
          </FieldGroup>

          <FieldGroup label="Core Pains">
            <DynamicList
              items={icpData.pains}
              onUpdate={(i, v) => updateIcpListItem('pains', i, v)}
              onAdd={() => addIcpListItem('pains')}
              onRemove={(i) => removeIcpListItem('pains', i)}
              placeholder="e.g. No consistent leads, overwhelmed by tech"
            />
          </FieldGroup>

          <FieldGroup label="Market Sophistication Level">
            <SingleSelectTags options={SOPHISTICATION_OPTIONS} value={icpData.sophistication_level} onChange={v => updateIcp('sophistication_level', v)} />
          </FieldGroup>

          <FieldGroup label="Channels They Use">
            <MultiSelectTags options={CHANNELS_OPTIONS} value={icpData.channels} onToggle={v => toggleIcpMulti('channels', v)} />
          </FieldGroup>

          <FieldGroup label="Who Is This NOT For?">
            <TextArea value={icpData.who_not_for} onChange={v => updateIcp('who_not_for', v)} placeholder="Who should NOT buy from you? Be specific." rows={3} />
          </FieldGroup>

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('psychographics')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Psychographics
            </button>
            <button onClick={() => setIcpSection('promise')} className="px-6 py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
              Next: Promise &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Promise */}
      {icpSection === 'promise' && (
        <div>
          <SectionHeading title="The Promise" description="Your promise needs to be so clear that a 6-year-old can understand it. 'He used to be broke, now he earns 10k a month.' It must be tangible — not mindset coaching or identity work. The brain needs to see the before and after." />

          <FieldGroup label="Your Crystal Clear Promise">
            <TextArea value={icpData.promise} onChange={v => updateIcp('promise', v)} placeholder="e.g. I help online coaches go from struggling to sign clients to consistently earning £10k+ per month within 12 months." rows={4} />
          </FieldGroup>

          <div className="mt-4">
            <AIButton loading={aiLoading['sold-out-promise-refine']} onClick={runPromiseRefine} hasOutput={!!icpData.ai_suggestions?.promise} label="Sharpen My Promise" regenerateLabel="Re-sharpen" />
            <AIOutput content={icpData.ai_suggestions?.promise} title="Promise Suggestions" />
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('market')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Market
            </button>
            <button onClick={() => setIcpSection('path')} className="px-6 py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
              Next: Path &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Path — Auto-populated from Distinction Engine */}
      {icpSection === 'path' && (
        <div>
          <SectionHeading title="The Path" description="Three problems hold your ideal client back from achieving your promise. For each problem, you've created three solutions with branded mechanisms. This data comes from your Distinction Engine." />

          {dePopulated && <AutoPopBanner source="Distinction Engine" />}

          {icpData.problems.filter(Boolean).length === 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center mb-6">
              <p className="text-zinc-400 text-sm mb-2">Your Distinction Engine data will auto-populate here.</p>
              <p className="text-zinc-600 text-xs">Complete your Distinction Engine first to define your 3 problems, 9 solutions, and branded mechanisms.</p>
              <button onClick={() => router.push('/distinction-engine')} className="mt-4 px-5 py-2 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gold/20 transition">
                Go to Distinction Engine
              </button>
            </div>
          )}

          {icpData.engine_name && (
            <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-6">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Your Engine</p>
              <p className="text-lg font-bold text-gold">{icpData.engine_name}</p>
            </div>
          )}

          {icpData.problems.map((problem, pi) => (
            problem && (
              <div key={pi} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
                <div className={`px-5 py-3 border-b border-zinc-800 ${pi === 0 ? 'bg-sky-500/5' : pi === 1 ? 'bg-violet-500/5' : 'bg-gold/5'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase tracking-widest ${pi === 0 ? 'text-sky-400' : pi === 1 ? 'text-violet-400' : 'text-gold'}`}>Problem {pi + 1}</span>
                    {icpData.pillar_names[pi] && <span className="text-xs text-zinc-500">({icpData.pillar_names[pi]})</span>}
                  </div>
                  <p className="text-sm text-white mt-1">{problem}</p>
                </div>
                <div className="p-5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Solutions & Mechanisms</p>
                  <div className="space-y-2">
                    {icpData.solutions[pi].map((sol, si) => (
                      sol && (
                        <div key={si} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-white">{sol}</p>
                            {icpData.mechanisms[pi][si] && (
                              <p className={`text-xs mt-0.5 ${pi === 0 ? 'text-sky-400/70' : pi === 1 ? 'text-violet-400/70' : 'text-gold/70'}`}>
                                {icpData.mechanisms[pi][si]}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )
          ))}

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('promise')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Promise
            </button>
            <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
              Continue to Path Planner &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Stage 2: Path Planner ──────────────────────────────────────────────────

  const renderStage2 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Path Planner</h1>
        <p className="text-zinc-500 text-sm">Map out the client journey from payment to transformation. Think milestones: early, midterm, and long-term. Your first milestone becomes The Dip (micro offer).</p>
      </div>

      <FieldGroup label="Total Programme Duration">
        <TextInput value={pathData.total_duration} onChange={v => updatePath('total_duration', v)} placeholder="e.g. 12 months, 6 months, 90 days" />
      </FieldGroup>

      {/* Onboarding */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <SectionHeading title="Onboarding (Day 0 → Day 1)" description="What happens between payment and the first call? This is where you handle the boring but necessary stuff — mindset, setup, assessments. Typically 5-7 days." />

        <FieldGroup label="Onboarding Duration">
          <TextInput value={pathData.onboarding.duration} onChange={v => updatePathNested('onboarding', 'duration', v)} placeholder="e.g. 5-7 days" />
        </FieldGroup>

        <FieldGroup label="What happens during onboarding?">
          <TextArea value={pathData.onboarding.activities} onChange={v => updatePathNested('onboarding', 'activities', v)} placeholder="e.g. Welcome video, identity work, goal setting, brand audit, mindset foundations" rows={3} />
        </FieldGroup>

        <FieldGroup label="Tedious but necessary work (front-loaded here)">
          <TextArea value={pathData.onboarding.boring_stuff} onChange={v => updatePathNested('onboarding', 'boring_stuff', v)} placeholder="e.g. Mindset reprogramming, values alignment, tech setup — the stuff that doesn't sound sexy but is essential" rows={3} />
        </FieldGroup>
      </div>

      {/* Milestone 1 */}
      <div className="bg-zinc-900 border border-gold/20 rounded-xl p-5 mb-6">
        <SectionHeading title="First Milestone (becomes The Dip)" description="The first tangible outcome your clients hit. This milestone gets packaged as your micro offer — a standalone product that gives people a taste of what you do." />

        <FieldGroup label="Timeframe">
          <TextInput value={pathData.milestone_1.timeframe} onChange={v => updatePathNested('milestone_1', 'timeframe', v)} placeholder="e.g. 4 weeks from onboarding" />
        </FieldGroup>

        <FieldGroup label="Promise — what will they have by this point?">
          <TextArea value={pathData.milestone_1.promise} onChange={v => updatePathNested('milestone_1', 'promise', v)} placeholder="e.g. Your premium position brand set up, your sold-out offer built, your marketing magnetising people, your sales system ready to go." rows={3} />
        </FieldGroup>

        <FieldGroup label="Specific deliverables">
          <TextArea value={pathData.milestone_1.deliverables} onChange={v => updatePathNested('milestone_1', 'deliverables', v)} placeholder="e.g. Brand positioning complete, offer architecture done, first 3 content pieces live, sales script built" rows={3} />
        </FieldGroup>
      </div>

      {/* Milestone 2 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <SectionHeading title="Second Milestone" description="The next major checkpoint. What should they achieve here?" />

        <FieldGroup label="Timeframe">
          <TextInput value={pathData.milestone_2.timeframe} onChange={v => updatePathNested('milestone_2', 'timeframe', v)} placeholder="e.g. Week 10" />
        </FieldGroup>

        <FieldGroup label="Promise">
          <TextArea value={pathData.milestone_2.promise} onChange={v => updatePathNested('milestone_2', 'promise', v)} placeholder="e.g. Launch your first intake, attract your first clients using the micro-offer, set up your demand engine" rows={3} />
        </FieldGroup>

        <FieldGroup label="Specific deliverables">
          <TextArea value={pathData.milestone_2.deliverables} onChange={v => updatePathNested('milestone_2', 'deliverables', v)} placeholder="e.g. First 3 clients signed, launch sequence complete, content system running" rows={3} />
        </FieldGroup>
      </div>

      {/* Extended Programme */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <SectionHeading title="Extended Programme" description="What happens after the initial milestones? Cover the remaining pillars and hit long-term goals." />

        <FieldGroup label="Description">
          <TextArea value={pathData.extended.description} onChange={v => updatePathNested('extended', 'description', v)} placeholder="e.g. Ongoing coaching covering the remaining pillars — lifestyle design, advanced scaling, team building, systems automation" rows={3} />
        </FieldGroup>

        <div className="mt-4">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Additional Milestones</label>
          <div className="space-y-3">
            {pathData.extended.milestones.map((ms, i) => (
              <div key={i} className="flex gap-3">
                <input value={ms.timeframe || ''} onChange={e => updateExtendedMilestone(i, 'timeframe', e.target.value)} placeholder="e.g. Month 6" className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <input value={ms.outcome || ''} onChange={e => updateExtendedMilestone(i, 'outcome', e.target.value)} placeholder="What they achieve" className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <button onClick={() => removeExtendedMilestone(i)} className="text-zinc-700 hover:text-red-400 transition px-2">&#10005;</button>
              </div>
            ))}
            <button onClick={addExtendedMilestone} className="text-xs text-gold hover:text-gold-light transition">+ Add Milestone</button>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3">Let AI suggest milestones and timelines based on your offer type and ICP.</p>
        <AIButton loading={aiLoading['sold-out-path-suggest']} onClick={runPathSuggest} hasOutput={!!pathData.ai_suggestions} label="Suggest Milestones" regenerateLabel="Re-suggest" />
        <AIOutput content={pathData.ai_suggestions} title="Path Suggestions" />
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; ICP Sniper
        </button>
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          Continue to Bang Bang Offer &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 3: Bang Bang Offer ───────────────────────────────────────────────

  const renderStage3 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Bang Bang Offer</h1>
        <p className="text-zinc-500 text-sm">Five elements: Promise + Bonuses (increase reward), Guarantee + Payment Plan (reduce risk), and Urgency + Scarcity (get them over the line). Run it as intakes.</p>
      </div>

      {/* Offer Core */}
      <SectionHeading title="Offer Core" description="Name, promise, and who it's for." />

      <FieldGroup label="Offer Name">
        <TextInput value={bangBangData.name} onChange={v => updateBB('name', v)} placeholder="e.g. The Accelerator, Black Belt, The Inner Circle" />
      </FieldGroup>

      <FieldGroup label="Core Promise">
        <TextArea value={bangBangData.promise || icpData.promise} onChange={v => updateBB('promise', v)} placeholder="The transformation you promise — pulled from your ICP Sniper" rows={3} />
      </FieldGroup>

      <FieldGroup label="Who It's For (qualification criteria)">
        <TextArea value={bangBangData.who_for} onChange={v => updateBB('who_for', v)} placeholder="e.g. You have actual skills and can help people win. You have clients already and want more. You take direction well and can follow a custom growth plan." rows={4} />
      </FieldGroup>

      <FieldGroup label="Who It's NOT For">
        <TextArea value={bangBangData.who_not_for || icpData.who_not_for} onChange={v => updateBB('who_not_for', v)} placeholder="e.g. Just starting out and haven't made a sale yet. Think all you need to do is manifest. Have worked with 7 other coaches and 'they' were the problem." rows={4} />
      </FieldGroup>

      {/* Phases — from Path Planner */}
      <div className="mt-8">
        <SectionHeading title="Programme Phases" description="Your Path Planner milestones become programme phases. Add detail about what happens in each." />

        {/* Pull from Path Planner button */}
        {(pathData.milestone_1.promise || pathData.milestone_2.promise) && (
          <button
            onClick={() => {
              const phases = []
              if (pathData.onboarding.duration || pathData.onboarding.activities) {
                phases.push({
                  name: 'Onboarding',
                  duration: pathData.onboarding.duration || '5-7 days',
                  description: [pathData.onboarding.activities, pathData.onboarding.boring_stuff].filter(Boolean).join('. '),
                  outcome: 'Client fully set up and ready to begin',
                })
              }
              if (pathData.milestone_1.promise) {
                phases.push({
                  name: 'Phase 1 — Quick Wins',
                  duration: pathData.milestone_1.timeframe || '4 weeks',
                  description: pathData.milestone_1.deliverables || '',
                  outcome: pathData.milestone_1.promise,
                })
              }
              if (pathData.milestone_2.promise) {
                phases.push({
                  name: 'Phase 2 — Launch & Grow',
                  duration: pathData.milestone_2.timeframe || '',
                  description: pathData.milestone_2.deliverables || '',
                  outcome: pathData.milestone_2.promise,
                })
              }
              if (pathData.extended.description) {
                phases.push({
                  name: 'Phase 3 — Scale',
                  duration: pathData.total_duration ? `Remaining ${pathData.total_duration}` : '',
                  description: pathData.extended.description,
                  outcome: icpData.promise || 'Full transformation delivered',
                })
              }
              if (phases.length > 0) setBangBangData(prev => ({ ...prev, phases }))
            }}
            className="mb-4 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-emerald-500/20 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Pull Phases from Path Planner
          </button>
        )}

        <div className="space-y-4">
          {(bangBangData.phases || []).map((phase, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Phase {i + 1}</span>
                {bangBangData.phases.length > 1 && (
                  <button onClick={() => removeBBPhase(i)} className="text-zinc-700 hover:text-red-400 transition text-sm">&#10005;</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Name</label>
                  <input value={phase.name || ''} onChange={e => updateBBPhase(i, 'name', e.target.value)} placeholder="e.g. Leads, Clients & Money" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Duration</label>
                  <input value={phase.duration || ''} onChange={e => updateBBPhase(i, 'duration', e.target.value)} placeholder="e.g. 2 months" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-zinc-500 mb-1">What happens in this phase?</label>
                <textarea value={phase.description || ''} onChange={e => updateBBPhase(i, 'description', e.target.value)} placeholder="Describe the activities, systems installed, and wins expected" rows={2} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Outcome</label>
                <input value={phase.outcome || ''} onChange={e => updateBBPhase(i, 'outcome', e.target.value)} placeholder="What do they achieve by the end?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBBPhase} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Phase</button>
      </div>

      {/* Value Stack */}
      <div className="mt-8">
        <SectionHeading title="Value Stack" description="Everything included in the offer with its perceived value." />

        <div className="space-y-3">
          {(bangBangData.stack || []).map((item, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Item {i + 1}</span>
                {bangBangData.stack.length > 1 && (
                  <button onClick={() => removeBBStack(i)} className="text-zinc-700 hover:text-red-400 transition text-sm">&#10005;</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Component</label>
                  <input value={item.component || ''} onChange={e => updateBBStack(i, 'component', e.target.value)} placeholder="e.g. 12x 1:1 Strategy Calls" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Value (GBP)</label>
                  <input type="number" value={item.value || ''} onChange={e => updateBBStack(i, 'value', e.target.value)} placeholder="2000" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <input value={item.description || ''} onChange={e => updateBBStack(i, 'description', e.target.value)} placeholder="Why is this valuable?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBBStack} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Stack Item</button>
        <p className="text-zinc-600 text-xs mt-2">Auto-calculated stack value: £{computedStackValue.toLocaleString()}</p>
      </div>

      {/* Pricing */}
      <div className="mt-8">
        <SectionHeading title="Pricing" description="Total price, staggered payments, and pay-in-full discount." />

        <FieldGroup label="Total Programme Price (GBP)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
            <input type="number" value={bangBangData.price || ''} onChange={e => updateBB('price', e.target.value)} placeholder="6000" className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
        </FieldGroup>

        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Staggered Payment Plan</label>
        <div className="space-y-2 mb-4">
          {(bangBangData.staggered_payments || []).map((p, i) => (
            <div key={i} className="flex gap-3">
              <input value={p.month || ''} onChange={e => updateBBPayment(i, 'month', e.target.value)} placeholder={`Month ${i + 1}`} className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
                <input type="number" value={p.amount || ''} onChange={e => updateBBPayment(i, 'amount', e.target.value)} placeholder="300" className="w-full pl-7 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <button onClick={() => removeBBPayment(i)} className="text-zinc-700 hover:text-red-400 transition px-2">&#10005;</button>
            </div>
          ))}
          <button onClick={addBBPayment} className="text-xs text-gold hover:text-gold-light transition">+ Add Payment Step</button>
        </div>

        <FieldGroup label="Pay-in-Full Discount">
          <TextInput value={bangBangData.pay_in_full_discount} onChange={v => updateBB('pay_in_full_discount', v)} placeholder="e.g. Save £500 when you pay in full" />
        </FieldGroup>
      </div>

      {/* Increase Reward — Bonuses */}
      <div className="mt-8">
        <SectionHeading title="Increase Reward — Bonuses" description="What extras do they get that increase the perceived value?" />

        <div className="space-y-3">
          {(bangBangData.bonuses || []).map((bonus, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bonus {i + 1}</span>
                {bangBangData.bonuses.length > 1 && (
                  <button onClick={() => removeBBBonus(i)} className="text-zinc-700 hover:text-red-400 transition text-sm">&#10005;</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Name</label>
                  <input value={bonus.name || ''} onChange={e => updateBBBonus(i, 'name', e.target.value)} placeholder="e.g. $10k in 10 Minutes" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Value (GBP)</label>
                  <input type="number" value={bonus.value || ''} onChange={e => updateBBBonus(i, 'value', e.target.value)} placeholder="500" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <input value={bonus.description || ''} onChange={e => updateBBBonus(i, 'description', e.target.value)} placeholder="What do they get and why is it valuable?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBBBonus} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Bonus</button>
      </div>

      {/* Reduce Risk — Guarantee */}
      <div className="mt-8">
        <SectionHeading title="Reduce Risk — Guarantee" description="Guarantees reduce perceived risk. Choose the type that fits your offer." />

        <FieldGroup label="Guarantee Type">
          <SingleSelectTags options={GUARANTEE_OPTIONS} value={bangBangData.guarantee_type} onChange={v => updateBB('guarantee_type', v)} />
        </FieldGroup>

        <FieldGroup label="Guarantee Detail">
          <TextArea value={bangBangData.guarantee_detail} onChange={v => updateBB('guarantee_detail', v)} placeholder="e.g. 60-day 'Love it or leave it' period. If something's not right, we'll tear up the agreement and walk away as friends." rows={3} />
        </FieldGroup>

        <FieldGroup label="Guarantee Duration">
          <TextInput value={bangBangData.guarantee_duration} onChange={v => updateBB('guarantee_duration', v)} placeholder="e.g. 60 days, 30 days" />
        </FieldGroup>
      </div>

      {/* Urgency & Scarcity */}
      <div className="mt-8">
        <SectionHeading title="Urgency & Scarcity" description="These get people off the fence. Running as intakes is highly recommended." />

        <FieldGroup label="Scarcity">
          <TextInput value={bangBangData.scarcity} onChange={v => updateBB('scarcity', v)} placeholder="e.g. Limited to 10 spots per intake, application only" />
        </FieldGroup>

        <FieldGroup label="Urgency">
          <TextInput value={bangBangData.urgency} onChange={v => updateBB('urgency', v)} placeholder="e.g. Early access closes Monday — opens to public Tuesday" />
        </FieldGroup>

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => updateBB('intake_model', !bangBangData.intake_model)}
            className={`w-5 h-5 rounded flex items-center justify-center border transition ${bangBangData.intake_model ? 'bg-gold/20 border-gold/40' : 'border-zinc-700'}`}
          >
            {bangBangData.intake_model && <svg className="w-3 h-3 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </button>
          <span className="text-sm text-zinc-400">Run as intakes (recommended)</span>
        </div>
      </div>

      {/* Social Proof & Delivery */}
      <div className="mt-8">
        <SectionHeading title="Social Proof & Delivery" />

        <FieldGroup label="Social Proof Available">
          <MultiSelectTags options={SOCIAL_PROOF_OPTIONS} value={bangBangData.social_proof} onToggle={v => toggleBBMulti('social_proof', v)} />
        </FieldGroup>

        <FieldGroup label="Big Name Clients">
          <TextInput value={bangBangData.big_names} onChange={v => updateBB('big_names', v)} placeholder="e.g. Dan Martell, Todd Herman, Alex Charfen" />
        </FieldGroup>

        <FieldGroup label="Results Numbers">
          <TextInput value={bangBangData.results_numbers} onChange={v => updateBB('results_numbers', v)} placeholder="e.g. 3,000+ coaches helped, 8-figure business" />
        </FieldGroup>

        <FieldGroup label="Delivery Model">
          <MultiSelectTags options={DELIVERY_MODEL_OPTIONS} value={bangBangData.delivery_model} onToggle={v => toggleBBMulti('delivery_model', v)} />
        </FieldGroup>

        <FieldGroup label="Touch Points">
          <MultiSelectTags options={TOUCH_POINTS_OPTIONS} value={bangBangData.touch_points} onToggle={v => toggleBBMulti('touch_points', v)} />
        </FieldGroup>
      </div>

      {/* Continuity */}
      <div className="mt-8">
        <SectionHeading title="Continuity" description="What happens after the initial programme? Month-to-month, as long as they're loving it." />

        <FieldGroup label="Continuity Offer">
          <TextInput value={bangBangData.continuity_offer} onChange={v => updateBB('continuity_offer', v)} placeholder="e.g. Ongoing monthly coaching, mastermind access" />
        </FieldGroup>

        <FieldGroup label="Format">
          <SingleSelectTags options={CONTINUITY_FORMAT_OPTIONS} value={bangBangData.continuity_format} onChange={v => updateBB('continuity_format', v)} />
        </FieldGroup>

        <FieldGroup label="Continuity Price (GBP / month)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
            <input type="number" value={bangBangData.continuity_price || ''} onChange={e => updateBB('continuity_price', e.target.value)} placeholder="500" className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
        </FieldGroup>
      </div>

      {/* Tiers */}
      <div className="mt-8">
        <SectionHeading title="Tiers (Optional)" description="Like Taki's 3 tiers — different levels for different clients." />

        <div className="space-y-3">
          {(bangBangData.tiers || []).map((tier, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tier {i + 1}</span>
                {bangBangData.tiers.length > 1 && (
                  <button onClick={() => removeBBTier(i)} className="text-zinc-700 hover:text-red-400 transition text-sm">&#10005;</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Name</label>
                  <input value={tier.name || ''} onChange={e => updateBBTier(i, 'name', e.target.value)} placeholder="e.g. Growth" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Revenue Range</label>
                  <input value={tier.range || ''} onChange={e => updateBBTier(i, 'range', e.target.value)} placeholder="e.g. £10k-30k/m" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <input value={tier.description || ''} onChange={e => updateBBTier(i, 'description', e.target.value)} placeholder="What this tier focuses on" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBBTier} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Tier</button>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <SectionHeading title="Call to Action" />

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="CTA Action" className="mb-0">
            <TextInput value={bangBangData.cta_action} onChange={v => updateBB('cta_action', v)} placeholder="e.g. Apply Now, Book a Call" />
          </FieldGroup>
          <FieldGroup label="CTA URL" className="mb-0">
            <TextInput value={bangBangData.cta_url} onChange={v => updateBB('cta_url', v)} placeholder="e.g. https://..." />
          </FieldGroup>
        </div>
      </div>

      {/* AI Draft */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3">Generate a complete offer document in your brand voice, structured like a proven high-ticket sales page.</p>
        <AIButton loading={aiLoading['sold-out-bangbang-draft']} onClick={runBangBangDraft} hasOutput={!!bangBangData.ai_draft} label="Generate Bang Bang Offer Doc" regenerateLabel="Regenerate Offer Doc" />
        <AIOutput content={bangBangData.ai_draft} title="Your Bang Bang Offer" />
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; Path Planner
        </button>
        <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          Continue to The Dip &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 4: The Dip (Micro Offer) ─────────────────────────────────────────

  const renderStage4 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">The Dip</h1>
        <p className="text-zinc-500 text-sm">Your micro offer — the first milestone packaged as a standalone product. Same structure as the Bang Bang but shorter, lower barrier, no payment plan. It gives people a taste of what you do, then bridges to the main offer.</p>
      </div>

      {pathData.milestone_1.promise && (
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">From your Path Planner — First Milestone</p>
          <p className="text-sm text-gold">{pathData.milestone_1.promise}</p>
          {pathData.milestone_1.timeframe && <p className="text-xs text-zinc-500 mt-1">Timeframe: {pathData.milestone_1.timeframe}</p>}
        </div>
      )}

      <FieldGroup label="Dip Name">
        <TextInput value={dipData.name} onChange={v => updateDip('name', v)} placeholder="e.g. The Launchpad, The Kickstart, The Sprint" />
      </FieldGroup>

      <FieldGroup label="Promise">
        <TextArea value={dipData.promise || pathData.milestone_1.promise} onChange={v => updateDip('promise', v)} placeholder="What specific result will they get from The Dip?" rows={3} />
      </FieldGroup>

      <FieldGroup label="Problem It Solves">
        <TextInput value={dipData.problem} onChange={v => updateDip('problem', v)} placeholder="The single, specific problem this entry offer addresses" />
      </FieldGroup>

      <FieldGroup label="Outcome">
        <TextInput value={dipData.outcome} onChange={v => updateDip('outcome', v)} placeholder="Tangible result they walk away with" />
      </FieldGroup>

      <FieldGroup label="Format">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIP_FORMAT_OPTIONS.map(opt => (
            <button key={opt} onClick={() => updateDip('format', opt)} className={`px-3 py-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition border text-center ${dipData.format === opt ? 'bg-gold/10 text-gold border-gold/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}>{opt}</button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Delivery Method">
        <MultiSelectTags options={DIP_DELIVERY_OPTIONS} value={dipData.delivery} onToggle={v => toggleDipMulti('delivery', v)} />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <FieldGroup label="Duration" className="mb-0">
          <TextInput value={dipData.duration} onChange={v => updateDip('duration', v)} placeholder="e.g. 2 months, 6 weeks" />
        </FieldGroup>
        <FieldGroup label="Price (GBP)" className="mb-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
            <input type="number" value={dipData.price || ''} onChange={e => updateDip('price', e.target.value)} placeholder="1500" className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
        </FieldGroup>
      </div>

      {/* Bonuses */}
      <SectionHeading title="Bonuses" description="What do they get on top of the core Dip offer?" />
      <div className="space-y-3 mb-4">
        {(dipData.bonuses || []).map((bonus, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bonus {i + 1}</span>
              {dipData.bonuses.length > 1 && <button onClick={() => removeDipBonus(i)} className="text-zinc-700 hover:text-red-400 transition text-sm">&#10005;</button>}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Name</label>
                <input value={bonus.name || ''} onChange={e => updateDipBonus(i, 'name', e.target.value)} placeholder="e.g. Quick-Win Playbook" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Value (GBP)</label>
                <input type="number" value={bonus.value || ''} onChange={e => updateDipBonus(i, 'value', e.target.value)} placeholder="200" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <input value={bonus.description || ''} onChange={e => updateDipBonus(i, 'description', e.target.value)} placeholder="What do they get?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
            </div>
          </div>
        ))}
        <button onClick={addDipBonus} className="text-xs text-gold hover:text-gold-light transition">+ Add Bonus</button>
      </div>

      {/* Guarantee */}
      <SectionHeading title="Guarantee" />
      <FieldGroup label="Guarantee Type">
        <SingleSelectTags options={GUARANTEE_OPTIONS} value={dipData.guarantee_type} onChange={v => updateDip('guarantee_type', v)} />
      </FieldGroup>
      <FieldGroup label="Guarantee Detail">
        <TextInput value={dipData.guarantee_detail} onChange={v => updateDip('guarantee_detail', v)} placeholder="Describe your guarantee" />
      </FieldGroup>

      {/* Bridge */}
      <SectionHeading title="Bridge to Main Offer" description="How does completing The Dip naturally lead them to wanting the full Bang Bang Offer?" />
      <FieldGroup label="Bridge">
        <TextArea value={dipData.bridge_to_main} onChange={v => updateDip('bridge_to_main', v)} placeholder="e.g. By the end of Phase 1, we'll both know if we want to keep working together. If we're both good, we move onto scaling in Phase 2 & 3." rows={4} />
      </FieldGroup>

      <FieldGroup label="Belief to Create">
        <TextInput value={dipData.belief_to_create} onChange={v => updateDip('belief_to_create', v)} placeholder="What new belief should they walk away with?" />
      </FieldGroup>

      {/* AI Draft */}
      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3">Generate your micro offer document — a standalone sales page for The Dip.</p>
        <AIButton loading={aiLoading['sold-out-dip-draft']} onClick={runDipDraft} hasOutput={!!dipData.ai_draft} label="Generate Micro Offer Doc" regenerateLabel="Regenerate Micro Offer" />
        <AIOutput content={dipData.ai_draft} title="Your Micro Offer — The Dip" />
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; Bang Bang Offer
        </button>
        <button onClick={() => goToStage(5)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          Continue to Communication &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 5: Communication & Delivery ──────────────────────────────────────

  const renderStage5 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Communication & Delivery</h1>
        <p className="text-zinc-500 text-sm">Define what the client gets within the programme. How do you communicate, deliver, and support?</p>
      </div>

      <FieldGroup label="Daily Communication">
        <MultiSelectTags options={DAILY_COMMS_OPTIONS} value={commsData.daily} onToggle={v => toggleCommsMulti('daily', v)} />
      </FieldGroup>

      <FieldGroup label="Async Feedback">
        <MultiSelectTags options={ASYNC_FEEDBACK_OPTIONS} value={commsData.async_feedback} onToggle={v => toggleCommsMulti('async_feedback', v)} />
      </FieldGroup>

      <FieldGroup label="1:1 Calls">
        <TextInput value={commsData.calls_1_1} onChange={v => updateComms('calls_1_1', v)} placeholder="e.g. Unlimited Zoom, Weekly 30-min, Fortnightly 1-hour" />
      </FieldGroup>

      <FieldGroup label="Group Calls">
        <TextInput value={commsData.group_calls} onChange={v => updateComms('group_calls', v)} placeholder="e.g. Once per week, Bi-weekly masterminds" />
      </FieldGroup>

      <FieldGroup label="Events">
        <TextInput value={commsData.events} onChange={v => updateComms('events', v)} placeholder="e.g. Once per quarter (1 in-person, 2 virtual)" />
      </FieldGroup>

      <FieldGroup label="Workshops">
        <TextInput value={commsData.workshops} onChange={v => updateComms('workshops', v)} placeholder="e.g. Monthly skill session or hotseat" />
      </FieldGroup>

      <FieldGroup label="Education Platform">
        <TextInput value={commsData.education_platform} onChange={v => updateComms('education_platform', v)} placeholder="e.g. Skool, Kajabi, Teachable, Custom portal" />
      </FieldGroup>

      {/* Custom Items */}
      <div className="mt-6">
        <SectionHeading title="Custom Delivery Items" description="Anything else specific to your programme." />
        <div className="space-y-3">
          {(commsData.custom_items || []).map((item, i) => (
            <div key={i} className="flex gap-3">
              <input value={item.name || ''} onChange={e => updateCommsItem(i, 'name', e.target.value)} placeholder="e.g. Content review" className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              <input value={item.frequency || ''} onChange={e => updateCommsItem(i, 'frequency', e.target.value)} placeholder="e.g. Weekly" className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              <button onClick={() => removeCommsItem(i)} className="text-zinc-700 hover:text-red-400 transition px-2">&#10005;</button>
            </div>
          ))}
          <button onClick={addCommsItem} className="text-xs text-gold hover:text-gold-light transition">+ Add Item</button>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3">Let AI suggest a communication plan based on your offer type and delivery model.</p>
        <AIButton loading={aiLoading['sold-out-comms-suggest']} onClick={runCommsSuggest} hasOutput={!!commsData.ai_suggestions} label="Suggest Comms Plan" regenerateLabel="Re-suggest" />
        <AIOutput content={commsData.ai_suggestions} title="Communication Plan Suggestions" />
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; The Dip
        </button>
        <button onClick={() => goToStage(6)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          View Blueprint &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 6: Blueprint Summary ─────────────────────────────────────────────

  const renderStage6 = () => {
    const SummaryField = ({ label, value }) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return null
      const display = Array.isArray(value) ? value.filter(x => x).join(', ') : value
      if (!display) return null
      return (
        <div className="mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
          <p className="text-sm text-white mt-0.5">{display}</p>
        </div>
      )
    }

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">Blueprint Summary</h1>
          <p className="text-zinc-500 text-sm">Your complete Sold Out™ playbook with scoring, flags, and generated offer documents.</p>
        </div>

        {/* Score Overview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={scores.overall.total} max={scores.overall.max} size={140} strokeWidth={10} />
            <div className="flex-1 w-full">
              <div className="mb-4">
                <span className={`text-sm font-bold ${scores.overall.band === 'Offer-Ready' ? 'text-gold' : scores.overall.band === 'Strong Foundation' ? 'text-emerald-400' : scores.overall.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.overall.band}</span>
                <span className="text-zinc-600 text-xs ml-2">
                  {scores.overall.band === 'Offer-Ready' ? 'Your offer is ready to go live.' : scores.overall.band === 'Strong Foundation' ? 'Almost there. Refine the gaps below.' : scores.overall.band === 'Getting There' ? 'Good progress. Keep building.' : 'Focus on completing the core sections.'}
                </span>
              </div>
              <ProgressBar score={scores.icp.total} max={scores.icp.max} label="ICP Sniper" color="bg-sky-400" />
              <ProgressBar score={scores.path.total} max={scores.path.max} label="Path Planner" color="bg-violet-400" />
              <ProgressBar score={scores.bangBang.total} max={scores.bangBang.max} label="Bang Bang Offer" color="bg-gold" />
              <ProgressBar score={scores.dip.total} max={scores.dip.max} label="The Dip" color="bg-emerald-400" />
              <ProgressBar score={scores.comms.total} max={scores.comms.max} label="Communication" color="bg-pink-400" />
              <ProgressBar score={scores.de.total} max={scores.de.max} label="Distinction Engine" color="bg-orange-400" />
            </div>
          </div>
        </div>

        {/* Flags */}
        {scores.flags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Flags & Warnings</h3>
            <div className="space-y-2">
              {scores.flags.map((flag, i) => (
                <div key={i} className={`border rounded-lg p-3 flex items-start gap-3 ${
                  flag.severity === 'high' ? 'bg-red-500/5 border-red-500/20' :
                  flag.severity === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20' :
                  'bg-zinc-800 border-zinc-700'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${
                    flag.severity === 'high' ? 'text-red-400' :
                    flag.severity === 'medium' ? 'text-yellow-400' :
                    'text-zinc-500'
                  }`}>{flag.severity}</span>
                  <p className="text-sm text-zinc-300">{flag.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Offer Docs */}
        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Bang Bang Offer Document</h3>
            {scores.overall.total >= 35 ? (
              <>
                <AIButton loading={aiLoading['sold-out-bangbang-draft']} onClick={runBangBangDraft} hasOutput={!!bangBangData.ai_draft} label="Generate Bang Bang Offer" regenerateLabel="Regenerate Bang Bang Offer" />
                {bangBangData.ai_draft && (
                  <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6 mt-4">
                    <div className="flex justify-end mb-3">
                      <button onClick={() => { navigator.clipboard.writeText(bangBangData.ai_draft); flash() }} className="text-xs text-gold hover:text-gold-light transition flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Copy
                      </button>
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{bangBangData.ai_draft}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-400 text-sm">Score {scores.overall.total}/50 — you need 35 to generate your offer document.</p>
                <div className="w-full max-w-xs h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(scores.overall.total / 35) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Micro Offer Document (The Dip)</h3>
            {scores.overall.total >= 35 ? (
              <>
                <AIButton loading={aiLoading['sold-out-dip-draft']} onClick={runDipDraft} hasOutput={!!dipData.ai_draft} label="Generate Micro Offer" regenerateLabel="Regenerate Micro Offer" />
                {dipData.ai_draft && (
                  <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 mt-4">
                    <div className="flex justify-end mb-3">
                      <button onClick={() => { navigator.clipboard.writeText(dipData.ai_draft); flash() }} className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Copy
                      </button>
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{dipData.ai_draft}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-400 text-sm">Complete more of your playbook to unlock micro offer generation.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Quick Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Pyramid Level" value={icpData.pyramid_level ? PYRAMID_LEVELS.find(p => p.id === icpData.pyramid_level)?.label : ''} />
            <SummaryField label="Target Level" value={icpData.target_level} />
            <SummaryField label="Sector" value={icpData.sector} />
            <SummaryField label="Promise" value={icpData.promise} />
            <SummaryField label="Engine Name" value={icpData.engine_name} />
            <SummaryField label="Programme Duration" value={pathData.total_duration} />
            <SummaryField label="Offer Name" value={bangBangData.name} />
            <SummaryField label="Price" value={bangBangData.price ? `£${Number(bangBangData.price).toLocaleString()}` : ''} />
            <SummaryField label="Guarantee" value={bangBangData.guarantee_type} />
            <SummaryField label="Dip Name" value={dipData.name} />
            <SummaryField label="Dip Price" value={dipData.price ? `£${Number(dipData.price).toLocaleString()}` : ''} />
          </div>
        </div>

        <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; Edit Playbook
        </button>
      </div>
    )
  }

  // ── Sidebar & Layout ───────────────────────────────────────────���───────────

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

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Save Toast */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-xl">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="text-sm text-zinc-300">Saved</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-zinc-950 border-r border-zinc-800 z-20">
        {sidebarNav}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-60 bg-zinc-950 border-r border-zinc-800">
            {sidebarNav}
          </div>
        </div>
      )}

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 z-30 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto" />
        <div className="w-6" />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 md:px-8 md:py-7 mt-14 md:mt-0" onBlur={saveAll}>
          {currentStage === 1 && renderStage1()}
          {currentStage === 2 && renderStage2()}
          {currentStage === 3 && renderStage3()}
          {currentStage === 4 && renderStage4()}
          {currentStage === 5 && renderStage5()}
          {currentStage === 6 && renderStage6()}
        </div>
      </div>
    </div>
  )
}
