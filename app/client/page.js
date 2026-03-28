'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am – 9pm
const HOUR_H = 64 // px per hour

const TIME_OPTIONS = []
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    const period = h >= 12 ? 'pm' : 'am'
    const display = h > 12 ? h - 12 : h
    TIME_OPTIONS.push({
      value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      label: `${display}:${String(m).padStart(2, '0')} ${period}`,
    })
  }
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

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

function getWeekDays(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function getTimeTopPx(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h - 6) * HOUR_H + (m / 60) * HOUR_H
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')}${period}`
}

function formatWeekRange(weekStr) {
  const start = new Date(weekStr)
  const end = new Date(weekStr)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function formatDayHeader(dateStr) {
  const d = new Date(dateStr)
  return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.getDate() }
}

function defaultAdventures() {
  return Array.from({ length: 6 }, (_, i) => ({
    order_index: i + 1, title: '', who_with: '', when_planned: '', where_planned: '', completed: false,
  }))
}

function expandTasksForRange(tasks, startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T23:59:59')
  const result = []
  tasks.filter(t => t.status === 'schedule' && t.scheduled_date).forEach(task => {
    const recurring = task.recurring || 'none'
    let d = new Date(task.scheduled_date + 'T00:00:00')
    if (recurring === 'none') {
      if (d >= start && d <= end) result.push({ ...task, _displayDate: task.scheduled_date })
    } else {
      let iter = 0
      while (d <= end && iter < 500) {
        iter++
        const dateStr = d.toISOString().split('T')[0]
        if (d >= start) result.push({ ...task, _displayDate: dateStr })
        if (recurring === 'daily') d.setDate(d.getDate() + 1)
        else if (recurring === 'weekly') d.setDate(d.getDate() + 7)
        else if (recurring === 'monthly') d.setMonth(d.getMonth() + 1)
        else break
      }
    }
  })
  return result
}

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, target, color = 'gold' }) {
  const colors = {
    gold:   { text: 'text-gold',        bar: 'bg-gold' },
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
  const weekViewRef = useRef(null)

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
  const [calendarView, setCalendarView] = useState('month')
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayViewDate, setDayViewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [taskModal, setTaskModal] = useState(null)
  const [modalForm, setModalForm] = useState({ title: '', date: '', time: '', duration: 60, recurring: 'none' })
  const [delegatingTask, setDelegatingTask] = useState(null)
  const [delegateName, setDelegateName] = useState('')

  // ── Auto-scroll week view to 8am ────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'war-map' && calendarView === 'week' && weekViewRef.current) {
      weekViewRef.current.scrollTop = 2 * HOUR_H // scroll to 8am
    }
  }, [activeTab, calendarView])

  // ── Auth & Fetch ─────────────────────────────────────────────────────────────

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
      setDesignForm(f => ({ ...f, ...designRes.data }))
      setDesignEditing(false)
    } else {
      setDesignEditing(true)
    }

    if (adventuresRes.data?.length > 0) {
      const merged = defaultAdventures().map(def =>
        adventuresRes.data.find(a => a.order_index === def.order_index) || def
      )
      setAdventuresForm(merged)
    }

    if (warRes.data) setWarMapTasks(warRes.data)
    setLoading(false)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

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
  }

  const completeTask = async (taskId) => {
    const { data } = await supabase.from('war_map_tasks').update({ completed: true }).eq('id', taskId).select().single()
    if (data) setWarMapTasks(prev => prev.map(t => t.id === taskId ? data : t))
  }

  const deleteTask = async (taskId) => {
    await supabase.from('war_map_tasks').delete().eq('id', taskId)
    setWarMapTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const confirmDelegate = async (taskId) => {
    if (!delegateName.trim()) return
    await triageTask(taskId, 'delegate', { delegated_to: delegateName.trim() })
    setDelegatingTask(null)
    setDelegateName('')
  }

  // Modal helpers
  const openNewTaskModal = (date, time = '') => {
    setModalForm({ title: '', date, time, duration: 60, recurring: 'none' })
    setTaskModal({ mode: 'new' })
  }

  const openScheduleModal = (task) => {
    setModalForm({ title: task.title, date: todayStr, time: '09:00', duration: 60, recurring: 'none' })
    setTaskModal({ mode: 'schedule', taskId: task.id })
  }

  const openViewModal = (task) => {
    setTaskModal({ mode: 'view', task })
  }

  const saveTaskModal = async () => {
    if (!modalForm.title.trim() || !modalForm.date) return
    if (taskModal.mode === 'new') {
      const { data } = await supabase.from('war_map_tasks').insert([{
        client_id: clientData.id,
        title: modalForm.title.trim(),
        status: 'schedule',
        scheduled_date: modalForm.date,
        scheduled_time: modalForm.time || null,
        duration_minutes: Number(modalForm.duration),
        recurring: modalForm.recurring,
        week_of: getMonday(new Date(modalForm.date)),
      }]).select().single()
      if (data) setWarMapTasks(prev => [data, ...prev])
    } else if (taskModal.mode === 'schedule') {
      const { data } = await supabase.from('war_map_tasks').update({
        status: 'schedule',
        scheduled_date: modalForm.date,
        scheduled_time: modalForm.time || null,
        duration_minutes: Number(modalForm.duration),
        recurring: modalForm.recurring,
      }).eq('id', taskModal.taskId).select().single()
      if (data) setWarMapTasks(prev => prev.map(t => t.id === taskModal.taskId ? data : t))
    }
    setTaskModal(null)
  }

  // Formatters
  const formatCurrency = (v) => v != null ? `£${Number(v).toLocaleString()}` : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // ── Computed ──────────────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split('T')[0]
  const weekDays = getWeekDays(warMapWeek)
  const monthStart = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(calendarYear, calendarMonth + 1, 0).toISOString().split('T')[0]
  const tasksForWeek = expandTasksForRange(warMapTasks, weekDays[0], weekDays[6])
  const tasksForMonth = expandTasksForRange(warMapTasks, monthStart, monthEnd)
  const tasksForDay = expandTasksForRange(warMapTasks, dayViewDate, dayViewDate)

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calStartOffset = (firstDayOfMonth + 6) % 7
  const calCells = [...Array(calStartOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const brainDump = warMapTasks.filter(t => t.status === 'brain_dump')
  const delegated  = warMapTasks.filter(t => t.status === 'delegate')
  const doNow      = warMapTasks.filter(t => t.status === 'do_now')

  // ── Guards ────────────────────────────────────────────────────────────────────

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

  const tabs = [
    { id: 'design',      label: 'Design™' },
    { id: 'war-map',     label: 'Weekly War Map™' },
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'submit-kpis', label: 'Submit KPIs' },
    { id: 'check-in',    label: 'Check-In' },
    { id: 'projects',    label: 'Projects' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

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

      <div className="max-w-5xl mx-auto p-4 md:p-7">

        {/* Welcome */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back, {clientData.name.split(' ')[0]}</h1>
          <p className="text-zinc-500 text-sm mt-1">{clientData.business} · {clientData.industry}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-7 gap-1 sm:gap-5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 pt-1 px-2 sm:px-0 text-xs sm:text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DESIGN™ ──────────────────────────────────────────────────────── */}
        {activeTab === 'design' && (
          <div>
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-widest">Design™</h2>
                <p className="text-zinc-600 text-xs mt-1">{new Date().getFullYear()}</p>
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
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Masoji</h3>
                  <p className="text-zinc-600 text-xs mb-4">Your single defining moment for {new Date().getFullYear()}. The experience that will mark this year.</p>
                  <textarea value={designForm.misoji} onChange={e => setDesignForm({ ...designForm, misoji: e.target.value })}
                    rows={3} placeholder="Describe your masoji for this year..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Mini Adventures</h3>
                  <p className="text-zinc-600 text-xs mb-5">Six experiences outside of business — physical, travel, anything that fills you up.</p>
                  <div className="space-y-4">
                    {adventuresForm.map((adv, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Adventure {i + 1}</p>
                        <input value={adv.title} onChange={e => setAdventuresForm(prev => prev.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                          placeholder="What is it?"
                          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm mb-3" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[{ key: 'who_with', placeholder: 'Who with?' }, { key: 'when_planned', placeholder: 'When?' }, { key: 'where_planned', placeholder: 'Where?' }].map(({ key, placeholder }) => (
                            <input key={key} value={adv[key]} onChange={e => setAdventuresForm(prev => prev.map((a, j) => j === i ? { ...a, [key]: e.target.value } : a))}
                              placeholder={placeholder}
                              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Days Off</h3>
                  <p className="text-zinc-600 text-xs mb-5">When are you protecting your time?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'days_off_week', label: 'Weekly', placeholder: 'e.g. Sundays' },
                      { key: 'days_off_month', label: 'Monthly', placeholder: 'e.g. Last weekend' },
                      { key: 'days_off_quarter', label: 'Quarterly', placeholder: 'e.g. One full week' },
                      { key: 'days_off_year', label: 'Annually', placeholder: 'e.g. 2 weeks in August' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
                        <input value={designForm[key]} onChange={e => setDesignForm({ ...designForm, [key]: e.target.value })} placeholder={placeholder}
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Skills</h3>
                  <p className="text-zinc-600 text-xs mb-5">What are you investing in developing this year?</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Skill 1</label>
                      <input value={designForm.skill_1} onChange={e => setDesignForm({ ...designForm, skill_1: e.target.value })} placeholder="e.g. Public speaking"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Skill 2</label>
                      <input value={designForm.skill_2} onChange={e => setDesignForm({ ...designForm, skill_2: e.target.value })} placeholder="e.g. Financial management"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gold uppercase tracking-widest mb-2">Key Skill — Primary Focus</label>
                      <input value={designForm.key_skill} onChange={e => setDesignForm({ ...designForm, key_skill: e.target.value })} placeholder="The one skill you're committed to mastering"
                        className="w-full px-4 py-3 bg-zinc-800 border border-gold/40 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Top 3 Money-Making Tasks</h3>
                  <p className="text-zinc-600 text-xs mb-5">The three activities that directly generate revenue in your business.</p>
                  <div className="space-y-3">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="flex items-center gap-3">
                        <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                        <input value={designForm[`money_task_${n}`]} onChange={e => setDesignForm({ ...designForm, [`money_task_${n}`]: e.target.value })}
                          placeholder={`Money-making task ${n}`}
                          className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                      </div>
                    ))}
                  </div>
                </section>

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
              <div className="space-y-10">
                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Masoji</h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <p className="text-white text-sm leading-relaxed">{lifeDesign?.misoji || <span className="text-zinc-600">Not set</span>}</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Mini Adventures</h3>
                  <div className="space-y-3">
                    {adventuresForm.map((adv, i) => (
                      <div key={i} className={`bg-zinc-900 border rounded-lg p-4 flex items-start gap-4 ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
                        <button onClick={() => toggleAdventureComplete(adv)} className="mt-0.5 flex-shrink-0">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${adv.completed ? 'bg-gold border-gold' : 'border-zinc-600 hover:border-gold'}`}>
                            {adv.completed && <svg className="w-3 h-3 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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

                <section>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Skills</h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                    {lifeDesign?.skill_1 && <div className="flex items-center gap-3"><span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 1</span><span className="text-zinc-300 text-sm">{lifeDesign.skill_1}</span></div>}
                    {lifeDesign?.skill_2 && <div className="flex items-center gap-3"><span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 2</span><span className="text-zinc-300 text-sm">{lifeDesign.skill_2}</span></div>}
                    {lifeDesign?.key_skill && <div className="flex items-center gap-3 pt-2 border-t border-zinc-800"><span className="text-gold text-xs uppercase tracking-widest w-16 font-semibold">Primary</span><span className="text-white text-sm font-semibold">{lifeDesign.key_skill}</span></div>}
                    {!lifeDesign?.skill_1 && !lifeDesign?.skill_2 && <p className="text-zinc-600 text-sm">Not set</p>}
                  </div>
                </section>

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

        {/* ── WEEKLY WAR MAP™ ───────────────────────────────────────────────── */}
        {activeTab === 'war-map' && (
          <div>

            {/* Brain Dump */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Brain Dump</h3>
                {brainDump.length > 0 && <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded font-semibold">{brainDump.length}</span>}
              </div>
              <p className="text-zinc-600 text-xs mb-3">Get everything out of your head. Don't filter — just dump it all, then decide.</p>
              <div className="flex gap-2 mb-3">
                <input value={warMapInput} onChange={e => setWarMapInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToBrainDump()}
                  placeholder="What's on your mind?"
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                <button onClick={addToBrainDump} className="px-5 py-2.5 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition flex-shrink-0">Add</button>
              </div>

              {brainDump.length > 0 && (
                <div className="space-y-1.5">
                  {brainDump.map(task => (
                    <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm text-white min-w-0 break-words">{task.title}</p>
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition p-1 flex-shrink-0 -mt-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => openScheduleModal(task)} className="text-xs text-sky-400 hover:text-sky-300 uppercase tracking-wider font-semibold px-2.5 py-1.5 rounded hover:bg-sky-400/10 transition">Schedule</button>
                        <button onClick={() => setDelegatingTask(delegatingTask === task.id ? null : task.id)} className="text-xs text-violet-400 hover:text-violet-300 uppercase tracking-wider font-semibold px-2.5 py-1.5 rounded hover:bg-violet-400/10 transition">Delegate</button>
                        <button onClick={() => triageTask(task.id, 'do_now')} className="text-xs text-gold hover:text-gold-light uppercase tracking-wider font-semibold px-2.5 py-1.5 rounded hover:bg-gold/10 transition">Do Now</button>
                      </div>
                      {delegatingTask === task.id && (
                        <div className="flex items-center gap-2 mt-2 pl-0">
                          <input autoFocus value={delegateName} onChange={e => setDelegateName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmDelegate(task.id)}
                            placeholder="Who are you delegating to?"
                            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold text-xs" />
                          <button onClick={() => confirmDelegate(task.id)} className="px-3 py-1.5 bg-gold text-zinc-950 font-bold text-xs rounded transition">✓</button>
                          <button onClick={() => { setDelegatingTask(null); setDelegateName('') }} className="px-3 py-1.5 border border-zinc-700 text-zinc-500 text-xs rounded transition">✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between sm:justify-start gap-1">
                <div className="flex items-center gap-0.5">
                  <button onClick={() => {
                      if (calendarView === 'day') setDayViewDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split('T')[0] })
                      else if (calendarView === 'week') setWarMapWeek(w => shiftWeek(w, -1))
                      else { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) } else setCalendarMonth(m => m - 1) }
                    }}
                    className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-semibold text-white min-w-[140px] sm:min-w-[200px] text-center">
                    {calendarView === 'day'
                      ? new Date(dayViewDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                      : calendarView === 'week'
                        ? formatWeekRange(warMapWeek)
                        : `${MONTH_NAMES[calendarMonth]} ${calendarYear}`}
                  </span>
                  <button onClick={() => {
                      if (calendarView === 'day') setDayViewDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0] })
                      else if (calendarView === 'week') setWarMapWeek(w => shiftWeek(w, 1))
                      else { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) } else setCalendarMonth(m => m + 1) }
                    }}
                    className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
                <button onClick={() => { setDayViewDate(todayStr); setWarMapWeek(getMonday()); setCalendarYear(new Date().getFullYear()); setCalendarMonth(new Date().getMonth()) }}
                  className="px-2.5 py-1 text-xs text-zinc-500 hover:text-gold uppercase tracking-wider font-semibold transition">
                  Today
                </button>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button onClick={() => openNewTaskModal(calendarView === 'day' ? dayViewDate : todayStr)}
                  className="px-4 py-2 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                  + Add
                </button>
                <div className="flex border border-zinc-700 rounded overflow-hidden">
                  <button onClick={() => setCalendarView('day')}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'day' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
                    Day
                  </button>
                  <button onClick={() => setCalendarView('week')}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'week' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
                    Week
                  </button>
                  <button onClick={() => setCalendarView('month')}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'month' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
                    Month
                  </button>
                </div>
              </div>
            </div>

            {/* ── DAY VIEW ──────────────────────────────────────────────── */}
            {calendarView === 'day' && (() => {
              const dayTasksAll = tasksForDay
              const timedTasks = dayTasksAll.filter(t => t.scheduled_time)
              const allDayTasks = dayTasksAll.filter(t => !t.scheduled_time)
              const { day: dayName } = formatDayHeader(dayViewDate)
              return (
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* All-day tasks */}
                  {allDayTasks.length > 0 && (
                    <div className="px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/40 space-y-1.5">
                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">All Day</p>
                      {allDayTasks.map(task => (
                        <div key={`${task.id}-${task._displayDate}`}
                          onClick={() => openViewModal(task)}
                          className={`text-sm px-3 py-2 rounded cursor-pointer ${task.completed ? 'bg-zinc-800 text-zinc-500 line-through' : 'bg-gold/20 text-gold active:bg-gold/30 transition'}`}>
                          {task.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scrollable time grid */}
                  <div ref={weekViewRef} className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
                    <div className="relative" style={{ minHeight: `${HOURS.length * HOUR_H}px` }}>
                      {/* Hour slots */}
                      {HOURS.map((h, i) => (
                        <div key={h}
                          style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}
                          className="absolute inset-x-0 flex border-t border-zinc-800/40 active:bg-zinc-800/30 cursor-pointer transition"
                          onClick={() => openNewTaskModal(dayViewDate, `${String(h).padStart(2, '0')}:00`)}>
                          <div className="w-14 flex-shrink-0 text-right pr-3 pt-1">
                            <span className="text-xs text-zinc-600">{h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}</span>
                          </div>
                        </div>
                      ))}

                      {/* Timed tasks */}
                      {timedTasks.map((task, tIdx) => {
                        const top = getTimeTopPx(task.scheduled_time)
                        const height = Math.max(40, ((task.duration_minutes || 60) / 60) * HOUR_H)
                        return (
                          <div key={`${task.id}-${task._displayDate}`}
                            style={{ top: `${top}px`, height: `${height}px`, left: '60px' }}
                            className={`absolute right-2 rounded-lg px-3 py-2 overflow-hidden cursor-pointer z-10 border ${
                              task.completed
                                ? 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
                                : 'bg-gold/20 border-gold/40 text-gold active:bg-gold/30 transition'
                            }`}
                            onClick={e => { e.stopPropagation(); openViewModal(task) }}>
                            <p className="font-semibold text-sm truncate leading-tight">{task.title}</p>
                            {height > 44 && <p className="text-gold/60 mt-0.5 text-xs">{formatTime(task.scheduled_time)}{task.duration_minutes ? ` · ${task.duration_minutes}min` : ''}</p>}
                            {task.recurring && task.recurring !== 'none' && <span className="text-gold/50 text-xs"> ↻ {task.recurring}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── WEEK VIEW ─────────────────────────────────────────────── */}
            {calendarView === 'week' && (
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <div ref={weekViewRef} className="overflow-auto" style={{ maxHeight: '560px' }}>
                  <div style={{ minWidth: '560px' }}>
                    {/* Day headers — sticky top */}
                    <div className="flex sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800" style={{ paddingLeft: '48px' }}>
                      {weekDays.map(dateStr => {
                        const { day, date } = formatDayHeader(dateStr)
                        const isToday = dateStr === todayStr
                        return (
                          <div key={dateStr}
                            className={`flex-1 text-center py-2.5 border-l border-zinc-800 cursor-pointer active:bg-zinc-800/40 ${isToday ? 'bg-gold/10' : ''}`}
                            onClick={() => { setDayViewDate(dateStr); setCalendarView('day') }}>
                            <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest">{day}</p>
                            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 text-xs sm:text-sm font-bold ${isToday ? 'bg-gold text-zinc-950' : 'text-zinc-300'}`}>
                              {date}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Time grid */}
                    <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_H}px` }}>

                      {/* Time labels */}
                      <div className="flex-shrink-0 relative bg-zinc-900/30" style={{ width: '48px', minHeight: `${HOURS.length * HOUR_H}px` }}>
                        {HOURS.map((h, i) => (
                          <div key={h} style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}
                            className="absolute inset-x-0 flex items-start justify-end pr-2 pt-1 border-t border-zinc-800/50">
                            <span className="text-[10px] sm:text-xs text-zinc-600">{h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}</span>
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {weekDays.map(dateStr => {
                        const isToday = dateStr === todayStr
                        const dayTasks = tasksForWeek.filter(t => t._displayDate === dateStr)
                        const timedTasks = dayTasks.filter(t => t.scheduled_time)
                        const allDayTasks = dayTasks.filter(t => !t.scheduled_time)

                        return (
                          <div key={dateStr} className={`flex-1 relative border-l border-zinc-800 ${isToday ? 'bg-gold/[0.03]' : ''}`}
                            style={{ minHeight: `${HOURS.length * HOUR_H}px` }}>

                            {/* All-day tasks strip */}
                            {allDayTasks.length > 0 && (
                              <div className="px-0.5 pt-0.5 pb-1 border-b border-zinc-800/50 space-y-0.5 z-10 relative bg-zinc-900/40">
                                {allDayTasks.map(task => (
                                  <div key={`${task.id}-${task._displayDate}`}
                                    onClick={() => openViewModal(task)}
                                    className={`text-[10px] sm:text-xs px-1 py-0.5 rounded cursor-pointer truncate ${task.completed ? 'bg-zinc-800 text-zinc-500 line-through' : 'bg-gold/20 text-gold active:bg-gold/30 transition'}`}>
                                    {task.title}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Hour slot backgrounds */}
                            {HOURS.map((h, i) => (
                              <div key={h}
                                style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}
                                className="absolute inset-x-0 border-t border-zinc-800/40 active:bg-zinc-800/20 cursor-pointer transition"
                                onClick={() => openNewTaskModal(dateStr, `${String(h).padStart(2, '0')}:00`)}>
                              </div>
                            ))}

                            {/* Timed tasks */}
                            {timedTasks.map((task, tIdx) => {
                              const top = getTimeTopPx(task.scheduled_time)
                              const height = Math.max(24, ((task.duration_minutes || 60) / 60) * HOUR_H)
                              return (
                                <div key={`${task.id}-${task._displayDate}`}
                                  style={{ top: `${top}px`, height: `${height}px`, left: `${tIdx * 2}px` }}
                                  className={`absolute right-0.5 rounded px-1 py-0.5 text-[10px] sm:text-xs overflow-hidden cursor-pointer z-10 border ${
                                    task.completed
                                      ? 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
                                      : 'bg-gold/20 border-gold/40 text-gold active:bg-gold/30 transition'
                                  }`}
                                  onClick={e => { e.stopPropagation(); openViewModal(task) }}>
                                  <p className="font-semibold truncate leading-tight">{task.title}</p>
                                  {height > 36 && <p className="text-gold/60 mt-0.5 text-[9px] sm:text-[10px]">{formatTime(task.scheduled_time)}</p>}
                                  {task.recurring && task.recurring !== 'none' && <span className="text-gold/50 text-[9px]"> ↻</span>}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MONTH VIEW ────────────────────────────────────────────── */}
            {calendarView === 'month' && (
              <div>
                <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
                  {[['M','Mon'],['T','Tue'],['W','Wed'],['T','Thu'],['F','Fri'],['S','Sat'],['S','Sun']].map(([short, full], i) => (
                    <div key={i} className="bg-zinc-950 py-2 text-center text-[10px] sm:text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      <span className="sm:hidden">{short}</span>
                      <span className="hidden sm:inline">{full}</span>
                    </div>
                  ))}
                  {calCells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} className="bg-zinc-950 h-16 sm:h-20 md:h-24" />
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayTasks = tasksForMonth.filter(t => t._displayDate === dateStr)
                    const isToday = dateStr === todayStr
                    const isSelected = selectedDay === dateStr
                    return (
                      <div key={day}
                        className={`bg-zinc-950 h-16 sm:h-20 md:h-24 p-1 sm:p-1.5 cursor-pointer active:bg-zinc-900/60 hover:bg-zinc-900/60 transition ${isSelected ? 'ring-1 ring-inset ring-gold bg-zinc-900/40' : ''}`}
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}>
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${isToday ? 'bg-gold text-zinc-950' : 'text-zinc-500'}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5 mt-0.5 hidden sm:block">
                          {dayTasks.slice(0, 2).map(task => (
                            <div key={`${task.id}-${task._displayDate}`}
                              className={`text-[10px] px-1 py-0.5 rounded truncate leading-tight ${task.completed ? 'text-zinc-600 line-through' : 'bg-gold/20 text-gold'}`}>
                              {task.scheduled_time ? formatTime(task.scheduled_time) + ' ' : ''}{task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && <div className="text-[10px] text-zinc-600 px-1">+{dayTasks.length - 2} more</div>}
                        </div>
                        {/* Mobile: just show dot indicators */}
                        {dayTasks.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5 sm:hidden justify-center">
                            {dayTasks.slice(0, 3).map((task, idx) => (
                              <div key={idx} className={`w-1 h-1 rounded-full ${task.completed ? 'bg-zinc-600' : 'bg-gold'}`} />
                            ))}
                            {dayTasks.length > 3 && <div className="w-1 h-1 rounded-full bg-zinc-600" />}
                          </div>
                        )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Day Panel */}
                {selectedDay && (
                  <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-white">
                        {new Date(selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <button onClick={() => openNewTaskModal(selectedDay)}
                        className="px-3 py-1.5 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                        + Add
                      </button>
                    </div>
                    {tasksForMonth.filter(t => t._displayDate === selectedDay).length === 0 ? (
                      <p className="text-zinc-600 text-sm">No tasks scheduled — click + Add to create one.</p>
                    ) : (
                      <div className="space-y-2">
                        {tasksForMonth.filter(t => t._displayDate === selectedDay).map(task => (
                          <div key={`${task.id}-${task._displayDate}`}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 border cursor-pointer transition ${
                              task.completed ? 'border-zinc-800 opacity-50' : 'border-zinc-800 hover:border-gold/30'
                            }`}
                            onClick={() => openViewModal(task)}>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                              <div className="flex gap-3 mt-0.5 text-xs text-zinc-600">
                                {task.scheduled_time && <span className="text-gold/70">{formatTime(task.scheduled_time)}{task.duration_minutes ? ` · ${task.duration_minutes}min` : ''}</span>}
                                {task.recurring && task.recurring !== 'none' && <span>↻ {task.recurring}</span>}
                              </div>
                            </div>
                            {!task.completed && (
                              <button onClick={e => { e.stopPropagation(); completeTask(task.id) }}
                                className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition flex-shrink-0">Done</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delegated + Do Now */}
            {(delegated.length > 0 || doNow.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 pt-7 border-t border-zinc-800">
                <div>
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                    Delegated <span className="text-zinc-600">({delegated.length})</span>
                  </p>
                  <div className="space-y-1.5">
                    {delegated.length === 0 && <p className="text-zinc-700 text-xs">Nothing delegated yet.</p>}
                    {delegated.map(task => (
                      <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-40' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                          {task.delegated_to && <p className="text-xs text-violet-400 mt-0.5">→ {task.delegated_to}</p>}
                        </div>
                        {!task.completed && <button onClick={() => completeTask(task.id)} className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition flex-shrink-0">Done</button>}
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                    Do Now <span className="text-zinc-600">({doNow.length})</span>
                  </p>
                  <div className="space-y-1.5">
                    {doNow.length === 0 && <p className="text-zinc-700 text-xs">Nothing marked for immediate action.</p>}
                    {doNow.map(task => (
                      <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-40' : ''}`}>
                        <p className={`text-sm font-medium flex-1 truncate ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                        {!task.completed && <button onClick={() => completeTask(task.id)} className="text-xs text-zinc-500 hover:text-emerald-400 uppercase tracking-wider transition flex-shrink-0">Done</button>}
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TASK MODAL ────────────────────────────────────────────── */}
            {taskModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4"
                onClick={() => setTaskModal(null)}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}>

                  {/* Mobile drag handle */}
                  <div className="flex justify-center mb-3 sm:hidden">
                    <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                      {taskModal.mode === 'view' ? 'Task' : taskModal.mode === 'schedule' ? 'Schedule Task' : 'Add Task'}
                    </h3>
                    <button onClick={() => setTaskModal(null)} className="text-zinc-500 hover:text-white active:text-white transition p-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {taskModal.mode === 'view' ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Task</p>
                        <p className="text-white font-medium">{taskModal.task.title}</p>
                      </div>
                      {taskModal.task.scheduled_date && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Date</p>
                          <p className="text-zinc-300 text-sm">{new Date(taskModal.task.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      )}
                      {taskModal.task.scheduled_time && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Time</p>
                          <p className="text-zinc-300 text-sm">{formatTime(taskModal.task.scheduled_time)}{taskModal.task.duration_minutes ? ` · ${taskModal.task.duration_minutes} min` : ''}</p>
                        </div>
                      )}
                      {taskModal.task.recurring && taskModal.task.recurring !== 'none' && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Repeats</p>
                          <p className="text-zinc-300 text-sm capitalize">{taskModal.task.recurring}</p>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        {!taskModal.task.completed && (
                          <button onClick={() => { completeTask(taskModal.task.id); setTaskModal(null) }}
                            className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded transition">
                            Mark Done
                          </button>
                        )}
                        <button onClick={() => { deleteTask(taskModal.task.id); setTaskModal(null) }}
                          className="flex-1 py-2.5 border border-red-900 hover:bg-red-900/20 text-red-400 font-bold text-xs uppercase tracking-widest rounded transition">
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Task</label>
                        <input autoFocus={taskModal.mode === 'new'} value={modalForm.title}
                          onChange={e => setModalForm({ ...modalForm, title: e.target.value })}
                          readOnly={taskModal.mode === 'schedule'}
                          placeholder="What needs to be done?"
                          className={`w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm ${taskModal.mode === 'schedule' ? 'opacity-70' : ''}`} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Date</label>
                          <input type="date" value={modalForm.date} onChange={e => setModalForm({ ...modalForm, date: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Time</label>
                          <select value={modalForm.time} onChange={e => setModalForm({ ...modalForm, time: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm">
                            <option value="">No time</option>
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Duration</label>
                          <select value={modalForm.duration} onChange={e => setModalForm({ ...modalForm, duration: Number(e.target.value) })}
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm">
                            <option value={30}>30 min</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                            <option value={180}>3 hours</option>
                            <option value={240}>4 hours</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Repeat</label>
                          <select value={modalForm.recurring} onChange={e => setModalForm({ ...modalForm, recurring: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm">
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button onClick={saveTaskModal} disabled={!modalForm.title.trim() || !modalForm.date}
                          className="flex-1 py-3 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                          {taskModal.mode === 'schedule' ? 'Schedule Task' : 'Add to Calendar'}
                        </button>
                        <button onClick={() => setTaskModal(null)}
                          className="px-4 py-3 border border-zinc-700 text-zinc-400 hover:text-white text-xs uppercase tracking-widest font-semibold rounded transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ────────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-baseline gap-2 mb-5">
              <h2 className="text-base font-semibold text-white uppercase tracking-wider">Latest KPIs</h2>
              {latestKpi && <span className="text-zinc-600 text-xs">{formatDate(latestKpi.week_date)}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-9">
              <StatCard label="Leads"         value={latestKpi?.leads}  target={clientData.lead_target}  color="gold" />
              <StatCard label="Outreach"      value={latestKpi?.outreach} target={clientData.outreach_target} color="blue" />
              <StatCard label="Sales"         value={latestKpi?.sales}  color="purple" />
              <StatCard label="Revenue"       value={latestKpi?.revenue != null ? formatCurrency(latestKpi.revenue) : null} target={clientData.revenue_target ? formatCurrency(clientData.revenue_target) : null} color="green" />
              <StatCard label="Cost per Lead" value={latestKpi?.cost_per_lead != null ? formatCurrency(latestKpi.cost_per_lead) : null} color="gold" />
              <StatCard label="Tasks Done"    value={latestKpi?.tasks_completed} color="blue" />
            </div>
            {kpis.length > 1 && (
              <div>
                <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-5">KPI History</h2>
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900">
                        {['Week','Leads','Revenue','Sales'].map(h => (
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
            {kpiSuccess && <div className="mb-5 p-3.5 bg-emerald-900/20 border border-emerald-900 rounded text-emerald-400 text-xs uppercase tracking-wider font-semibold">KPIs submitted successfully</div>}
            <form onSubmit={submitKpi} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Week Date</label>
                <input type="date" value={kpiForm.week_date} onChange={e => setKpiForm({ ...kpiForm, week_date: e.target.value })} required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'leads', label: 'Leads Generated' }, { key: 'outreach', label: 'Outreach Contacts' },
                  { key: 'sales', label: 'Sales Closed' }, { key: 'revenue', label: 'Revenue (£)' },
                  { key: 'cost_per_lead', label: 'Cost per Lead (£)' }, { key: 'tasks_completed', label: 'Tasks Completed' },
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

        {/* ── CHECK-IN ─────────────────────────────────────────────────────── */}
        {activeTab === 'check-in' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-1">Weekly Check-In</h2>
            <p className="text-zinc-500 text-sm mb-7">Reflect on your week with your coach.</p>
            {checkinSuccess && <div className="mb-5 p-3.5 bg-emerald-900/20 border border-emerald-900 rounded text-emerald-400 text-xs uppercase tracking-wider font-semibold">Check-in submitted successfully</div>}
            <form onSubmit={submitCheckin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" value={checkinForm.checkin_date} onChange={e => setCheckinForm({ ...checkinForm, checkin_date: e.target.value })} required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Overall Rating — <span className="text-gold">{checkinForm.rating}/5</span></label>
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

        {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
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

      </div>
    </div>
  )
}
