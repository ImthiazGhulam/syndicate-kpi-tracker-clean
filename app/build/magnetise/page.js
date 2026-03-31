'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// ── Hook Library (50 hooks) ───────────────────────────────────────────────────

const HOOKS = [
  { key: 'result',      text: "This is why your {x} isn't giving you results" },
  { key: 'realize',     text: "Only a few people realize {x}" },
  { key: 'real-reason', text: "The real reason everyone is {doing x}" },
  { key: 'wasting',     text: "Stop wasting time on {x}" },
  { key: 'proven',      text: "(Number) proven methods to {achieve x}" },
  { key: 'transformed', text: "How I transformed {x} in {timeframe}" },
  { key: 'lie',         text: "The biggest lie in {industry}" },
  { key: 'no-one',      text: "What no one tells you about {x}" },
  { key: 'stopped',     text: "Why I stopped {doing x}" },
  { key: 'best',        text: "The best {x} I've ever used" },
  { key: 'expectations',text: "(Blank): Expectations vs. Reality" },
  { key: 'game-changer',text: "How {x} can be your biggest game-changer" },
  { key: 'cheat-sheet', text: "The ultimate cheat sheet on {x}" },
  { key: 'important',   text: "Why {x} is more important than you think" },
  { key: 'habits',      text: "(Number) habits of highly effective {people}" },
  { key: 'make-work',   text: "How to make {x} work for you" },
  { key: 'secret',      text: "The secret to {achieving x}" },
  { key: 'wish',        text: "What I wish I had known about {x}" },
  { key: 'strategy',    text: "The single most effective strategy for {x}" },
  { key: 'still-doing', text: "If you're still {doing x}, here's why you should stop" },
  { key: 'used-to',     text: "I used to think {x}, but I was wrong" },
  { key: 'overcome',    text: "How to overcome {problem}" },
  { key: 'things',      text: "(Number) things every {person} should know" },
  { key: 'game-changer2',text: "This {x} strategy is a game changer" },
  { key: 'before',      text: "Before you {do x}, read this" },
  { key: 'learn',       text: "What {industry} can learn from {another}" },
  { key: 'guarantee',   text: "How to guarantee {result}" },
  { key: 'truth',       text: "The truth about {belief}" },
  { key: 'debunked',    text: "{x} debunked: what really works" },
  { key: 'one-thing',   text: "If you only do one thing, make sure it's {x}" },
  { key: 'wrong',       text: "What everyone gets wrong about {x}" },
  { key: 'avoiding',    text: "How avoiding {x} can help you {achieve y}" },
  { key: 'explained',   text: "{x} explained in (number) simple steps" },
  { key: 'decision',    text: "Why {x} is the best decision I ever made" },
  { key: 'types',       text: "The (number) types of {people} in {niche}" },
  { key: 'world-full',  text: "How to be a {x} in a world full of {y}" },
  { key: 'unless',      text: "{x} doesn't work unless you {do y}" },
  { key: 'talk-about',  text: "Why we need to talk about {x}" },
  { key: 'vs',          text: "{x} vs. {y}: What's really better?" },
  { key: 'handle',      text: "The best way to handle {situation}" },
  { key: 'might-be',    text: "{x} might be your best {opportunity}" },
  { key: 'really-looks',text: "What {x} really looks like" },
  { key: 'stop-start',  text: "How to stop {bad habit} and start {good habit}" },
  { key: 'change-way',  text: "This could change the way you think about {x}" },
  { key: 'worth-trying',text: "{x} tips that are actually worth trying" },
  { key: 'rethink',     text: "Why it's time to rethink {common practice}" },
  { key: 'lead-to',     text: "How {x} can lead to {unexpected outcome}" },
  { key: 'happens',     text: "What happens when you {do x}" },
  { key: 'underrated',  text: "Why {x} is underrated" },
  { key: 'best-worst',  text: "The best and worst of {x}" },
]

function scoreHooks(capture, contrarian) {
  const combined = (capture + ' ' + contrarian).toLowerCase()
  return HOOKS.map(h => {
    let score = Math.random() * 0.5
    if (combined.includes('result') && h.key === 'result') score += 3
    if (combined.includes('stop') && h.key === 'stopped') score += 3
    if (combined.includes('lie') && h.key === 'lie') score += 3
    if (combined.includes('wrong') && h.key === 'wrong') score += 3
    if (combined.includes('truth') && h.key === 'truth') score += 3
    if (combined.includes('strategy') && h.key === 'strategy') score += 3
    if ((combined.includes('think') || combined.includes('belief')) && h.key === 'used-to') score += 2
    if ((combined.includes('content') || combined.includes('post')) && ['result','stopped','still-doing','rethink','wrong','no-one'].includes(h.key)) score += 2
    if ((combined.includes('client') || combined.includes('coach')) && ['result','secret','strategy','overcome','guarantee'].includes(h.key)) score += 2
    if (combined.includes('notice') && ['really-looks','happens','change-way'].includes(h.key)) score += 2
    if (combined.includes('pattern') && ['truth','debunked','wrong','rethink'].includes(h.key)) score += 2
    return { ...h, score }
  }).sort((a, b) => b.score - a.score).slice(0, 6)
}

const CTA_OPTIONS = [
  'Follow for more',
  'Grab my free lead magnet',
  'DM me the word [keyword]',
  'Comment below',
  'Save this',
]

const STEPS = [
  { num: 1, label: 'Capture' },
  { num: 2, label: 'Positioning' },
  { num: 3, label: 'Hook' },
  { num: 4, label: 'Build Format' },
  { num: 5, label: 'Build Output' },
  { num: 6, label: 'Payoff + CTA' },
  { num: 7, label: 'Final Script' },
]

const defaultDraft = () => ({
  capture: '',
  common_advice: '',
  contrarian: '',
  selected_hook: '',
  build_format: '',
  build_inputs: {},
  build_output: '',
  payoff: '',
  cta_type: '',
  cta_line: '',
})

// ── Sub-components (OUTSIDE main function — prevents mobile keyboard drop) ────

function Label({ children }) {
  return <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{children}</p>
}

function Hint({ children }) {
  return <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed italic">{children}</p>
}

function TA({ value, onChange, placeholder, rows }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows || 4}
      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm resize-none leading-relaxed"
    />
  )
}

function SectionHeading({ step, label }) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1">Step {step} of 7</p>
      <h1 className="text-xl font-bold text-white">{label}</h1>
    </div>
  )
}

function NavButtons({ onBack, onNext, backLabel, nextLabel, nextDisabled, generating }) {
  return (
    <div className="flex justify-between mt-8 gap-3">
      {onBack ? (
        <button onClick={onBack} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 active:bg-zinc-600 transition">
          &larr; {backLabel || 'Back'}
        </button>
      ) : <div />}
      <button
        onClick={onNext}
        disabled={nextDisabled || generating}
        className="px-6 py-2.5 bg-gold text-zinc-950 font-bold text-sm rounded-lg hover:bg-gold-light active:bg-gold-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {generating ? 'Generating...' : (nextLabel || 'Next →')}
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MagnetisePage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [savedDrafts, setSavedDrafts] = useState([])
  const [draftId, setDraftId] = useState(null)
  const [draft, setDraft] = useState(defaultDraft())
  const [scoredHooks, setScoredHooks] = useState([])
  const [customHook, setCustomHook] = useState('')
  const [useCustomHook, setUseCustomHook] = useState(false)
  const [userId, setUserId] = useState(null)

  const toastEl = useRef(null)
  const toastTimer = useRef(null)

  const flash = (msg = 'Saved') => {
    if (!toastEl.current) return
    toastEl.current.querySelector('[data-msg]').textContent = msg
    toastEl.current.style.opacity = '1'
    toastEl.current.style.transform = 'translateY(0)'
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      if (!toastEl.current) return
      toastEl.current.style.opacity = '0'
      toastEl.current.style.transform = 'translateY(16px)'
    }, 2500)
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle()

      if (!client) { setLoading(false); return }
      setClientData(client)

      const { data: drafts } = await supabase
        .from('magnetise_drafts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })

      if (drafts?.length) {
        setSavedDrafts(drafts)
        const latest = drafts.find(d => d.status === 'draft')
        if (latest) loadDraftIntoState(latest)
      }

      setLoading(false)
    }
    init()
  }, [])

  const loadDraftIntoState = (d) => {
    setDraftId(d.id)
    setDraft({
      capture:       d.capture || '',
      common_advice: d.common_advice || '',
      contrarian:    d.contrarian || '',
      selected_hook: d.selected_hook || '',
      build_format:  d.build_format || '',
      build_inputs:  d.build_inputs || {},
      build_output:  d.build_output || '',
      payoff:        d.payoff || '',
      cta_type:      d.cta_type || '',
      cta_line:      d.cta_line || '',
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (draftData, id, status = 'draft') => {
    if (!userId) return id
    const payload = {
      user_id:       userId,
      capture:       draftData.capture || '',
      common_advice: draftData.common_advice || '',
      contrarian:    draftData.contrarian || '',
      selected_hook: draftData.selected_hook || '',
      build_format:  draftData.build_format || null,
      build_inputs:  draftData.build_inputs || {},
      build_output:  draftData.build_output || '',
      payoff:        draftData.payoff || '',
      cta_type:      draftData.cta_type || '',
      cta_line:      draftData.cta_line || '',
      status,
    }
    if (id) {
      await supabase.from('magnetise_drafts').update(payload).eq('id', id)
      return id
    } else {
      const { data } = await supabase
        .from('magnetise_drafts')
        .insert(payload)
        .select()
        .single()
      if (data) { setDraftId(data.id); return data.id }
    }
    return id
  }, [userId])

  // ── Navigation ────────────────────────────────────────────────────────────

  const goToStep = async (n) => {
    setSaving(true)
    const newId = await saveDraft(draft, draftId)
    if (newId && !draftId) setDraftId(newId)
    setSaving(false)
    flash()
    setStep(n)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nextStep = () => goToStep(Math.min(step + 1, 7))
  const prevStep = () => goToStep(Math.max(step - 1, 1))

  const updateDraft = (key, val) => setDraft(prev => ({ ...prev, [key]: val }))
  const updateInput = (key, val) => setDraft(prev => ({ ...prev, build_inputs: { ...prev.build_inputs, [key]: val } }))

  // Score hooks on entering step 3
  useEffect(() => {
    if (step === 3) setScoredHooks(scoreHooks(draft.capture, draft.contrarian))
  }, [step])

  // ── AI Generation ─────────────────────────────────────────────────────────

  const generateBuild = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/magnetise/generate-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: draft.selected_hook,
          format: draft.build_format,
          inputs: draft.build_inputs,
          contrarian: draft.contrarian,
          niche: clientData?.business || '',
        }),
      })
      const result = await res.json()
      if (result.error) { alert('Generate failed: ' + result.error); setGenerating(false); return }
      updateDraft('build_output', result.text || '')
    } catch (e) { console.error(e); alert('Generate failed: ' + e.message) }
    setGenerating(false)
  }

  const generatePayoff = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/magnetise/generate-payoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: draft.selected_hook,
          build: draft.build_output,
          contrarian: draft.contrarian,
        }),
      })
      const result = await res.json()
      if (result.error) { alert('Generate failed: ' + result.error); setGenerating(false); return }
      updateDraft('payoff', result.text || '')
    } catch (e) { console.error(e); alert('Generate failed: ' + e.message) }
    setGenerating(false)
  }

  const generateCTA = async () => {
    if (!draft.cta_type) return
    setGenerating(true)
    try {
      const res = await fetch('/api/magnetise/generate-cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: draft.selected_hook,
          build: draft.build_output,
          payoff: draft.payoff,
          ctaType: draft.cta_type,
        }),
      })
      const result = await res.json()
      if (result.error) { alert('Generate failed: ' + result.error); setGenerating(false); return }
      updateDraft('cta_line', result.text || '')
    } catch (e) { console.error(e); alert('Generate failed: ' + e.message) }
    setGenerating(false)
  }

  const copyScript = () => {
    const parts = [
      draft.selected_hook,
      draft.build_output,
      draft.payoff,
      draft.cta_line,
    ].filter(Boolean)
    navigator.clipboard.writeText(parts.join('\n\n'))
    flash('Copied!')
  }

  const completeDraft = async () => {
    setSaving(true)
    await saveDraft(draft, draftId, 'complete')
    setSaving(false)
    flash('Complete!')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase
        .from('magnetise_drafts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
      if (data) setSavedDrafts(data)
    }
  }

  const startNewDraft = () => {
    setDraftId(null)
    setDraft(defaultDraft())
    setCustomHook('')
    setUseCustomHook(false)
    setStep(1)
    setShowDrafts(false)
  }

  const refreshDrafts = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('magnetise_drafts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
    if (data) setSavedDrafts(data)
  }

  // ── Step completion checks ────────────────────────────────────────────────

  const stepDone = (n) => {
    if (n === 1) return draft.capture.length > 10
    if (n === 2) return draft.contrarian.length > 10
    if (n === 3) return draft.selected_hook.length > 5
    if (n === 4) return draft.build_format !== ''
    if (n === 5) return draft.build_output.length > 20
    if (n === 6) return draft.payoff.length > 10 && draft.cta_line.length > 5
    return false
  }

  // ── Guard states ──────────────────────────────────────────────────────────

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
        <button onClick={() => router.push('/login')} className="px-4 py-2 bg-gold text-zinc-950 rounded text-xs font-bold">Back to Login</button>
      </div>
    </div>
  )

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const sidebarNav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 pb-4 border-b border-zinc-800">
        <img src="/logo.png" alt="The Syndicate" className="h-12 w-auto" />
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <button onClick={() => router.push('/client')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="tracking-wide">Back to App</span>
        </button>
      </div>

      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-white text-sm font-semibold truncate">{clientData.name}</p>
        <p className="text-zinc-600 text-xs truncate mt-0.5">{clientData.business}</p>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 pb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Steps</p>
        {STEPS.map(s => (
          <button
            key={s.num}
            onClick={() => goToStep(s.num)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition ${
              step === s.num
                ? 'text-gold bg-gold/[0.08] border-r-2 border-gold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${
              stepDone(s.num)
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : step === s.num
                ? 'border-gold text-gold'
                : 'border-zinc-700 text-zinc-600'
            }`}>
              {stepDone(s.num) ? '✓' : s.num}
            </span>
            {s.label}
          </button>
        ))}

        <div className="mt-6 px-5 pt-4 border-t border-zinc-800 space-y-3">
          <button
            onClick={() => { refreshDrafts(); setShowDrafts(true) }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1.5 w-full text-left"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Saved Drafts ({savedDrafts.length})
          </button>
          <button
            onClick={startNewDraft}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1.5 w-full text-left"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Draft
          </button>
        </div>
      </div>
    </nav>
  )

  // ── Step renders ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <SectionHeading step={1} label="Capture" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <Label>What happened this week?</Label>
        <TA
          value={draft.capture}
          onChange={e => updateDraft('capture', e.target.value)}
          placeholder="A client moment, a conversation, a result, something you noticed, a mistake you made..."
          rows={5}
        />
        <Hint>Think raw. Don't filter. What's the most interesting thing that came up — a win, a pattern, a frustration, a realisation?</Hint>
      </div>
      <NavButtons
        onNext={nextStep}
        nextDisabled={!stepDone(1)}
      />
    </div>
  )

  const renderStep2 = () => (
    <div>
      <SectionHeading step={2} label="Positioning" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <Label>What's the common advice in your niche around this?</Label>
        <TA
          value={draft.common_advice}
          onChange={e => updateDraft('common_advice', e.target.value)}
          placeholder="What does everyone say you should do? What's the default advice?"
          rows={3}
        />
        <Hint>This is the conventional wisdom — what most people in your space say or believe.</Hint>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <Label>Your contrarian take — what do you believe instead?</Label>
        <TA
          value={draft.contrarian}
          onChange={e => updateDraft('contrarian', e.target.value)}
          placeholder="What's your angle? Where do you push back? What do you know that others don't say?"
          rows={4}
        />
        <Hint>This is the thing that makes your content worth watching. The harder it is to disagree with, the better.</Hint>
      </div>
      <NavButtons
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={!stepDone(2)}
      />
    </div>
  )

  const renderStep3 = () => (
    <div>
      <SectionHeading step={3} label="Hook" />
      <p className="text-zinc-500 text-sm mb-5">Hooks ranked for your content. Pick one or write your own.</p>

      <div className="space-y-3 mb-6">
        {scoredHooks.map((h, i) => (
          <button
            key={h.key}
            onClick={() => { updateDraft('selected_hook', h.text); setUseCustomHook(false) }}
            className={`w-full text-left p-4 rounded-xl border transition ${
              draft.selected_hook === h.text && !useCustomHook
                ? 'border-gold bg-gold/[0.06]'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-white leading-relaxed">{h.text}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">#{i + 1}</span>
                {draft.selected_hook === h.text && !useCustomHook && (
                  <span className="text-gold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setUseCustomHook(!useCustomHook)}
            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
              useCustomHook ? 'border-gold bg-gold' : 'border-zinc-600'
            }`}
          >
            {useCustomHook && <svg className="w-2.5 h-2.5 text-zinc-950" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </button>
          <Label>Write my own hook</Label>
        </div>
        {useCustomHook && (
          <TA
            value={customHook}
            onChange={e => { setCustomHook(e.target.value); updateDraft('selected_hook', e.target.value) }}
            placeholder="Write your own opening line..."
            rows={2}
          />
        )}
      </div>

      <NavButtons
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={!stepDone(3)}
      />
    </div>
  )

  const renderStep4 = () => (
    <div>
      <SectionHeading step={4} label="Build Format" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        {['story', 'list', 'steps'].map(fmt => (
          <button
            key={fmt}
            onClick={() => updateDraft('build_format', fmt)}
            className={`py-4 rounded-xl border font-semibold text-sm capitalize transition ${
              draft.build_format === fmt
                ? 'border-gold bg-gold/[0.08] text-gold'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {fmt === 'story' && '📖 '}
            {fmt === 'list' && '📋 '}
            {fmt === 'steps' && '🔢 '}
            {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
          </button>
        ))}
      </div>

      {draft.build_format === 'story' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What's the specific moment or situation you want to tell?</Label>
            <TA
              value={draft.build_inputs.moment || ''}
              onChange={e => updateInput('moment', e.target.value)}
              placeholder="A client conversation, something you witnessed, a mistake you made, a result you got..."
              rows={3}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What did you notice or realise in that moment?</Label>
            <TA
              value={draft.build_inputs.realise || ''}
              onChange={e => updateInput('realise', e.target.value)}
              placeholder="The turning point — what shifted in your thinking or theirs..."
              rows={3}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What did that moment connect back to in your experience?</Label>
            <TA
              value={draft.build_inputs.connect || ''}
              onChange={e => updateInput('connect', e.target.value)}
              placeholder="Link it to your journey, your belief, or something you've been through yourself..."
              rows={3}
            />
          </div>
        </div>
      )}

      {draft.build_format === 'list' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What are the 3–5 things you want them to know or see differently?</Label>
            <TA
              value={draft.build_inputs.points || ''}
              onChange={e => updateInput('points', e.target.value)}
              placeholder="Each point should be a standalone insight — not a list of tips, more like punches..."
              rows={4}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What's the one belief that connects all these points?</Label>
            <TA
              value={draft.build_inputs.thread || ''}
              onChange={e => updateInput('thread', e.target.value)}
              placeholder="The thread that ties them together — your worldview..."
              rows={2}
            />
          </div>
        </div>
      )}

      {draft.build_format === 'steps' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What is the outcome someone gets at the end of these steps?</Label>
            <TA
              value={draft.build_inputs.outcome || ''}
              onChange={e => updateInput('outcome', e.target.value)}
              placeholder="Be specific — what can they do, make, or change after following this?"
              rows={2}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <Label>What are the 3–5 steps to get there?</Label>
            <TA
              value={draft.build_inputs.steps || ''}
              onChange={e => updateInput('steps', e.target.value)}
              placeholder="Keep each step to one action. Specific beats vague every time..."
              rows={4}
            />
          </div>
        </div>
      )}

      <NavButtons
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={!stepDone(4)}
      />
    </div>
  )

  const renderStep5 = () => (
    <div>
      <SectionHeading step={5} label="Build Output" />
      <p className="text-zinc-500 text-sm mb-5">Generate your build section from your answers, then edit until it's yours.</p>

      {!draft.build_output && (
        <button
          onClick={generateBuild}
          disabled={generating}
          className="w-full py-4 bg-gold text-zinc-950 font-bold text-sm rounded-xl hover:bg-gold-light active:bg-gold-dark transition disabled:opacity-50 flex items-center justify-center gap-2 mb-5"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Build
            </>
          )}
        </button>
      )}

      {draft.build_output && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <Label>Build Section</Label>
            <button
              onClick={generateBuild}
              disabled={generating}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
            >
              {generating ? 'Regenerating...' : '↻ Regenerate'}
            </button>
          </div>
          <TA
            value={draft.build_output}
            onChange={e => updateDraft('build_output', e.target.value)}
            rows={8}
          />
        </div>
      )}

      <NavButtons
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={!stepDone(5)}
        generating={generating}
      />
    </div>
  )

  const renderStep6 = () => (
    <div>
      <SectionHeading step={6} label="Payoff + CTA" />

      {/* Payoff */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <Label>Payoff</Label>
          <button
            onClick={generatePayoff}
            disabled={generating}
            className="text-xs text-gold hover:text-gold-light transition disabled:opacity-50"
          >
            {generating ? 'Generating...' : draft.payoff ? '↻ Regenerate' : '✦ Generate'}
          </button>
        </div>
        {!draft.payoff && !generating && (
          <p className="text-zinc-600 text-xs mb-3 italic">The landing — the insight or shift the viewer walks away with.</p>
        )}
        {(draft.payoff || generating) && (
          <TA
            value={draft.payoff}
            onChange={e => updateDraft('payoff', e.target.value)}
            placeholder="Generating..."
            rows={3}
          />
        )}
        {!draft.payoff && !generating && (
          <button
            onClick={generatePayoff}
            className="w-full py-3 bg-gold/10 border border-gold/20 text-gold font-semibold text-sm rounded-lg hover:bg-gold/[0.15] active:bg-gold/20 transition"
          >
            Generate Payoff
          </button>
        )}
      </div>

      {/* CTA Type */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <Label>CTA Type</Label>
        <div className="flex flex-wrap gap-2 mb-4">
          {CTA_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => updateDraft('cta_type', opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                draft.cta_type === opt
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            onClick={() => updateDraft('cta_type', 'custom')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              draft.cta_type === 'custom'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            + Custom
          </button>
        </div>
        {draft.cta_type === 'custom' && (
          <input
            type="text"
            value={draft.cta_line}
            onChange={e => updateDraft('cta_line', e.target.value)}
            placeholder="Type your CTA..."
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm mb-3"
          />
        )}
      </div>

      {/* CTA Line */}
      {draft.cta_type && draft.cta_type !== 'custom' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <Label>CTA Line</Label>
            <button
              onClick={generateCTA}
              disabled={generating}
              className="text-xs text-gold hover:text-gold-light transition disabled:opacity-50"
            >
              {generating ? 'Generating...' : draft.cta_line ? '↻ Regenerate' : '✦ Generate'}
            </button>
          </div>
          {!draft.cta_line && !generating && (
            <button
              onClick={generateCTA}
              className="w-full py-3 bg-gold/10 border border-gold/20 text-gold font-semibold text-sm rounded-lg hover:bg-gold/[0.15] active:bg-gold/20 transition"
            >
              Generate CTA Line
            </button>
          )}
          {(draft.cta_line || generating) && (
            <TA
              value={draft.cta_line}
              onChange={e => updateDraft('cta_line', e.target.value)}
              placeholder="Generating..."
              rows={2}
            />
          )}
        </div>
      )}

      <NavButtons
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={!stepDone(6)}
        generating={generating}
      />
    </div>
  )

  const renderStep7 = () => (
    <div>
      <SectionHeading step={7} label="Final Script" />
      <p className="text-zinc-500 text-sm mb-5">Your complete piece. Review, copy, and post.</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 space-y-5">
        {draft.selected_hook && (
          <div>
            <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Hook</span>
            <p className="text-white text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{draft.selected_hook}</p>
          </div>
        )}
        {draft.build_output && (
          <div className="pt-4 border-t border-zinc-800">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Build</span>
            <p className="text-white text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{draft.build_output}</p>
          </div>
        )}
        {draft.payoff && (
          <div className="pt-4 border-t border-zinc-800">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Payoff</span>
            <p className="text-white text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{draft.payoff}</p>
          </div>
        )}
        {draft.cta_line && (
          <div className="pt-4 border-t border-zinc-800">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">CTA</span>
            <p className="text-white text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{draft.cta_line}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={prevStep} className="px-5 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 active:bg-zinc-600 transition">
          &larr; Edit
        </button>
        <button onClick={copyScript} className="flex-1 py-2.5 bg-gold text-zinc-950 font-bold text-sm rounded-lg hover:bg-gold-light active:bg-gold-dark transition flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Full Script
        </button>
        <button onClick={completeDraft} disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition disabled:opacity-50">
          {saving ? 'Saving...' : '✓ Mark Complete'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
        <button onClick={startNewDraft} className="text-sm text-zinc-500 hover:text-zinc-300 transition">
          + Start a new piece
        </button>
      </div>
    </div>
  )

  // ── Saved Drafts Modal ────────────────────────────────────────────────────

  const draftsModal = showDrafts && (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/70" onClick={() => setShowDrafts(false)} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Saved Drafts</h2>
          <button onClick={() => setShowDrafts(false)} className="text-zinc-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          {savedDrafts.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-6">No drafts yet.</p>
          )}
          {savedDrafts.map(d => (
            <button
              key={d.id}
              onClick={() => { loadDraftIntoState(d); setStep(d.status === 'complete' ? 7 : 1); setShowDrafts(false) }}
              className={`w-full text-left p-4 rounded-xl border transition ${
                draftId === d.id ? 'border-gold bg-gold/[0.06]' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                  {d.selected_hook || d.capture?.slice(0, 80) || 'Untitled draft'}
                </p>
                <span className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${
                  d.status === 'complete' ? 'text-emerald-400' : 'text-zinc-500'
                }`}>
                  {d.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-1.5">
                {new Date(d.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </button>
          ))}
        </div>
        <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-4">
          <button onClick={startNewDraft} className="w-full py-2.5 bg-gold text-zinc-950 font-bold text-sm rounded-lg hover:bg-gold-light transition">
            + New Draft
          </button>
        </div>
      </div>
    </div>
  )

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Toast */}
      <div
        ref={toastEl}
        style={{ opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.3s, transform 0.3s' }}
        className="fixed bottom-6 right-6 z-50 pointer-events-none"
      >
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-xl">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span data-msg className="text-sm text-zinc-300">Saved</span>
        </div>
      </div>

      {draftsModal}

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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto" />
        <div className="w-6" />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden">
        <div className="max-w-2xl mx-auto p-4 md:px-8 md:py-7 mt-14 md:mt-0">
          {saving && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs text-zinc-500">Saving...</span>
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
          {step === 7 && renderStep7()}
        </div>
      </div>
    </div>
  )
}
