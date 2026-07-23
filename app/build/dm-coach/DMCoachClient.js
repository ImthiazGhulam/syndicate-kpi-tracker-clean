'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// ── Status lines for loading ────────────────────────────────────────────────

const COACH_STATUS_LINES = [
  'Reading your Hot List...',
  'Checking the voice profile...',
  'Locating the move...',
  'Drafting the next message...',
]

// ── Sub-components ──────────────────────────────────────────────────────────

function LoadingOverlay({ lines }) {
  const [lineIndex, setLineIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex(prev => (prev + 1) % lines.length)
    }, 2500)
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
        <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs">👤</span>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-[85%]">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-xs">🎯</span>
      </div>
      <div className="glass-card p-4 max-w-[85%]">
        <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {formatCoachResponse(message.content)}
        </div>
      </div>
    </div>
  )
}

function formatCoachResponse(text) {
  if (!text) return text
  // Bold the section headers
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="text-gold font-bold text-xs uppercase tracking-widest mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.match(/^\*\*[^*]+\*\*/)) {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      return (
        <p key={i} className="mb-1">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <span key={j} className="text-gold font-bold">{part.replace(/\*\*/g, '')}</span>
            }
            return <span key={j}>{part}</span>
          })}
        </p>
      )
    }
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="mb-1">{line}</p>
  })
}

// ── Suggested prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { label: 'Who needs a message today?', icon: '📋' },
  { label: 'Who has gone stale?', icon: '⏰' },
  { label: 'Help me open a DM with a new follower', icon: '💬' },
  { label: 'I got a reply, what do I send next?', icon: '↩️' },
]

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
  const [leadCount, setLeadCount] = useState(0)
  const [hasVoiceProfile, setHasVoiceProfile] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)

      // Check lead count and voice profile availability
      const [leadsRes, ppRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
        supabase.from('premium_position').select('id').eq('client_id', client.id).maybeSingle(),
      ])

      setLeadCount(leadsRes.count || 0)
      setHasVoiceProfile(!!ppRes.data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, sending])

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
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setInput('')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
        <div className="w-6" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-30 w-72 h-screen glass-sidebar flex flex-col transition-transform lg:transition-none`}>
          <div className="p-6 border-b border-white/[0.06]">
            <h2 className="text-lg font-display font-bold text-white tracking-tight">DM Sales Coach</h2>
            <p className="text-xs text-zinc-500 mt-1">GYC Phase 8</p>
          </div>

          {/* Status indicators */}
          <div className="p-4 space-y-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${hasVoiceProfile ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-zinc-400">
                {hasVoiceProfile ? 'Voice profile loaded' : 'No voice profile (warm-neutral)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${leadCount > 0 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="text-xs text-zinc-400">
                {leadCount} lead{leadCount !== 1 ? 's' : ''} on Hot List
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="text-[10px] font-display font-bold text-zinc-600 uppercase tracking-[0.25em] mb-3">Quick Prompts</p>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => { sendMessage(p.label); setSidebarOpen(false) }}
                disabled={sending}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition glass-card-hover text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <span className="mr-2">{p.icon}</span>{p.label}
              </button>
            ))}

            <div className="pt-4">
              <button
                onClick={clearChat}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition border border-zinc-800 hover:border-zinc-600"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Back to dashboard */}
          <div className="p-4 border-t border-white/[0.06]">
            <button onClick={() => router.push('/client')} className="w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition">
              ← Dashboard
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              {messages.length === 0 && !sending && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-white mb-2">DM Sales Coach</h2>
                  <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">
                    Paste a DM conversation, name a lead, or ask who needs a message. I'll tell you the exact move and draft the next message in your voice.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(p.label)}
                        className="px-4 py-3 rounded-lg text-sm text-left transition glass-card-hover text-zinc-400 hover:text-white"
                      >
                        <span className="mr-2">{p.icon}</span>{p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {sending && <LoadingOverlay lines={COACH_STATUS_LINES} />}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl px-4 py-3 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste a DM conversation, name a lead, or ask a question..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || sending}
                  className="px-4 py-3 rounded-lg bg-gold hover:bg-gold-light text-zinc-950 font-bold text-sm uppercase tracking-widest transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  Send
                </button>
              </div>
              <p className="text-[10px] text-zinc-700 mt-2 text-center">
                Shift+Enter for new line. Your Hot List and voice profile are accessed live.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
