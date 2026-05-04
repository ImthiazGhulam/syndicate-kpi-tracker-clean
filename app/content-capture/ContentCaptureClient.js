'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Hook Templates ─────────────────────────────────────────────────────────────

const HOOK_TEMPLATES = [
  { template: "This is why your {blank} isn't giving you results", example: "This is why your current business model isn't giving you results" },
  { template: "Only a few people realize {blank}", example: "Only a few people realize the power of LinkedIn for B2B leads" },
  { template: "The real reason everyone is {blank}", example: "The real reason everyone is pivoting to online courses" },
  { template: "Stop wasting time on {blank}", example: "Stop wasting time on ineffective networking events" },
  { template: "{number} proven methods to {achieve a goal}", example: "5 proven methods to double your client base" },
  { template: "How I transformed {blank} in {time frame}", example: "How I transformed my website traffic in just 30 days" },
  { template: "The biggest lie in {industry/topic}", example: "The biggest lie in personal branding" },
  { template: "What no one tells you about {blank}", example: "What no one tells you about scaling your business" },
  { template: "Why I stopped {doing something}", example: "Why I stopped attending purely motivational seminars" },
  { template: "The best {blank} I've ever used", example: "The best productivity tool I've ever used" },
  { template: "{Blank}: Expectations vs. Reality", example: "Working from home: Expectations vs. Reality" },
  { template: "How {blank} can be your biggest game-changer", example: "How strategic partnerships can be your biggest game-changer" },
  { template: "The ultimate cheat sheet on {blank}", example: "The ultimate cheat sheet on business tax deductions" },
  { template: "Why {blank} is more important than you think", example: "Why customer feedback is more important than you think" },
  { template: "{Number} habits of highly effective {type of people}", example: "7 habits of highly effective entrepreneurs" },
  { template: "How to make {blank} work for you", example: "How to make social media algorithms work for you" },
  { template: "The secret to {achieving a specific result}", example: "The secret to getting repeat clients" },
  { template: "What I wish I had known about {blank}", example: "What I wish I had known about ecommerce" },
  { template: "The single most effective strategy for {blank}", example: "The single most effective strategy for client retention" },
  { template: "If you're still {doing something}, here's why you should stop", example: "If you're still using cold calling, here's why you should stop" },
  { template: "I used to think {blank}, but I was wrong", example: "I used to think price wars were unavoidable, but I was wrong" },
  { template: "How to overcome {a common problem}", example: "How to overcome fear of public speaking" },
  { template: "{Number} things every {type of person} should know", example: "3 things every new coach should know" },
  { template: "This {blank} strategy is a game changer", example: "This inbound marketing strategy is a game changer" },
  { template: "Before you {do something}, read this", example: "Before you hire a VA, read this" },
  { template: "What {profession} can learn from {another profession}", example: "What business coaches can learn from therapists" },
  { template: "How to guarantee {desired result}", example: "How to guarantee your emails get read" },
  { template: "The truth about {common belief}", example: "The truth about passive income" },
  { template: "{Blank} debunked: what really works", example: '"More clients, more income" debunked: what really works' },
  { template: "If you only {do one thing}, make sure it's {blank}", example: "If you only improve one skill, make sure it's storytelling" },
  { template: "What everyone gets wrong about {blank}", example: "What everyone gets wrong about networking" },
  { template: "How avoiding {blank} can help you {achieve something}", example: "How avoiding multitasking can help you increase productivity" },
  { template: "{Blank} explained in {number} simple steps", example: "Business automation explained in 5 simple steps" },
  { template: "Why {blank} is the best decision I ever made", example: "Why hiring a business coach is the best decision I ever made" },
]

const OUTPUT_FORMATS = [
  { id: 'yap', label: 'YAP (Short-Form)', icon: '🎬', desc: '60 seconds or less' },
  { id: 'carousel', label: 'Carousel', icon: '📱', desc: '7-10 slides' },
  { id: 'email', label: 'Email', icon: '✉️', desc: 'Newsletter/nurture' },
  { id: 'youtube', label: 'YouTube', icon: '🎥', desc: 'Intro-focused script' },
  { id: 'talking-head', label: 'Talking Head', icon: '🎙️', desc: 'Pro-shot bite-sized' },
  { id: 'photo-caption', label: 'Photo + Caption', icon: '📸', desc: 'Caption only' },
]

const CTA_OPTIONS = [
  { id: 'youtube', label: 'YouTube Channel' },
  { id: 'email-list', label: 'Email List' },
  { id: 'lead-magnet', label: 'Lead Magnet' },
  { id: 'custom', label: 'Custom' },
]

const STAGES = [
  { num: 1, label: 'Capture', icon: '📥' },
  { num: 2, label: 'Hook', icon: '🪝' },
  { num: 3, label: 'Format', icon: '🎯' },
  { num: 4, label: 'Generate', icon: '⚡' },
  { num: 5, label: 'Edit & Export', icon: '✏️' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function GoldLabel({ children }) {
  return <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">{children}</label>
}

function Label({ children }) {
  return <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{children}</label>
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ContentCaptureClient() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentStage, setCurrentStage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Capture data
  const [debriefData, setDebriefData] = useState([])
  const [hasDebriefs, setHasDebriefs] = useState(true)
  const [manualCapture, setManualCapture] = useState({
    client_wins: '',
    calendar_events: '',
    learnings: '',
    photos: '',
    wins: '',
    losses: '',
  })
  const [selectedCaptures, setSelectedCaptures] = useState([])

  // Hook
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [hookText, setHookText] = useState('')
  const [hookSearch, setHookSearch] = useState('')

  // Format
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [selectedCta, setSelectedCta] = useState('youtube')
  const [customCta, setCustomCta] = useState('')

  // Generated content
  const [generatedContent, setGeneratedContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [record, setRecord] = useState(null)

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

  // ── Init ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)

      // Fetch last 7 days of debriefs
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: debriefs } = await supabase
        .from('evening_pulse')
        .select('*')
        .eq('client_id', client.id)
        .gte('date', dateStr)
        .order('date', { ascending: false })

      if (debriefs && debriefs.length > 0) {
        setDebriefData(debriefs)
        setHasDebriefs(true)
      } else {
        setHasDebriefs(false)
      }

      // Check for existing content capture record
      const { data: existing } = await supabase
        .from('content_captures')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setRecord(existing)
        if (existing.captures) setSelectedCaptures(existing.captures)
        if (existing.hook_template) setSelectedTemplate(existing.hook_template)
        if (existing.hook_text) setHookText(existing.hook_text)
        if (existing.output_format) setSelectedFormat(existing.output_format)
        if (existing.cta_type) setSelectedCta(existing.cta_type)
        if (existing.custom_cta) setCustomCta(existing.custom_cta)
        if (existing.generated_content) setGeneratedContent(existing.generated_content)
        if (existing.current_stage) setCurrentStage(existing.current_stage)
        if (existing.manual_capture) setManualCapture(existing.manual_capture)
      }

      setLoading(false)
    }
    init()
  }, [])

  // ── Save ───────────────────────────────────────────────────────────────────────

  const saveToSupabase = useCallback(async (fields) => {
    if (!clientData) return
    const payload = {
      client_id: clientData.id,
      captures: selectedCaptures,
      hook_template: selectedTemplate,
      hook_text: hookText,
      output_format: selectedFormat,
      cta_type: selectedCta,
      custom_cta: customCta,
      generated_content: generatedContent,
      current_stage: currentStage,
      manual_capture: manualCapture,
      updated_at: new Date().toISOString(),
      ...fields,
    }

    if (record) {
      await supabase.from('content_captures').update(payload).eq('id', record.id)
    } else {
      const { data: newRec } = await supabase.from('content_captures').insert(payload).select().single()
      if (newRec) setRecord(newRec)
    }
    flash()
  }, [clientData, record, selectedCaptures, selectedTemplate, hookText, selectedFormat, selectedCta, customCta, generatedContent, currentStage, manualCapture])

  const debouncedSave = useCallback((fields = {}) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveToSupabase(fields), 500)
  }, [saveToSupabase])

  // ── Generate Content ────────────────────────────────────────────────────────────

  const generateContent = async () => {
    setGenerating(true)
    try {
      const captureText = selectedCaptures.length > 0
        ? selectedCaptures.map(c => `- ${c}`).join('\n')
        : Object.entries(manualCapture).filter(([,v]) => v).map(([k,v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('\n')

      const ctaText = selectedCta === 'custom' ? customCta : CTA_OPTIONS.find(c => c.id === selectedCta)?.label || ''

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content-capture',
          data: {
            hook: hookText,
            captures: captureText,
            format: selectedFormat,
            cta: ctaText,
          },
        }),
      })
      const result = await res.json()
      if (result.plan) {
        setGeneratedContent(result.plan)
        setCurrentStage(5)
        await saveToSupabase({ generated_content: result.plan, current_stage: 5 })
      }
    } catch (err) {
      console.error('Generation error:', err)
    }
    setGenerating(false)
  }

  // ── Start New ──────────────────────────────────────────────────────────────────

  const startNew = async () => {
    setRecord(null)
    setSelectedCaptures([])
    setSelectedTemplate(null)
    setHookText('')
    setSelectedFormat(null)
    setSelectedCta('youtube')
    setCustomCta('')
    setGeneratedContent('')
    setManualCapture({ client_wins: '', calendar_events: '', learnings: '', photos: '', wins: '', losses: '' })
    setCurrentStage(1)
  }

  // ── Extract captures from debriefs ─────────────────────────────────────────────

  const extractCaptures = () => {
    const captures = []
    debriefData.forEach(d => {
      if (d.went_well) captures.push(d.went_well)
      if (d.learned) captures.push(d.learned)
      if (d.proud_of) captures.push(d.proud_of)
      for (let i = 1; i <= 5; i++) {
        if (d[`win_${i}_title`]) captures.push(`Win: ${d[`win_${i}_title`]}${d[`win_${i}_action`] ? ' — ' + d[`win_${i}_action`] : ''}`)
      }
      if (d.do_differently) captures.push(d.do_differently)
    })
    return captures
  }

  const toggleCapture = (capture) => {
    setSelectedCaptures(prev =>
      prev.includes(capture) ? prev.filter(c => c !== capture) : [...prev, capture]
    )
  }

  // ── Render Stages ──────────────────────────────────────────────────────────────

  const renderStage1 = () => {
    if (hasDebriefs && debriefData.length > 0) {
      const captures = extractCaptures()
      return (
        <div className="space-y-6">
          <div>
            <GoldLabel>Your last 7 days</GoldLabel>
            <p className="text-zinc-400 text-sm mb-4">Select the stories, wins, and insights you want to turn into content:</p>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {captures.map((capture, i) => (
              <button
                key={i}
                onClick={() => toggleCapture(capture)}
                className={`w-full text-left px-4 py-3 rounded border transition text-sm ${
                  selectedCaptures.includes(capture)
                    ? 'bg-gold/10 border-gold/40 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {capture}
              </button>
            ))}
          </div>
          {captures.length === 0 && (
            <p className="text-zinc-500 text-sm italic">No content found in your debriefs. Use manual input below.</p>
          )}
          <div className="border-t border-zinc-800 pt-4">
            <Label>Or add more context manually</Label>
            <TextArea
              value={manualCapture.client_wins}
              onChange={v => setManualCapture(prev => ({ ...prev, client_wins: v }))}
              onBlur={() => debouncedSave()}
              placeholder="Any additional wins, stories, or insights..."
              rows={3}
            />
          </div>
        </div>
      )
    }

    // No debriefs — manual capture
    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>Capture Your Raw Material</GoldLabel>
          <p className="text-zinc-400 text-sm mb-4">No debriefs found from the past week. Tell us what's been happening:</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Client Wins</Label>
            <TextArea value={manualCapture.client_wins} onChange={v => setManualCapture(prev => ({ ...prev, client_wins: v }))} onBlur={() => debouncedSave()} placeholder="What results have your clients achieved recently?" rows={2} />
          </div>
          <div>
            <Label>Calendar / Events</Label>
            <TextArea value={manualCapture.calendar_events} onChange={v => setManualCapture(prev => ({ ...prev, calendar_events: v }))} onBlur={() => debouncedSave()} placeholder="Any calls, meetings, or events worth sharing?" rows={2} />
          </div>
          <div>
            <Label>Learnings</Label>
            <TextArea value={manualCapture.learnings} onChange={v => setManualCapture(prev => ({ ...prev, learnings: v }))} onBlur={() => debouncedSave()} placeholder="What did you learn or realise this week?" rows={2} />
          </div>
          <div>
            <Label>Wins</Label>
            <TextArea value={manualCapture.wins} onChange={v => setManualCapture(prev => ({ ...prev, wins: v }))} onBlur={() => debouncedSave()} placeholder="Personal or business wins..." rows={2} />
          </div>
          <div>
            <Label>Losses / Challenges</Label>
            <TextArea value={manualCapture.losses} onChange={v => setManualCapture(prev => ({ ...prev, losses: v }))} onBlur={() => debouncedSave()} placeholder="What didn't go to plan? (Great content comes from vulnerability)" rows={2} />
          </div>
        </div>
      </div>
    )
  }

  const renderStage2 = () => {
    const filtered = hookSearch
      ? HOOK_TEMPLATES.filter(h => h.template.toLowerCase().includes(hookSearch.toLowerCase()) || h.example.toLowerCase().includes(hookSearch.toLowerCase()))
      : HOOK_TEMPLATES

    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>Choose Your Hook</GoldLabel>
          <p className="text-zinc-400 text-sm mb-4">Pick a viral hook template, then customise it:</p>
        </div>
        <TextInput
          value={hookSearch}
          onChange={setHookSearch}
          placeholder="Search hooks..."
        />
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
          {filtered.map((hook, i) => (
            <button
              key={i}
              onClick={() => { setSelectedTemplate(hook.template); setHookText(hook.example) }}
              className={`w-full text-left px-4 py-3 rounded border transition ${
                selectedTemplate === hook.template
                  ? 'bg-gold/10 border-gold/40'
                  : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <p className="text-white text-sm font-medium">{hook.template}</p>
              <p className="text-zinc-500 text-xs mt-1">{hook.example}</p>
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <div className="border-t border-zinc-800 pt-4">
            <Label>Your Hook (edit below)</Label>
            <TextInput
              value={hookText}
              onChange={setHookText}
              onBlur={() => debouncedSave()}
              placeholder="Write your hook..."
            />
          </div>
        )}
      </div>
    )
  }

  const renderStage3 = () => (
    <div className="space-y-6">
      <div>
        <GoldLabel>Choose Output Format</GoldLabel>
        <p className="text-zinc-400 text-sm mb-4">What type of content are you creating?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {OUTPUT_FORMATS.map(fmt => (
          <button
            key={fmt.id}
            onClick={() => { setSelectedFormat(fmt.id); debouncedSave() }}
            className={`p-4 rounded border text-left transition ${
              selectedFormat === fmt.id
                ? 'bg-gold/10 border-gold/40'
                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <span className="text-2xl">{fmt.icon}</span>
            <p className="text-white text-sm font-medium mt-2">{fmt.label}</p>
            <p className="text-zinc-500 text-xs">{fmt.desc}</p>
          </button>
        ))}
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <Label>Call to Action</Label>
        <div className="flex flex-wrap gap-2">
          {CTA_OPTIONS.map(cta => (
            <button
              key={cta.id}
              onClick={() => { setSelectedCta(cta.id); debouncedSave() }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                selectedCta === cta.id
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              {cta.label}
            </button>
          ))}
        </div>
        {selectedCta === 'custom' && (
          <div className="mt-3">
            <TextInput
              value={customCta}
              onChange={setCustomCta}
              onBlur={() => debouncedSave()}
              placeholder="Enter your custom CTA..."
            />
          </div>
        )}
      </div>
    </div>
  )

  const renderStage4 = () => {
    const ready = hookText && selectedFormat && (selectedCaptures.length > 0 || Object.values(manualCapture).some(v => v))
    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>Generate Your Content</GoldLabel>
          <p className="text-zinc-400 text-sm mb-4">Review your selections and generate:</p>
        </div>
        <div className="space-y-3">
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>Hook</Label>
            <p className="text-white text-sm">{hookText || <span className="text-zinc-500 italic">Not set</span>}</p>
          </div>
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>Format</Label>
            <p className="text-white text-sm">{OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label || <span className="text-zinc-500 italic">Not selected</span>}</p>
          </div>
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>CTA</Label>
            <p className="text-white text-sm">{selectedCta === 'custom' ? customCta : CTA_OPTIONS.find(c => c.id === selectedCta)?.label}</p>
          </div>
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>Source Material ({selectedCaptures.length > 0 ? selectedCaptures.length + ' items' : 'manual input'})</Label>
            <div className="text-zinc-400 text-xs mt-1 max-h-32 overflow-y-auto">
              {selectedCaptures.length > 0
                ? selectedCaptures.map((c, i) => <p key={i} className="mb-1">• {c}</p>)
                : Object.entries(manualCapture).filter(([,v]) => v).map(([k,v]) => <p key={k} className="mb-1"><span className="text-zinc-500">{k.replace(/_/g, ' ')}:</span> {v}</p>)
              }
            </div>
          </div>
        </div>
        <button
          onClick={generateContent}
          disabled={!ready || generating}
          className={`w-full py-4 rounded font-bold text-sm uppercase tracking-widest transition ${
            ready && !generating
              ? 'bg-gold text-black hover:bg-gold/90'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {generating ? 'Generating...' : '⚡ Generate Content'}
        </button>
        {!ready && <p className="text-zinc-500 text-xs text-center">Complete all previous stages first</p>}
      </div>
    )
  }

  const renderStage5 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <GoldLabel>Your Content</GoldLabel>
        <button
          onClick={startNew}
          className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:text-white hover:border-zinc-600 transition"
        >
          + New Piece
        </button>
      </div>
      <div className="bg-zinc-800 rounded border border-zinc-700 p-1">
        <textarea
          value={generatedContent}
          onChange={e => setGeneratedContent(e.target.value)}
          onBlur={() => debouncedSave({ generated_content: generatedContent })}
          rows={20}
          className="w-full px-4 py-3 bg-transparent text-white text-sm focus:outline-none resize-none leading-relaxed"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => { navigator.clipboard.writeText(generatedContent); flash('Copied!') }}
          className="flex-1 py-3 rounded font-bold text-sm uppercase tracking-widest bg-gold text-black hover:bg-gold/90 transition"
        >
          📋 Copy
        </button>
        <button
          onClick={() => { setCurrentStage(4); generateContent() }}
          className="flex-1 py-3 rounded font-bold text-sm uppercase tracking-widest bg-zinc-700 text-white hover:bg-zinc-600 transition"
        >
          🔄 Regenerate
        </button>
      </div>
    </div>
  )

  const renderCurrentStage = () => {
    switch (currentStage) {
      case 1: return renderStage1()
      case 2: return renderStage2()
      case 3: return renderStage3()
      case 4: return renderStage4()
      case 5: return renderStage5()
      default: return renderStage1()
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Layout ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="text-gold font-bold text-sm uppercase tracking-widest">Content Capture</span>
        <div className="w-6" />
      </div>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-zinc-900 border-r border-zinc-800 z-40 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 pb-4 border-b border-zinc-800/50">
          <button onClick={() => router.push('/client')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
            ← Back to Dashboard
          </button>
          <h2 className="text-gold font-bold text-lg mt-3">Content Capture™</h2>
          <p className="text-zinc-500 text-xs mt-1">Turn your week into content</p>
        </div>
        <nav className="p-4 space-y-1">
          {STAGES.map(stage => (
            <button
              key={stage.num}
              onClick={() => { setCurrentStage(stage.num); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition ${
                currentStage === stage.num
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{stage.icon}</span>
              <span>{stage.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-2xl mx-auto p-6 lg:p-10">
          {/* Stage header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{STAGES[currentStage - 1]?.icon}</span>
              <h1 className="text-2xl font-bold text-white">{STAGES[currentStage - 1]?.label}</h1>
            </div>
            {/* Progress */}
            <div className="flex gap-1 mt-4">
              {STAGES.map(s => (
                <div key={s.num} className={`h-1 flex-1 rounded-full ${s.num <= currentStage ? 'bg-gold' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>

          {/* Stage content */}
          {renderCurrentStage()}

          {/* Navigation */}
          {currentStage < 5 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
              <button
                onClick={() => setCurrentStage(Math.max(1, currentStage - 1))}
                disabled={currentStage === 1}
                className="px-6 py-2.5 rounded text-sm font-semibold text-zinc-400 hover:text-white transition disabled:opacity-30"
              >
                ← Back
              </button>
              <button
                onClick={() => { setCurrentStage(currentStage + 1); debouncedSave() }}
                className="px-6 py-2.5 rounded text-sm font-semibold bg-gold text-black hover:bg-gold/90 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      <div ref={toastRef} className="fixed bottom-6 right-6 bg-gold text-black px-4 py-2 rounded-lg font-bold text-sm opacity-0 translate-y-4 transition-all pointer-events-none z-50">
        Saved
      </div>
    </div>
  )
}
