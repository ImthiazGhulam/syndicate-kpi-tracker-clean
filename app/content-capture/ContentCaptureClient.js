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

const EMAIL_TYPES = [
  { id: 'social-proof', label: 'Social Proof', icon: '📈', desc: 'Show your list you\'re great at what you do — testimonials, screenshots, results' },
  { id: 'value', label: 'Value', icon: '🚀', desc: 'Share your latest content or insights with context — the bulk of your email strategy' },
  { id: 'offer', label: 'Offer', icon: '💰', desc: 'Direct CTA inviting people to work with you — use sparingly (1-2 per month)' },
]

const EMAIL_FRAMEWORKS = [
  { id: '4ps', label: '4 Ps', desc: 'Promise → Picture → Proof → Push', detail: 'State the desired outcome, get them to visualise it, prove it with evidence, then push to CTA' },
  { id: 'nesb', label: 'NESB', desc: 'New → Easy → Safe → Big', detail: 'Position as a new method, show it\'s easy, minimise risk, make it feel like a massive opportunity' },
  { id: 'aida', label: 'AIDA', desc: 'Attention → Interest → Desire → Action', detail: 'Grab attention with a bold statement, build interest, create desire, prompt action' },
]

const HOOK_FORMAT_LABELS = {
  'yap': 'First 3-5 seconds (spoken opening)',
  'carousel': 'Slide 1-2 (scroll-stopping text)',
  'email': 'Subject line + opening line',
  'youtube': 'Title + first 30 seconds',
  'talking-head': 'Opening statement (direct to camera)',
  'photo-caption': 'First line of caption (before the fold)',
}

const STAGES = [
  { num: 1, label: 'Capture', icon: '📥' },
  { num: 2, label: 'Format', icon: '🎯' },
  { num: 3, label: 'Structure', icon: '📝' },
  { num: 4, label: 'Hook', icon: '🪝' },
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

  // Business context
  const [brandData, setBrandData] = useState(null)
  const [offerData, setOfferData] = useState(null)

  // Capture data
  const [debriefData, setDebriefData] = useState([])
  const [hasDebriefs, setHasDebriefs] = useState(true)
  const [manualCapture, setManualCapture] = useState('')
  const [selectedCapture, setSelectedCapture] = useState('')

  // Format
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [selectedCta, setSelectedCta] = useState('youtube')
  const [customCta, setCustomCta] = useState('')
  const [emailType, setEmailType] = useState(null)
  const [emailFramework, setEmailFramework] = useState(null)

  // Structure (body without hook)
  const [generatedStructure, setGeneratedStructure] = useState('')
  const [generatingStructure, setGeneratingStructure] = useState(false)

  // Hook
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [hookText, setHookText] = useState('')
  const [hookSearch, setHookSearch] = useState('')
  const [suggestedHooks, setSuggestedHooks] = useState([])
  const [suggestingHooks, setSuggestingHooks] = useState(false)

  // Generated content (final)
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

      // Fetch Premium Position + Sold Out for business context
      const { data: ppData } = await supabase.from('premium_position').select('brand_star, hero').eq('client_id', client.id).maybeSingle()
      if (ppData) setBrandData(ppData)
      const { data: opData } = await supabase.from('offer_playbooks').select('icp, bang_bang').eq('client_id', client.id).maybeSingle()
      if (opData) setOfferData(opData)

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
        if (existing.selected_capture) setSelectedCapture(existing.selected_capture)
        if (existing.hook_template) setSelectedTemplate(existing.hook_template)
        if (existing.hook_text) setHookText(existing.hook_text)
        if (existing.output_format) setSelectedFormat(existing.output_format)
        if (existing.cta_type) setSelectedCta(existing.cta_type)
        if (existing.custom_cta) setCustomCta(existing.custom_cta)
        if (existing.generated_content) setGeneratedContent(existing.generated_content)
        if (existing.generated_structure) setGeneratedStructure(existing.generated_structure)
        if (existing.email_type) setEmailType(existing.email_type)
        if (existing.email_framework) setEmailFramework(existing.email_framework)
        if (existing.current_stage) setCurrentStage(existing.current_stage)
        if (existing.manual_capture) setManualCapture(existing.manual_capture)
        if (existing.suggested_hooks) setSuggestedHooks(existing.suggested_hooks)
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
      selected_capture: selectedCapture,
      hook_template: selectedTemplate,
      hook_text: hookText,
      output_format: selectedFormat,
      cta_type: selectedCta,
      custom_cta: customCta,
      generated_content: generatedContent,
      generated_structure: generatedStructure,
      email_type: emailType,
      email_framework: emailFramework,
      current_stage: currentStage,
      manual_capture: manualCapture,
      suggested_hooks: suggestedHooks,
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
  }, [clientData, record, selectedCapture, selectedTemplate, hookText, selectedFormat, selectedCta, customCta, generatedContent, generatedStructure, emailType, emailFramework, currentStage, manualCapture, suggestedHooks])

  const debouncedSave = useCallback((fields = {}) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveToSupabase(fields), 500)
  }, [saveToSupabase])

  // ── Business Context Builder ─────────────────────────────────────────────────

  const getBusinessContext = () => {
    const parts = []
    if (brandData?.brand_star) {
      const s = brandData.brand_star
      if (s.what_you_do) parts.push(`What they do: ${s.what_you_do}`)
      if (s.sector) parts.push(`Sector: ${s.sector}`)
      if (s.client_type) parts.push(`Serves: ${s.client_type}`)
      if (s.specific_description) parts.push(`Specifically: ${s.specific_description}`)
      if (s.contrarian_belief) parts.push(`Contrarian belief: ${s.contrarian_belief}`)
      if (s.personality?.length) parts.push(`Brand personality: ${s.personality.join(', ')}`)
    }
    if (brandData?.hero) {
      const h = brandData.hero
      if (h.gift) parts.push(`Their gift/expertise: ${h.gift}`)
      if (h.identity_label) parts.push(`Identity: ${h.identity_label}`)
    }
    if (offerData?.icp) {
      const i = offerData.icp
      if (i.sector) parts.push(`Client sector: ${i.sector}`)
      if (i.specific_description) parts.push(`Ideal client: ${i.specific_description}`)
      if (i.desired_identity) parts.push(`Client wants to become: ${i.desired_identity}`)
      if (i.trigger_moment) parts.push(`Client trigger moment: ${i.trigger_moment}`)
    }
    if (offerData?.bang_bang) {
      const b = offerData.bang_bang
      if (b.name) parts.push(`Main offer: ${b.name}`)
      if (b.promise) parts.push(`Promise: ${b.promise}`)
      if (b.who_for) parts.push(`Offer is for: ${b.who_for}`)
    }
    return parts.length > 0 ? parts.join('\n') : ''
  }

  // ── Generate Structure (body without hook) ──────────────────────────────────

  const generateStructure = async () => {
    setGeneratingStructure(true)
    try {
      const captureText = selectedCapture || manualCapture
      const ctaText = selectedCta === 'custom' ? customCta : CTA_OPTIONS.find(c => c.id === selectedCta)?.label || ''

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content-capture-structure',
          data: {
            captures: captureText,
            format: selectedFormat,
            cta: ctaText,
            business_context: getBusinessContext(),
            email_type: emailType,
            email_framework: emailFramework,
          },
        }),
      })
      const result = await res.json()
      if (result.plan) {
        setGeneratedStructure(result.plan)
        setCurrentStage(4)
        await saveToSupabase({ generated_structure: result.plan, current_stage: 4 })
      }
    } catch (err) {
      console.error('Structure generation error:', err)
    }
    setGeneratingStructure(false)
  }

  // ── Suggest Hooks (format-aware) ────────────────────────────────────────────

  const suggestHooks = async () => {
    setSuggestingHooks(true)
    try {
      const captureText = selectedCapture || manualCapture
      const templateList = HOOK_TEMPLATES.map(h => h.template).join('\n')

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content-capture-hooks',
          data: {
            captures: captureText,
            templates: templateList,
            business_context: getBusinessContext(),
            format: selectedFormat,
            structure: generatedStructure,
            email_type: emailType,
            email_framework: emailFramework,
          },
        }),
      })
      const result = await res.json()
      if (result.plan) {
        const hooks = result.plan.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
        setSuggestedHooks(hooks)
      }
    } catch (err) {
      console.error('Hook suggestion error:', err)
    }
    setSuggestingHooks(false)
  }

  // ── Generate Final Content (hook + structure combined) ──────────────────────

  const generateContent = async () => {
    setGenerating(true)
    try {
      const captureText = selectedCapture || manualCapture
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
            business_context: getBusinessContext(),
            structure: generatedStructure,
            email_type: emailType,
            email_framework: emailFramework,
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
    setSelectedCapture('')
    setSelectedTemplate(null)
    setHookText('')
    setSelectedFormat(null)
    setSelectedCta('youtube')
    setCustomCta('')
    setEmailType(null)
    setEmailFramework(null)
    setGeneratedContent('')
    setGeneratedStructure('')
    setManualCapture('')
    setSuggestedHooks([])
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

  // ── Render Stages ──────────────────────────────────────────────────────────────

  // Stage 1: Capture
  const renderStage1 = () => {
    if (hasDebriefs && debriefData.length > 0) {
      const captures = extractCaptures()
      return (
        <div className="space-y-6">
          <div>
            <GoldLabel>Pick One Story</GoldLabel>
            <p className="text-zinc-400 text-sm mb-4">Each capture is its own piece of content. Select the one you want to turn into something:</p>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {captures.map((capture, i) => (
              <button
                key={i}
                onClick={() => { setSelectedCapture(capture); setSuggestedHooks([]); setGeneratedStructure('') }}
                className={`w-full text-left px-4 py-3 rounded border transition text-sm ${
                  selectedCapture === capture
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
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs uppercase tracking-widest">or write your own</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div>
            <Label>Manual capture</Label>
            <TextArea
              value={manualCapture}
              onChange={v => { setManualCapture(v); setSelectedCapture(''); setSuggestedHooks([]); setGeneratedStructure('') }}
              onBlur={() => debouncedSave()}
              placeholder="A client win, something you learned, a story from your week..."
              rows={3}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>Capture Your Story</GoldLabel>
          <p className="text-zinc-400 text-sm mb-4">No debriefs found from the past week. Write one story, win, learning, or insight to turn into content:</p>
        </div>
        <TextArea
          value={manualCapture}
          onChange={v => setManualCapture(v)}
          onBlur={() => debouncedSave()}
          placeholder="e.g. A client just hit their first £10k month after implementing the pricing framework I taught them last week..."
          rows={5}
        />
      </div>
    )
  }

  // Stage 2: Format
  const renderStage2 = () => (
    <div className="space-y-6">
      <div>
        <GoldLabel>Choose Output Format</GoldLabel>
        <p className="text-zinc-400 text-sm mb-4">What type of content are you creating?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {OUTPUT_FORMATS.map(fmt => (
          <button
            key={fmt.id}
            onClick={() => { setSelectedFormat(fmt.id); setSuggestedHooks([]); setGeneratedStructure(''); if (fmt.id !== 'email') { setEmailType(null); setEmailFramework(null) }; debouncedSave() }}
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

      {/* Email-specific options */}
      {selectedFormat === 'email' && (
        <>
          <div className="border-t border-zinc-800 pt-4">
            <GoldLabel>Email Type</GoldLabel>
            <p className="text-zinc-400 text-sm mb-3">What kind of email are you sending?</p>
            <div className="space-y-2">
              {EMAIL_TYPES.map(et => (
                <button
                  key={et.id}
                  onClick={() => { setEmailType(et.id); debouncedSave() }}
                  className={`w-full text-left p-4 rounded border transition ${
                    emailType === et.id
                      ? 'bg-gold/10 border-gold/40'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{et.icon}</span>
                    <span className="text-white text-sm font-medium">{et.label}</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-1 ml-7">{et.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <GoldLabel>Copywriting Framework</GoldLabel>
            <p className="text-zinc-400 text-sm mb-3">How should the email be structured?</p>
            <div className="space-y-2">
              {EMAIL_FRAMEWORKS.map(fw => (
                <button
                  key={fw.id}
                  onClick={() => { setEmailFramework(fw.id); debouncedSave() }}
                  className={`w-full text-left p-4 rounded border transition ${
                    emailFramework === fw.id
                      ? 'bg-gold/10 border-gold/40'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{fw.label}</span>
                    <span className="text-gold text-xs font-semibold">{fw.desc}</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-1">{fw.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

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

  // Stage 3: Structure (generate body without hook)
  const renderStage3 = () => {
    const ready = selectedFormat && (selectedCapture || manualCapture)
    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>Build Your Structure</GoldLabel>
          <p className="text-zinc-400 text-sm mb-4">We'll generate the story, steps, payoff and CTA for your {OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label || 'content'}. The hook comes next.</p>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>Story / Capture</Label>
            <p className="text-zinc-300 text-sm">{selectedCapture || manualCapture || <span className="text-zinc-500 italic">Not set</span>}</p>
          </div>
          <div className="bg-zinc-800 rounded p-4 border border-zinc-700">
            <Label>Format</Label>
            <p className="text-white text-sm">{OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label || <span className="text-zinc-500 italic">Not selected</span>}</p>
          </div>
        </div>

        {!generatedStructure ? (
          <button
            onClick={generateStructure}
            disabled={!ready || generatingStructure}
            className={`w-full py-4 rounded font-bold text-sm uppercase tracking-widest transition ${
              ready && !generatingStructure
                ? 'bg-gold text-black hover:bg-gold/90'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {generatingStructure ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Building structure...
              </span>
            ) : '📝 Generate Structure'}
          </button>
        ) : (
          <>
            <div className="bg-zinc-800 rounded border border-zinc-700 p-1">
              <textarea
                value={generatedStructure}
                onChange={e => setGeneratedStructure(e.target.value)}
                onBlur={() => debouncedSave({ generated_structure: generatedStructure })}
                rows={14}
                className="w-full px-4 py-3 bg-transparent text-white text-sm focus:outline-none resize-none leading-relaxed"
              />
            </div>
            <button
              onClick={generateStructure}
              disabled={generatingStructure}
              className="w-full py-3 rounded border border-gold/30 text-gold font-semibold text-sm hover:bg-gold/10 transition disabled:opacity-50"
            >
              {generatingStructure ? 'Regenerating...' : '🔄 Regenerate Structure'}
            </button>
          </>
        )}
      </div>
    )
  }

  // Stage 4: Hook (format-aware, done last)
  const renderStage4 = () => {
    const formatLabel = HOOK_FORMAT_LABELS[selectedFormat] || 'Opening hook'
    const filtered = hookSearch
      ? HOOK_TEMPLATES.filter(h => h.template.toLowerCase().includes(hookSearch.toLowerCase()) || h.example.toLowerCase().includes(hookSearch.toLowerCase()))
      : HOOK_TEMPLATES

    return (
      <div className="space-y-6">
        <div>
          <GoldLabel>The Hook</GoldLabel>
          <p className="text-zinc-400 text-sm mb-2">The most important part. Based on your structure, pick or generate the perfect hook.</p>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded px-3 py-2 mt-2">
            <p className="text-gold text-xs font-semibold uppercase tracking-widest">For {OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label}:</p>
            <p className="text-zinc-300 text-sm mt-1">{formatLabel}</p>
          </div>
        </div>

        {/* AI-Suggested Hooks */}
        <div className="space-y-3">
          <button
            onClick={suggestHooks}
            disabled={suggestingHooks}
            className="w-full py-3 rounded border border-gold/30 text-gold font-semibold text-sm hover:bg-gold/10 transition disabled:opacity-50"
          >
            {suggestingHooks ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                Crafting hooks for {OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label}...
              </span>
            ) : suggestedHooks.length > 0 ? '⚡ Regenerate Hook Suggestions' : '⚡ Suggest Hooks From My Content'}
          </button>
          {suggestedHooks.length > 0 && (
            <>
              <Label>Suggested for your {OUTPUT_FORMATS.find(f => f.id === selectedFormat)?.label}</Label>
              <div className="space-y-2">
                {suggestedHooks.map((hook, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedTemplate('suggested'); setHookText(hook) }}
                    className={`w-full text-left px-4 py-3 rounded border transition text-sm ${
                      hookText === hook && selectedTemplate === 'suggested'
                        ? 'bg-gold/10 border-gold/40 text-white'
                        : 'bg-zinc-800/80 border-gold/20 text-zinc-200 hover:border-gold/40'
                    }`}
                  >
                    {hook}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs uppercase tracking-widest">or browse templates</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Template Browser */}
        <TextInput value={hookSearch} onChange={setHookSearch} placeholder="Search hook templates..." />
        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
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

        {/* Editable hook */}
        {hookText && (
          <div className="border-t border-zinc-800 pt-4">
            <GoldLabel>Your Hook (edit below)</GoldLabel>
            <TextInput
              value={hookText}
              onChange={setHookText}
              onBlur={() => debouncedSave()}
              placeholder="Write your hook..."
            />
          </div>
        )}

        {/* Generate final */}
        {hookText && (
          <button
            onClick={generateContent}
            disabled={generating}
            className={`w-full py-4 rounded font-bold text-sm uppercase tracking-widest transition ${
              !generating ? 'bg-gold text-black hover:bg-gold/90' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Assembling final content...
              </span>
            ) : '⚡ Generate Final Content'}
          </button>
        )}
      </div>
    )
  }

  // Stage 5: Edit & Export
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
          onClick={() => { setCurrentStage(4); }}
          className="flex-1 py-3 rounded font-bold text-sm uppercase tracking-widest bg-zinc-700 text-white hover:bg-zinc-600 transition"
        >
          🪝 Change Hook
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
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{STAGES[currentStage - 1]?.icon}</span>
              <h1 className="text-2xl font-bold text-white">{STAGES[currentStage - 1]?.label}</h1>
            </div>
            <div className="flex gap-1 mt-4">
              {STAGES.map(s => (
                <div key={s.num} className={`h-1 flex-1 rounded-full ${s.num <= currentStage ? 'bg-gold' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>

          {renderCurrentStage()}

          {currentStage < 5 && currentStage !== 3 && currentStage !== 4 && (
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

          {(currentStage === 3 || currentStage === 4) && (
            <div className="flex justify-start mt-8 pt-6 border-t border-zinc-800">
              <button
                onClick={() => setCurrentStage(currentStage - 1)}
                className="px-6 py-2.5 rounded text-sm font-semibold text-zinc-400 hover:text-white transition"
              >
                ← Back
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
