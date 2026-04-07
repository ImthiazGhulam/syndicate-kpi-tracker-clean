'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Main Component ──────────────────────────────────────────────────────────

export default function AIAcceleratorPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Entries
  const [allEntries, setAllEntries] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)

  // Form
  const [record, setRecord] = useState(null)
  const [manualProcess, setManualProcess] = useState('')
  const [idealOutput, setIdealOutput] = useState('')
  const [whereItBreaks, setWhereItBreaks] = useState('')
  const [generatedTool, setGeneratedTool] = useState(null)
  const [comfortLevel, setComfortLevel] = useState(null) // 1-4

  // New entry
  const [newTitle, setNewTitle] = useState('')
  const [newProblem, setNewProblem] = useState('')
  const [creatingEntry, setCreatingEntry] = useState(false)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)

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

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: client } = await supabase.from('clients').select('*').eq('email', session.user.email).single()
      if (!client) { router.push('/client'); return }
      setClientData(client)
      const { data: entries } = await supabase.from('ai_accelerator').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      setAllEntries(entries || [])
      setLoading(false)
    }
    init()
  }, [])

  // ── Select / Create ───────────────────────────────────────────────────────

  const selectEntry = (entry) => {
    setRecord(entry)
    setSelectedEntry(entry.id)
    setManualProcess(entry.manual_process || '')
    setIdealOutput(entry.ideal_output || '')
    setWhereItBreaks(entry.where_it_breaks || '')
    setGeneratedTool(entry.generated_tool && Object.keys(entry.generated_tool).length > 0 ? entry.generated_tool : null)
    setComfortLevel(entry.comfort_level || entry.generated_tool?.comfort_level || null)
    setDeployed(false)
  }

  const createNewEntry = async () => {
    if (!newProblem.trim()) return
    setCreatingEntry(true)
    const title = newTitle.trim() || newProblem.trim().slice(0, 60)
    const { data: newRec } = await supabase.from('ai_accelerator').insert({
      client_id: clientData.id,
      title,
      problem_statement: newProblem.trim(),
    }).select().single()
    if (newRec) {
      setAllEntries(prev => [newRec, ...prev])
      selectEntry(newRec)
      setNewTitle('')
      setNewProblem('')
    }
    setCreatingEntry(false)
  }

  const backToList = () => {
    saveAnswers()
    setSelectedEntry(null)
    setRecord(null)
    supabase.from('ai_accelerator').select('*').eq('client_id', clientData.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllEntries(data) })
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveAnswers = async () => {
    if (!record) return
    const { error } = await supabase.from('ai_accelerator').update({
      manual_process: manualProcess,
      ideal_output: idealOutput,
      where_it_breaks: whereItBreaks,
      comfort_level: comfortLevel,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    if (error) { console.error('ai_accelerator save error:', error); return }
    flash()
  }

  // ── Generate Tool ─────────────────────────────────────────────────────────

  const generateTool = async () => {
    if (!comfortLevel || !manualProcess.trim()) return
    setGenerating(true)
    setDeployed(false)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai-accelerator',
          data: {
            problem_statement: record?.problem_statement || '',
            manual_process: manualProcess,
            ideal_output: idealOutput,
            where_it_breaks: whereItBreaks,
            comfort_level: comfortLevel,
          },
        }),
      })
      const result = await res.json()
      if (result.error) { alert('Failed: ' + result.error); setGenerating(false); return }
      if (result.tool) {
        const tool = { ...result.tool, comfort_level: comfortLevel }
        setGeneratedTool(tool)
        const { error: toolErr } = await supabase.from('ai_accelerator').update({
          generated_tool: tool,
          manual_process: manualProcess,
          ideal_output: idealOutput,
          where_it_breaks: whereItBreaks,
          updated_at: new Date().toISOString(),
        }).eq('id', record.id)
        if (toolErr) console.error('ai_accelerator save error:', toolErr)
      }
    } catch (e) { alert('Failed: ' + e.message) }
    setGenerating(false)
  }

  // ── Deploy to Calendar ────────────────────────────────────────────────────

  const deployToCalendar = async () => {
    if (!generatedTool || !clientData) return
    setDeploying(true)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startDate = tomorrow.toISOString().split('T')[0]

    const { data: project, error: projectErr } = await supabase.from('projects').insert([{
      client_id: clientData.id,
      name: `⚡ AI Accelerator: ${record?.title || 'New Tool'}`,
      description: record?.problem_statement || '',
      status: 'in_progress',
      priority: 'high',
      start_date: startDate,
      end_date: startDate,
    }]).select().single()

    if (projectErr) { console.error('projects save error:', projectErr); setDeploying(false); return }
    if (project) {
      const tasks = []
      // Test task
      if (generatedTool.test_task) {
        tasks.push({
          project_id: project.id,
          client_id: clientData.id,
          title: generatedTool.test_task.title || 'Test your AI tool with a real client',
          description: generatedTool.test_task.description || '',
          scheduled_date: startDate,
          scheduled_time: '09:00',
          duration_minutes: 20,
          completed: false,
        })
      }
      // SOP steps as tasks
      if (generatedTool.sop?.steps) {
        generatedTool.sop.steps.forEach((step, i) => {
          const d = new Date(startDate + 'T12:00:00')
          d.setDate(d.getDate() + Math.floor(i / 2))
          tasks.push({
            project_id: project.id,
            client_id: clientData.id,
            title: `Step ${i + 1}: ${step}`,
            scheduled_date: d.toISOString().split('T')[0],
            completed: false,
          })
        })
      }
      if (tasks.length > 0) {
        const { error: tasksErr } = await supabase.from('project_tasks').insert(tasks)
        if (tasksErr) console.error('project_tasks save error:', tasksErr)
      }
    }

    setDeployed(true)
    setDeploying(false)
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

  // ── Problem Picker ────────────────────────────────────────────────────────

  if (!selectedEntry) return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="The Syndicate" className="h-10 w-auto" />
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-widest">AI Accelerator™</h1>
            <p className="text-zinc-600 text-xs">Pick a problem. Answer 3 questions. Get your AI tool.</p>
          </div>
        </div>
        <button onClick={() => router.push('/client')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="hidden sm:inline tracking-wide">Back to App</span>
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:px-8 md:py-8">
        {/* New Problem */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-5">What do you want AI to help with?</h2>
          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Give it a short name</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Client follow-ups, Proposal writing, Content repurposing"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
          </div>
          <div className="mb-5">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Describe the problem</label>
            <textarea rows={3} value={newProblem} onChange={e => setNewProblem(e.target.value)}
              placeholder="What are you doing manually that takes too long, feels repetitive, or could be better?"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
          </div>
          <button onClick={createNewEntry} disabled={!newProblem.trim() || creatingEntry}
            className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-30 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
            {creatingEntry ? 'Creating...' : 'Start Building'}
          </button>
        </div>

        {/* Existing */}
        {allEntries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gold/40 rounded-full" />
              <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Your AI Tools</h2>
            </div>
            <div className="space-y-3">
              {allEntries.map(entry => {
                const hasTool = entry.generated_tool && Object.keys(entry.generated_tool).length > 0
                return (
                  <button key={entry.id} onClick={() => selectEntry(entry)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{entry.title || 'Untitled'}</p>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{entry.problem_statement}</p>
                        {hasTool && (
                          <span className="inline-block mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Tool generated</span>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div ref={toastRef} className="fixed bottom-6 right-6 z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 transition-all duration-300" style={{ opacity: 0, transform: 'translateY(1rem)' }}>Saved</div>
    </div>
  )

  // ── Builder View ──────────────────────────────────────────────────────────

  const allAnswered = manualProcess.trim() && idealOutput.trim() && whereItBreaks.trim() && comfortLevel

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={backToList} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="tracking-wide">All Tools</span>
          </button>
        </div>
        <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto" />
      </header>

      <div className="max-w-3xl mx-auto p-4 md:px-8 md:py-8">
        {/* Problem header */}
        <div className="mb-8">
          <p className="text-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-1.5">AI Accelerator™</p>
          <h1 className="text-xl font-black text-white tracking-tight">{record?.title || 'Build Your Tool'}</h1>
          <div className="bg-zinc-900 border border-gold/20 rounded-lg px-4 py-2.5 mt-3">
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Your Problem</p>
            <p className="text-sm text-zinc-300">{record?.problem_statement}</p>
          </div>
        </div>

        {/* Three Questions */}
        <div className="space-y-6 mb-8">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800/80 border border-zinc-700/40 rounded-2xl p-5 sm:p-6">
            <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">Question 1</label>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">Walk me through what you do right now, step by step — like you're explaining it to a new hire who's never done this before.</p>
            <textarea rows={5} value={manualProcess} onChange={e => setManualProcess(e.target.value)} onBlur={saveAnswers}
              placeholder="e.g. When a new client enquires, I read their message, write a reply, then create a proposal in Google Docs, send it over email..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800/80 border border-zinc-700/40 rounded-2xl p-5 sm:p-6">
            <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">Question 2</label>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">What does the perfect result look like? If this was done brilliantly every single time, what would the output be?</p>
            <textarea rows={4} value={idealOutput} onChange={e => setIdealOutput(e.target.value)} onBlur={saveAnswers}
              placeholder="e.g. A personalised proposal that mentions their specific problem, shows my solution, includes pricing, and sounds like me — not generic..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800/80 border border-zinc-700/40 rounded-2xl p-5 sm:p-6">
            <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">Question 3</label>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">Where does it currently go wrong? What's slow, inconsistent, or just annoying about how you do this today?</p>
            <textarea rows={4} value={whereItBreaks} onChange={e => setWhereItBreaks(e.target.value)} onBlur={saveAnswers}
              placeholder="e.g. It takes me 45 minutes per proposal, I forget to personalise them, sometimes I lose the enquiry details..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
          </div>
        </div>

        {/* Comfort Level */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gold rounded-full" />
            <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Your comfort level with AI</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { level: 1, title: 'Complete Newbie', sub: 'Give me something I can copy and paste', icon: '🟢' },
              { level: 2, title: 'Getting Started', sub: 'I can follow a multi-step process', icon: '🔵' },
              { level: 3, title: 'Comfortable', sub: 'I can connect tools like Zapier or Make', icon: '🟣' },
              { level: 4, title: 'Ready to Build', sub: 'Show me how to build it with Claude Code', icon: '🔴' },
            ].map(opt => (
              <button key={opt.level} onClick={() => setComfortLevel(opt.level)}
                className={`text-left p-4 rounded-xl border transition ${
                  comfortLevel === opt.level
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${comfortLevel === opt.level ? 'text-white' : 'text-zinc-300'}`}>{opt.title}</p>
                    <p className="text-xs mt-0.5">{opt.sub}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <div className="text-center mb-8">
          <button onClick={generateTool} disabled={!allAnswered || generating}
            className={`px-8 py-4 font-bold text-xs uppercase tracking-widest rounded-lg transition ${
              generatedTool
                ? 'bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30'
                : 'bg-gold hover:bg-gold-light text-zinc-950'
            } disabled:opacity-30`}>
            {generating ? 'Building your tool...' : generatedTool ? 'Regenerate' : 'Build My AI Tool'}
          </button>
          {!allAnswered && !generatedTool && (
            <p className="text-zinc-600 text-xs mt-2">Answer all 3 questions and pick your comfort level to unlock</p>
          )}
        </div>

        {/* Generated Tool Output */}
        {generatedTool && (
          <div className="space-y-5">
            {/* The Prompt */}
            {generatedTool.prompt && (
              <div className="bg-zinc-900 border border-gold/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-[0.2em]">Your AI Prompt</h3>
                  <button onClick={() => { navigator.clipboard.writeText(generatedTool.prompt); flash('Copied!') }}
                    className="px-3 py-1.5 text-[10px] font-bold text-gold bg-gold/5 border border-gold/20 rounded-lg hover:bg-gold/10 transition uppercase tracking-widest">
                    Copy
                  </button>
                </div>
                <p className="text-zinc-500 text-xs mb-3">Paste this into Claude (claude.ai) and press enter:</p>
                <div className="bg-zinc-800 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">{generatedTool.prompt}</div>
              </div>
            )}

            {/* SOP */}
            {generatedTool.sop && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-4">How to Use It — Step by Step</h3>
                {generatedTool.sop.tool_recommendation && (
                  <div className="bg-zinc-800 rounded-xl px-4 py-3 mb-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Recommended Tool</p>
                    <p className="text-sm text-white font-semibold">{generatedTool.sop.tool_recommendation}</p>
                  </div>
                )}
                <div className="space-y-4">
                  {(generatedTool.sop.steps || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-4 bg-zinc-800/50 rounded-xl p-4">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-gold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Task */}
            {generatedTool.test_task && (
              <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-3">Your Test Task — Do This Tomorrow</h3>
                <p className="text-white text-sm font-semibold">{generatedTool.test_task.title}</p>
                {generatedTool.test_task.description && (
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{generatedTool.test_task.description}</p>
                )}
              </div>
            )}

            {/* Build Guide (Level 4 only) */}
            {generatedTool.build_guide && (
              <div className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-[0.2em] mb-4">Build Guide — Claude Code</h3>
                <div className="space-y-4">
                  {(generatedTool.build_guide.steps || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-4 bg-zinc-800/50 rounded-xl p-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-violet-400">{i + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deploy */}
            <div className="text-center pt-4">
              {deployed ? (
                <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-500/30 rounded-2xl p-6 text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Deployed</h3>
                      <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Your test task is on the calendar</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="text-sm font-bold text-white">Project Created</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Check your <span className="text-gold font-semibold">Projects</span> tab</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl">
                      <span className="text-lg">☀️</span>
                      <div>
                        <p className="text-sm font-bold text-white">Morning Ops</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Your test task will appear in <span className="text-gold font-semibold">Today's Schedule</span> tomorrow</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={deployToCalendar} disabled={deploying}
                    className="px-8 py-4 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {deploying ? 'Deploying...' : 'Deploy Test Task to Calendar'}
                  </button>
                  <p className="text-zinc-600 text-xs mt-2">Creates a project with your test task scheduled for tomorrow morning</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={toastRef} className="fixed bottom-6 right-6 z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 transition-all duration-300" style={{ opacity: 0, transform: 'translateY(1rem)' }}>Saved</div>
    </div>
  )
}
