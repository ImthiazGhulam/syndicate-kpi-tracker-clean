'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data Shapes ─────────────────────────────────────────────────────

const defaultIcp = () => ({
  client_type: '',
  sector: '',
  specific_description: '',
  age_from: '',
  age_to: '',
  gender_focus: '',
  geography: [],
  life_stage: [],
  income_level: '',
  prior_coaching: '',
  current_self_perception: '',
  desired_identity: '',
  identity_label: '',
  values: [],
  current_beliefs: '',
  investment_relationship: '',
  scepticism_level: '',
  buying_behaviour: [],
  personality: [],
  emotional_state: [],
  trigger_moment: '',
  influences: '',
  buying_influencers: [],
  real_objections: [],
  cost_of_inaction: '',
  dream_outcome: '',
  already_tried: [''],
  pains: [''],
  sophistication_level: '',
  channels: [],
  who_not_for: '',
})

const defaultDip = () => ({
  problem: '',
  format: '',
  outcome: '',
  delivery: [],
  duration: '',
  time_to_first_result: '',
  price: '',
  client_effort: '',
  bridge: '',
  belief_to_create: '',
  psychographic_fit: [],
})

const defaultBangBang = () => ({
  name: '',
  promise: '',
  who_not_for: '',
  dream_score: '',
  unique_mechanism: '',
  category: '',
  duration: '',
  phases: [{ name: '', duration: '', description: '', outcome: '' }],
  touch_points: [],
  client_commitment: '',
  milestones: { at_30_days: '', at_90_days: '', at_6_months: '' },
  stack: [{ component: '', value: '', description: '' }],
  stack_value: '',
  price: '',
  payment_options: [],
  delivery_model: [],
  guarantees: [],
  guarantee_detail: '',
  scarcity: '',
  social_proof: [],
  continuity_offer: '',
  continuity_format: '',
  continuity_price: '',
  downsell: '',
  alignment_checks: {
    q1: { answer: '', detail: '' },
    q2: { answer: '', detail: '' },
    q3: { answer: '', detail: '' },
    q4: { answer: '', detail: '' },
  },
})

// ── Option Arrays ───────────────────────────────────────────────────────────

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
  "I've been burned before",
  "I can't afford it right now",
  "I don't have time",
  "My partner won't agree",
  "I need to think about it",
  "I'm not sure it'll work for me",
  "I've tried something similar",
  "I don't trust online programmes",
  "I want to but I'm scared",
  "What if I fail again?",
]
const SOPHISTICATION_OPTIONS = ['Unaware', 'Problem-aware', 'Solution-aware', 'Product-aware', 'Most-aware']
const CHANNELS_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X/Twitter', 'Email', 'Podcast', 'SEO/Blog', 'Referrals', 'Paid ads', 'Events/speaking', 'Webinars', 'Communities']
const SECTOR_SUGGESTIONS = ['Health & Fitness', 'Business Coaching', 'Life Coaching', 'Financial Services', 'Real Estate', 'E-commerce', 'SaaS', 'Education', 'Marketing Agency', 'Consulting', 'Creative Services', 'Personal Development', 'Wellness', 'Mindset', 'Relationships']

const DIP_FORMAT_OPTIONS = ['Workshop', 'Audit', 'Mini-course', 'Template', 'Challenge', 'Strategy Session', 'Done-for-you Starter', 'Masterclass']
const DIP_DELIVERY_OPTIONS = ['Live online', 'Pre-recorded', 'In person', 'Async', 'Hybrid']

const TOUCH_POINTS_OPTIONS = ['1:1 calls', 'Group calls', 'Slack/community', 'Email support', 'Voxer access', 'In-person meetups', 'Video feedback', 'Templates/worksheets', 'Portal/course', 'WhatsApp group']
const PAYMENT_OPTIONS = ['Pay in full', 'Split pay (2-3)', 'Monthly subscription', 'Payment plan (6-12)']
const DELIVERY_MODEL_OPTIONS = ['1:1 only', 'Group only', 'Hybrid (1:1 + group)', 'Self-paced + support', 'Done with you', 'Done for you']
const GUARANTEE_OPTIONS = ['Money-back guarantee', 'Results guarantee', 'Conditional guarantee', 'No guarantee (premium positioning)', 'Trial period']
const SOCIAL_PROOF_OPTIONS = ['Case studies', 'Video testimonials', 'Screenshots/DMs', 'Before/after', 'Revenue numbers', 'Media features', 'Certifications', 'Years experience']
const CONTINUITY_FORMAT_OPTIONS = ['Monthly membership', 'Quarterly retainer', 'Annual programme', 'Pay-per-session', 'Lifetime access']

const ALIGNMENT_QUESTIONS = [
  'Does this offer solve a genuine, urgent problem your ICP has right now?',
  'Can you confidently deliver the promised outcome within the stated timeframe?',
  'Does the pricing reflect the value AND match your ICP\'s ability to invest?',
  'Is the offer structure sustainable for you to deliver at scale?',
]

// ── Reusable Sub-components (outside main component to prevent remounting) ──

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

// ── Component ───────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const router = useRouter()

  // Auth & client
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Playbook
  const [playbook, setPlaybook] = useState(null)
  const [currentStage, setCurrentStage] = useState(1)
  const [icpData, setIcpData] = useState(defaultIcp())
  const [dipData, setDipData] = useState(defaultDip())
  const [bangBangData, setBangBangData] = useState(defaultBangBang())
  const [frameworkData, setFrameworkData] = useState({
    pillars: [
      { name: '', description: '', modules: [{ name: '', description: '' }, { name: '', description: '' }, { name: '', description: '' }] },
      { name: '', description: '', modules: [{ name: '', description: '' }, { name: '', description: '' }, { name: '', description: '' }] },
      { name: '', description: '', modules: [{ name: '', description: '' }, { name: '', description: '' }, { name: '', description: '' }] },
    ],
    framework_name: '',
    tagline: '',
  })
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [icpSection, setIcpSection] = useState('demographics')

  const saveTimerRef = useRef(null)
  const localSaveTimerRef = useRef(null)

  const flash = () => { setShowToast(true); setTimeout(() => setShowToast(false), 2000) }

  // ── Auth Init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)
      await fetchPlaybook(client.id)
    }
    init()
  }, [])

  const fetchPlaybook = async (clientId) => {
    const { data, error } = await supabase
      .from('offer_playbooks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setPlaybook(data)
      setCurrentStage(data.current_stage || 1)
      setIcpData({ ...defaultIcp(), ...(data.icp || {}) })
      setDipData({ ...defaultDip(), ...(data.dip || {}) })
      setBangBangData({ ...defaultBangBang(), ...(data.bang_bang || {}) })
      if (data.framework) setFrameworkData(prev => ({ ...prev, ...data.framework }))
    } else {
      // Create new playbook
      const { data: newPb } = await supabase
        .from('offer_playbooks')
        .insert({
          client_id: clientId,
          name: 'My Offer Playbook',
          status: 'draft',
          current_stage: 1,
          icp: defaultIcp(),
          dip: defaultDip(),
          bang_bang: defaultBangBang(),
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

  // ── Save Functions ──────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!playbook) return
    const { error } = await supabase.from('offer_playbooks').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', playbook.id)
    if (error) { console.error('offer_playbooks save error:', error); return }
  }, [playbook])

  // Save on blur — called when user leaves a field
  const saveAll = useCallback(() => {
    if (!playbook) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const s = computeScores()
      saveToSupabase({
        icp: icpData, dip: dipData, bang_bang: bangBangData, framework: frameworkData, current_stage: currentStage,
        scores: { icp_score: s.icp.total, dip_score: s.dip.total, bb_score: s.bangBang.total, fw_score: s.framework.total, total_score: s.overall.total, band: s.overall.band, flags: s.flags }
      })
    }, 500)
  }, [playbook, saveToSupabase, icpData, dipData, bangBangData, frameworkData, currentStage])

  // Save when switching stages
  useEffect(() => {
    if (!playbook) return
    saveToSupabase({ current_stage: currentStage })
  }, [currentStage])

  // LocalStorage backup every 30 seconds
  useEffect(() => {
    localSaveTimerRef.current = setInterval(() => {
      if (playbook) {
        localStorage.setItem(`playbook_${playbook.id}`, JSON.stringify({
          icp: icpData,
          dip: dipData,
          bang_bang: bangBangData,
          current_stage: currentStage,
          saved_at: new Date().toISOString(),
        }))
      }
    }, 30000)
    return () => clearInterval(localSaveTimerRef.current)
  }, [playbook, icpData, dipData, bangBangData, currentStage])

  // ── ICP Updaters ──────────────────────────────────────────────────────────

  const updateIcp = (key, val) => setIcpData(prev => ({ ...prev, [key]: val }))
  const toggleIcpMulti = (key, val) => {
    setIcpData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  // ── Dip Updaters ──────────────────────────────────────────────────────────

  const updateDip = (key, val) => setDipData(prev => ({ ...prev, [key]: val }))
  const toggleDipMulti = (key, val) => {
    setDipData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  // ── Bang Bang Updaters ────────────────────────────────────────────────────

  const updateBB = (key, val) => setBangBangData(prev => ({ ...prev, [key]: val }))
  const toggleBBMulti = (key, val) => {
    setBangBangData(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const updateBBPhase = (idx, key, val) => {
    setBangBangData(prev => {
      const phases = [...prev.phases]
      phases[idx] = { ...phases[idx], [key]: val }
      return { ...prev, phases }
    })
  }
  const addBBPhase = () => {
    setBangBangData(prev => ({ ...prev, phases: [...prev.phases, { name: '', duration: '', description: '', outcome: '' }] }))
  }
  const removeBBPhase = (idx) => {
    setBangBangData(prev => ({ ...prev, phases: prev.phases.filter((_, i) => i !== idx) }))
  }
  const updateBBStack = (idx, key, val) => {
    setBangBangData(prev => {
      const stack = [...prev.stack]
      stack[idx] = { ...stack[idx], [key]: val }
      return { ...prev, stack }
    })
  }
  const addBBStack = () => {
    setBangBangData(prev => ({ ...prev, stack: [...prev.stack, { component: '', value: '', description: '' }] }))
  }
  const removeBBStack = (idx) => {
    setBangBangData(prev => ({ ...prev, stack: prev.stack.filter((_, i) => i !== idx) }))
  }
  const updateBBMilestone = (key, val) => {
    setBangBangData(prev => ({ ...prev, milestones: { ...prev.milestones, [key]: val } }))
  }
  const updateBBAlignment = (qKey, field, val) => {
    setBangBangData(prev => ({
      ...prev,
      alignment_checks: {
        ...prev.alignment_checks,
        [qKey]: { ...prev.alignment_checks[qKey], [field]: val },
      },
    }))
  }

  // Computed stack value
  const computedStackValue = (bangBangData.stack || []).reduce((sum, s) => sum + (Number(s.value) || 0), 0)

  // ── Dynamic List Helpers ──────────────────────────────────────────────────

  const addIcpListItem = (key) => {
    setIcpData(prev => ({ ...prev, [key]: [...(prev[key] || []), ''] }))
  }
  const removeIcpListItem = (key, idx) => {
    setIcpData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
  }
  const updateIcpListItem = (key, idx, val) => {
    setIcpData(prev => {
      const arr = [...prev[key]]
      arr[idx] = val
      return { ...prev, [key]: arr }
    })
  }

  // ── Scoring Engine ────────────────────────────────────────────────────────

  // ── Framework Updaters ─────────────────────────────────────────────────────
  const updateFramework = (key, val) => setFrameworkData(prev => ({ ...prev, [key]: val }))
  const updatePillar = (pillarIdx, key, val) => {
    setFrameworkData(prev => {
      const pillars = [...prev.pillars]
      pillars[pillarIdx] = { ...pillars[pillarIdx], [key]: val }
      return { ...prev, pillars }
    })
  }
  const updateModule = (pillarIdx, modIdx, key, val) => {
    setFrameworkData(prev => {
      const pillars = [...prev.pillars]
      const modules = [...pillars[pillarIdx].modules]
      modules[modIdx] = { ...modules[modIdx], [key]: val }
      pillars[pillarIdx] = { ...pillars[pillarIdx], modules }
      return { ...prev, pillars }
    })
  }
  const addModule = (pillarIdx) => {
    setFrameworkData(prev => {
      const pillars = [...prev.pillars]
      pillars[pillarIdx] = { ...pillars[pillarIdx], modules: [...pillars[pillarIdx].modules, { name: '', description: '' }] }
      return { ...prev, pillars }
    })
  }
  const removeModule = (pillarIdx, modIdx) => {
    setFrameworkData(prev => {
      const pillars = [...prev.pillars]
      pillars[pillarIdx] = { ...pillars[pillarIdx], modules: pillars[pillarIdx].modules.filter((_, i) => i !== modIdx) }
      return { ...prev, pillars }
    })
  }

  const computeScores = () => {
    let icpDemo = 0
    let icpPsycho = 0
    let dipScore = 0
    let bbScore = 0
    const flags = []

    // ICP Demographics (7 points)
    if (icpData.client_type) icpDemo += 1
    if (icpData.sector) icpDemo += 1
    if (icpData.specific_description && icpData.specific_description.length > 10) icpDemo += 1
    if (icpData.age_from && icpData.age_to) icpDemo += 1
    if (icpData.gender_focus) icpDemo += 0.5
    if (icpData.geography && icpData.geography.length > 0) icpDemo += 0.5
    if (icpData.life_stage && icpData.life_stage.length > 0) icpDemo += 1
    if (icpData.income_level) icpDemo += 0.5
    if (icpData.prior_coaching) icpDemo += 0.5

    // ICP Psychographics (8 points)
    if (icpData.current_self_perception && icpData.current_self_perception.length > 10) icpPsycho += 1
    if (icpData.desired_identity && icpData.desired_identity.length > 10) icpPsycho += 1
    if (icpData.identity_label) icpPsycho += 0.5
    if (icpData.values && icpData.values.length >= 2) icpPsycho += 0.5
    if (icpData.current_beliefs && icpData.current_beliefs.length > 10) icpPsycho += 0.5
    if (icpData.investment_relationship) icpPsycho += 0.5
    if (icpData.scepticism_level) icpPsycho += 0.5
    if (icpData.buying_behaviour && icpData.buying_behaviour.length > 0) icpPsycho += 0.5
    if (icpData.personality && icpData.personality.length > 0) icpPsycho += 0.5
    if (icpData.emotional_state && icpData.emotional_state.length > 0) icpPsycho += 0.5
    if (icpData.trigger_moment && icpData.trigger_moment.length > 10) icpPsycho += 0.5
    if (icpData.influences && icpData.influences.length > 5) icpPsycho += 0.5
    if (icpData.buying_influencers && icpData.buying_influencers.length > 0) icpPsycho += 0.5
    if (icpData.real_objections && icpData.real_objections.length >= 2) icpPsycho += 0.5
    if (icpData.cost_of_inaction && icpData.cost_of_inaction.length > 10) icpPsycho += 0.5

    // Market context bonus (included in ICP total — adds to demo)
    if (icpData.dream_outcome) icpDemo += 0 // already counted above limit
    if (icpData.already_tried && icpData.already_tried.filter(x => x).length > 0) icpPsycho += 0 // bonus
    if (icpData.pains && icpData.pains.filter(x => x).length > 0) icpPsycho += 0
    if (icpData.sophistication_level) icpPsycho += 0
    if (icpData.channels && icpData.channels.length > 0) icpPsycho += 0

    // Cap ICP scores
    icpDemo = Math.min(icpDemo, 7)
    icpPsycho = Math.min(icpPsycho, 8)

    // Dip Score (10 points)
    if (dipData.problem && dipData.problem.length > 5) dipScore += 1.5
    if (dipData.format) dipScore += 1
    if (dipData.outcome && dipData.outcome.length > 5) dipScore += 1.5
    if (dipData.delivery && dipData.delivery.length > 0) dipScore += 1
    if (dipData.duration) dipScore += 1
    if (dipData.time_to_first_result) dipScore += 1
    if (dipData.price) dipScore += 1
    if (dipData.client_effort) dipScore += 0.5
    if (dipData.bridge && dipData.bridge.length > 10) dipScore += 1
    if (dipData.belief_to_create) dipScore += 0.5
    dipScore = Math.min(dipScore, 10)

    // Bang Bang Score (15 points)
    // Core (5)
    if (bangBangData.name) bbScore += 1
    if (bangBangData.promise && bangBangData.promise.length > 10) bbScore += 1
    if (bangBangData.dream_score) bbScore += 0.5
    if (bangBangData.unique_mechanism && bangBangData.unique_mechanism.length > 10) bbScore += 1.5
    if (bangBangData.category) bbScore += 1
    // Structure (3)
    if (bangBangData.duration) bbScore += 0.5
    if (bangBangData.phases && bangBangData.phases.filter(p => p.name).length > 0) bbScore += 1
    if (bangBangData.touch_points && bangBangData.touch_points.length > 0) bbScore += 0.5
    if (bangBangData.milestones && (bangBangData.milestones.at_30_days || bangBangData.milestones.at_90_days)) bbScore += 1
    // Value & Pricing (3)
    if (bangBangData.stack && bangBangData.stack.filter(s => s.component).length > 0) bbScore += 1
    if (bangBangData.price) bbScore += 1
    if (bangBangData.payment_options && bangBangData.payment_options.length > 0) bbScore += 1
    // Risk & Positioning (2)
    if (bangBangData.guarantees && bangBangData.guarantees.length > 0) bbScore += 1
    if (bangBangData.social_proof && bangBangData.social_proof.length > 0) bbScore += 1
    // Continuity (1)
    if (bangBangData.continuity_offer) bbScore += 0.5
    if (bangBangData.continuity_format) bbScore += 0.5
    // Alignment (1)
    const alignAnswered = Object.values(bangBangData.alignment_checks || {}).filter(a => a.answer).length
    bbScore += Math.min(alignAnswered * 0.25, 1)
    bbScore = Math.min(bbScore, 15)

    // Flags
    if (!icpData.specific_description || icpData.specific_description.length < 20) {
      flags.push({ severity: 'high', message: 'ICP specific description is too vague or missing' })
    }
    if (!icpData.emotional_state || icpData.emotional_state.length === 0) {
      flags.push({ severity: 'medium', message: 'No emotional state selected for ICP — this drives messaging' })
    }
    if (!dipData.problem) {
      flags.push({ severity: 'high', message: 'Dip problem is not defined' })
    }
    if (!dipData.bridge || dipData.bridge.length < 20) {
      flags.push({ severity: 'medium', message: 'Dip bridge to main offer needs more detail' })
    }
    if (!bangBangData.unique_mechanism || bangBangData.unique_mechanism.length < 20) {
      flags.push({ severity: 'high', message: 'Unique mechanism is weak or missing — this is critical for differentiation' })
    }
    if (!bangBangData.promise || bangBangData.promise.length < 15) {
      flags.push({ severity: 'high', message: 'Core promise is too short or missing' })
    }
    if (bangBangData.price && bangBangData.price < 500) {
      flags.push({ severity: 'medium', message: 'Price may be too low for a premium offer' })
    }
    if (!bangBangData.guarantees || bangBangData.guarantees.length === 0) {
      flags.push({ severity: 'low', message: 'No guarantee selected — consider adding one to reduce risk' })
    }
    const notYetAlignments = Object.values(bangBangData.alignment_checks || {}).filter(a => a.answer === 'not_yet').length
    if (notYetAlignments >= 2) {
      flags.push({ severity: 'high', message: `${notYetAlignments} alignment checks are "not yet" — review before launching` })
    }
    if (icpData.who_not_for && !bangBangData.who_not_for) {
      flags.push({ severity: 'low', message: 'Consider copying ICP exclusions to your Bang Bang offer' })
    }

    const icpTotal = Math.round((icpDemo + icpPsycho) * 10) / 10
    // Framework Score (10 points)
    let fwScore = 0
    if (frameworkData.framework_name) fwScore += 1
    if (frameworkData.tagline && frameworkData.tagline.split(/\s+/).length >= 4) fwScore += 1
    frameworkData.pillars.forEach(p => {
      if (p.name) fwScore += 1
      const filledMods = p.modules.filter(m => m.name).length
      if (filledMods >= 2) fwScore += 1
      else if (filledMods >= 1) fwScore += 0.5
    })
    fwScore = Math.min(Math.round(fwScore * 10) / 10, 10)

    if (!frameworkData.framework_name) flags.push({ severity: 'low', message: 'Give your signature framework a name — it becomes your intellectual property' })
    const emptyPillars = frameworkData.pillars.filter(p => !p.name).length
    if (emptyPillars > 0) flags.push({ severity: 'low', message: `${emptyPillars} of 3 pillars are unnamed — each pillar should represent a key area your offer addresses` })

    const total = Math.round((icpTotal + dipScore + bbScore + fwScore) * 10) / 10

    let band = 'Needs Work'
    if (total >= 42) band = 'Offer-Ready'
    else if (total >= 34) band = 'Strong Foundation'
    else if (total >= 24) band = 'Getting There'

    return {
      icp: { demo: Math.round(icpDemo * 10) / 10, psycho: Math.round(icpPsycho * 10) / 10, total: icpTotal, max: 15 },
      dip: { total: Math.round(dipScore * 10) / 10, max: 10 },
      bangBang: { total: Math.round(bbScore * 10) / 10, max: 15 },
      framework: { total: fwScore, max: 10 },
      overall: { total, max: 50, band },
      flags,
    }
  }

  const scores = computeScores()

  // ── Generate AI Prompt ────────────────────────────────────────────────────

  const generateAIPrompt = () => {
    const lines = []
    lines.push('=== OFFER PLAYBOOK DATA ===\n')

    lines.push('--- ICP (Ideal Client Profile) ---')
    lines.push(`Client Type: ${icpData.client_type}`)
    lines.push(`Sector: ${icpData.sector}`)
    lines.push(`Description: ${icpData.specific_description}`)
    lines.push(`Age Range: ${icpData.age_from} - ${icpData.age_to}`)
    lines.push(`Gender Focus: ${icpData.gender_focus}`)
    lines.push(`Geography: ${(icpData.geography || []).join(', ')}`)
    lines.push(`Life Stage: ${(icpData.life_stage || []).join(', ')}`)
    lines.push(`Income Level: ${icpData.income_level}`)
    lines.push(`Prior Coaching: ${icpData.prior_coaching}`)
    lines.push(`Current Self-Perception: ${icpData.current_self_perception}`)
    lines.push(`Desired Identity: ${icpData.desired_identity}`)
    lines.push(`Identity Label: ${icpData.identity_label}`)
    lines.push(`Core Values: ${(icpData.values || []).join(', ')}`)
    lines.push(`Current Beliefs: ${icpData.current_beliefs}`)
    lines.push(`Investment Relationship: ${icpData.investment_relationship}`)
    lines.push(`Scepticism Level: ${icpData.scepticism_level}`)
    lines.push(`Buying Behaviour: ${(icpData.buying_behaviour || []).join(', ')}`)
    lines.push(`Personality: ${(icpData.personality || []).join(', ')}`)
    lines.push(`Emotional State: ${(icpData.emotional_state || []).join(', ')}`)
    lines.push(`Trigger Moment: ${icpData.trigger_moment}`)
    lines.push(`Influences: ${icpData.influences}`)
    lines.push(`Buying Influencers: ${(icpData.buying_influencers || []).join(', ')}`)
    lines.push(`Real Objections: ${(icpData.real_objections || []).join(', ')}`)
    lines.push(`Cost of Inaction: ${icpData.cost_of_inaction}`)
    lines.push(`Dream Outcome: ${icpData.dream_outcome}`)
    lines.push(`Already Tried: ${(icpData.already_tried || []).filter(x => x).join(', ')}`)
    lines.push(`Pains: ${(icpData.pains || []).filter(x => x).join(', ')}`)
    lines.push(`Sophistication Level: ${icpData.sophistication_level}`)
    lines.push(`Channels: ${(icpData.channels || []).join(', ')}`)
    lines.push(`Who NOT For: ${icpData.who_not_for}`)

    lines.push('\n--- The Dip (Entry Offer) ---')
    lines.push(`Problem: ${dipData.problem}`)
    lines.push(`Format: ${dipData.format}`)
    lines.push(`Outcome: ${dipData.outcome}`)
    lines.push(`Delivery: ${(dipData.delivery || []).join(', ')}`)
    lines.push(`Duration: ${dipData.duration}`)
    lines.push(`Time to First Result: ${dipData.time_to_first_result}`)
    lines.push(`Price: ${dipData.price}`)
    lines.push(`Client Effort: ${dipData.client_effort}`)
    lines.push(`Bridge to Main Offer: ${dipData.bridge}`)
    lines.push(`Belief to Create: ${dipData.belief_to_create}`)
    lines.push(`Psychographic Fit: ${(dipData.psychographic_fit || []).join(', ')}`)

    lines.push('\n--- Bang Bang Offer (Core Offer) ---')
    lines.push(`Name: ${bangBangData.name}`)
    lines.push(`Promise: ${bangBangData.promise}`)
    lines.push(`Who NOT For: ${bangBangData.who_not_for}`)
    lines.push(`Dream Score: ${bangBangData.dream_score}/7`)
    lines.push(`Unique Mechanism: ${bangBangData.unique_mechanism}`)
    lines.push(`Category: ${bangBangData.category}`)
    lines.push(`Duration: ${bangBangData.duration}`)
    lines.push(`Phases: ${(bangBangData.phases || []).map(p => `${p.name} (${p.duration}): ${p.description} -> ${p.outcome}`).join(' | ')}`)
    lines.push(`Touch Points: ${(bangBangData.touch_points || []).join(', ')}`)
    lines.push(`Client Commitment: ${bangBangData.client_commitment}`)
    lines.push(`Milestones: 30d: ${bangBangData.milestones?.at_30_days}, 90d: ${bangBangData.milestones?.at_90_days}, 6m: ${bangBangData.milestones?.at_6_months}`)
    lines.push(`Value Stack: ${(bangBangData.stack || []).map(s => `${s.component} (${s.value}): ${s.description}`).join(' | ')}`)
    lines.push(`Stack Value: ${bangBangData.stack_value || computedStackValue}`)
    lines.push(`Price: ${bangBangData.price}`)
    lines.push(`Payment Options: ${(bangBangData.payment_options || []).join(', ')}`)
    lines.push(`Delivery Model: ${(bangBangData.delivery_model || []).join(', ')}`)
    lines.push(`Guarantees: ${(bangBangData.guarantees || []).join(', ')}`)
    lines.push(`Guarantee Detail: ${bangBangData.guarantee_detail}`)
    lines.push(`Scarcity: ${bangBangData.scarcity}`)
    lines.push(`Social Proof: ${(bangBangData.social_proof || []).join(', ')}`)
    lines.push(`Continuity Offer: ${bangBangData.continuity_offer}`)
    lines.push(`Continuity Format: ${bangBangData.continuity_format}`)
    lines.push(`Continuity Price: ${bangBangData.continuity_price}`)
    lines.push(`Downsell: ${bangBangData.downsell}`)

    lines.push('\n--- Scores ---')
    lines.push(`ICP: ${scores.icp.total}/${scores.icp.max}`)
    lines.push(`Dip: ${scores.dip.total}/${scores.dip.max}`)
    lines.push(`Bang Bang: ${scores.bangBang.total}/${scores.bangBang.max}`)
    lines.push(`Total: ${scores.overall.total}/${scores.overall.max} (${scores.overall.band})`)

    if (scores.flags.length > 0) {
      lines.push('\n--- Flags ---')
      scores.flags.forEach(f => lines.push(`[${f.severity.toUpperCase()}] ${f.message}`))
    }

    lines.push('\n=== END PLAYBOOK DATA ===')
    lines.push('\nUsing this data, help me refine and improve my offer. Identify gaps, suggest copy angles, and give me specific next steps.')

    navigator.clipboard.writeText(lines.join('\n'))
    flash()
  }

  // ── Stage Navigation ──────────────────────────────────────────────────────

  const goToStage = (stage) => {
    saveAll()
    setCurrentStage(stage)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stages = [
    { num: 1, label: 'ICP Builder', icon: '1' },
    { num: 2, label: 'The Dip', icon: '2' },
    { num: 3, label: 'Bang Bang Offer', icon: '3' },
    { num: 4, label: 'Signature Framework™', icon: '4' },
    { num: 5, label: 'Blueprint', icon: '5' },
  ]

  // ── Stage completion checks ───────────────────────────────────────────────

  const stageComplete = (num) => {
    if (num === 1) return scores.icp.total >= 10
    if (num === 2) return scores.dip.total >= 7
    if (num === 3) return scores.bangBang.total >= 10
    if (num === 4) return scores.overall.total >= 29
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

  // Sub-components (TextInput, TextArea, SingleSelectTags, MultiSelectTags, DynamicList,
  // Label, SectionHeading, FieldGroup, ScoreRing) are all defined OUTSIDE the main
  // component to prevent focus loss on mobile re-render

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

  // ── Save Toast ────────────────────────────────────────────────────────────

  const SaveToast = () => (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-xl">
        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-sm text-zinc-300">Saved</span>
      </div>
    </div>
  )

  // ── Stage 1: ICP Builder ──────────────────────────────────────────────────

  const renderStage1 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">ICP Builder</h1>
        <p className="text-zinc-500 text-sm">Define your Ideal Client Profile across three dimensions.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-8 bg-zinc-900 rounded-lg p-1">
        {[
          { id: 'demographics', label: 'Demographics' },
          { id: 'psychographics', label: 'Psychographics' },
          { id: 'market', label: 'Market Context' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setIcpSection(tab.id)} className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition ${icpSection === tab.id ? 'bg-zinc-800 text-gold' : 'text-zinc-500 hover:text-zinc-300'}`}>{tab.label}</button>
        ))}
      </div>

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

          <div className="flex justify-end mt-8">
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
            <TextArea value={icpData.influences} onChange={v => updateIcp('influences', v)} placeholder="Who do they follow, listen to, or look up to? What content do they consume?" rows={3} />
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
              Next: Market Context &rarr;
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
            <TextArea value={icpData.who_not_for} onChange={v => updateIcp('who_not_for', v)} placeholder="Who should NOT buy from you? Be specific about exclusions." rows={3} />
          </FieldGroup>

          <div className="flex justify-between mt-8">
            <button onClick={() => setIcpSection('psychographics')} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
              &larr; Psychographics
            </button>
            <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
              Continue to Stage 2 &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Stage 2: The Dip ──────────────────────────────────────────────────────

  const renderStage2 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">The Dip</h1>
        <p className="text-zinc-500 text-sm">Design your entry-level offer that bridges to your core programme.</p>
      </div>

      <SectionHeading title="Problem & Format" description="What specific problem does The Dip solve?" />

      <FieldGroup label="Problem It Solves">
        <TextInput value={dipData.problem} onChange={v => updateDip('problem', v)} placeholder="The single, specific problem this entry offer addresses" />
      </FieldGroup>

      <FieldGroup label="Format">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIP_FORMAT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => updateDip('format', opt)}
              className={`px-3 py-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition border text-center ${dipData.format === opt ? 'bg-gold/10 text-gold border-gold/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Outcome / Promise">
        <TextInput value={dipData.outcome} onChange={v => updateDip('outcome', v)} placeholder="What specific result will they get from this?" />
      </FieldGroup>

      <FieldGroup label="Delivery Method">
        <MultiSelectTags options={DIP_DELIVERY_OPTIONS} value={dipData.delivery} onToggle={v => toggleDipMulti('delivery', v)} />
      </FieldGroup>

      <SectionHeading title="Logistics" description="Duration, effort, and pricing." />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <FieldGroup label="Duration" className="mb-0">
          <TextInput value={dipData.duration} onChange={v => updateDip('duration', v)} placeholder="e.g. 90 minutes, 5 days" />
        </FieldGroup>
        <FieldGroup label="Time to First Result" className="mb-0">
          <TextInput value={dipData.time_to_first_result} onChange={v => updateDip('time_to_first_result', v)} placeholder="e.g. Same day, 48 hours" />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <FieldGroup label="Price (GBP)" className="mb-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
            <input
              type="number"
              value={dipData.price || ''}
              onChange={e => updateDip('price', e.target.value)}
              placeholder="47"
              className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
            />
          </div>
        </FieldGroup>
        <FieldGroup label="Client Effort Required" className="mb-0">
          <TextInput value={dipData.client_effort} onChange={v => updateDip('client_effort', v)} placeholder="e.g. 2 hours, minimal" />
        </FieldGroup>
      </div>

      <SectionHeading title="Bridge to Core Offer" description="How does The Dip connect to your main programme?" />

      <FieldGroup label="Bridge">
        <TextArea value={dipData.bridge} onChange={v => updateDip('bridge', v)} placeholder="How does completing The Dip naturally lead them to wanting your core offer? What gap remains?" rows={4} />
      </FieldGroup>

      <FieldGroup label="Belief to Create">
        <TextInput value={dipData.belief_to_create} onChange={v => updateDip('belief_to_create', v)} placeholder="What new belief should they walk away with?" />
      </FieldGroup>

      <FieldGroup label="Psychographic Fit">
        <p className="text-zinc-600 text-xs mb-2">Which emotional states does this entry offer best serve?</p>
        <MultiSelectTags options={EMOTIONAL_STATE_OPTIONS} value={dipData.psychographic_fit} onToggle={v => toggleDipMulti('psychographic_fit', v)} />
      </FieldGroup>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; ICP Builder
        </button>
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          Continue to Stage 3 &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 3: Bang Bang Offer ──────────────────────────────────────────────

  const renderStage3 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Bang Bang Offer</h1>
        <p className="text-zinc-500 text-sm">Build your core, premium offer with full structure and positioning.</p>
      </div>

      {/* Section A — Core */}
      <SectionHeading title="A — Core" description="The heart of your offer. Name, promise, and differentiation." />

      <FieldGroup label="Offer Name">
        <TextInput value={bangBangData.name} onChange={v => updateBB('name', v)} placeholder="e.g. The Accelerator, The Inner Circle" />
      </FieldGroup>

      <FieldGroup label="Core Promise">
        <TextArea value={bangBangData.promise} onChange={v => updateBB('promise', v)} placeholder="What specific transformation do you promise? Be bold but honest." rows={3} />
      </FieldGroup>

      <FieldGroup label="Who Is This NOT For?">
        <TextArea value={bangBangData.who_not_for || icpData.who_not_for || ''} onChange={v => updateBB('who_not_for', v)} placeholder="Who should NOT join this programme?" rows={3} />
      </FieldGroup>

      <FieldGroup label="Dream Outcome Score (1-7)">
        <p className="text-zinc-600 text-xs mb-2">How transformative is the promised outcome? 1 = incremental, 7 = life-changing.</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <button key={n} onClick={() => updateBB('dream_score', n)} className={`w-10 h-10 rounded-lg text-sm font-bold transition border ${bangBangData.dream_score === n ? 'bg-gold/10 text-gold border-gold/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'}`}>{n}</button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Unique Mechanism">
        <TextArea value={bangBangData.unique_mechanism} onChange={v => updateBB('unique_mechanism', v)} placeholder="What's your unique method, framework, or approach that makes this different from everything else?" rows={4} />
      </FieldGroup>

      <FieldGroup label="Category">
        <TextInput value={bangBangData.category} onChange={v => updateBB('category', v)} placeholder="e.g. Business coaching, Fitness transformation, Mindset mastery" />
      </FieldGroup>

      {/* Section B — Structure */}
      <div className="mt-10">
        <SectionHeading title="B — Structure" description="How the programme is delivered and experienced." />

        <FieldGroup label="Total Duration">
          <TextInput value={bangBangData.duration} onChange={v => updateBB('duration', v)} placeholder="e.g. 12 weeks, 6 months, 12 months" />
        </FieldGroup>

        <FieldGroup label="Phases">
          <p className="text-zinc-600 text-xs mb-3">Break your programme into clear phases.</p>
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
                    <input value={phase.name || ''} onChange={e => updateBBPhase(i, 'name', e.target.value)} placeholder="e.g. Foundation" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Duration</label>
                    <input value={phase.duration || ''} onChange={e => updateBBPhase(i, 'duration', e.target.value)} placeholder="e.g. 4 weeks" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-zinc-500 mb-1">Description</label>
                  <textarea value={phase.description || ''} onChange={e => updateBBPhase(i, 'description', e.target.value)} placeholder="What happens in this phase?" rows={2} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Outcome</label>
                  <input value={phase.outcome || ''} onChange={e => updateBBPhase(i, 'outcome', e.target.value)} placeholder="What do they achieve by the end of this phase?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBBPhase} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Phase</button>
        </FieldGroup>

        <FieldGroup label="Touch Points">
          <MultiSelectTags options={TOUCH_POINTS_OPTIONS} value={bangBangData.touch_points} onToggle={v => toggleBBMulti('touch_points', v)} />
        </FieldGroup>

        <FieldGroup label="Client Commitment">
          <TextInput value={bangBangData.client_commitment} onChange={v => updateBB('client_commitment', v)} placeholder="e.g. 5 hours per week, daily check-ins" />
        </FieldGroup>

        <FieldGroup label="Milestones">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">At 30 Days</label>
              <TextInput value={bangBangData.milestones?.at_30_days} onChange={v => updateBBMilestone('at_30_days', v)} placeholder="What will they have achieved?" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">At 90 Days</label>
              <TextInput value={bangBangData.milestones?.at_90_days} onChange={v => updateBBMilestone('at_90_days', v)} placeholder="What will they have achieved?" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">At 6 Months</label>
              <TextInput value={bangBangData.milestones?.at_6_months} onChange={v => updateBBMilestone('at_6_months', v)} placeholder="What will they have achieved?" />
            </div>
          </div>
        </FieldGroup>
      </div>

      {/* Section C — Value & Pricing */}
      <div className="mt-10">
        <SectionHeading title="C — Value & Pricing" description="Build your value stack and set your price." />

        <FieldGroup label="Value Stack">
          <p className="text-zinc-600 text-xs mb-3">List everything included in the offer with its perceived value.</p>
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
                    <input value={item.component || ''} onChange={e => updateBBStack(i, 'component', e.target.value)} placeholder="e.g. 12x 1:1 Calls" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Value (GBP)</label>
                    <input type="number" value={item.value || ''} onChange={e => updateBBStack(i, 'value', e.target.value)} placeholder="2000" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Description</label>
                  <input value={item.description || ''} onChange={e => updateBBStack(i, 'description', e.target.value)} placeholder="What does this include and why is it valuable?" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBBStack} className="text-xs text-gold hover:text-gold-light transition mt-3">+ Add Stack Item</button>
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <FieldGroup label="Total Stack Value (GBP)" className="mb-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
              <input
                type="number"
                value={bangBangData.stack_value || computedStackValue || ''}
                onChange={e => updateBB('stack_value', e.target.value)}
                placeholder={String(computedStackValue)}
                className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
              />
            </div>
            <p className="text-zinc-600 text-xs mt-1">Auto-calculated: £{computedStackValue.toLocaleString()}</p>
          </FieldGroup>
          <FieldGroup label="Your Price (GBP)" className="mb-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
              <input
                type="number"
                value={bangBangData.price || ''}
                onChange={e => updateBB('price', e.target.value)}
                placeholder="3000"
                className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
              />
            </div>
          </FieldGroup>
        </div>

        <FieldGroup label="Payment Options">
          <MultiSelectTags options={PAYMENT_OPTIONS} value={bangBangData.payment_options} onToggle={v => toggleBBMulti('payment_options', v)} />
        </FieldGroup>

        <FieldGroup label="Delivery Model">
          <MultiSelectTags options={DELIVERY_MODEL_OPTIONS} value={bangBangData.delivery_model} onToggle={v => toggleBBMulti('delivery_model', v)} />
        </FieldGroup>
      </div>

      {/* Section D — Risk & Positioning */}
      <div className="mt-10">
        <SectionHeading title="D — Risk & Positioning" description="Remove friction and build trust." />

        <FieldGroup label="Guarantees">
          <MultiSelectTags options={GUARANTEE_OPTIONS} value={bangBangData.guarantees} onToggle={v => toggleBBMulti('guarantees', v)} />
        </FieldGroup>

        <FieldGroup label="Guarantee Detail">
          <TextInput value={bangBangData.guarantee_detail} onChange={v => updateBB('guarantee_detail', v)} placeholder="Describe the specifics of your guarantee" />
        </FieldGroup>

        <FieldGroup label="Scarcity / Urgency">
          <TextInput value={bangBangData.scarcity} onChange={v => updateBB('scarcity', v)} placeholder="e.g. Limited to 10 spots per quarter, application only" />
        </FieldGroup>

        <FieldGroup label="Social Proof Available">
          <MultiSelectTags options={SOCIAL_PROOF_OPTIONS} value={bangBangData.social_proof} onToggle={v => toggleBBMulti('social_proof', v)} />
        </FieldGroup>
      </div>

      {/* Section E — Continuity */}
      <div className="mt-10">
        <SectionHeading title="E — Continuity" description="Keep clients beyond the initial programme." />

        <FieldGroup label="Continuity Offer">
          <TextInput value={bangBangData.continuity_offer} onChange={v => updateBB('continuity_offer', v)} placeholder="e.g. Monthly mastermind, ongoing 1:1 retainer" />
        </FieldGroup>

        <FieldGroup label="Continuity Format">
          <SingleSelectTags options={CONTINUITY_FORMAT_OPTIONS} value={bangBangData.continuity_format} onChange={v => updateBB('continuity_format', v)} />
        </FieldGroup>

        <FieldGroup label="Continuity Price (GBP)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">£</span>
            <input
              type="number"
              value={bangBangData.continuity_price || ''}
              onChange={e => updateBB('continuity_price', e.target.value)}
              placeholder="500"
              className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Downsell Option">
          <TextInput value={bangBangData.downsell} onChange={v => updateBB('downsell', v)} placeholder="What do you offer if they can't commit to the full programme?" />
        </FieldGroup>
      </div>

      {/* Section F — Alignment Checks */}
      <div className="mt-10">
        <SectionHeading title="F — Alignment Checks" description="Honest self-assessment before you launch." />

        {ALIGNMENT_QUESTIONS.map((q, i) => {
          const qKey = `q${i + 1}`
          const check = bangBangData.alignment_checks?.[qKey] || { answer: '', detail: '' }
          return (
            <div key={qKey} className="mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-white mb-3">{q}</p>
              <div className="flex gap-2 mb-3">
                {['yes', 'partially', 'not_yet'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateBBAlignment(qKey, 'answer', opt)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition border ${
                      check.answer === opt
                        ? opt === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : opt === 'partially' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {opt === 'not_yet' ? 'Not Yet' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
              {check.answer && check.answer !== 'yes' && (
                <TextInput value={check.detail} onChange={v => updateBBAlignment(qKey, 'detail', v)} placeholder="What needs to happen to get this to a yes?" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
          &larr; The Dip
        </button>
        <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-gold text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition">
          Signature Framework™ &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 4: Blueprint Summary ────────────────────────────────────────────

  // ── Stage 4: Signature Framework™ ────────────────────────────────────────

  const renderStage4 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Signature Framework™</h1>
        <p className="text-zinc-500 text-sm">Define the three core pillars of your offer. Each pillar addresses a key area your clients need to transform — and within each, you deliver through specific modules or methods.</p>
      </div>

      {/* Framework Name */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <SectionHeading title="Your Framework" description="Give your signature methodology a name. This becomes your intellectual property — the thing only you deliver." />
        <FieldGroup label="Framework Name">
          <TextInput value={frameworkData.framework_name} onChange={v => updateFramework('framework_name', v)} placeholder="e.g. The Syndicate Method™, The Growth Engine™, The 90-Day Accelerator™" />
        </FieldGroup>
        <FieldGroup label="Framework Tagline">
          <TextInput value={frameworkData.tagline} onChange={v => updateFramework('tagline', v)} placeholder="A single sentence that captures what your framework delivers" />
        </FieldGroup>
      </div>

      {/* Three Pillars */}
      <SectionHeading title="The Three Pillars" description="Your offer resolves three key areas for your client. Think of these as the transformation categories — not the deliverables. What are the three big shifts your clients go through?" />

      <div className="space-y-6">
        {frameworkData.pillars.map((pillar, pi) => (
          <div key={pi} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className={`px-5 py-4 border-b border-zinc-800 ${pi === 0 ? 'bg-sky-500/5' : pi === 1 ? 'bg-violet-500/5' : 'bg-gold/5'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${pi === 0 ? 'bg-sky-500/20 text-sky-400' : pi === 1 ? 'bg-violet-500/20 text-violet-400' : 'bg-gold/20 text-gold'}`}>{pi + 1}</span>
                <div className="flex-1">
                  <input
                    value={pillar.name}
                    onChange={e => updatePillar(pi, 'name', e.target.value)}
                    placeholder={pi === 0 ? 'e.g. Build the Business' : pi === 1 ? 'e.g. Rewire the Mindset' : 'e.g. Design the Lifestyle'}
                    className="w-full bg-transparent text-white font-bold text-sm placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-5">
              <FieldGroup label="What does this pillar address?">
                <TextArea value={pillar.description} onChange={v => updatePillar(pi, 'description', v)} placeholder="Describe the key transformation area this pillar covers. What problem does it solve? What shift does it create?" rows={2} />
              </FieldGroup>

              <div className="mt-4">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Modules / Methods within this pillar</label>
                <div className="space-y-3">
                  {pillar.modules.map((mod, mi) => (
                    <div key={mi} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${pi === 0 ? 'text-sky-400' : pi === 1 ? 'text-violet-400' : 'text-gold'}`}>Module {mi + 1}</span>
                        {pillar.modules.length > 1 && (
                          <button onClick={() => removeModule(pi, mi)} className="text-zinc-700 hover:text-red-400 transition text-xs">Remove</button>
                        )}
                      </div>
                      <input
                        value={mod.name}
                        onChange={e => updateModule(pi, mi, 'name', e.target.value)}
                        placeholder={pi === 0 && mi === 0 ? 'e.g. Premium Positioning' : pi === 0 && mi === 1 ? 'e.g. Offer Architecture' : 'Module name'}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm mb-2"
                      />
                      <input
                        value={mod.description}
                        onChange={e => updateModule(pi, mi, 'description', e.target.value)}
                        placeholder="What does this module deliver or teach?"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                      />
                    </div>
                  ))}
                  <button onClick={() => addModule(pi)} className="text-xs text-gold hover:text-gold-light transition font-semibold">+ Add module</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Bang Bang Offer
        </button>
        <button onClick={() => goToStage(5)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          View Blueprint &rarr;
        </button>
      </div>
    </div>
  )

  // ── Stage 5: Blueprint Summary ────────────────────────────────────────────

  const renderStage5 = () => {
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
          <p className="text-zinc-500 text-sm">Your complete offer playbook at a glance with scoring.</p>
        </div>

        {/* Score Overview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative flex items-center justify-center">
              <ScoreRing score={scores.overall.total} max={scores.overall.max} size={140} strokeWidth={10} />
            </div>
            <div className="flex-1 w-full">
              <div className="mb-4">
                <span className={`text-sm font-bold ${scores.overall.band === 'Offer-Ready' ? 'text-gold' : scores.overall.band === 'Strong Foundation' ? 'text-emerald-400' : scores.overall.band === 'Getting There' ? 'text-yellow-400' : 'text-red-400'}`}>{scores.overall.band}</span>
                <span className="text-zinc-600 text-xs ml-2">
                  {scores.overall.band === 'Offer-Ready' ? 'Your offer is ready to go live.' : scores.overall.band === 'Strong Foundation' ? 'Almost there. Refine the gaps below.' : scores.overall.band === 'Getting There' ? 'Good progress. Keep building.' : 'Focus on completing the core sections.'}
                </span>
              </div>
              <ProgressBar score={scores.icp.total} max={scores.icp.max} label="ICP" color="bg-sky-400" />
              <ProgressBar score={scores.dip.total} max={scores.dip.max} label="The Dip" color="bg-violet-400" />
              <ProgressBar score={scores.bangBang.total} max={scores.bangBang.max} label="Bang Bang Offer" color="bg-gold" />
              <ProgressBar score={scores.framework.total} max={scores.framework.max} label="Signature Framework™" color="bg-emerald-400" />
            </div>
          </div>
        </div>

        {/* Stage 4 — Signature Framework Summary */}
        {frameworkData.framework_name && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Stage 4 — Signature Framework™</h3>
            <div className="mb-4">
              <p className="text-white text-lg font-bold">{frameworkData.framework_name}</p>
              {frameworkData.tagline && <p className="text-zinc-400 text-sm mt-1 italic">{frameworkData.tagline}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {frameworkData.pillars.map((pillar, pi) => pillar.name && (
                <div key={pi} className={`border rounded-lg p-4 ${pi === 0 ? 'border-sky-500/30 bg-sky-500/5' : pi === 1 ? 'border-violet-500/30 bg-violet-500/5' : 'border-gold/30 bg-gold/5'}`}>
                  <p className={`text-sm font-bold mb-2 ${pi === 0 ? 'text-sky-400' : pi === 1 ? 'text-violet-400' : 'text-gold'}`}>{pillar.name}</p>
                  {pillar.description && <p className="text-zinc-400 text-xs mb-3">{pillar.description}</p>}
                  <div className="space-y-1">
                    {pillar.modules.filter(m => m.name).map((mod, mi) => (
                      <div key={mi} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                        <p className="text-zinc-300 text-xs">{mod.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* ICP Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Stage 1 — ICP Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Client Type" value={icpData.client_type} />
            <SummaryField label="Sector" value={icpData.sector} />
            <SummaryField label="Age Range" value={icpData.age_from && icpData.age_to ? `${icpData.age_from} - ${icpData.age_to}` : ''} />
            <SummaryField label="Gender Focus" value={icpData.gender_focus} />
            <SummaryField label="Geography" value={icpData.geography} />
            <SummaryField label="Life Stage" value={icpData.life_stage} />
            <SummaryField label="Income Level" value={icpData.income_level} />
            <SummaryField label="Prior Coaching" value={icpData.prior_coaching} />
          </div>
          <SummaryField label="Specific Description" value={icpData.specific_description} />
          <SummaryField label="Current Self-Perception" value={icpData.current_self_perception} />
          <SummaryField label="Desired Identity" value={icpData.desired_identity} />
          <SummaryField label="Identity Label" value={icpData.identity_label} />
          <SummaryField label="Core Values" value={icpData.values} />
          <SummaryField label="Current Beliefs" value={icpData.current_beliefs} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Investment Relationship" value={icpData.investment_relationship} />
            <SummaryField label="Scepticism Level" value={icpData.scepticism_level} />
          </div>
          <SummaryField label="Buying Behaviour" value={icpData.buying_behaviour} />
          <SummaryField label="Personality" value={icpData.personality} />
          <SummaryField label="Emotional State" value={icpData.emotional_state} />
          <SummaryField label="Trigger Moment" value={icpData.trigger_moment} />
          <SummaryField label="Influences" value={icpData.influences} />
          <SummaryField label="Buying Influencers" value={icpData.buying_influencers} />
          <SummaryField label="Real Objections" value={icpData.real_objections} />
          <SummaryField label="Cost of Inaction" value={icpData.cost_of_inaction} />
          <SummaryField label="Dream Outcome" value={icpData.dream_outcome} />
          <SummaryField label="Already Tried" value={(icpData.already_tried || []).filter(x => x)} />
          <SummaryField label="Pains" value={(icpData.pains || []).filter(x => x)} />
          <SummaryField label="Sophistication Level" value={icpData.sophistication_level} />
          <SummaryField label="Channels" value={icpData.channels} />
          <SummaryField label="Who NOT For" value={icpData.who_not_for} />
        </div>

        {/* Dip Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Stage 2 — The Dip</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Problem" value={dipData.problem} />
            <SummaryField label="Format" value={dipData.format} />
            <SummaryField label="Outcome" value={dipData.outcome} />
            <SummaryField label="Delivery" value={dipData.delivery} />
            <SummaryField label="Duration" value={dipData.duration} />
            <SummaryField label="Time to First Result" value={dipData.time_to_first_result} />
            <SummaryField label="Price" value={dipData.price ? `£${dipData.price}` : ''} />
            <SummaryField label="Client Effort" value={dipData.client_effort} />
          </div>
          <SummaryField label="Bridge to Core Offer" value={dipData.bridge} />
          <SummaryField label="Belief to Create" value={dipData.belief_to_create} />
          <SummaryField label="Psychographic Fit" value={dipData.psychographic_fit} />
        </div>

        {/* Bang Bang Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Stage 3 — Bang Bang Offer</h3>

          <div className="mb-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Core</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Name" value={bangBangData.name} />
            <SummaryField label="Category" value={bangBangData.category} />
            <SummaryField label="Dream Score" value={bangBangData.dream_score ? `${bangBangData.dream_score} / 7` : ''} />
          </div>
          <SummaryField label="Promise" value={bangBangData.promise} />
          <SummaryField label="Who NOT For" value={bangBangData.who_not_for} />
          <SummaryField label="Unique Mechanism" value={bangBangData.unique_mechanism} />

          <div className="mb-4 mt-6">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Structure</span>
          </div>
          <SummaryField label="Duration" value={bangBangData.duration} />
          {(bangBangData.phases || []).filter(p => p.name).length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Phases</span>
              <div className="mt-2 space-y-2">
                {bangBangData.phases.filter(p => p.name).map((p, i) => (
                  <div key={i} className="bg-zinc-800 rounded p-3">
                    <p className="text-sm text-white font-semibold">{p.name} <span className="text-zinc-500 font-normal">({p.duration})</span></p>
                    {p.description && <p className="text-xs text-zinc-400 mt-1">{p.description}</p>}
                    {p.outcome && <p className="text-xs text-zinc-500 mt-1">Outcome: {p.outcome}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <SummaryField label="Touch Points" value={bangBangData.touch_points} />
          <SummaryField label="Client Commitment" value={bangBangData.client_commitment} />
          {(bangBangData.milestones?.at_30_days || bangBangData.milestones?.at_90_days || bangBangData.milestones?.at_6_months) && (
            <div className="mb-3">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Milestones</span>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                {bangBangData.milestones?.at_30_days && (
                  <div className="bg-zinc-800 rounded p-3">
                    <p className="text-xs text-zinc-500 mb-1">30 Days</p>
                    <p className="text-sm text-white">{bangBangData.milestones.at_30_days}</p>
                  </div>
                )}
                {bangBangData.milestones?.at_90_days && (
                  <div className="bg-zinc-800 rounded p-3">
                    <p className="text-xs text-zinc-500 mb-1">90 Days</p>
                    <p className="text-sm text-white">{bangBangData.milestones.at_90_days}</p>
                  </div>
                )}
                {bangBangData.milestones?.at_6_months && (
                  <div className="bg-zinc-800 rounded p-3">
                    <p className="text-xs text-zinc-500 mb-1">6 Months</p>
                    <p className="text-sm text-white">{bangBangData.milestones.at_6_months}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4 mt-6">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Value & Pricing</span>
          </div>
          {(bangBangData.stack || []).filter(s => s.component).length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Value Stack</span>
              <div className="mt-2 space-y-2">
                {bangBangData.stack.filter(s => s.component).map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-800 rounded p-3">
                    <div>
                      <p className="text-sm text-white">{s.component}</p>
                      {s.description && <p className="text-xs text-zinc-500 mt-0.5">{s.description}</p>}
                    </div>
                    <span className="text-sm text-gold font-semibold">£{Number(s.value || 0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Stack Value</span>
                  <span className="text-sm text-white font-bold">£{(Number(bangBangData.stack_value) || computedStackValue).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Price" value={bangBangData.price ? `£${Number(bangBangData.price).toLocaleString()}` : ''} />
            <SummaryField label="Payment Options" value={bangBangData.payment_options} />
          </div>
          <SummaryField label="Delivery Model" value={bangBangData.delivery_model} />

          <div className="mb-4 mt-6">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Risk & Positioning</span>
          </div>
          <SummaryField label="Guarantees" value={bangBangData.guarantees} />
          <SummaryField label="Guarantee Detail" value={bangBangData.guarantee_detail} />
          <SummaryField label="Scarcity" value={bangBangData.scarcity} />
          <SummaryField label="Social Proof" value={bangBangData.social_proof} />

          <div className="mb-4 mt-6">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Continuity</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SummaryField label="Continuity Offer" value={bangBangData.continuity_offer} />
            <SummaryField label="Format" value={bangBangData.continuity_format} />
            <SummaryField label="Price" value={bangBangData.continuity_price ? `£${bangBangData.continuity_price}` : ''} />
            <SummaryField label="Downsell" value={bangBangData.downsell} />
          </div>

          {/* Alignment checks */}
          {Object.values(bangBangData.alignment_checks || {}).some(a => a.answer) && (
            <>
              <div className="mb-4 mt-6">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Alignment Checks</span>
              </div>
              {ALIGNMENT_QUESTIONS.map((q, i) => {
                const qKey = `q${i + 1}`
                const check = bangBangData.alignment_checks?.[qKey] || {}
                if (!check.answer) return null
                return (
                  <div key={qKey} className="mb-3">
                    <p className="text-xs text-zinc-500">{q}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${
                      check.answer === 'yes' ? 'text-emerald-400' :
                      check.answer === 'partially' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {check.answer === 'not_yet' ? 'Not Yet' : check.answer.charAt(0).toUpperCase() + check.answer.slice(1)}
                    </p>
                    {check.detail && <p className="text-xs text-zinc-400 mt-0.5">{check.detail}</p>}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-zinc-700 transition">
            &larr; Edit Playbook
          </button>
        </div>

        {/* Offer Launch Plan */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          {scores.overall.total >= 40 ? (
            <>
              <div className="text-center mb-6">
                <button onClick={async () => {
                  setPlaybook(prev => ({ ...prev, _planLoading: true }))
                  try {
                    const res = await fetch('/api/generate-plan', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'sold-out', data: { icp: icpData, dip: dipData, bang_bang: bangBangData, framework: frameworkData } }),
                    })
                    const result = await res.json()
                    if (result.error) { alert('Failed: ' + result.error); setPlaybook(prev => ({ ...prev, _planLoading: false })); return }
                    const { error: planError } = await supabase.from('offer_playbooks').update({ generated_plan: result.plan, updated_at: new Date().toISOString() }).eq('id', playbook.id)
                    if (planError) { console.error('offer_playbooks save error:', planError); alert('Failed to save plan: ' + planError.message); setPlaybook(prev => ({ ...prev, _planLoading: false })); return }
                    setPlaybook(prev => ({ ...prev, generated_plan: result.plan, _planLoading: false }))
                  } catch (e) { alert('Failed: ' + e.message); setPlaybook(prev => ({ ...prev, _planLoading: false })) }
                }} disabled={playbook._planLoading} className={`px-8 py-4 ${playbook.generated_plan ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30' : 'bg-gold hover:bg-gold-light text-zinc-950'} disabled:opacity-50 font-bold text-xs uppercase tracking-widest rounded-lg transition`}>
                  {playbook._planLoading ? 'Generating your plan...' : playbook.generated_plan ? 'Regenerate My Offer Launch Plan' : 'Generate My Offer Launch Plan'}
                </button>
                {playbook.generated_plan && <p className="text-zinc-600 text-xs mt-2">Updated your answers? Hit regenerate to refresh your plan.</p>}
              </div>
              {playbook.generated_plan && (
                <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Your Offer Launch Plan</h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{playbook.generated_plan}</div>
                </div>
              )}
            </>
          ) : (() => {
            const improvements = []
            const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
            // ICP
            if (!icpData.specific_description || wc(icpData.specific_description) < 10) improvements.push({ stage: 1, label: 'ICP Builder', msg: 'Describe your ideal client in more detail (10+ words)' })
            if (!icpData.dream_outcome || wc(icpData.dream_outcome) < 8) improvements.push({ stage: 1, label: 'ICP Builder', msg: 'Make your dream outcome more specific (8+ words)' })
            if ((icpData.pains || []).filter(Boolean).length < 3) improvements.push({ stage: 1, label: 'ICP Builder', msg: 'Add at least 3 pain points' })
            if (!(icpData.channels || []).length) improvements.push({ stage: 1, label: 'ICP Builder', msg: 'Select where your ICP hangs out' })
            if (!icpData.trigger_moment || wc(icpData.trigger_moment) < 8) improvements.push({ stage: 1, label: 'ICP Builder', msg: 'Describe the trigger moment (8+ words)' })
            // Dip
            if (!dipData.format) improvements.push({ stage: 2, label: 'The Dip', msg: 'Choose a format for your entry offer' })
            if (!dipData.problem || wc(dipData.problem) < 5) improvements.push({ stage: 2, label: 'The Dip', msg: 'Define the specific problem your Dip solves' })
            if (!dipData.outcome || wc(dipData.outcome) < 5) improvements.push({ stage: 2, label: 'The Dip', msg: 'Define the outcome your Dip delivers' })
            if (!dipData.bridge || wc(dipData.bridge) < 10) improvements.push({ stage: 2, label: 'The Dip', msg: 'Explain the bridge to your main offer (10+ words)' })
            // Bang Bang
            if (!bangBangData.name) improvements.push({ stage: 3, label: 'Bang Bang Offer', msg: 'Name your main offer' })
            if (!bangBangData.promise || wc(bangBangData.promise) < 15) improvements.push({ stage: 3, label: 'Bang Bang Offer', msg: 'Write your core promise (15+ words)' })
            if (!bangBangData.unique_mechanism) improvements.push({ stage: 3, label: 'Bang Bang Offer', msg: 'Define your unique mechanism' })
            if ((bangBangData.phases || []).filter(p => p.name).length < 2) improvements.push({ stage: 3, label: 'Bang Bang Offer', msg: 'Add at least 2 programme phases' })
            if (!bangBangData.price) improvements.push({ stage: 3, label: 'Bang Bang Offer', msg: 'Set your price' })
            // Framework
            if (!frameworkData.framework_name) improvements.push({ stage: 4, label: 'Signature Framework™', msg: 'Name your signature framework' })
            const namedPillars = (frameworkData.pillars || []).filter(p => p.name).length
            if (namedPillars < 3) improvements.push({ stage: 4, label: 'Signature Framework™', msg: `Name all 3 pillars (${namedPillars}/3 done)` })
            return (
            <div>
              <div className="text-center mb-6">
                <p className="text-zinc-400 text-sm font-medium mb-1">Score {scores.overall.total}/50 — you need 40 to unlock your launch plan</p>
                <div className="w-full max-w-xs mx-auto h-3 bg-zinc-800 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(scores.overall.total / 40) * 100}%` }} />
                </div>
                <p className="text-zinc-600 text-xs mt-2">{40 - scores.overall.total} points to go</p>
              </div>
              {improvements.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Improve these to unlock your plan</h3>
                  <div className="space-y-2">
                    {improvements.slice(0, 8).map((imp, i) => (
                      <button key={i} onClick={() => goToStage(imp.stage)}
                        className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left hover:border-gold/30 active:border-gold/30 transition">
                        <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{imp.label}</p>
                          <p className="text-xs text-zinc-500">{imp.msg}</p>
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
      </div>
    )
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <SaveToast />

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
          {/* Saving indicator */}
          {saving && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs text-zinc-500">Saving...</span>
            </div>
          )}

          {currentStage === 1 && renderStage1()}
          {currentStage === 2 && renderStage2()}
          {currentStage === 3 && renderStage3()}
          {currentStage === 4 && renderStage4()}
          {currentStage === 5 && renderStage5()}
        </div>
      </div>
    </div>
  )
}
