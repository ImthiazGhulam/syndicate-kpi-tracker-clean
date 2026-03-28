'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  return date.toISOString().split('T')[0]
}

function shiftWeek(weekStr, n) {
  const d = new Date(weekStr)
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(weekStr) {
  const start = new Date(weekStr)
  const end = new Date(weekStr)
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const defaultAdventures = () =>
  Array.from({ length: 6 }, (_, i) => ({
    order_index: i + 1, title: '', who_with: '', when_planned: '', where_planned: '', completed: false,
  }))

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, target, color = 'gold' }) {
  const colors = {
    gold:   { text: 'text-gold',       bar: 'bg-gold' },
    green:  { text: 'text-emerald-400', bar: 'bg-emerald-500' },
    blue:   { text: 'text-sky-400',     bar: 'bg-sky-500' },
    purple: { text: 'text-violet-400',  bar: 'bg-violet-500' },
  }
  const pct = target && value ? Math.min(100, Math.round((value / target) * 100)) : null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color].text}`}>{value ?? '—'}</p>
      {target && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-zinc-600 mb-1.5 uppercase tracking-wide">
            <span>Target: {target}</span>
            {pct != null && <span>{pct}%</span>}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors[color].bar}`} style={{ width: `${pct || 0}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientPage() {
  const router = useRouter()

  // Core
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('design')

  // Data
  const [kpis, setKpis] = useState([])
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])

  // KPI form
  const [kpiForm, setKpiForm] = useState({
    week_date: new Date().toISOString().split('T')[0],
    leads: '', outreach: '', sales: '', revenue: '', cost_per_lead: '', tasks_completed: '',
  })
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiSuccess, setKpiSuccess] = useState(false)

  // Check-in form
  const [checkinForm, setCheckinForm] = useState({
    checkin_date: new Date().toISOString().split('T')[0],
    rating: 3, well: '', challenges: '', next_focus: '',
  })
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  // Design™
  const [lifeDesign, setLifeDesign] = useState(null)
  const [designEditing, setDesignEditing] = useState(false)
  const [designLoading, setDesignLoading] = useState(false)
  const [designForm, setDesignForm] = useState({
    misoji: '', days_off_week: '', days_off_month: '', days_off_quarter: '', days_off_year: '',
    skill_1: '', skill_2: '', key_skill: '', money_task_1: '', money_task_2: '', money_task_3: '',
  })
  const [adventuresForm, setAdventuresForm] = useState(defaultAdventures())

  // Weekly War Map
  const [warMapTasks, setWarMapTasks] = useState([])
  const [warMapInput, setWarMapInput] = useState('')
  const [warMapWeek, setWarMapWeek] = useState(() => getMonday())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [actioningTask, setActioningTask] = useState(null) // { id, action }
  const [actionInput, setActionInput] = useState('')

  // ── Auth & Fetch ────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) { router.push('/admin'); return }
      setUser(session.user)
      await fetchAll(session.user.email)
    }
    init()
  }, [])

  const fetchAll = async (email) => {
    const { data: client } = await supabase.from('clients').select('*').eq('email', email).single()
    if (!client) { setLoading(false); return }
    setClientData(client)

    const year = new Date().getFullYear()

    const [kpisRes, checkinsRes, projectsRes, designRes, adventuresRes, warRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('client_id', client.id).order('week_date', { ascending: false }),
      supabase.from('checkins').select('*').eq('client_id', client.id).order('checkin_date', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
      supabase.from('life_design').select('*').eq('client_id', client.id).eq('year', year).maybeSingle(),
      supabase.from('mini_adventures').select('*').eq('client_id', client.id).eq('year', year).order('order_index'),
      supabase.from('war_map_tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
    ])

    if (kpisRes.data) setKpis(kpisRes.data)
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)

    if (designRes.data) {
      setLifeDesign(designRes.data)
      setDesignForm({ ...designForm, ...designRes.data })
      setDesignEditing(false)
    } else {
      setDesignEditing(true)
    }

    if (adventuresRes.data?.length > 0) {
      const merged = defaultAdventures().map((def) =>
        adventuresRes.data.find(a => a.order_index === def.order_index) || def
      )
      setAdventuresForm(merged)
    }

    if (warRes.data) setWarMapTasks(warRes.data)
    setLoading(false)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const submitKpi = async (e) => {
    e.preventDefault(); setKpiLoading(true)
    const payload = {
      client_id: clientData.id, week_date: kpiForm.week_date,
      leads: kpiForm.leads !== '' ? Number(kpiForm.leads) : null,
      outreach: kpiForm.outreach !== '' ? Number(kpiForm.outreach) : null,
      sales: kpiForm.sales !== '' ? Number(kpiForm.sales) : null,
      revenue: kpiForm.revenue !== '' ? Number(kpiForm.revenue) : null,
      cost_per_lead: kpiForm.cost_per_lead !== '' ? Number(kpiForm.cost_per_lead) : null,
      tasks_completed: kpiForm.tasks_completed !== '' ? Number(kpiForm.tasks_completed) : null,
    }
    const { error } = await supabase.from('kpis').insert([payload])
    if (!error) {
      setKpiSuccess(true)
      setKpiForm({ week_date: new Date().toISOString().split('T')[0], leads: '', outreach: '', sales: '', revenue: '', cost_per_lead: '', tasks_completed: '' })
      fetchAll(user.email)
      setTimeout(() => setKpiSuccess(false), 3000)
    }
    setKpiLoading(false)
  }

  const submitCheckin = async (e) => {
    e.preventDefault(); setCheckinLoading(true)
    const { error } = await supabase.from('checkins').insert([{ client_id: clientData.id, ...checkinForm, rating: Number(checkinForm.rating) }])
    if (!error) {
      setCheckinSuccess(true)
      setCheckinForm({ checkin_date: new Date().toISOString().split('T')[0], rating: 3, well: '', challenges: '', next_focus: '' })
      fetchAll(user.email)
      setTimeout(() => setCheckinSuccess(false), 3000)
    }
    setCheckinLoading(false)
  }

  const saveDesign = async () => {
    setDesignLoading(true)
    const year = new Date().getFullYear()

    const { data: saved } = await supabase
      .from('life_design')
      .upsert({ client_id: clientData.id, year, ...designForm, updated_at: new Date().toISOString() }, { onConflict: 'client_id,year' })
      .select().single()

    if (saved) setLifeDesign(saved)

    // Save adventures
    await supabase.from('mini_adventures').delete().eq('client_id', clientData.id).eq('year', year)
    const toSave = adventuresForm.filter(a => a.title?.trim()).map(a => ({ ...a, client_id: clientData.id, year }))
    if (toSave.length > 0) await supabase.from('mini_adventures').insert(toSave)

    setDesignEditing(false)
    setDesignLoading(false)
  }

  const toggleAdventureComplete = async (adventure) => {
    if (!adventure.id) return
    const { data } = await supabase.from('mini_adventures').update({ completed: !adventure.completed }).eq('id', adventure.id).select().single()
    if (data) setAdventuresForm(prev => prev.map(a => a.id === adventure.id ? data : a))
  }

  // War Map
  const addToBrainDump = async () => {
    if (!warMapInput.trim()) return
    const { data } = await supabase.from('war_map_tasks').insert([{
      client_id: clientData.id, title: warMapInput.trim(), status: 'brain_dump', week_of: warMapWeek,
    }]).select().single()
    if (data) setWarMapTasks(prev => [data, ...prev])
    setWarMapInput('')
  }

  const triageTask = async (taskId, status, extra = {}) => {
    const { data } = await supabase.from('war_map_tasks').update({ status, ...extra }).eq('id', taskId).select().single()
    if (data) setWarMapTasks(prev => prev.map(t => t.id === taskId ? data : t))
    setActioningTask(null)
    setActionInput('')
  }

  const completeTask = async (taskId) => {
    const { data } = await supabase.from('war_map_tasks').update({ completed: true }).eq('id', taskId).select().single()
    if (data) setWarMapTasks(prev => prev.map(t => t.id === taskId ? data : t))
  }

  const deleteTask = async (taskId) => {
    await supabase.from('war_map_tasks').delete().eq('id', taskId)
    setWarMapTasks(prev => prev.filter(t => t.id !== taskId))
  }

  // ── Formatters ──────────────────────────────────────────────────────────────

  const formatCurrency = (v) => v != null ? `£${Number(v).toLocaleString()}` : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  )

  if (!clientData) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center max-w-sm">
        <h2 className="text-white font-semibold mb-2">Account Not Found</h2>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">Your email isn't linked to a client account. Please contact your coach.</p>
        <button onClick={handleSignOut} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs uppercase tracking-widest font-semibold transition">Sign Out</button>
      </div>
    </div>
  )

  const latestKpi = kpis[0]
  const year = new Date().getFullYear()

  const tabs = [
    { id: 'design',     label: 'Design™' },
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'submit-kpis', label: 'Submit KPIs' },
    { id: 'check-in',   label: 'Check-In' },
    { id: 'projects',   label: 'Projects' },
    { id: 'war-map',    label: 'Weekly War Map' },
  ]

  // War map filtered views
  const weekBrainDump = warMapTasks.filter(t => t.status === 'brain_dump' && t.week_of === warMapWeek)
  const delegated     = warMapTasks.filter(t => t.status === 'delegate')
  const scheduled     = warMapTasks.filter(t => t.status === 'schedule')
  const doNow         = warMapTasks.filter(t => t.status === 'do_now')

  // Calendar data
  const scheduledDates = new Set(scheduled.filter(t => t.scheduled_date).map(t => t.scheduled_date))
  const todayStr = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calStartOffset = (firstDayOfMonth + 6) % 7
  const calCells = [...Array(calStartOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gold rounded flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-sm font-bold tracking-wider uppercase leading-none">The Syndicate</p>
            <p className="text-zinc-600 text-xs tracking-widest uppercase mt-0.5">{clientData.name}</p>
          </div>
          <p className="text-white text-sm font-bold tracking-wider uppercase sm:hidden">The Syndicate</p>
        </div>
        <button onClick={handleSignOut} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-7">

        {/* Welcome */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back, {clientData.name.split(' ')[0]}</h1>
          <p className="text-zinc-500 text-sm mt-1">{clientData.business} · {clientData.industry}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-7 gap-5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DESIGN™ ─────────────────────────────────────────────────────── */}
        {activeTab === 'design' && (
          <div>
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-widest">Design™</h2>
                <p className="text-zinc-600 text-xs mt-1">{year}</p>
              </div>
              {lifeDesign && !designEditing && (
                <button onClick={() => setDesignEditing(true)}
                  className="px-4 py-2 border border-zinc-700 hover:border-gold hover:text-gold text-zinc-400 text-xs uppercase tracking-widest font-semibold rounded transition">
                  Edit
                </button>
              )}
            </div>

            {designEditing ? (
              <div className="space-y-10">

                {/* Masoji */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Masoji</h3>
                  <p className="text-zinc-600 text-xs mb-4">Your single defining moment for {year}. The experience that will mark this year.</p>
                  <textarea
                    value={designForm.misoji}
                    onChange={e => setDesignForm({ ...designForm, misoji: e.target.value })}
                    rows={3}
                    placeholder="Describe your masoji for this year..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
                  />
                </section>

                {/* Mini Adventures */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Mini Adventures</h3>
                  <p className="text-zinc-600 text-xs mb-5">Six experiences outside of business — physical, travel, anything that fills you up.</p>
                  <div className="space-y-4">
                    {adventuresForm.map((adv, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Adventure {i + 1}</p>
                        <input
                          value={adv.title}
                          onChange={e => setAdventuresForm(prev => prev.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                          placeholder="What is it?"
                          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm mb-3"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { key: 'who_with', placeholder: 'Who with?' },
                            { key: 'when_planned', placeholder: 'When?' },
                            { key: 'where_planned', placeholder: 'Where?' },
                          ].map(({ key, placeholder }) => (
                            <input
                              key={key}
                              value={adv[key]}
                              onChange={e => setAdventuresForm(prev => prev.map((a, j) => j === i ? { ...a, [key]: e.target.value } : a))}
                              placeholder={placeholder}
                              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Days Off */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Days Off</h3>
                  <p className="text-zinc-600 text-xs mb-5">When are you protecting your time?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'days_off_week', label: 'Weekly' },
                      { key: 'days_off_month', label: 'Monthly' },
                      { key: 'days_off_quarter', label: 'Quarterly' },
                      { key: 'days_off_year', label: 'Annually' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
                        <input
                          value={designForm[key]}
                          onChange={e => setDesignForm({ ...designForm, [key]: e.target.value })}
                          placeholder={label === 'Weekly' ? 'e.g. Sundays' : label === 'Monthly' ? 'e.g. Last weekend' : label === 'Quarterly' ? 'e.g. One full week' : 'e.g. 2 weeks in August'}
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Skills</h3>
                  <p className="text-zinc-600 text-xs mb-5">What are you investing in developing this year?</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Skill 1</label>
                      <input value={designForm.skill_1} onChange={e => setDesignForm({ ...designForm, skill_1: e.target.value })} placeholder="e.g. Public speaking" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Skill 2</label>
                      <input value={designForm.skill_2} onChange={e => setDesignForm({ ...designForm, skill_2: e.target.value })} placeholder="e.g. Financial management" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gold uppercase tracking-widest mb-2">Key Skill — Primary Focus</label>
                      <input value={designForm.key_skill} onChange={e => setDesignForm({ ...designForm, key_skill: e.target.value })} placeholder="The one skill you're committed to mastering" className="w-full px-4 py-3 bg-zinc-800 border border-gold/40 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                  </div>
                </section>

                {/* Money-Making Tasks */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Top 3 Money-Making Tasks</h3>
                  <p className="text-zinc-600 text-xs mb-5">The three activities that directly generate revenue in your business.</p>
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => {
                      const key = `money_task_${n}`
                      return (
                        <div key={n} className="flex items-center gap-3">
                          <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                          <input
                            value={designForm[key]}
                            onChange={e => setDesignForm({ ...designForm, [key]: e.target.value })}
                            placeholder={`Money-making task ${n}`}
                            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                          />
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Save */}
                <div className="flex gap-3 pt-2">
                  <button onClick={saveDesign} disabled={designLoading}
                    className="px-8 py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                    {designLoading ? 'Saving...' : 'Save Design™'}
                  </button>
                  {lifeDesign && (
                    <button onClick={() => setDesignEditing(false)}
                      className="px-6 py-3.5 border border-zinc-700 text-zinc-400 hover:text-white text-xs uppercase tracking-widest font-semibold rounded transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

            ) : (
              /* View Mode */
              <div className="space-y-10">

                {/* Masoji */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Masoji</h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <p className="text-white text-sm leading-relaxed">{lifeDesign?.misoji || <span className="text-zinc-600">Not set</span>}</p>
                  </div>
                </section>

                {/* Mini Adventures */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Mini Adventures</h3>
                  <div className="space-y-3">
                    {adventuresForm.map((adv, i) => (
                      <div key={i} className={`bg-zinc-900 border rounded-lg p-4 flex items-start gap-4 ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
                        <button onClick={() => toggleAdventureComplete(adv)} className="mt-0.5 flex-shrink-0">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${adv.completed ? 'bg-gold border-gold' : 'border-zinc-600 hover:border-gold'}`}>
                            {adv.completed && (
                              <svg className="w-3 h-3 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          {adv.title ? (
                            <>
                              <p className={`font-semibold text-sm ${adv.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>{adv.title}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-zinc-500">
                                {adv.who_with && <span>With: {adv.who_with}</span>}
                                {adv.when_planned && <span>When: {adv.when_planned}</span>}
                                {adv.where_planned && <span>Where: {adv.where_planned}</span>}
                              </div>
                            </>
                          ) : (
                            <p className="text-zinc-700 text-sm italic">Adventure {i + 1} — not set</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Days Off */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Days Off</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'days_off_week', label: 'Weekly' },
                      { key: 'days_off_month', label: 'Monthly' },
                      { key: 'days_off_quarter', label: 'Quarterly' },
                      { key: 'days_off_year', label: 'Annually' },
                    ].map(({ key, label }) => (
                      <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
                        <p className="text-white text-sm font-medium">{lifeDesign?.[key] || <span className="text-zinc-700">—</span>}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Skills</h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                    {lifeDesign?.skill_1 && (
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 1</span>
                        <span className="text-zinc-300 text-sm">{lifeDesign.skill_1}</span>
                      </div>
                    )}
                    {lifeDesign?.skill_2 && (
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 2</span>
                        <span className="text-zinc-300 text-sm">{lifeDesign.skill_2}</span>
                      </div>
                    )}
                    {lifeDesign?.key_skill && (
                      <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                        <span className="text-gold text-xs uppercase tracking-widest w-16 font-semibold">Primary</span>
                        <span className="text-white text-sm font-semibold">{lifeDesign.key_skill}</span>
                      </div>
                    )}
                    {!lifeDesign?.skill_1 && !lifeDesign?.skill_2 && <p className="text-zinc-600 text-sm">Not set</p>}
                  </div>
                </section>

                {/* Money-Making Tasks */}
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Top 3 Money-Making Tasks</h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-3.5 flex items-center gap-4">
                        <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                        <span className="text-white text-sm">{lifeDesign?.[`money_task_${n}`] || <span className="text-zinc-700">Not set</span>}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ───────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-baseline gap-2 mb-5">
              <h2 className="text-base font-semibold text-white uppercase tracking-wider">Latest KPIs</h2>
              {latestKpi && <span className="text-zinc-600 text-xs">{formatDate(latestKpi.week_date)}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-9">
              <StatCard label="Leads"        value={latestKpi?.leads}  target={clientData.lead_target}  color="gold" />
              <StatCard label="Outreach"     value={latestKpi?.outreach} target={clientData.outreach_target} color="blue" />
              <StatCard label="Sales"        value={latestKpi?.sales}  color="purple" />
              <StatCard label="Revenue"      value={latestKpi?.revenue != null ? formatCurrency(latestKpi.revenue) : null} target={clientData.revenue_target ? formatCurrency(clientData.revenue_target) : null} color="green" />
              <StatCard label="Cost per Lead" value={latestKpi?.cost_per_lead != null ? formatCurrency(latestKpi.cost_per_lead) : null} color="gold" />
              <StatCard label="Tasks Done"   value={latestKpi?.tasks_completed} color="blue" />
            </div>
            {kpis.length > 1 && (
              <div>
                <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-5">KPI History</h2>
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900">
                        {['Week', 'Leads', 'Revenue', 'Sales'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.slice(1).map(kpi => (
                        <tr key={kpi.id} className="border-b border-zinc-900 hover:bg-zinc-900/60 transition">
                          <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">{formatDate(kpi.week_date)}</td>
                          <td className="px-4 py-3.5 text-zinc-300">{kpi.leads ?? '—'}</td>
                          <td className="px-4 py-3.5 text-emerald-400 font-medium">{kpi.revenue != null ? formatCurrency(kpi.revenue) : '—'}</td>
                          <td className="px-4 py-3.5 text-zinc-300">{kpi.sales ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUBMIT KPIs ──────────────────────────────────────────────────── */}
        {activeTab === 'submit-kpis' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-1">Submit Weekly KPIs</h2>
            <p className="text-zinc-500 text-sm mb-7">Fill in your numbers for the week.</p>
            {kpiSuccess && (
              <div className="mb-5 p-3.5 bg-emerald-900/20 border border-emerald-900 rounded text-emerald-400 text-xs uppercase tracking-wider font-semibold">
                KPIs submitted successfully
              </div>
            )}
            <form onSubmit={submitKpi} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Week Date</label>
                <input type="date" value={kpiForm.week_date} onChange={e => setKpiForm({ ...kpiForm, week_date: e.target.value })} required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'leads', label: 'Leads Generated' },
                  { key: 'outreach', label: 'Outreach Contacts' },
                  { key: 'sales', label: 'Sales Closed' },
                  { key: 'revenue', label: 'Revenue (£)' },
                  { key: 'cost_per_lead', label: 'Cost per Lead (£)' },
                  { key: 'tasks_completed', label: 'Tasks Completed' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
                    <input type="number" min="0" step={key === 'revenue' || key === 'cost_per_lead' ? '0.01' : '1'}
                      value={kpiForm[key]} onChange={e => setKpiForm({ ...kpiForm, [key]: e.target.value })} placeholder="0"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={kpiLoading}
                className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                {kpiLoading ? 'Submitting...' : 'Submit KPIs'}
              </button>
            </form>
          </div>
        )}

        {/* ── CHECK-IN ────────────────────────────────────────────────────── */}
        {activeTab === 'check-in' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-1">Weekly Check-In</h2>
            <p className="text-zinc-500 text-sm mb-7">Reflect on your week with your coach.</p>
            {checkinSuccess && (
              <div className="mb-5 p-3.5 bg-emerald-900/20 border border-emerald-900 rounded text-emerald-400 text-xs uppercase tracking-wider font-semibold">
                Check-in submitted successfully
              </div>
            )}
            <form onSubmit={submitCheckin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" value={checkinForm.checkin_date} onChange={e => setCheckinForm({ ...checkinForm, checkin_date: e.target.value })} required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  Overall Rating — <span className="text-gold">{checkinForm.rating}/5</span>
                </label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setCheckinForm({ ...checkinForm, rating: n })} className="focus:outline-none p-1">
                      <svg className={`w-8 h-8 transition ${n <= checkinForm.rating ? 'text-gold' : 'text-zinc-700 hover:text-zinc-500'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key: 'well', label: 'What went well this week?', color: 'text-emerald-500' },
                { key: 'challenges', label: 'What were your challenges?', color: 'text-red-500' },
                { key: 'next_focus', label: "What's your focus for next week?", color: 'text-sky-500' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${color}`}>{label}</label>
                  <textarea value={checkinForm[key]} onChange={e => setCheckinForm({ ...checkinForm, [key]: e.target.value })}
                    rows={3} placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
              ))}
              <button type="submit" disabled={checkinLoading}
                className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                {checkinLoading ? 'Submitting...' : 'Submit Check-In'}
              </button>
            </form>
          </div>
        )}

        {/* ── PROJECTS ────────────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div>
            <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-5">Your Projects</h2>
            {projects.length === 0 ? (
              <p className="text-center py-12 text-zinc-600 text-sm">No projects yet — your coach will add them.</p>
            ) : (
              <div className="space-y-3">
                {projects.map(p => {
                  const statusColors = {
                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    completed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
                    planning: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
                  }
                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h3 className="font-semibold text-white">{p.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${statusColors[p.status] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>{p.status}</span>
                        {p.priority && <span className="text-xs text-zinc-600 uppercase tracking-wider">{p.priority} priority</span>}
                      </div>
                      {p.description && <p className="text-zinc-400 text-sm leading-relaxed">{p.description}</p>}
                      <div className="flex gap-5 mt-3 text-xs text-zinc-600 uppercase tracking-wide">
                        {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                        {p.end_date && <span>End: {formatDate(p.end_date)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── WEEKLY WAR MAP ───────────────────────────────────────────────── */}
        {activeTab === 'war-map' && (
          <div>
            {/* Week selector */}
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-widest">Weekly War Map</h2>
                <p className="text-zinc-600 text-xs mt-1">{formatWeekRange(warMapWeek)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setWarMapWeek(w => shiftWeek(w, -1))}
                  className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setWarMapWeek(getMonday())}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-gold uppercase tracking-wider font-semibold transition">
                  Today
                </button>
                <button onClick={() => setWarMapWeek(w => shiftWeek(w, 1))}
                  className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* Brain Dump Input */}
            <div className="mb-7">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Brain Dump</p>
              <p className="text-zinc-600 text-xs mb-4">Get everything out of your head. Don't filter — just dump it all here.</p>
              <div className="flex gap-2">
                <input
                  value={warMapInput}
                  onChange={e => setWarMapInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addToBrainDump()}
                  placeholder="What's on your mind for this week?"
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                />
                <button onClick={addToBrainDump}
                  className="px-5 py-3 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition flex-shrink-0">
                  Add
                </button>
              </div>
            </div>

            {/* Brain Dump List */}
            {weekBrainDump.length > 0 && (
              <div className="mb-7">
                <div className="space-y-2">
                  {weekBrainDump.map(task => (
                    <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-white text-sm font-medium flex-1">{task.title}</p>
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {/* Triage buttons */}
                      {actioningTask?.id === task.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            autoFocus
                            value={actionInput}
                            onChange={e => setActionInput(e.target.value)}
                            placeholder={actioningTask.action === 'delegate' ? 'Who are you delegating to?' : 'Pick a date (e.g. 28 Mar)'}
                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-xs"
                          />
                          <button
                            onClick={() => {
                              if (actioningTask.action === 'delegate') {
                                triageTask(task.id, 'delegate', { delegated_to: actionInput })
                              } else {
                                triageTask(task.id, 'schedule', { scheduled_date: actionInput })
                              }
                            }}
                            className="px-3 py-2 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-wider rounded transition"
                          >
                            Confirm
                          </button>
                          <button onClick={() => { setActioningTask(null); setActionInput('') }}
                            className="px-3 py-2 border border-zinc-700 text-zinc-400 text-xs rounded transition hover:text-white">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setActioningTask({ id: task.id, action: 'delegate' }); setActionInput('') }}
                            className="px-3 py-1.5 border border-zinc-700 hover:border-violet-500 hover:text-violet-400 text-zinc-400 text-xs uppercase tracking-wider font-semibold rounded transition">
                            Delegate
                          </button>
                          <button onClick={() => { setActioningTask({ id: task.id, action: 'schedule' }); setActionInput('') }}
                            className="px-3 py-1.5 border border-zinc-700 hover:border-sky-500 hover:text-sky-400 text-zinc-400 text-xs uppercase tracking-wider font-semibold rounded transition">
                            Schedule
                          </button>
                          <button onClick={() => triageTask(task.id, 'do_now')}
                            className="px-3 py-1.5 border border-zinc-700 hover:border-gold hover:text-gold text-zinc-400 text-xs uppercase tracking-wider font-semibold rounded transition">
                            Do Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weekBrainDump.length === 0 && (
              <div className="mb-7 py-8 border border-dashed border-zinc-800 rounded-lg text-center">
                <p className="text-zinc-600 text-sm">Brain dump is clear — add tasks above to get started.</p>
              </div>
            )}

            {/* Triaged Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-9">

              {/* Delegated */}
              <div>
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Delegated <span className="text-zinc-600">({delegated.length})</span>
                </p>
                <div className="space-y-2">
                  {delegated.length === 0 && <p className="text-zinc-700 text-xs">Nothing delegated yet.</p>}
                  {delegated.map(task => (
                    <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg p-3 ${task.completed ? 'opacity-50' : ''}`}>
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                      {task.delegated_to && <p className="text-xs text-violet-400 mt-1">→ {task.delegated_to}</p>}
                      <div className="flex gap-2 mt-2">
                        {!task.completed && <button onClick={() => completeTask(task.id)} className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition">Done</button>}
                        <button onClick={() => deleteTask(task.id)} className="text-xs text-zinc-700 hover:text-red-400 uppercase tracking-wider transition">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduled */}
              <div>
                <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                  Scheduled <span className="text-zinc-600">({scheduled.length})</span>
                </p>
                <div className="space-y-2">
                  {scheduled.length === 0 && <p className="text-zinc-700 text-xs">Nothing scheduled yet.</p>}
                  {scheduled.map(task => (
                    <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg p-3 ${task.completed ? 'opacity-50' : ''}`}>
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                      {task.scheduled_date && <p className="text-xs text-sky-400 mt-1">{task.scheduled_date}</p>}
                      <div className="flex gap-2 mt-2">
                        {!task.completed && <button onClick={() => completeTask(task.id)} className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition">Done</button>}
                        <button onClick={() => deleteTask(task.id)} className="text-xs text-zinc-700 hover:text-red-400 uppercase tracking-wider transition">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Do Now */}
              <div>
                <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                  Do Now <span className="text-zinc-600">({doNow.length})</span>
                </p>
                <div className="space-y-2">
                  {doNow.length === 0 && <p className="text-zinc-700 text-xs">Nothing marked for immediate action.</p>}
                  {doNow.map(task => (
                    <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg p-3 ${task.completed ? 'opacity-50' : ''}`}>
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                      <div className="flex gap-2 mt-2">
                        {!task.completed && <button onClick={() => completeTask(task.id)} className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition">Done</button>}
                        <button onClick={() => deleteTask(task.id)} className="text-xs text-zinc-700 hover:text-red-400 uppercase tracking-wider transition">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="border-t border-zinc-800 pt-7">
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) } else setCalendarMonth(m => m - 1) }}
                    className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) } else setCalendarMonth(m => m + 1) }}
                    className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-zinc-700 py-2 uppercase tracking-wider font-semibold">{d}</div>
                ))}
                {calCells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const hasTasks = scheduledDates.has(dateStr)
                  const isToday = dateStr === todayStr
                  const dayTasks = scheduled.filter(t => t.scheduled_date === dateStr)
                  return (
                    <div key={day} title={dayTasks.map(t => t.title).join(', ')}
                      className={`aspect-square flex flex-col items-center justify-center rounded text-xs cursor-default ${
                        isToday ? 'bg-gold/20 text-gold font-bold' : hasTasks ? 'text-white' : 'text-zinc-600'
                      }`}>
                      <span>{day}</span>
                      {hasTasks && <div className="w-1 h-1 bg-gold rounded-full mt-0.5" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
