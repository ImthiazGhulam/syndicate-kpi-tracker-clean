'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Default Data ────────────────────────────────────────────────────────────

const defaultData = () => ({
  // Stage 1: Three core problems + promise
  problem_1: '',
  problem_2: '',
  problem_3: '',
  promise: '',
  // Stage 5: Engine name
  engine_name: '',
  engine_name_suggestions: [],
  // Stage 2: Branded pillar names (chosen by client)
  pillar_1: '',
  pillar_2: '',
  pillar_3: '',
  // AI-suggested pillar names (3 per problem)
  pillar_suggestions_1: [],
  pillar_suggestions_2: [],
  pillar_suggestions_3: [],
  // Stage 3: Solutions (3 per pillar = 9 total)
  solution_1_1: '', solution_1_2: '', solution_1_3: '',
  solution_2_1: '', solution_2_2: '', solution_2_3: '',
  solution_3_1: '', solution_3_2: '', solution_3_3: '',
  // Stage 4: Unique mechanism names (chosen by client)
  mechanism_1_1: '', mechanism_1_2: '', mechanism_1_3: '',
  mechanism_2_1: '', mechanism_2_2: '', mechanism_2_3: '',
  mechanism_3_1: '', mechanism_3_2: '', mechanism_3_3: '',
  // AI-suggested mechanism names
  mechanism_suggestions_1_1: [], mechanism_suggestions_1_2: [], mechanism_suggestions_1_3: [],
  mechanism_suggestions_2_1: [], mechanism_suggestions_2_2: [], mechanism_suggestions_2_3: [],
  mechanism_suggestions_3_1: [], mechanism_suggestions_3_2: [], mechanism_suggestions_3_3: [],
})

const STAGES = [
  { num: 1, label: 'Core Problems', icon: '1' },
  { num: 2, label: 'Brand Your Pillars', icon: '2' },
  { num: 3, label: 'Solutions', icon: '3' },
  { num: 4, label: 'Unique Mechanisms', icon: '4' },
  { num: 5, label: 'Your Engine', icon: '5' },
]

// ── Sub-components (outside main for mobile perf) ───────────────────────────

function TextInput({ value, onChange, onBlur, placeholder }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
    />
  )
}

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

function GoldLabel({ children }) {
  return <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">{children}</label>
}

function Label({ children }) {
  return <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{children}</label>
}

function SuggestionPills({ suggestions, onSelect, current }) {
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
            current === s
              ? 'bg-gold/20 text-gold border-gold/40'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-gold/30 hover:text-white'
          }`}>
          {s}
        </button>
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DistinctionEnginePage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [record, setRecord] = useState(null)
  const [brandData, setBrandData] = useState(null)
  const [currentStage, setCurrentStage] = useState(1)
  const [data, setData] = useState(defaultData())
  const [generatedOutput, setGeneratedOutput] = useState('')
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

      // Fetch Premium Position for brand voice context
      const { data: ppData } = await supabase.from('premium_position').select('brand_star, hero, bucket').eq('client_id', client.id).maybeSingle()
      if (ppData) setBrandData(ppData)

      const { data: existing } = await supabase.from('distinction_engine').select('*').eq('client_id', client.id).maybeSingle()
      if (existing) {
        setRecord(existing)
        setCurrentStage(existing.current_stage || 1)
        setData({ ...defaultData(), ...(existing.engine_data || {}) })
        setGeneratedOutput(existing.generated_output || '')
      } else {
        const { data: newRec } = await supabase
          .from('distinction_engine')
          .insert({ client_id: client.id, current_stage: 1, engine_data: defaultData(), generated_output: '' })
          .select().single()
        if (newRec) setRecord(newRec)
      }
      setLoading(false)
    }
    init()
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!record) return
    const { error } = await supabase.from('distinction_engine').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    if (error) { console.error('distinction_engine save error:', error); return }
    flash()
  }, [record, flash])

  const saveAll = useCallback(() => {
    if (!record) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveToSupabase({
        engine_data: data,
        current_stage: currentStage,
        generated_output: generatedOutput,
      })
    }, 500)
  }, [record, saveToSupabase, data, currentStage, generatedOutput])

  useEffect(() => { if (!record) return; saveToSupabase({ current_stage: currentStage }) }, [currentStage])

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateField = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  // ── AI Suggestion Generation ──────────────────────────────────────────────

  const [suggestingPillars, setSuggestingPillars] = useState(false)
  const [suggestingMechanisms, setSuggestingMechanisms] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [suggestingName, setSuggestingName] = useState(false)

  const generatePillarSuggestions = async () => {
    if (!data.problem_1.trim() || !data.problem_2.trim() || !data.problem_3.trim()) {
      alert('Fill in all three core problems first.')
      return
    }
    setSuggestingPillars(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'distinction-pillars',
          data: {
            problem_1: data.problem_1,
            problem_2: data.problem_2,
            problem_3: data.problem_3,
            niche: clientData.business || '',
            brand: brandData || null,
          },
        }),
      })
      const result = await res.json()
      if (result.suggestions) {
        setData(prev => ({
          ...prev,
          pillar_suggestions_1: result.suggestions.pillar_1 || [],
          pillar_suggestions_2: result.suggestions.pillar_2 || [],
          pillar_suggestions_3: result.suggestions.pillar_3 || [],
        }))
        saveAll()
      }
    } catch (e) { alert('Failed: ' + e.message) }
    setSuggestingPillars(false)
  }

  const generateMechanismSuggestions = async () => {
    const allSolutions = []
    for (let p = 1; p <= 3; p++) {
      for (let s = 1; s <= 3; s++) {
        const sol = data[`solution_${p}_${s}`]
        if (!sol || !sol.trim()) {
          alert('Fill in all nine solutions first.')
          return
        }
        allSolutions.push({ pillar: p, slot: s, solution: sol, pillarName: data[`pillar_${p}`] || data[`problem_${p}`] })
      }
    }
    setSuggestingMechanisms(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'distinction-mechanisms',
          data: {
            solutions: allSolutions,
            niche: clientData.business || '',
            brand: brandData || null,
          },
        }),
      })
      const result = await res.json()
      if (result.suggestions) {
        const updates = {}
        Object.entries(result.suggestions).forEach(([key, names]) => {
          updates[`mechanism_suggestions_${key}`] = names
        })
        setData(prev => ({ ...prev, ...updates }))
        saveAll()
      }
    } catch (e) { alert('Failed: ' + e.message) }
    setSuggestingMechanisms(false)
  }

  const generateEngineName = async () => {
    if (!data.promise?.trim()) { alert('Fill in your promise on Stage 1 first.'); return }
    if (!data.pillar_1?.trim() || !data.pillar_2?.trim() || !data.pillar_3?.trim()) { alert('Name all three pillars first.'); return }
    setSuggestingName(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'distinction-name',
          data: {
            promise: data.promise,
            pillar_1: data.pillar_1,
            pillar_2: data.pillar_2,
            pillar_3: data.pillar_3,
            niche: clientData.business || '',
            brand: brandData || null,
          },
        }),
      })
      const result = await res.json()
      if (result.suggestions) {
        setData(prev => ({ ...prev, engine_name_suggestions: result.suggestions }))
        saveAll()
      }
    } catch (e) { alert('Failed: ' + e.message) }
    setSuggestingName(false)
  }

  const generateFinalOutput = async () => {
    if (!data.engine_name?.trim()) { alert('Name your Distinction Engine first.'); return }
    for (let p = 1; p <= 3; p++) {
      if (!data[`pillar_${p}`]?.trim()) { alert(`Name pillar ${p} first.`); return }
      for (let s = 1; s <= 3; s++) {
        if (!data[`mechanism_${p}_${s}`]?.trim()) { alert(`Name all unique mechanisms first.`); return }
      }
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'distinction-engine', data: { ...data, brand: brandData || null } }),
      })
      const result = await res.json()
      if (result.error) { alert('Failed: ' + result.error); setGenerating(false); return }
      setGeneratedOutput(result.plan)
      await supabase.from('distinction_engine').update({
        generated_output: result.plan,
        updated_at: new Date().toISOString(),
      }).eq('id', record.id)
    } catch (e) { alert('Failed: ' + e.message) }
    setGenerating(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const goToStage = (num) => {
    saveAll()
    setCurrentStage(num)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stageComplete = (num) => {
    if (num === 1) return !!(data.problem_1?.trim() && data.problem_2?.trim() && data.problem_3?.trim())
    if (num === 2) return !!(data.pillar_1?.trim() && data.pillar_2?.trim() && data.pillar_3?.trim())
    if (num === 3) {
      for (let p = 1; p <= 3; p++) for (let s = 1; s <= 3; s++) if (!data[`solution_${p}_${s}`]?.trim()) return false
      return true
    }
    if (num === 4) {
      for (let p = 1; p <= 3; p++) for (let s = 1; s <= 3; s++) if (!data[`mechanism_${p}_${s}`]?.trim()) return false
      return true
    }
    if (num === 5) return !!generatedOutput
    return false
  }

  // ── Render Stages ─────────────────────────────────────────────────────────

  const renderStage1 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Stage 1: Core Problems</h1>
        <p className="text-zinc-500 text-sm">What are the three biggest pain points or problems you solve for your clients?</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">Think about the broad areas where your work creates the most transformation. These are usually things like visibility, confidence, sales, messaging, mindset, systems, delivery, productivity, leadership, health, relationships, or client results.</p>
      </div>

      {[1, 2, 3].map(n => (
        <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <GoldLabel>Problem {n}</GoldLabel>
          <TextArea
            value={data[`problem_${n}`]}
            onChange={v => updateField(`problem_${n}`, v)}
            onBlur={saveAll}
            placeholder={n === 1 ? 'e.g. Lead generation — they struggle to get enough qualified leads' : n === 2 ? 'e.g. Sales — they can\'t close at premium prices' : 'e.g. Delivery — they over-deliver and burn out'}
            rows={2}
          />
        </div>
      ))}

      <div className="bg-zinc-900 border border-gold/20 rounded-xl p-5 mb-5">
        <GoldLabel>The Promise</GoldLabel>
        <p className="text-sm text-zinc-400 mb-3 leading-relaxed">What is the end result or transformation your clients get when they work with you? This is the destination — the thing your entire system delivers.</p>
        <TextArea
          value={data.promise}
          onChange={v => updateField('promise', v)}
          onBlur={saveAll}
          placeholder="e.g. I take coaches from invisible to fully booked in 90 days without paid ads"
          rows={2}
        />
      </div>

      <div className="flex justify-end mt-8">
        <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          Next: Brand Your Pillars &rarr;
        </button>
      </div>
    </div>
  )

  const renderStage2 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Stage 2: Brand Your Pillars</h1>
        <p className="text-zinc-500 text-sm">Turn each problem into a branded, memorable pillar name. Type your own or use AI suggestions.</p>
      </div>

      <div className="text-center mb-6">
        <button onClick={generatePillarSuggestions} disabled={suggestingPillars}
          className="px-6 py-3 bg-zinc-800 border border-gold/30 text-gold font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
          {suggestingPillars ? 'Generating...' : 'Generate AI Suggestions'}
        </button>
        <p className="text-zinc-600 text-xs mt-2">AI will suggest 3 branded names per problem. You pick or type your own.</p>
      </div>

      {[1, 2, 3].map(n => (
        <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <Label>Problem {n}</Label>
          <p className="text-sm text-zinc-400 mb-3">{data[`problem_${n}`] || '(not set yet — go back to Stage 1)'}</p>
          <GoldLabel>Branded Pillar Name</GoldLabel>
          <TextInput
            value={data[`pillar_${n}`]}
            onChange={v => updateField(`pillar_${n}`, v)}
            onBlur={saveAll}
            placeholder="e.g. Entice, Enrol, Empower..."
          />
          <SuggestionPills
            suggestions={data[`pillar_suggestions_${n}`]}
            current={data[`pillar_${n}`]}
            onSelect={v => { updateField(`pillar_${n}`, v); setTimeout(saveAll, 100) }}
          />
        </div>
      ))}

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(1)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Core Problems
        </button>
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          Next: Solutions &rarr;
        </button>
      </div>
    </div>
  )

  const renderStage3 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Stage 3: Solutions</h1>
        <p className="text-zinc-500 text-sm">For each pillar, what are three things you teach, install, fix, or guide your clients through?</p>
      </div>

      {[1, 2, 3].map(p => (
        <div key={p} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <GoldLabel>Pillar {p}: {data[`pillar_${p}`] || data[`problem_${p}`] || `Problem ${p}`}</GoldLabel>
          {[1, 2, 3].map(s => (
            <div key={s} className="mb-4">
              <Label>Solution {s}</Label>
              <TextInput
                value={data[`solution_${p}_${s}`]}
                onChange={v => updateField(`solution_${p}_${s}`, v)}
                onBlur={saveAll}
                placeholder={`What do you do to solve this? (solution ${s} of 3)`}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(2)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Brand Your Pillars
        </button>
        <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          Next: Unique Mechanisms &rarr;
        </button>
      </div>
    </div>
  )

  const renderStage4 = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Stage 4: Unique Mechanisms</h1>
        <p className="text-zinc-500 text-sm">Give each solution a branded name — a unique mechanism that makes your method feel ownable and premium.</p>
      </div>

      <div className="text-center mb-6">
        <button onClick={generateMechanismSuggestions} disabled={suggestingMechanisms}
          className="px-6 py-3 bg-zinc-800 border border-gold/30 text-gold font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
          {suggestingMechanisms ? 'Generating...' : 'Generate AI Suggestions'}
        </button>
        <p className="text-zinc-600 text-xs mt-2">AI will suggest branded names for each solution. Pick or type your own.</p>
      </div>

      {[1, 2, 3].map(p => (
        <div key={p} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <GoldLabel>Pillar {p}: {data[`pillar_${p}`] || `Problem ${p}`}</GoldLabel>
          {[1, 2, 3].map(s => (
            <div key={s} className="mb-5">
              <Label>Solution: {data[`solution_${p}_${s}`] || '(not set)'}</Label>
              <GoldLabel>Unique Mechanism Name</GoldLabel>
              <TextInput
                value={data[`mechanism_${p}_${s}`]}
                onChange={v => updateField(`mechanism_${p}_${s}`, v)}
                onBlur={saveAll}
                placeholder="e.g. Growth Tax Ads, The Conversion Code..."
              />
              <SuggestionPills
                suggestions={data[`mechanism_suggestions_${p}_${s}`]}
                current={data[`mechanism_${p}_${s}`]}
                onSelect={v => { updateField(`mechanism_${p}_${s}`, v); setTimeout(saveAll, 100) }}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStage(3)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
          &larr; Solutions
        </button>
        <button onClick={() => goToStage(5)} className="px-6 py-2.5 bg-gold text-black font-semibold text-sm rounded-lg hover:bg-gold-light transition">
          Next: Your Engine &rarr;
        </button>
      </div>
    </div>
  )

  const renderStage5 = () => {
    const allComplete = stageComplete(4) && !!data.engine_name?.trim()
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-base font-bold text-white uppercase tracking-widest mb-1">Your Distinction Engine&trade;</h1>
          <p className="text-zinc-500 text-sm">Name your engine, review your framework, and generate your compiled output with a narrative explanation.</p>
        </div>

        {/* Engine Name */}
        <div className="bg-zinc-900 border border-gold/20 rounded-xl p-5 mb-6">
          <GoldLabel>Name Your Engine</GoldLabel>
          <p className="text-sm text-zinc-400 mb-3 leading-relaxed">This is the name of your complete system — your intellectual property. It should feel owned, premium, and memorable.</p>
          <TextInput
            value={data.engine_name}
            onChange={v => updateField('engine_name', v)}
            onBlur={saveAll}
            placeholder='e.g. The Revenue Architecture™, The Impact Blueprint™'
          />
          <SuggestionPills
            suggestions={data.engine_name_suggestions}
            current={data.engine_name}
            onSelect={v => { updateField('engine_name', v); setTimeout(saveAll, 100) }}
          />
          <div className="mt-3">
            <button onClick={generateEngineName} disabled={suggestingName}
              className="px-5 py-2 bg-zinc-800 border border-gold/30 text-gold font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
              {suggestingName ? 'Generating...' : 'Suggest Names'}
            </button>
          </div>
          {data.promise && (
            <p className="text-zinc-600 text-xs mt-3">Based on your promise: &ldquo;{data.promise}&rdquo;</p>
          )}
        </div>

        {/* Visual Summary */}
        <div className="space-y-4 mb-8">
          {[1, 2, 3].map(p => (
            <div key={p} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <GoldLabel>Pillar {p}: {data[`pillar_${p}`] || '—'}</GoldLabel>
                <button onClick={() => goToStage(2)}
                  className="shrink-0 px-3 py-1 text-xs font-semibold text-gold border border-gold/30 rounded hover:bg-gold/10 transition">
                  Edit
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">{data[`problem_${p}`] || '—'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(s => (
                  <div key={s} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                    <p className="text-xs font-bold text-gold mb-1">{data[`mechanism_${p}_${s}`] || '—'}</p>
                    <p className="text-xs text-zinc-500">{data[`solution_${p}_${s}`] || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Generate */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          {allComplete ? (
            <>
              <div className="text-center mb-6">
                <button onClick={generateFinalOutput} disabled={generating}
                  className={`px-8 py-4 ${generatedOutput ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30' : 'bg-gold hover:bg-gold-light text-zinc-950'} disabled:opacity-50 font-bold text-xs uppercase tracking-widest rounded-lg transition`}>
                  {generating ? 'Building your engine...' : generatedOutput ? 'Regenerate Distinction Engine' : 'Generate Distinction Engine'}
                </button>
                {generatedOutput && <p className="text-zinc-600 text-xs mt-2">Updated your pillars or mechanisms? Hit regenerate to refresh.</p>}
              </div>
              {generatedOutput && (
                <div className="bg-zinc-900 border border-gold/30 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Your Distinction Engine&trade;</h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{generatedOutput}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-zinc-400 text-sm font-medium mb-3">Complete all stages to generate your Distinction Engine</p>
              <div className="space-y-2 max-w-sm mx-auto">
                {STAGES.slice(0, 4).map(s => (
                  <button key={s.num} onClick={() => goToStage(s.num)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition ${
                      stageComplete(s.num)
                        ? 'bg-zinc-900 border-emerald-900/40 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-gold/30'
                    }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                      stageComplete(s.num) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'border-zinc-700 text-zinc-600'
                    }`}>
                      {stageComplete(s.num) ? '\u2713' : s.icon}
                    </span>
                    <span className="text-sm">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="flex justify-start mt-8">
          <button onClick={() => goToStage(4)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-lg hover:bg-zinc-700 transition">
            &larr; Unique Mechanisms
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

  // ── Sidebar ───────────────────────────────────────────────────────────────

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
        {STAGES.map(stage => (
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
          <p className="text-xs text-zinc-600 mb-1">Progress</p>
          <p className="text-sm font-bold text-white">{STAGES.filter((_, i) => stageComplete(i + 1)).length}<span className="text-zinc-600"> / 5 stages</span></p>
        </div>
      </div>
    </nav>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-zinc-950 border-r border-zinc-800">
        {sidebarNav}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 h-full bg-zinc-950 border-r border-zinc-800">
            {sidebarNav}
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden">
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
