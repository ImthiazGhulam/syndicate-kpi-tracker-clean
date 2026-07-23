'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// ── Constants ───────────────────────────────────────────────────────────────

const COACH_STATUS_LINES = [
  'Reading your Hot List...',
  'Checking the voice profile...',
  'Locating the move...',
  'Drafting the next message...',
]

const LEAD_STAGES = [
  { id: 'dm_sent', label: 'Initial DM Sent', short: 'DM Sent', color: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-400' },
  { id: 'lead_magnet_sent', label: 'Lead Magnet Sent', short: 'Magnet', color: 'border-pink-500/40 bg-pink-500/5', dot: 'bg-pink-400' },
  { id: 'follow_up', label: 'Follow-up Friday', short: 'Friday', color: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-400' },
  { id: 'call_booked', label: 'Call Booked', short: 'Booked', color: 'border-gold/40 bg-gold/5', dot: 'bg-gold' },
  { id: 'client_won', label: 'Client Won', short: 'Won', color: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-400' },
  { id: 'ghosted', label: 'Ghosted', short: 'Ghosted', color: 'border-red-500/40 bg-red-500/5', dot: 'bg-red-400' },
]

const SUGGESTED_PROMPTS = [
  { label: 'Who needs a message today?', icon: '📋' },
  { label: 'Who has gone stale?', icon: '⏰' },
  { label: 'Help me open a DM with a new follower', icon: '💬' },
  { label: 'I got a reply, what do I send next?', icon: '↩️' },
]

// ── Sub-components ──────────────────────────────────────────────────────────

function CoachLoading({ lines }) {
  const [lineIndex, setLineIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => { setLineIndex(prev => (prev + 1) % lines.length) }, 2500)
    return () => clearInterval(timer)
  }, [lines])

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-xs">🎯</span>
      </div>
      <div className="glass-card p-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-gold text-sm font-bold uppercase tracking-widest animate-pulse">{lines[lineIndex]}</p>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  if (isUser) {
    return (
      <div className="flex items-start gap-3 mb-4 flex-row-reverse">
        <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0 mt-1"><span className="text-xs">👤</span></div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-[85%]">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1"><span className="text-xs">🎯</span></div>
      <div className="glass-card p-4 max-w-[85%]">
        <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{formatCoachResponse(message.content)}</div>
      </div>
    </div>
  )
}

function formatCoachResponse(text) {
  if (!text) return text
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="text-gold font-bold text-xs uppercase tracking-widest mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.match(/^\*\*[^*]+\*\*/)) {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      return (
        <p key={i} className="mb-1">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) return <span key={j} className="text-gold font-bold">{part.replace(/\*\*/g, '')}</span>
            return <span key={j}>{part}</span>
          })}
        </p>
      )
    }
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="mb-1">{line}</p>
  })
}

function LeadCard({ lead, onAsk, onMove }) {
  const stage = LEAD_STAGES.find(s => s.id === lead.status)
  const stageIdx = LEAD_STAGES.findIndex(s => s.id === lead.status)
  const prevStage = stageIdx > 0 ? LEAD_STAGES[stageIdx - 1] : null
  const nextStage = stageIdx < LEAD_STAGES.length - 1 ? LEAD_STAGES[stageIdx + 1] : null
  const daysSince = Math.floor((Date.now() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="glass-card p-3 group">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onAsk(lead)} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{lead.name}</p>
          {lead.instagram && <p className="text-[11px] text-violet-400 mt-0.5 truncate">@{lead.instagram.replace('@', '')}</p>}
        </button>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${stage?.dot || 'bg-zinc-500'}`} />
      </div>
      {lead.notes && <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-1">{lead.notes}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[10px] ${daysSince >= 7 ? 'text-amber-400' : 'text-zinc-600'}`}>
          {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
        </span>
        <div className="flex items-center gap-1">
          {prevStage && (
            <button onClick={() => onMove(lead.id, prevStage.id)} className="px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition uppercase tracking-wider">←</button>
          )}
          {nextStage && (
            <button onClick={() => onMove(lead.id, nextStage.id)} className="px-2 py-0.5 text-[9px] font-bold text-gold hover:text-gold-light bg-gold/10 hover:bg-gold/20 rounded transition uppercase tracking-wider">→</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DMCoachClient() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasVoiceProfile, setHasVoiceProfile] = useState(false)

  // Hot List
  const [leads, setLeads] = useState([])
  const [hotListOpen, setHotListOpen] = useState(false)
  const [hotListFilter, setHotListFilter] = useState('all')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)

      const [leadsRes, ppRes] = await Promise.all([
        supabase.from('leads').select('*').eq('client_id', client.id).order('updated_at', { ascending: false }),
        supabase.from('premium_position').select('id').eq('client_id', client.id).maybeSingle(),
      ])

      if (leadsRes.data) setLeads(leadsRes.data)
      setHasVoiceProfile(!!ppRes.data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, sending])

  // ── Lead actions ──────────────────────────────────────────────────────────

  const moveLead = async (leadId, newStatus) => {
    const { data } = await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId).select().single()
    if (data) setLeads(prev => prev.map(l => l.id === leadId ? data : l))
  }

  const askAboutLead = (lead) => {
    const text = `What do I send ${lead.name}${lead.instagram ? ` (@${lead.instagram.replace('@', '')})` : ''}?`
    setInput(text)
    setHotListOpen(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText || sending) return

    const userMessage = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/dm-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          clientId: clientData.id,
        }),
      })
      const result = await res.json()
      if (result.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Something went wrong: ${result.error}. Try again.` }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to connect. Check your internet and try again.' }])
    }

    setSending(false)
    // Refresh leads after coach response (stage might have changed)
    if (clientData) {
      const { data } = await supabase.from('leads').select('*').eq('client_id', clientData.id).order('updated_at', { ascending: false })
      if (data) setLeads(data)
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => { setMessages([]); setInput('') }

  // ── Filtered leads ────────────────────────────────────────────────────────

  const filteredLeads = hotListFilter === 'all' ? leads : leads.filter(l => l.status === hotListFilter)
  const stageCounts = LEAD_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.id).length }))

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-grid text-white flex flex-col">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="text-xs font-display font-bold text-gold uppercase tracking-widest">DM Sales Coach</span>
        <button onClick={() => setHotListOpen(!hotListOpen)} className={`text-zinc-400 hover:text-white transition ${hotListOpen ? 'text-gold' : ''}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Coach nav */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-30 w-64 h-screen glass-sidebar flex flex-col transition-transform lg:transition-none`}>
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-base font-display font-bold text-white tracking-tight">DM Sales Coach</h2>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">GYC Phase 8</p>
          </div>

          <div className="p-4 space-y-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${hasVoiceProfile ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[11px] text-zinc-500">{hasVoiceProfile ? 'Voice profile active' : 'No voice profile'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${leads.length > 0 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="text-[11px] text-zinc-500">{leads.length} lead{leads.length !== 1 ? 's' : ''} tracked</span>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <p className="text-[10px] font-display font-bold text-zinc-600 uppercase tracking-[0.25em] mb-2">Quick Prompts</p>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => { sendMessage(p.label); setSidebarOpen(false) }} disabled={sending}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] transition sidebar-item text-zinc-400 hover:text-white disabled:opacity-50">
                <span className="mr-2">{p.icon}</span>{p.label}
              </button>
            ))}
            <div className="pt-3">
              <button onClick={clearChat} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition border border-zinc-800 hover:border-zinc-600">
                Clear Chat
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-white/[0.06] space-y-1.5">
            <button onClick={() => setHotListOpen(!hotListOpen)} className="hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest text-gold hover:text-gold-light transition border border-gold/20 hover:border-gold/40 justify-center">
              {hotListOpen ? 'Hide' : 'Show'} Hot List
            </button>
            <button onClick={() => router.push('/client')} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition">
              ← Dashboard
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              {messages.length === 0 && !sending && (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h2 className="text-lg font-display font-bold text-white mb-2">DM Sales Coach</h2>
                  <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
                    Paste a DM conversation, name a lead, or ask who needs a message.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => sendMessage(p.label)}
                        className="px-3 py-2.5 rounded-lg text-sm text-left transition glass-card-hover text-zinc-400 hover:text-white">
                        <span className="mr-2">{p.icon}</span>{p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
              {sending && <CoachLoading lines={COACH_STATUS_LINES} />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl px-4 py-3 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Paste a DM, name a lead, or ask a question..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
                  className="px-4 py-3 rounded-lg bg-gold hover:bg-gold-light text-zinc-950 font-bold text-sm uppercase tracking-widest transition disabled:opacity-30 flex-shrink-0">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Hot List */}
        <aside className={`${hotListOpen ? 'translate-x-0' : 'translate-x-full'} lg:${hotListOpen ? 'translate-x-0' : 'translate-x-full'} fixed lg:sticky top-0 right-0 z-30 w-80 h-screen glass-sidebar flex flex-col transition-transform overflow-hidden`}
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: 'none' }}>
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Hot List</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setHotListOpen(false)} className="text-zinc-500 hover:text-white transition p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Stage filter pills */}
          <div className="px-3 py-3 border-b border-white/[0.06] overflow-x-auto scrollbar-none">
            <div className="flex gap-1.5">
              <button onClick={() => setHotListFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition flex-shrink-0 ${hotListFilter === 'all' ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-white'}`}>
                All ({leads.length})
              </button>
              {stageCounts.filter(s => s.count > 0).map(s => (
                <button key={s.id} onClick={() => setHotListFilter(s.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition flex-shrink-0 ${hotListFilter === s.id ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-white'}`}>
                  {s.short} ({s.count})
                </button>
              ))}
            </div>
          </div>

          {/* Lead cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {filteredLeads.length === 0 && (
              <p className="text-zinc-600 text-xs text-center py-8">No leads{hotListFilter !== 'all' ? ' in this stage' : ''}</p>
            )}
            {hotListFilter === 'all' ? (
              // Group by stage
              LEAD_STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.status === stage.id)
                if (stageLeads.length === 0) return null
                return (
                  <div key={stage.id}>
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stage.label}</span>
                      <span className="text-[10px] text-zinc-600">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {stageLeads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onAsk={askAboutLead} onMove={moveLead} />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onAsk={askAboutLead} onMove={moveLead} />
              ))
            )}
          </div>

          {/* Pipeline summary bar */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-zinc-800">
              {stageCounts.filter(s => s.count > 0 && s.id !== 'client_won' && s.id !== 'ghosted').map(s => (
                <div key={s.id} className={`${s.dot} transition-all`} style={{ width: `${(s.count / Math.max(leads.length, 1)) * 100}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-zinc-600">{stageCounts.find(s => s.id === 'dm_sent')?.count || 0} active</span>
              <span className="text-[9px] text-emerald-400">{stageCounts.find(s => s.id === 'client_won')?.count || 0} won</span>
            </div>
          </div>
        </aside>

        {/* Mobile Hot List overlay */}
        {hotListOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setHotListOpen(false)} />}
      </div>
    </div>
  )
}
