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

const KPI_COLS = [
  { key: 'total_followers', label: 'Total Followers', group: 'audience', input: true },
  { key: 'new_followers', label: 'New Followers', group: 'audience', input: true },
  { key: 'qual_followers', label: 'Qual. Followers', group: 'audience', input: true },
  { key: 'ad_spend', label: 'Ad Spend (£)', group: 'audience', input: true, step: '0.01' },
  { key: 'cost_per_qual', label: 'Cost/Qual', group: 'audience', calc: r => r.qual_followers ? '£' + (r.ad_spend / r.qual_followers).toFixed(2) : '—' },
  { key: 'content_posted', label: 'Content', group: 'audience', input: true },
  { key: 'new_convos', label: 'New Convos', group: 'convos', input: true },
  { key: 'aud_conv_pct', label: 'Aud→Conv %', group: 'convos', calc: r => r.new_followers ? Math.round(r.new_convos / r.new_followers * 100) + '%' : '—' },
  { key: 'responded', label: 'Responded', group: 'convos', input: true },
  { key: 'response_rate', label: 'Resp %', group: 'convos', calc: r => r.new_convos ? Math.round(r.responded / r.new_convos * 100) + '%' : '—' },
  { key: 'triage_calls', label: 'Triage', group: 'calls', input: true },
  { key: 'triage_conv_pct', label: 'Triage %', group: 'calls', calc: r => r.responded ? Math.round(r.triage_calls / r.responded * 100) + '%' : '—' },
  { key: 'calls_booked', label: 'Booked', group: 'calls', input: true },
  { key: 'calls_taken', label: 'Taken', group: 'calls', input: true },
  { key: 'show_up_pct', label: 'Show %', group: 'calls', calc: r => r.calls_booked ? Math.round(r.calls_taken / r.calls_booked * 100) + '%' : '—' },
  { key: 'offers', label: 'Offers', group: 'sales', input: true },
  { key: 'no_shows', label: 'No Shows', group: 'sales', input: true },
  { key: 'follow_ups', label: 'Follow Ups', group: 'sales', input: true },
  { key: 'closed', label: 'Closed', group: 'sales', input: true },
  { key: 'close_rate', label: 'Close %', group: 'sales', calc: r => r.offers ? Math.round(r.closed / r.offers * 100) + '%' : '—' },
  { key: 'cash_collected', label: 'Cash (£)', group: 'sales', input: true, step: '0.01' },
  { key: 'revenue', label: 'Revenue (£)', group: 'sales', input: true, step: '0.01' },
]

const KPI_GROUPS = [
  { id: 'audience', label: 'Audience', color: 'text-sky-400 border-sky-400/30' },
  { id: 'convos', label: 'Conversations', color: 'text-violet-400 border-violet-400/30' },
  { id: 'calls', label: 'Calls', color: 'text-gold border-gold/30' },
  { id: 'sales', label: 'Sales', color: 'text-emerald-400 border-emerald-400/30' },
]

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

// ── Toast ───────────────────────────────────────────────────────────────────

function SaveToast({ show }) {
  if (!show) return null
  return (
    <div className="fixed top-4 right-4 z-50 toast-in">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Saved</span>
      </div>
    </div>
  )
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syndicate_active_tab') || 'progress'
    }
    return 'progress'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const toastRef = useRef(null)

  const flash = () => {
    if (toastRef.current) {
      toastRef.current.style.display = 'flex'
      toastRef.current.style.animation = 'none'
      toastRef.current.offsetHeight // force reflow
      toastRef.current.style.animation = ''
      toastRef.current.classList.add('toast-in')
      clearTimeout(toastRef.current._timer)
      toastRef.current._timer = setTimeout(() => {
        if (toastRef.current) toastRef.current.style.display = 'none'
      }, 2000)
    }
  }
  const switchTab = (id) => { setActiveTab(id); localStorage.setItem('syndicate_active_tab', id); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  // Data
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])

  // Dashboard — daily KPI tracker
  const [monthlyKpis, setMonthlyKpis] = useState({})
  const [kpiMonth, setKpiMonth] = useState(new Date().getMonth())
  const [kpiYear, setKpiYear] = useState(new Date().getFullYear())

  // Projects — CRUD
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'not_started', priority: 'medium', start_date: '', end_date: '', links: '', resources: '' })
  const [projectTasks, setProjectTasks] = useState({})
  const [newTaskInputs, setNewTaskInputs] = useState({})
  const [expandedProjects, setExpandedProjects] = useState({})

  // Hot List — lead pipeline
  const [leads, setLeads] = useState([])
  const [addingLeadCol, setAddingLeadCol] = useState(null)
  const [newLeadName, setNewLeadName] = useState('')
  const [newLeadIG, setNewLeadIG] = useState('')
  const [dragLead, setDragLead] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [editingLead, setEditingLead] = useState(null)
  const [leadForm, setLeadForm] = useState({ name: '', instagram: '', notes: '' })

  // Check-in form
  const [checkinForm, setCheckinForm] = useState({
    checkin_date: new Date().toISOString().split('T')[0],
    rating: 3, well: '', challenges: '', next_focus: '',
  })
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  // Identity Chamber
  const [identityAffirmations, setIdentityAffirmations] = useState('')
  const [identitySaving, setIdentitySaving] = useState(false)

  // Evening Ops
  const [eveningPulse, setEveningPulse] = useState({})
  const [eveningPulseDate, setEveningPulseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [eveningSaving, setEveningSaving] = useState(false)

  // The Lock In — weekly review
  const [weeklyReview, setWeeklyReview] = useState({})
  // Lock In reviews the previous week — on Sunday, review the current (ending) week; Mon-Sat, review last week
  const [reviewWeek, setReviewWeek] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    if (dayOfWeek === 0) return getMonday() // Sunday: review this week (ending today)
    return shiftWeek(getMonday(), -1) // Mon-Sat: review last week
  })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [allLockIns, setAllLockIns] = useState([])
  const [allWarMaps, setAllWarMaps] = useState([])

  // Monthly Review
  const [monthlyReview, setMonthlyReview] = useState({})
  const [lastMonthReview, setLastMonthReview] = useState(null)
  const [reviewMonth, setReviewMonth] = useState(new Date().getMonth())
  const [reviewYear, setReviewYear] = useState(new Date().getFullYear())
  const [monthlySaving, setMonthlySaving] = useState(false)

  // Dashboard — programme progress
  const [weekMorningOps, setWeekMorningOps] = useState([])
  const [weekDebriefs, setWeekDebriefs] = useState([])
  const [weekKpis, setWeekKpis] = useState([])

  // Morning Ops
  const [dailyPulse, setDailyPulse] = useState({ intention: '', feeling: '', win: '', money_task: '', todo_1: '', todo_2: '', todo_3: '', gratitude: '', let_go: '', identity_read: false, completed: false, completed_at: null })
  const [dailyPulseDate, setDailyPulseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [pulseSaving, setPulseSaving] = useState(false)

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
  // War Map plans the upcoming week — on Sunday, plan next week; Mon-Sat, plan this week
  const [warMapWeek, setWarMapWeek] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    if (dayOfWeek === 0) return shiftWeek(getMonday(), 1) // Sunday: plan next week
    return getMonday() // Mon-Sat: plan this week
  })
  const [weeklyPriorities, setWeeklyPriorities] = useState({ number_one_priority: '', priority_2: '', priority_3: '', priority_4: '', completed: false, completed_at: null })
  const [prioritiesSaving, setPrioritiesSaving] = useState(false)
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

  // Fetch weekly priorities when week changes
  useEffect(() => {
    if (clientData) fetchWeeklyPriorities(warMapWeek)
  }, [warMapWeek, clientData?.id])

  // Fetch monthly KPIs when month/year changes
  const fetchMonthlyKpis = async (y, m) => {
    if (!clientData) return
    const s = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const e = new Date(y, m + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('daily_kpis').select('*').eq('client_id', clientData.id).gte('date', s).lte('date', e)
    const obj = {}
    data?.forEach(row => { obj[row.date] = row })
    setMonthlyKpis(obj)
  }

  useEffect(() => {
    if (clientData) fetchMonthlyKpis(kpiYear, kpiMonth)
  }, [kpiMonth, kpiYear, clientData?.id])

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
    const monday = getMonday()
    const today = new Date().toISOString().split('T')[0]
    const mStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const mEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    const [dkpiRes, checkinsRes, projectsRes, designRes, adventuresRes, warRes, weeklyRes, pulseRes, leadsRes, identityRes, eveningRes, reviewRes, weekPulsesRes, weekDebriefsRes, weekKpisRes, monthlyRes, lastMonthlyRes, allLockInsRes, allWarMapsRes] = await Promise.all([
      supabase.from('daily_kpis').select('*').eq('client_id', client.id).gte('date', mStart).lte('date', mEnd),
      supabase.from('checkins').select('*').eq('client_id', client.id).order('checkin_date', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
      supabase.from('life_design').select('*').eq('client_id', client.id).eq('year', year).maybeSingle(),
      supabase.from('mini_adventures').select('*').eq('client_id', client.id).eq('year', year).order('order_index'),
      supabase.from('war_map_tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('war_map_weekly').select('*').eq('client_id', client.id).eq('week_of', monday).maybeSingle(),
      supabase.from('daily_pulse').select('*').eq('client_id', client.id).eq('date', today).maybeSingle(),
      supabase.from('leads').select('*').eq('client_id', client.id).order('created_at', { ascending: true }),
      supabase.from('identity_change').select('*').eq('client_id', client.id).maybeSingle(),
      supabase.from('evening_pulse').select('*').eq('client_id', client.id).eq('date', today).maybeSingle(),
      supabase.from('weekly_review').select('*').eq('client_id', client.id).eq('week_of', monday).maybeSingle(),
      supabase.from('weekly_review').select('week_of, completed, completed_at, revenue, week_rating').eq('client_id', client.id).order('week_of', { ascending: false }),
      supabase.from('war_map_weekly').select('week_of, completed, completed_at, number_one_priority').eq('client_id', client.id).order('week_of', { ascending: false }),
      supabase.from('daily_pulse').select('*').eq('client_id', client.id).gte('date', monday).lte('date', new Date(new Date(monday).getTime() + 6*86400000).toISOString().split('T')[0]),
      supabase.from('evening_pulse').select('*').eq('client_id', client.id).gte('date', monday).lte('date', new Date(new Date(monday).getTime() + 6*86400000).toISOString().split('T')[0]),
      supabase.from('daily_kpis').select('*').eq('client_id', client.id).gte('date', monday).lte('date', new Date(new Date(monday).getTime() + 6*86400000).toISOString().split('T')[0]),
      supabase.from('monthly_review').select('*').eq('client_id', client.id).eq('month', new Date().getMonth()).eq('year', new Date().getFullYear()).maybeSingle(),
      supabase.from('monthly_review').select('*').eq('client_id', client.id).eq('month', new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1).eq('year', new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()).maybeSingle(),
    ])

    if (dkpiRes.data) {
      const obj = {}
      dkpiRes.data.forEach(row => { obj[row.date] = row })
      setMonthlyKpis(obj)
    }
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (projectsRes.data) {
      setProjects(projectsRes.data)
      // Fetch tasks for all projects
      const taskPromises = projectsRes.data.map(p =>
        supabase.from('project_tasks').select('*').eq('project_id', p.id).order('created_at')
      )
      const taskResults = await Promise.all(taskPromises)
      const tasksMap = {}
      projectsRes.data.forEach((p, i) => { tasksMap[p.id] = taskResults[i].data || [] })
      setProjectTasks(tasksMap)
    }

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
    if (weeklyRes.data) {
      setWeeklyPriorities(weeklyRes.data)
    } else {
      setWeeklyPriorities({ number_one_priority: '', priority_2: '', priority_3: '', priority_4: '', completed: false, completed_at: null })
    }
    if (pulseRes.data) {
      setDailyPulse(pulseRes.data)
    } else {
      setDailyPulse({ intention: '', feeling: '', win: '', money_task: '', todo_1: '', todo_2: '', todo_3: '', gratitude: '', let_go: '', completed: false, completed_at: null })
    }
    if (leadsRes.data) setLeads(leadsRes.data)
    if (identityRes.data) setIdentityAffirmations(identityRes.data.affirmations || '')
    if (eveningRes.data) setEveningPulse(eveningRes.data)
    else setEveningPulse({})
    if (reviewRes.data) setWeeklyReview(reviewRes.data)
    else setWeeklyReview({})
    if (weekPulsesRes.data) setWeekMorningOps(weekPulsesRes.data)
    if (weekDebriefsRes.data) setWeekDebriefs(weekDebriefsRes.data)
    if (weekKpisRes.data) setWeekKpis(weekKpisRes.data)
    if (monthlyRes.data) setMonthlyReview(monthlyRes.data)
    else setMonthlyReview({})
    setLastMonthReview(lastMonthlyRes.data || null)
    if (allLockInsRes.data) setAllLockIns(allLockInsRes.data)
    if (allWarMapsRes.data) setAllWarMaps(allWarMapsRes.data)
    setLoading(false)
  }

  // Fetch weekly priorities when week changes
  const fetchWeeklyPriorities = async (weekOf) => {
    if (!clientData) return
    const { data } = await supabase.from('war_map_weekly').select('*').eq('client_id', clientData.id).eq('week_of', weekOf).maybeSingle()
    if (data) {
      setWeeklyPriorities(data)
    } else {
      setWeeklyPriorities({ number_one_priority: '', priority_2: '', priority_3: '', priority_4: '', completed: false, completed_at: null })
    }
  }

  // Fetch daily pulse when date changes
  const fetchDailyPulse = async (dateStr) => {
    if (!clientData) return
    const { data } = await supabase.from('daily_pulse').select('*').eq('client_id', clientData.id).eq('date', dateStr).maybeSingle()
    if (data) {
      setDailyPulse(data)
    } else {
      setDailyPulse({ intention: '', feeling: '', win: '', money_task: '', todo_1: '', todo_2: '', todo_3: '', gratitude: '', let_go: '', completed: false, completed_at: null })
    }
  }

  useEffect(() => {
    if (clientData) fetchDailyPulse(dailyPulseDate)
  }, [dailyPulseDate, clientData?.id])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const buildPulsePayload = () => ({
    client_id: clientData.id,
    date: dailyPulseDate,
    intention: dailyPulse.intention || '',
    feeling: dailyPulse.feeling || '',
    win: dailyPulse.win || '',
    money_task: dailyPulse.money_task || '',
    todo_1: dailyPulse.todo_1 || '',
    todo_2: dailyPulse.todo_2 || '',
    todo_3: dailyPulse.todo_3 || '',
    gratitude_1: dailyPulse.gratitude_1 || '',
    gratitude_2: dailyPulse.gratitude_2 || '',
    gratitude_3: dailyPulse.gratitude_3 || '',
    gratitude_4: dailyPulse.gratitude_4 || '',
    gratitude_5: dailyPulse.gratitude_5 || '',
    gratitude_6: dailyPulse.gratitude_6 || '',
    let_go: dailyPulse.let_go || '',
    identity_read: dailyPulse.identity_read || false,
  })

  const savePulse = async () => {
    if (!clientData) return
    await supabase.from('daily_pulse').upsert(buildPulsePayload(), { onConflict: 'client_id,date' })
    flash()
  }

  const completePulse = async () => {
    if (!clientData) return
    setPulseSaving(true)
    const { data, error } = await supabase.from('daily_pulse').upsert({
      ...buildPulsePayload(),
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'client_id,date' }).select().single()
    if (error) { console.error('Morning Ops save error:', error); alert('Failed to save: ' + error.message); setPulseSaving(false); return }
    if (data) setDailyPulse(data)
    setPulseSaving(false)
  }

  // Daily KPI tracker
  const updateKpi = (dateStr, key, value) => {
    setMonthlyKpis(prev => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] || {}), [key]: value === '' ? 0 : Number(value) }
    }))
  }

  const saveKpiDay = async (dateStr) => {
    const row = monthlyKpis[dateStr] || {}
    const payload = { client_id: clientData.id, date: dateStr }
    KPI_COLS.filter(c => c.input).forEach(c => {
      payload[c.key] = Number(row[c.key]) || 0
    })
    await supabase.from('daily_kpis').upsert(payload, { onConflict: 'client_id,date' })
    flash()
  }

  // Hot List
  const LEAD_STAGES = [
    { id: 'new_lead', label: 'New Lead', color: 'border-sky-500/40 bg-sky-500/5' },
    { id: 'dm_sent', label: 'Initial DM Sent', color: 'border-violet-500/40 bg-violet-500/5' },
    { id: 'follow_up', label: 'Follow-up Friday DM', color: 'border-amber-500/40 bg-amber-500/5' },
    { id: 'call_booked', label: 'Call Booked', color: 'border-gold/40 bg-gold/5' },
    { id: 'client_won', label: 'Client Won', color: 'border-emerald-500/40 bg-emerald-500/5' },
    { id: 'ghosted', label: 'Client Ghosted', color: 'border-red-500/40 bg-red-500/5' },
  ]

  const addLead = async (status) => {
    if (!newLeadName.trim()) return
    const { data } = await supabase.from('leads').insert([{
      client_id: clientData.id, name: newLeadName.trim(), status,
      instagram: newLeadIG.trim() || null,
    }]).select().single()
    if (data) setLeads(prev => [...prev, data])
    setNewLeadName('')
    setNewLeadIG('')
    setAddingLeadCol(null)
  }

  const moveLead = async (leadId, newStatus) => {
    const { data } = await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId).select().single()
    if (data) setLeads(prev => prev.map(l => l.id === leadId ? data : l))
  }

  const deleteLead = async (leadId) => {
    await supabase.from('leads').delete().eq('id', leadId)
    setLeads(prev => prev.filter(l => l.id !== leadId))
    if (editingLead?.id === leadId) setEditingLead(null)
  }

  const openLeadModal = (lead) => {
    setLeadForm({ name: lead.name || '', instagram: lead.instagram || '', notes: lead.notes || '' })
    setEditingLead(lead)
  }

  const saveLeadEdit = async () => {
    if (!editingLead || !leadForm.name.trim()) return
    const { data } = await supabase.from('leads').update({
      name: leadForm.name.trim(),
      instagram: leadForm.instagram.trim() || null,
      notes: leadForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editingLead.id).select().single()
    if (data) setLeads(prev => prev.map(l => l.id === editingLead.id ? data : l))
    setEditingLead(null)
  }

  // Drag & drop
  const handleDragStart = (e, lead) => {
    setDragLead(lead)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
    // Style the dragged element
    setTimeout(() => { e.target.style.opacity = '0.4' }, 0)
  }
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDragLead(null)
    setDragOverCol(null)
  }
  const handleDragOver = (e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(stageId)
  }
  const handleDragLeave = () => { setDragOverCol(null) }
  const handleDrop = async (e, stageId) => {
    e.preventDefault()
    setDragOverCol(null)
    if (dragLead && dragLead.status !== stageId) {
      await moveLead(dragLead.id, stageId)
    }
    setDragLead(null)
  }

  // Touch drag for mobile
  const touchDragRef = useRef(null)
  const handleTouchStart = (e, lead) => {
    const touch = e.touches[0]
    touchDragRef.current = { lead, startX: touch.clientX, startY: touch.clientY, el: e.currentTarget, moved: false }
  }
  const handleTouchMove = (e) => {
    if (!touchDragRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchDragRef.current.startX)
    const dy = Math.abs(touch.clientY - touchDragRef.current.startY)
    if (dx > 10 || dy > 10) touchDragRef.current.moved = true
  }
  const handleTouchEnd = async (e) => {
    if (!touchDragRef.current || !touchDragRef.current.moved) {
      touchDragRef.current = null
      return
    }
    const touch = e.changedTouches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const colEl = el?.closest('[data-stage]')
    if (colEl) {
      const newStage = colEl.dataset.stage
      if (newStage !== touchDragRef.current.lead.status) {
        await moveLead(touchDragRef.current.lead.id, newStage)
      }
    }
    touchDragRef.current = null
  }

  // Evening Ops
  const fetchEveningPulse = async (dateStr) => {
    if (!clientData) return
    const { data } = await supabase.from('evening_pulse').select('*').eq('client_id', clientData.id).eq('date', dateStr).maybeSingle()
    setEveningPulse(data || {})
  }

  useEffect(() => {
    if (clientData) fetchEveningPulse(eveningPulseDate)
  }, [eveningPulseDate, clientData?.id])

  const buildEveningPayload = () => ({
    client_id: clientData.id, date: eveningPulseDate,
    priority_completed: eveningPulse.priority_completed ?? null,
    went_well: eveningPulse.went_well || '', do_differently: eveningPulse.do_differently || '',
    learned: eveningPulse.learned || '', show_up_rating: eveningPulse.show_up_rating ?? null,
    not_to_plan: eveningPulse.not_to_plan || '', proud_of: eveningPulse.proud_of || '',
    love_about_self: eveningPulse.love_about_self || '',
    gratitude_1: eveningPulse.gratitude_1 || '', gratitude_2: eveningPulse.gratitude_2 || '',
    gratitude_3: eveningPulse.gratitude_3 || '', gratitude_4: eveningPulse.gratitude_4 || '',
    gratitude_5: eveningPulse.gratitude_5 || '', gratitude_6: eveningPulse.gratitude_6 || '',
    win_1_title: eveningPulse.win_1_title || '', win_1_action: eveningPulse.win_1_action || '', win_1_progress: eveningPulse.win_1_progress || '',
    win_2_title: eveningPulse.win_2_title || '', win_2_action: eveningPulse.win_2_action || '', win_2_progress: eveningPulse.win_2_progress || '',
    win_3_title: eveningPulse.win_3_title || '', win_3_action: eveningPulse.win_3_action || '', win_3_progress: eveningPulse.win_3_progress || '',
    win_4_title: eveningPulse.win_4_title || '', win_4_action: eveningPulse.win_4_action || '', win_4_progress: eveningPulse.win_4_progress || '',
    win_5_title: eveningPulse.win_5_title || '', win_5_action: eveningPulse.win_5_action || '', win_5_progress: eveningPulse.win_5_progress || '',
  })

  const saveEvening = async (overrides = {}) => {
    if (!clientData) return
    const payload = { ...buildEveningPayload(), ...overrides }
    await supabase.from('evening_pulse').upsert(payload, { onConflict: 'client_id,date' })
    flash()
  }

  const completeEvening = async () => {
    if (!clientData) return
    setEveningSaving(true)
    const { data, error } = await supabase.from('evening_pulse').upsert({
      ...buildEveningPayload(), completed: true, completed_at: new Date().toISOString(),
    }, { onConflict: 'client_id,date' }).select().single()
    if (error) { console.error('Debrief save error:', error); alert('Failed to save: ' + error.message); setEveningSaving(false); return }
    if (data) setEveningPulse(data)
    setEveningSaving(false)
  }

  // Monthly Review
  const fetchMonthlyReview = async (m, y) => {
    if (!clientData) return
    // Get current month's review + last month's (for target comparison)
    const prevM = m === 0 ? 11 : m - 1
    const prevY = m === 0 ? y - 1 : y
    const [current, prev] = await Promise.all([
      supabase.from('monthly_review').select('*').eq('client_id', clientData.id).eq('month', m).eq('year', y).maybeSingle(),
      supabase.from('monthly_review').select('*').eq('client_id', clientData.id).eq('month', prevM).eq('year', prevY).maybeSingle(),
    ])
    setMonthlyReview(current.data || {})
    setLastMonthReview(prev.data || null)
  }

  useEffect(() => {
    if (clientData) fetchMonthlyReview(reviewMonth, reviewYear)
  }, [reviewMonth, reviewYear, clientData?.id])

  const saveMonthly = async (overrides = {}) => {
    if (!clientData) return
    const payload = {
      client_id: clientData.id, month: reviewMonth, year: reviewYear,
      revenue: monthlyReview.revenue || 0, target_hit: monthlyReview.target_hit,
      month_rating: monthlyReview.month_rating, biggest_win: monthlyReview.biggest_win || '',
      biggest_challenge: monthlyReview.biggest_challenge || '', key_learning: monthlyReview.key_learning || '',
      improve: monthlyReview.improve || '', goal_1: monthlyReview.goal_1 || '',
      goal_2: monthlyReview.goal_2 || '', goal_3: monthlyReview.goal_3 || '',
      mindset_shift: monthlyReview.mindset_shift || '', energy_focus: monthlyReview.energy_focus || '', revenue_target: monthlyReview.revenue_target || null,
      ...overrides,
    }
    await supabase.from('monthly_review').upsert(payload, { onConflict: 'client_id,month,year' })
    flash()
  }

  const completeMonthly = async () => {
    if (!clientData) return
    setMonthlySaving(true)
    const payload = {
      client_id: clientData.id, month: reviewMonth, year: reviewYear,
      revenue: monthlyReview.revenue || 0, target_hit: monthlyReview.target_hit,
      month_rating: monthlyReview.month_rating, biggest_win: monthlyReview.biggest_win || '',
      biggest_challenge: monthlyReview.biggest_challenge || '', key_learning: monthlyReview.key_learning || '',
      improve: monthlyReview.improve || '', goal_1: monthlyReview.goal_1 || '',
      goal_2: monthlyReview.goal_2 || '', goal_3: monthlyReview.goal_3 || '',
      mindset_shift: monthlyReview.mindset_shift || '', energy_focus: monthlyReview.energy_focus || '', revenue_target: monthlyReview.revenue_target || null,
      completed: true, completed_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('monthly_review').upsert(payload, { onConflict: 'client_id,month,year' }).select().single()
    if (error) { console.error('Monthly save error:', error); alert('Failed to save: ' + error.message); setMonthlySaving(false); return }
    if (data) setMonthlyReview(data)
    setMonthlySaving(false)
  }

  // Identity Chamber
  const saveIdentity = async () => {
    if (!clientData) return
    await supabase.from('identity_change').upsert({
      client_id: clientData.id,
      affirmations: identityAffirmations,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    flash()
  }

  // The Lock In — weekly review
  const fetchWeeklyReview = async (weekOf) => {
    if (!clientData) return
    const { data } = await supabase.from('weekly_review').select('*').eq('client_id', clientData.id).eq('week_of', weekOf).maybeSingle()
    setWeeklyReview(data || {})
  }

  useEffect(() => {
    if (clientData) fetchWeeklyReview(reviewWeek)
  }, [reviewWeek, clientData?.id])

  const buildReviewPayload = () => ({
    client_id: clientData.id, week_of: reviewWeek,
    revenue: weeklyReview.revenue || 0,
    target_hit: weeklyReview.target_hit ?? null,
    week_rating: weeklyReview.week_rating ?? null,
    went_well: weeklyReview.went_well || '',
    not_to_plan: weeklyReview.not_to_plan || '',
    patterns: weeklyReview.patterns || '',
    energy_drain: weeklyReview.energy_drain || '',
    energy_boost: weeklyReview.energy_boost || '',
    one_fix: weeklyReview.one_fix || '',
    win_1_title: weeklyReview.win_1_title || '', win_1_action: weeklyReview.win_1_action || '', win_1_progress: weeklyReview.win_1_progress || '',
    win_2_title: weeklyReview.win_2_title || '', win_2_action: weeklyReview.win_2_action || '', win_2_progress: weeklyReview.win_2_progress || '',
    win_3_title: weeklyReview.win_3_title || '', win_3_action: weeklyReview.win_3_action || '', win_3_progress: weeklyReview.win_3_progress || '',
    win_4_title: weeklyReview.win_4_title || '', win_4_action: weeklyReview.win_4_action || '', win_4_progress: weeklyReview.win_4_progress || '',
    win_5_title: weeklyReview.win_5_title || '', win_5_action: weeklyReview.win_5_action || '', win_5_progress: weeklyReview.win_5_progress || '',
    next_focus: weeklyReview.next_focus || '',
    next_income_target: weeklyReview.next_income_target || '',
    next_differently: weeklyReview.next_differently || '',
  })

  const saveReview = async (overrides = {}) => {
    if (!clientData) return
    const payload = { ...buildReviewPayload(), ...overrides }
    const { error } = await supabase.from('weekly_review').upsert(payload, { onConflict: 'client_id,week_of' })
    if (error) { console.error('Lock In auto-save error:', error); return }
    flash()
  }

  const completeReview = async () => {
    if (!clientData) return
    setReviewSaving(true)
    const payload = { ...buildReviewPayload(), completed: true, completed_at: new Date().toISOString() }
    const { data, error } = await supabase.from('weekly_review').upsert(payload, { onConflict: 'client_id,week_of' }).select().single()
    if (error) { console.error('Lock In save error:', error); alert('Failed to save: ' + error.message); setReviewSaving(false); return }
    if (data) setWeeklyReview(data)
    // Refresh history
    const { data: allRes } = await supabase.from('weekly_review').select('week_of, completed, completed_at, revenue, week_rating').eq('client_id', clientData.id).order('week_of', { ascending: false })
    if (allRes) setAllLockIns(allRes)
    setReviewSaving(false)
  }

  // Projects CRUD
  const resetProjectForm = () => {
    setProjectForm({ name: '', description: '', status: 'not_started', priority: 'medium', start_date: '', end_date: '', links: '', resources: '' })
    setEditingProject(null)
    setShowProjectForm(false)
  }

  const saveProject = async () => {
    if (!projectForm.name.trim()) return
    const payload = { client_id: clientData.id, name: projectForm.name.trim() }
    if (projectForm.description) payload.description = projectForm.description
    if (projectForm.status) payload.status = projectForm.status
    if (projectForm.priority) payload.priority = projectForm.priority
    if (projectForm.start_date) payload.start_date = projectForm.start_date
    if (projectForm.end_date) payload.end_date = projectForm.end_date
    if (projectForm.links) payload.links = projectForm.links
    if (projectForm.resources) payload.resources = projectForm.resources

    if (editingProject) {
      const { data, error } = await supabase.from('projects').update(payload).eq('id', editingProject).select().single()
      if (error) { console.error('Update project error:', error); alert('Failed to save: ' + error.message); return }
      if (data) { setProjects(prev => prev.map(p => p.id === editingProject ? data : p)); flash() }
    } else {
      const { data, error } = await supabase.from('projects').insert([payload]).select().single()
      if (error) { console.error('Insert project error:', error); alert('Failed to save: ' + error.message); return }
      if (data) { setProjects(prev => [data, ...prev]); setProjectTasks(prev => ({ ...prev, [data.id]: [] })); flash() }
    }
    resetProjectForm()
  }

  const editProject = (p) => {
    setProjectForm({ name: p.name || '', description: p.description || '', status: p.status || 'planning', priority: p.priority || 'medium', start_date: p.start_date || '', end_date: p.end_date || '', links: p.links || '', resources: p.resources || '' })
    setEditingProject(p.id)
    setShowProjectForm(true)
  }

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const addProjectTask = async (projectId) => {
    const title = newTaskInputs[projectId]?.trim()
    if (!title) return
    const { data } = await supabase.from('project_tasks').insert([{ project_id: projectId, client_id: clientData.id, title }]).select().single()
    if (data) setProjectTasks(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), data] }))
    setNewTaskInputs(prev => ({ ...prev, [projectId]: '' }))
  }

  const toggleProjectTask = async (projectId, taskId, completed) => {
    await supabase.from('project_tasks').update({ completed: !completed }).eq('id', taskId)
    setProjectTasks(prev => ({
      ...prev, [projectId]: (prev[projectId] || []).map(t => t.id === taskId ? { ...t, completed: !completed } : t)
    }))
  }

  const deleteProjectTask = async (projectId, taskId) => {
    await supabase.from('project_tasks').delete().eq('id', taskId)
    setProjectTasks(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => t.id !== taskId) }))
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

    // Save each adventure individually — update existing or insert new
    for (const adv of adventuresForm) {
      const payload = {
        client_id: clientData.id,
        year,
        order_index: adv.order_index,
        title: adv.title || '',
        who_with: adv.who_with || '',
        when_planned: adv.when_planned || '',
        where_planned: adv.where_planned || '',
        completed: adv.completed || false,
      }
      if (adv.id) {
        // Update existing adventure
        await supabase.from('mini_adventures').update(payload).eq('id', adv.id)
      } else if (payload.title.trim()) {
        // Insert new adventure only if it has a title
        const { data: newAdv } = await supabase.from('mini_adventures').insert([payload]).select().single()
        if (newAdv) {
          setAdventuresForm(prev => prev.map(a => a.order_index === adv.order_index && !a.id ? newAdv : a))
        }
      }
    }

    setDesignEditing(false)
    setDesignLoading(false)
    flash()
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

  // Weekly priorities
  const savePriorities = async () => {
    await supabase.from('war_map_weekly').upsert({
      client_id: clientData.id,
      week_of: warMapWeek,
      number_one_priority: weeklyPriorities.number_one_priority || '',
      priority_2: weeklyPriorities.priority_2 || '',
      priority_3: weeklyPriorities.priority_3 || '',
      priority_4: weeklyPriorities.priority_4 || '',
      revenue_target: weeklyPriorities.revenue_target || null,
    }, { onConflict: 'client_id,week_of' })
    flash()
  }

  const completeWarMap = async () => {
    setPrioritiesSaving(true)
    const { data, error } = await supabase.from('war_map_weekly').upsert({
      client_id: clientData.id,
      week_of: warMapWeek,
      number_one_priority: weeklyPriorities.number_one_priority || '',
      priority_2: weeklyPriorities.priority_2 || '',
      priority_3: weeklyPriorities.priority_3 || '',
      priority_4: weeklyPriorities.priority_4 || '',
      revenue_target: weeklyPriorities.revenue_target || null,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'client_id,week_of' }).select().single()
    if (error) { console.error('War Map save error:', error); alert('Failed to save: ' + error.message); setPrioritiesSaving(false); return }
    if (data) setWeeklyPriorities(data)
    // Refresh history
    const { data: allRes } = await supabase.from('war_map_weekly').select('week_of, completed, completed_at, number_one_priority').eq('client_id', clientData.id).order('week_of', { ascending: false })
    if (allRes) setAllWarMaps(allRes)
    setPrioritiesSaving(false)
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

  const openEditModal = (task) => {
    setModalForm({
      title: task.title || '',
      date: task.scheduled_date || todayStr,
      time: task.scheduled_time ? task.scheduled_time.slice(0, 5) : '',
      duration: task.duration_minutes || 60,
      recurring: task.recurring || 'none',
    })
    setTaskModal({ mode: 'edit', taskId: task.id })
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
    } else if (taskModal.mode === 'schedule' || taskModal.mode === 'edit') {
      const updates = {
        title: modalForm.title.trim(),
        scheduled_date: modalForm.date,
        scheduled_time: modalForm.time || null,
        duration_minutes: Number(modalForm.duration),
        recurring: modalForm.recurring,
      }
      if (taskModal.mode === 'schedule') updates.status = 'schedule'
      const { data } = await supabase.from('war_map_tasks').update(updates)
        .eq('id', taskModal.taskId).select().single()
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
  const tasksForPulseDay = expandTasksForRange(warMapTasks, dailyPulseDate, dailyPulseDate)

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

  // Dashboard computed
  const kpiDaysInMonth = new Date(kpiYear, kpiMonth + 1, 0).getDate()
  const kpiDays = Array.from({ length: kpiDaysInMonth }, (_, i) => {
    const d = i + 1
    return `${kpiYear}-${String(kpiMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
  // Monthly KPI totals (for Business Tracker tab)
  const kpiTotals = {}
  KPI_COLS.filter(c => c.input).forEach(c => {
    kpiTotals[c.key] = kpiDays.reduce((sum, d) => sum + (Number(monthlyKpis[d]?.[c.key]) || 0), 0)
  })
  const kpiDaysWithData = kpiDays.filter(d => monthlyKpis[d]).length || 1

  // Weekly KPI totals (for Command Centre revenue targets)
  const weeklyKpiTotals = {}
  const dashWeekDays = getWeekDays(getMonday())
  KPI_COLS.filter(c => c.input).forEach(c => {
    weeklyKpiTotals[c.key] = dashWeekDays.reduce((sum, d) => sum + (Number(monthlyKpis[d]?.[c.key]) || 0), 0)
  })

  // ── Dashboard Scores ─────────────────────────────────────────────────────────
  const todayDayIndex = dashWeekDays.indexOf(todayStr)
  const daysElapsed = Math.max(1, todayDayIndex >= 0 ? todayDayIndex + 1 : 1)

  const morningOpsCompleted = weekMorningOps.filter(p => p.completed).length
  const debriefsCompleted = weekDebriefs.filter(p => p.completed).length
  const identityReads = weekMorningOps.filter(p => p.identity_read).length
  const kpiDaysFilled = weekKpis.length
  const warMapDone = weeklyPriorities.completed ? 1 : 0
  const lockInDone = weeklyReview.completed ? 1 : 0
  const designDone = lifeDesign ? 1 : 0
  const identityChamberFilled = identityAffirmations.trim().length > 0 ? 1 : 0

  const capPct = (val, max) => Math.min(100, Math.round((val / max) * 100))
  const scores = {
    morningOps:  { value: Math.min(morningOpsCompleted, daysElapsed), max: daysElapsed, pct: capPct(morningOpsCompleted, daysElapsed), label: 'Morning Ops™', sub: 'daily', icon: '☀️', color: 'text-amber-400', bar: 'bg-amber-400' },
    debrief:     { value: Math.min(debriefsCompleted, daysElapsed), max: daysElapsed, pct: capPct(debriefsCompleted, daysElapsed), label: 'The Debrief™', sub: 'daily', icon: '🌙', color: 'text-indigo-400', bar: 'bg-indigo-400' },
    identity:    { value: Math.min(identityReads, daysElapsed), max: daysElapsed, pct: capPct(identityReads, daysElapsed), label: 'Identity Read', sub: 'daily', icon: '🪞', color: 'text-violet-400', bar: 'bg-violet-400' },
    warMap:      { value: warMapDone, max: 1, pct: warMapDone * 100, label: 'War Map™', sub: 'weekly', icon: '⚔️', color: 'text-sky-400', bar: 'bg-sky-400' },
    lockIn:      { value: lockInDone, max: 1, pct: lockInDone * 100, label: 'The Lock In™', sub: 'weekly', icon: '🔒', color: 'text-gold', bar: 'bg-gold' },
    tracker:     { value: Math.min(kpiDaysFilled, daysElapsed), max: daysElapsed, pct: capPct(kpiDaysFilled, daysElapsed), label: 'Business Tracker', sub: 'daily', icon: '📊', color: 'text-emerald-400', bar: 'bg-emerald-400' },
  }

  const overallPct = Math.min(100, Math.round(
    (scores.morningOps.pct * 0.25 + scores.debrief.pct * 0.20 + scores.identity.pct * 0.10 +
     scores.warMap.pct * 0.15 + scores.lockIn.pct * 0.15 + scores.tracker.pct * 0.15)
  ))

  const navSections = [
    { items: [
      { id: 'progress',    label: 'Command Centre',      icon: '🏠' },
      { id: 'projects',    label: 'Projects',             icon: '📋' },
    ]},
    { heading: 'Daily', items: [
      { id: 'identity',    label: 'Identity Chamber™',   icon: '🪞' },
      { id: 'morning-ops', label: 'Morning Ops™',        icon: '☀️' },
      { id: 'dashboard',   label: 'Business Tracker',    icon: '📊' },
      { id: 'hot-list',    label: 'Hot List',             icon: '🔥' },
      { id: 'debrief',     label: 'The Debrief™',        icon: '🌙' },
    ]},
    { heading: 'Weekly', items: [
      { id: 'lock-in',     label: 'The Lock In™',        icon: '🔒' },
      { id: 'war-map',     label: 'Weekly War Map™',     icon: '⚔️' },
    ]},
    { heading: 'Monthly', items: [
      { id: 'monthly',     label: 'Monthly Review',       icon: '📅' },
    ]},
    { heading: 'Yearly', items: [
      { id: 'design',      label: 'Design™',              icon: '🎯' },
    ]},
    { heading: 'Build™', items: [
      { id: 'premium-pos', label: 'Premium Position™',    icon: '👑', href: '/premium-position' },
      { id: 'playbook',    label: 'Sold Out™ Playbook',   icon: '📖', href: '/playbook' },
    ]},
    { heading: 'Learn', items: [
      { id: 'classroom',   label: 'Classroom',            icon: '🎓', href: 'https://www.skool.com/imthiazghulam/classroom', external: true },
    ]},
  ]

  const allTabs = navSections.flatMap(s => s.items)

  // ── Render ────────────────────────────────────────────────────────────────────

  const sidebarNav = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-zinc-800">
        <img src="/logo.png" alt="The Syndicate" className="h-12 w-auto" />
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-white text-sm font-semibold truncate">{clientData.name}</p>
        <p className="text-zinc-600 text-xs truncate mt-0.5">{clientData.business}</p>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-2 overflow-y-auto scrollbar-thin">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <p className="px-5 pt-5 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{section.heading}</p>
            )}
            {section.items.map(tab => (
              <button key={tab.id} onClick={() => tab.external ? window.open(tab.href, '_blank') : tab.href ? router.push(tab.href) : switchTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition ${
                  activeTab === tab.id
                    ? 'text-gold bg-gold/[0.08] border-r-2 border-gold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}>
                <span className="text-sm w-5 text-center">{tab.icon}</span>
                <span className="tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Sign out */}
      <div className="p-4 border-t border-zinc-800">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:text-white text-sm font-medium rounded hover:bg-zinc-900 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="tracking-wide">Sign Out</span>
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <div ref={toastRef} className="fixed top-4 right-4 z-50 hidden items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg toast-in">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Saved</span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-zinc-950 border-r border-zinc-800 z-20">
        {sidebarNav}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden fade-overlay">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-zinc-800 slide-in-left shadow-2xl">
            {sidebarNav}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white active:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img src="/logo.png" alt="The Syndicate" className="h-7 w-auto" />
          <div className="w-9" /> {/* Spacer for centering */}
        </header>

        <div className="max-w-4xl mx-auto p-4 md:px-8 md:py-7">

          {/* Page title */}
          <div className="mb-7">
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              {allTabs.find(t => t.id === activeTab)?.icon} {allTabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-zinc-600 text-xs mt-1">Welcome back, {clientData.name.split(' ')[0]} · {clientData.business}</p>
          </div>

        {/* ── IDENTITY CHANGE™ ────────────────────────────────────────── */}
        {/* ── COMMAND CENTRE — Programme Progress ────────────────────────── */}
        {activeTab === 'progress' && (
          <div className="fade-in">

            {/* Hero Score Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-6 sm:p-8 mb-6">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/[0.04] rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/[0.03] rounded-full blur-3xl -ml-24 -mb-24" />

              <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                {/* Progress Ring */}
                <div className="relative flex-shrink-0">
                  <svg className="w-36 h-36 sm:w-44 sm:h-44 -rotate-90" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#27272a" strokeWidth="8" />
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#C9A84C" strokeWidth="8"
                      strokeDasharray={`${(overallPct / 100) * 439.8} 439.8`}
                      strokeLinecap="round"
                      className="transition-all duration-1000" />
                    {/* Inner glow ring */}
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#C9A84C" strokeWidth="2" opacity="0.15" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{overallPct}</span>
                    <span className="text-xs font-bold text-gold uppercase tracking-widest">percent</span>
                  </div>
                </div>

                {/* Score Info */}
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider mb-1">Programme Score</h2>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">
                    Week of {new Date(getMonday()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                    overallPct >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    overallPct >= 70 ? 'bg-gold/20 text-gold border border-gold/30' :
                    overallPct >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {overallPct >= 90 ? 'Elite' : overallPct >= 70 ? 'Strong' : overallPct >= 50 ? 'Building' : 'Needs Work'}
                  </div>
                  <p className="text-zinc-600 text-xs mt-3 italic leading-relaxed">
                    {overallPct >= 90 ? '"You\'re operating at the highest level. This is what elite looks like."' :
                     overallPct >= 70 ? '"Solid week. You\'re in the game. Now go harder."' :
                     overallPct >= 50 ? '"You\'ve got the foundation. Time to raise the standard."' :
                     '"The programme works when you do. Commit fully this week."'}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Breakdown — 6 Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {Object.values(scores).map(s => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className={`text-xl font-black ${s.pct >= 80 ? s.color : s.pct > 0 ? 'text-zinc-400' : 'text-zinc-700'}`}>{s.pct}%</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{s.label}</p>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <p className="text-zinc-700 text-[10px] mt-1.5">{s.value} of {s.max}</p>
                </div>
              ))}
            </div>

            {/* This Week — Day by Day Grid */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-6 mb-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-5">This Week at a Glance</h3>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                {dashWeekDays.map((dateStr) => {
                  const { day } = formatDayHeader(dateStr)
                  const dateNum = new Date(dateStr).getDate()
                  const isToday = dateStr === todayStr
                  const isFuture = dateStr > todayStr
                  const hasMorning = weekMorningOps.some(p => p.date === dateStr && p.completed)
                  const hasEvening = weekDebriefs.some(p => p.date === dateStr && p.completed)
                  const hasKpi = weekKpis.some(k => k.date === dateStr)
                  const hasIdentity = weekMorningOps.some(p => p.date === dateStr && p.identity_read)
                  const dayScore = [hasMorning, hasEvening, hasKpi, hasIdentity].filter(Boolean).length
                  return (
                    <div key={dateStr} className={`text-center rounded-xl py-3 px-1 transition ${
                      isToday ? 'bg-gold/10 border-2 border-gold/40 shadow-lg shadow-gold/5' :
                      isFuture ? 'opacity-25 bg-zinc-800/30' :
                      dayScore === 4 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      dayScore > 0 ? 'bg-zinc-800/60 border border-zinc-800' : 'bg-zinc-800/30 border border-zinc-800/50'
                    }`}>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{day}</p>
                      <p className={`text-lg font-black my-1 ${isToday ? 'text-gold' : dayScore === 4 ? 'text-emerald-400' : 'text-zinc-400'}`}>{dateNum}</p>
                      <div className="flex justify-center gap-1 flex-wrap">
                        <div className={`w-2.5 h-2.5 rounded-full transition ${hasMorning ? 'bg-amber-400 shadow-sm shadow-amber-400/30' : 'bg-zinc-700/50'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition ${hasEvening ? 'bg-indigo-400 shadow-sm shadow-indigo-400/30' : 'bg-zinc-700/50'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition ${hasIdentity ? 'bg-violet-400 shadow-sm shadow-violet-400/30' : 'bg-zinc-700/50'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition ${hasKpi ? 'bg-emerald-400 shadow-sm shadow-emerald-400/30' : 'bg-zinc-700/50'}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-5 mt-5 justify-center flex-wrap">
                {[
                  { color: 'bg-amber-400', label: 'Morning Ops' },
                  { color: 'bg-indigo-400', label: 'Debrief' },
                  { color: 'bg-violet-400', label: 'Identity' },
                  { color: 'bg-emerald-400', label: 'Tracker' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <span className="text-[10px] text-zinc-500 font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column: Foundations + Business */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Programme Foundations */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Programme Foundations</h3>
                <div className="space-y-3">
                  {/* Identity Chamber */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${identityChamberFilled ? 'bg-violet-500/20' : 'bg-zinc-800'}`}>🪞</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Identity Chamber™</p>
                      <p className="text-zinc-600 text-xs">{identityChamberFilled ? `${identityAffirmations.split('\n').filter(l => l.trim()).length} affirmations` : 'Not set'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${identityChamberFilled ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  </div>
                  {/* Design */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${designDone ? 'bg-gold/20' : 'bg-zinc-800'}`}>🎯</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Design™</p>
                      <p className="text-zinc-600 text-xs">{designDone ? `${adventuresForm.filter(a => a.completed).length}/6 adventures` : 'Not started'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${designDone ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  </div>
                  {/* War Map */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${warMapDone ? 'bg-sky-500/20' : 'bg-zinc-800'}`}>⚔️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">War Map™</p>
                      <p className="text-zinc-600 text-xs">{warMapDone ? 'Completed' : 'Pending'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${warMapDone ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  </div>
                  {/* Lock In */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${lockInDone ? 'bg-gold/20' : 'bg-zinc-800'}`}>🔒</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">The Lock In™</p>
                      <p className="text-zinc-600 text-xs">{lockInDone ? 'Week reviewed' : 'Pending'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${lockInDone ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  </div>
                </div>
              </div>

              {/* Revenue Targets */}
              {(weeklyPriorities.revenue_target > 0 || monthlyReview.revenue_target > 0) && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Revenue Targets</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {weeklyPriorities.revenue_target > 0 && (() => {
                      const weekRevenue = weeklyKpiTotals.revenue || 0
                      const weekTarget = Number(weeklyPriorities.revenue_target)
                      const weekPct = Math.round((weekRevenue / weekTarget) * 100)
                      const hit = weekRevenue >= weekTarget
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">This Week</p>
                            <p className={`text-xs font-bold ${hit ? 'text-emerald-400' : 'text-gold'}`}>{weekPct}%</p>
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-xl font-black ${hit ? 'text-emerald-400' : 'text-white'}`}>£{weekRevenue.toLocaleString()}</span>
                            <span className="text-zinc-600 text-xs">/ £{weekTarget.toLocaleString()}</span>
                          </div>
                          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${hit ? 'bg-emerald-400' : 'bg-gold'}`} style={{ width: `${Math.min(100, weekPct)}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                    {lastMonthReview?.revenue_target > 0 && (() => {
                      const monthRevenue = kpiTotals.revenue || 0
                      const monthTarget = Number(lastMonthReview.revenue_target)
                      const monthPct = Math.round((monthRevenue / monthTarget) * 100)
                      const hit = monthRevenue >= monthTarget
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">This Month</p>
                            <p className={`text-xs font-bold ${hit ? 'text-emerald-400' : 'text-gold'}`}>{monthPct}%</p>
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-xl font-black ${hit ? 'text-emerald-400' : 'text-white'}`}>£{monthRevenue.toLocaleString()}</span>
                            <span className="text-zinc-600 text-xs">/ £{monthTarget.toLocaleString()}</span>
                          </div>
                          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${hit ? 'bg-emerald-400' : 'bg-gold'}`} style={{ width: `${Math.min(100, monthPct)}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Business Snapshot — This Week */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">This Week's Numbers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Revenue</p>
                    <p className="text-lg font-bold text-emerald-400">£{(weeklyKpiTotals.revenue || 0).toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">New Followers</p>
                    <p className="text-lg font-bold text-sky-400">{weeklyKpiTotals.new_followers || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Calls Taken</p>
                    <p className="text-lg font-bold text-gold">{weeklyKpiTotals.calls_taken || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Closed</p>
                    <p className="text-lg font-bold text-violet-400">{weeklyKpiTotals.closed || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Pipeline</h3>
              <div className="flex items-end justify-between gap-1">
                {[
                  { id: 'new_lead', label: 'New', color: 'bg-sky-400' },
                  { id: 'dm_sent', label: 'DM\'d', color: 'bg-violet-400' },
                  { id: 'follow_up', label: 'Follow Up', color: 'bg-amber-400' },
                  { id: 'call_booked', label: 'Call', color: 'bg-gold' },
                  { id: 'client_won', label: 'Won', color: 'bg-emerald-400' },
                  { id: 'ghosted', label: 'Ghost', color: 'bg-red-400' },
                ].map(s => {
                  const count = leads.filter(l => l.status === s.id).length
                  const counts = {}; leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })
                  const maxCount = Math.max(1, ...Object.values(counts))
                  return (
                    <div key={s.id} className="flex-1 text-center">
                      <p className="text-lg font-black text-white mb-1">{count}</p>
                      <div className="mx-auto w-full max-w-[40px]">
                        <div className={`${s.color} rounded-t-sm mx-auto transition-all duration-500`} style={{ height: `${Math.max(4, (count / Math.max(1, maxCount)) * 60)}px`, width: '100%' }} />
                      </div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mt-2">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'identity' && (
          <div className="fade-in max-w-2xl">
            <div className="mb-8">
              <p className="text-zinc-500 text-sm leading-relaxed">
                Write your affirmations in the present tense. Read them every morning before starting your day.
                These are not wishes — they are declarations of who you are becoming.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
                <span className="text-2xl">🪞</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">My Identity</h3>
                  <p className="text-zinc-600 text-xs mt-0.5">I am. I have. I do. I create.</p>
                </div>
              </div>

              <div className="space-y-2">
                {Array.from({ length: 20 }, (_, i) => {
                  const lines = (identityAffirmations || '').split('\n')
                  const value = lines[i] || ''
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-700 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <input
                        value={value}
                        onChange={e => {
                          const updated = [...lines]
                          while (updated.length <= i) updated.push('')
                          updated[i] = e.target.value
                          setIdentityAffirmations(updated.join('\n').replace(/\n+$/, ''))
                        }}
                        onBlur={saveIdentity}
                        placeholder={i === 0 ? 'I am a powerful leader who...' : i === 1 ? 'I attract abundance and...' : i === 2 ? 'I am disciplined, focused, and...' : ''}
                        className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700/50 rounded text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-zinc-700 text-xs italic">"The person you become is more important than the things you achieve."</p>
                {identitySaving && <span className="text-xs text-zinc-500 animate-pulse">Saving...</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── MORNING OPS™ ──────────────────────────────────────────────── */}
        {activeTab === 'morning-ops' && (
          <div className="fade-in">
            {/* Date nav */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-widest">Morning Ops™</h2>
                <p className="text-zinc-600 text-xs mt-1">
                  {new Date(dailyPulseDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setDailyPulseDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split('T')[0] })}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setDailyPulseDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 text-xs text-zinc-500 hover:text-gold uppercase tracking-wider font-semibold transition">
                  Today
                </button>
                <button onClick={() => setDailyPulseDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0] })}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {dailyPulse.completed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/20 border border-emerald-900/40 rounded mb-6">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Intention */}
              <div>
              {/* Weekly target reminder */}
              {weeklyPriorities.revenue_target > 0 && (
                <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">This Week's Target</p>
                    <p className="text-white font-bold text-lg mt-0.5">£{Number(weeklyPriorities.revenue_target).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Earned so far</p>
                    <p className="text-emerald-400 font-bold text-lg mt-0.5">£{(weeklyKpiTotals.revenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">My intention for today is...</label>
                <textarea value={dailyPulse.intention || ''} onChange={e => setDailyPulse(prev => ({ ...prev, intention: e.target.value }))} onBlur={savePulse}
                  rows={2} placeholder="Set your intention for the day..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
              </div>

              {/* Feeling */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">How am I feeling going into today?</label>
                <textarea value={dailyPulse.feeling || ''} onChange={e => setDailyPulse(prev => ({ ...prev, feeling: e.target.value }))} onBlur={savePulse}
                  rows={2} placeholder="Check in with yourself..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
              </div>

              {/* Win */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">What would make today a win?</label>
                <textarea value={dailyPulse.win || ''} onChange={e => setDailyPulse(prev => ({ ...prev, win: e.target.value }))} onBlur={savePulse}
                  rows={2} placeholder="Define what success looks like today..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
              </div>

              {/* Money-making task */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">My money-making task today is...</label>
                <input value={dailyPulse.money_task || ''} onChange={e => setDailyPulse(prev => ({ ...prev, money_task: e.target.value }))} onBlur={savePulse}
                  placeholder="The one task that moves the needle financially..."
                  className="w-full px-4 py-3 bg-zinc-900 border-2 border-gold/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm font-medium" />
              </div>

              {/* Top 3 to-dos */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Top 3 To-Dos</label>
                <div className="space-y-2">
                  {[
                    { key: 'todo_1', num: 1 },
                    { key: 'todo_2', num: 2 },
                    { key: 'todo_3', num: 3 },
                  ].map(({ key, num }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-5 flex-shrink-0 text-zinc-500">{num}</span>
                      <input value={dailyPulse[key] || ''} onChange={e => setDailyPulse(prev => ({ ...prev, [key]: e.target.value }))} onBlur={savePulse}
                        placeholder={`To-do ${num}`}
                        className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Schedule — from War Map */}
              {tasksForPulseDay.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Today's Schedule</label>
                  <div className="space-y-1.5">
                    {tasksForPulseDay
                      .sort((a, b) => (a.scheduled_time || '99:99').localeCompare(b.scheduled_time || '99:99'))
                      .map((task, idx) => (
                      <div key={`${task.id}-${idx}`} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 flex items-center gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                        <button onClick={() => completeTask(task.id)} className="flex-shrink-0">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-emerald-500 active:border-emerald-500'}`}>
                            {task.completed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </button>
                        {task.scheduled_time && <span className="text-xs text-sky-400/70 font-medium flex-shrink-0 w-14">{formatTime(task.scheduled_time)}</span>}
                        <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                        {task.duration_minutes && <span className="text-xs text-zinc-600 flex-shrink-0">{task.duration_minutes}min</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gratitude — 6 adventure boxes */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-1">I am so grateful I just...</label>
                <p className="text-zinc-600 text-xs mb-4">Rewrite each mini adventure as if it's already happened. Feel the gratitude.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }, (_, i) => {
                    const adv = adventuresForm[i] || {}
                    const key = `gratitude_${i + 1}`
                    return (
                      <div key={i} className={`bg-zinc-900 border rounded-lg p-3.5 ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${adv.completed ? 'bg-gold border-gold' : 'border-zinc-700'}`}>
                            {adv.completed && <svg className="w-2.5 h-2.5 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <p className={`text-xs font-semibold ${adv.title ? (adv.completed ? 'text-zinc-500' : 'text-white') : 'text-zinc-700 italic'}`}>
                            {adv.title || `Adventure ${i + 1}`}
                          </p>
                        </div>
                        <textarea
                          value={dailyPulse[key] || ''}
                          onChange={e => setDailyPulse(prev => ({ ...prev, [key]: e.target.value }))}
                          onBlur={savePulse}
                          rows={2}
                          placeholder={adv.title ? `I'm so grateful I ${adv.title.toLowerCase()}...` : `Adventure ${i + 1}...`}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-xs leading-relaxed"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Let go */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">What do I need to let go of?</label>
                <textarea value={dailyPulse.let_go || ''} onChange={e => setDailyPulse(prev => ({ ...prev, let_go: e.target.value }))} onBlur={savePulse}
                  rows={2} placeholder="Release what's holding you back..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
              </div>
            </div>

            {/* Identity check */}
            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-4">
              <button
                onClick={() => {
                  const updated = { ...dailyPulse, identity_read: !dailyPulse.identity_read }
                  setDailyPulse(updated)
                  // auto-save
                  supabase.from('daily_pulse').upsert({ ...buildPulsePayload(), identity_read: !dailyPulse.identity_read }, { onConflict: 'client_id,date' })
                }}
                className="flex items-center gap-3 w-full text-left">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${dailyPulse.identity_read ? 'bg-gold border-gold' : 'border-zinc-600 hover:border-gold'}`}>
                  {dailyPulse.identity_read && <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">I have read my Identity Chamber™</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Read your affirmations before completing Morning Ops</p>
                </div>
              </button>
            </div>

            {/* Complete button */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              {dailyPulse.completed ? (
                <div className="bg-zinc-900 border border-emerald-900/40 rounded-lg p-5 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold text-sm mb-1">Morning Ops Complete</p>
                  <p className="text-zinc-500 text-xs">
                    Submitted {dailyPulse.completed_at ? new Date(dailyPulse.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' + new Date(dailyPulse.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">Ready to go? Lock in your day.</p>
                  <button onClick={completePulse} disabled={pulseSaving}
                    className="w-full sm:w-auto px-10 py-4 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {pulseSaving ? 'Submitting...' : 'Complete Morning Ops™'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DESIGN™ ──────────────────────────────────────────────────────── */}
        {activeTab === 'design' && (
          <div className="fade-in">
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
                      <div key={i} className={`bg-zinc-900 border rounded-lg p-4 flex items-start gap-4 card-lift ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
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
          <div className="fade-in">

            {/* Week header + completion status */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-widest">Weekly War Map™</h2>
                <p className="text-zinc-600 text-xs mt-1">Plan the week ahead. Complete on Sunday.</p>
              </div>
              {weeklyPriorities.completed && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 border border-emerald-900/40 rounded">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
                </div>
              )}
            </div>

            {/* Priorities */}
            <div className="mb-8">
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">#1 Priority This Week</h3>
                <p className="text-zinc-600 text-xs mb-3">The single most important thing you must accomplish this week.</p>
                <input
                  value={weeklyPriorities.number_one_priority || ''}
                  onChange={e => setWeeklyPriorities(prev => ({ ...prev, number_one_priority: e.target.value }))}
                  onBlur={savePriorities}
                  placeholder="What is your #1 priority?"
                  className="w-full px-4 py-3.5 bg-zinc-900 border-2 border-gold/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm font-medium"
                />
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Revenue Target This Week (£)</h3>
                <p className="text-zinc-600 text-xs mb-3">What are you committing to earn this week?</p>
                <input
                  type="number" min="0" step="0.01"
                  value={weeklyPriorities.revenue_target || ''}
                  onChange={e => setWeeklyPriorities(prev => ({ ...prev, revenue_target: e.target.value }))}
                  onBlur={savePriorities}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-zinc-900 border-2 border-emerald-500/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm font-bold"
                />
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Other Priorities</h3>
                <p className="text-zinc-600 text-xs mb-3">Three more key focus areas for the week.</p>
                <div className="space-y-2">
                  {[
                    { key: 'priority_2', num: 1 },
                    { key: 'priority_3', num: 2 },
                    { key: 'priority_4', num: 3 },
                  ].map(({ key, num }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-5 flex-shrink-0 text-zinc-500">{num}</span>
                      <input
                        value={weeklyPriorities[key] || ''}
                        onChange={e => setWeeklyPriorities(prev => ({ ...prev, [key]: e.target.value }))}
                        onBlur={savePriorities}
                        placeholder={`Priority ${num}`}
                        className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                    className={`px-3 sm:px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'day' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white active:text-white'}`}>
                    Day
                  </button>
                  <button onClick={() => setCalendarView('week')}
                    className={`px-3 sm:px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'week' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white active:text-white'}`}>
                    Week
                  </button>
                  <button onClick={() => setCalendarView('month')}
                    className={`px-3 sm:px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${calendarView === 'month' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white active:text-white'}`}>
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
                  <div ref={weekViewRef} className="overflow-y-auto scrollbar-thin" style={{ maxHeight: '65vh' }}>
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
                <div ref={weekViewRef} className="overflow-auto scrollbar-thin" style={{ maxHeight: '560px' }}>
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
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold ${isToday ? 'bg-gold text-zinc-950' : 'text-zinc-500'}`}>
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
                              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-zinc-600' : 'bg-gold'}`} />
                            ))}
                            {dayTasks.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                          </div>
                        )}
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

            {/* ── COMPLETE WAR MAP ───────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-zinc-800">
              {weeklyPriorities.completed ? (
                <div className="bg-zinc-900 border border-emerald-900/40 rounded-lg p-5 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold text-sm mb-1">War Map Completed</p>
                  <p className="text-zinc-500 text-xs">
                    Submitted {weeklyPriorities.completed_at ? new Date(weeklyPriorities.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">All done? Submit your War Map for the week.</p>
                  <button
                    onClick={completeWarMap}
                    disabled={prioritiesSaving || !weeklyPriorities.number_one_priority?.trim()}
                    className="w-full sm:w-auto px-10 py-4 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {prioritiesSaving ? 'Submitting...' : 'Complete War Map™'}
                  </button>
                  {!weeklyPriorities.number_one_priority?.trim() && (
                    <p className="text-zinc-600 text-xs mt-2">Set your #1 priority before completing.</p>
                  )}
                </div>
              )}
            </div>

            {/* Past War Maps */}
            {allWarMaps.length > 0 && (
              <div className="mt-10 pt-6 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">History</h3>
                <div className="space-y-2">
                  {allWarMaps.map(wm => (
                    <button key={wm.week_of} onClick={() => setWarMapWeek(wm.week_of)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition text-left ${
                        warMapWeek === wm.week_of ? 'border-gold/30 bg-gold/5' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}>
                      <div>
                        <p className="text-sm text-white font-medium">{formatWeekRange(wm.week_of)}</p>
                        {wm.number_one_priority && <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[250px]">{wm.number_one_priority}</p>}
                      </div>
                      {wm.completed ? (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Done</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Draft</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── TASK MODAL ────────────────────────────────────────────── */}
            {taskModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4"
                onClick={() => setTaskModal(null)}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin slide-up"
                  onClick={e => e.stopPropagation()}>

                  {/* Mobile drag handle */}
                  <div className="flex justify-center mb-3 sm:hidden">
                    <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                      {taskModal.mode === 'view' ? 'Task' : taskModal.mode === 'edit' ? 'Edit Task' : taskModal.mode === 'schedule' ? 'Schedule Task' : 'Add Task'}
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
                          <button onClick={() => openEditModal(taskModal.task)}
                            className="flex-1 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold text-zinc-300 font-bold text-xs uppercase tracking-widest rounded transition">
                            Edit
                          </button>
                        )}
                        {!taskModal.task.completed && (
                          <button onClick={() => { completeTask(taskModal.task.id); setTaskModal(null) }}
                            className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded transition">
                            Done
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
                        <input autoFocus={taskModal.mode === 'new' || taskModal.mode === 'edit'} value={modalForm.title}
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
                          {taskModal.mode === 'edit' ? 'Save Changes' : taskModal.mode === 'schedule' ? 'Schedule Task' : 'Add to Calendar'}
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

        {/* ── DASHBOARD — Daily KPI Tracker ─────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-white uppercase tracking-widest">Dashboard</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => { if (kpiMonth === 0) { setKpiMonth(11); setKpiYear(y => y - 1) } else setKpiMonth(m => m - 1) }}
                  className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-semibold text-white min-w-[160px] text-center">{MONTH_NAMES[kpiMonth]} {kpiYear}</span>
                <button onClick={() => { if (kpiMonth === 11) { setKpiMonth(0); setKpiYear(y => y + 1) } else setKpiMonth(m => m + 1) }}
                  className="p-2 text-zinc-500 hover:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* KPI Table */}
            <div className="overflow-x-scroll border border-zinc-800 rounded-lg -mx-4 md:-mx-8 pb-2" style={{ scrollbarColor: '#3f3f46 transparent' }}>
              <table className="text-[11px] w-max min-w-full">
                <thead>
                  {/* Group headers */}
                  <tr className="bg-zinc-900">
                    <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-2 text-zinc-500 font-semibold uppercase tracking-wider border-b border-r border-zinc-800 w-10">Day</th>
                    {KPI_GROUPS.map(g => {
                      const count = KPI_COLS.filter(c => c.group === g.id).length
                      return <th key={g.id} colSpan={count} className={`px-2 py-2 font-bold uppercase tracking-wider border-b border-zinc-800 ${g.color}`}>{g.label}</th>
                    })}
                  </tr>
                  {/* Column headers */}
                  <tr className="bg-zinc-900/70">
                    <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-1.5 border-b border-r border-zinc-800" />
                    {KPI_COLS.map(col => (
                      <th key={col.key} className={`px-1.5 py-1.5 text-zinc-500 font-semibold whitespace-nowrap border-b border-zinc-800 ${col.calc ? 'bg-zinc-900/40' : ''}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpiDays.map((dateStr, i) => {
                    const day = i + 1
                    const row = monthlyKpis[dateStr] || {}
                    const isToday = dateStr === todayStr
                    return (
                      <tr key={dateStr} className={`border-b border-zinc-900/60 ${isToday ? 'bg-gold/[0.04]' : 'hover:bg-zinc-900/40'}`}>
                        <td className={`sticky left-0 z-10 px-2 py-1 text-center font-bold border-r border-zinc-800 ${isToday ? 'bg-gold/20 text-gold' : 'bg-zinc-950 text-zinc-500'}`}>
                          {day}
                        </td>
                        {KPI_COLS.map(col => (
                          <td key={col.key} className={`px-0.5 py-0.5 text-center ${col.calc ? 'bg-zinc-900/20 text-zinc-400' : ''}`}>
                            {col.calc ? (
                              <span className="px-1.5 py-1 block">{col.calc(row)}</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step={col.step || '1'}
                                value={row[col.key] || ''}
                                onChange={e => updateKpi(dateStr, col.key, e.target.value)}
                                onBlur={() => saveKpiDay(dateStr)}
                                placeholder="0"
                                className="w-full min-w-[52px] bg-transparent text-center text-white placeholder-zinc-700 py-1 px-1 focus:outline-none focus:bg-zinc-800 rounded transition"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gold/40 bg-zinc-900 font-bold">
                    <td className="sticky left-0 z-10 bg-zinc-900 px-2 py-2 text-center text-gold text-xs uppercase tracking-widest border-r border-zinc-800">Total</td>
                    {KPI_COLS.map(col => {
                      // Total followers & New followers: show % change first entry vs last entry
                      if (col.key === 'total_followers' || col.key === 'new_followers') {
                        const days = kpiDays.filter(d => monthlyKpis[d]?.[col.key] !== undefined && Number(monthlyKpis[d][col.key]) !== 0)
                        if (days.length < 2) {
                          return <td key={col.key} className="px-1.5 py-2 text-center text-zinc-500 text-xs">—</td>
                        }
                        const first = Number(monthlyKpis[days[0]][col.key])
                        const last = Number(monthlyKpis[days[days.length - 1]][col.key])
                        const pct = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0
                        return (
                          <td key={col.key} className="px-1.5 py-2 text-center">
                            <span className={`text-xs font-bold ${pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                              {pct > 0 ? '+' : ''}{pct}%
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={col.key} className="px-1.5 py-2 text-center text-white">
                          {col.calc
                            ? col.calc(kpiTotals)
                            : col.step === '0.01'
                              ? `£${kpiTotals[col.key]?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                              : kpiTotals[col.key] || 0
                          }
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Monthly Benchmarks */}
            <div className="mt-8">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Monthly Benchmarks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Avg Daily New Followers</p>
                  <p className="text-xl font-bold text-sky-400">{kpiTotals.new_followers ? Math.round(kpiTotals.new_followers / kpiDaysWithData) : '—'}</p>
                  <p className="text-zinc-600 text-[10px] mt-1">Target: 10+ per day</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Avg Daily New Convos</p>
                  <p className="text-xl font-bold text-violet-400">{kpiTotals.new_convos ? Math.round(kpiTotals.new_convos / kpiDaysWithData) : '—'}</p>
                  <p className="text-zinc-600 text-[10px] mt-1">Target: 20+ per day</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">DM Response Rate</p>
                  <p className="text-xl font-bold text-gold">{kpiTotals.new_convos ? Math.round(kpiTotals.responded / kpiTotals.new_convos * 100) + '%' : '—'}</p>
                  <p className="text-zinc-600 text-[10px] mt-1">Target: 30%+</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Show Up Rate</p>
                  <p className="text-xl font-bold text-emerald-400">{kpiTotals.calls_booked ? Math.round(kpiTotals.calls_taken / kpiTotals.calls_booked * 100) + '%' : '—'}</p>
                  <p className="text-zinc-600 text-[10px] mt-1">Target: 95%+</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HOT LIST — Lead Pipeline ─────────────────────────────────────── */}
        {activeTab === 'hot-list' && (
          <div className="fade-in">
            <div className="mb-6">
              <h2 className="text-base font-bold text-white uppercase tracking-widest">Hot List</h2>
              <p className="text-zinc-600 text-xs mt-1">Track your leads from first contact to closed client. Drag cards between columns.</p>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 pb-4">
              <div className="flex gap-3 px-4 sm:px-0" style={{ minWidth: '900px' }}>
                {LEAD_STAGES.map((stage, stageIdx) => {
                  const stageLeads = leads.filter(l => l.status === stage.id)
                  const prevStageId = stageIdx > 0 ? LEAD_STAGES[stageIdx - 1].id : null
                  const nextStageId = stageIdx < LEAD_STAGES.length - 1 ? LEAD_STAGES[stageIdx + 1].id : null
                  const isDragOver = dragOverCol === stage.id && dragLead?.status !== stage.id
                  return (
                    <div key={stage.id} className="flex-1 min-w-[150px]" data-stage={stage.id}>
                      {/* Column header */}
                      <div className={`rounded-t-lg border-t-2 ${stage.color} px-3 py-2.5 bg-zinc-900`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{stage.label}</h3>
                          <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                        </div>
                      </div>

                      {/* Drop zone */}
                      <div
                        className={`bg-zinc-900/50 border border-t-0 border-zinc-800 rounded-b-lg p-2 min-h-[200px] space-y-2 transition-colors ${isDragOver ? 'bg-gold/[0.06] border-gold/30' : ''}`}
                        onDragOver={e => handleDragOver(e, stage.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, stage.id)}
                        data-stage={stage.id}
                      >
                        {stageLeads.map(lead => (
                          <div key={lead.id}
                            draggable
                            onDragStart={e => handleDragStart(e, lead)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={e => handleTouchStart(e, lead)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 group cursor-grab active:cursor-grabbing hover:border-zinc-600 transition select-none card-lift">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openLeadModal(lead) }}>
                                <p className="text-sm font-semibold text-white leading-tight">{lead.name}</p>
                                {lead.instagram && (
                                  <p className="text-xs text-violet-400 mt-0.5 truncate">@{lead.instagram.replace('@', '')}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); openLeadModal(lead) }}
                                  className="text-zinc-700 hover:text-gold active:text-gold transition p-0.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id) }}
                                  className="text-zinc-700 hover:text-red-400 active:text-red-400 transition sm:opacity-0 sm:group-hover:opacity-100 p-0.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </div>
                            {lead.notes && <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{lead.notes}</p>}
                            <p className="text-[10px] text-zinc-600 mt-1.5">
                            Moved: {new Date(lead.updated_at || lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                            {/* Mobile move buttons */}
                            <div className="flex items-center gap-1.5 mt-2 sm:hidden">
                              {prevStageId && (
                                <button onClick={(e) => { e.stopPropagation(); moveLead(lead.id, prevStageId) }}
                                  className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-500 active:text-white bg-zinc-900 active:bg-zinc-700 rounded transition uppercase tracking-wider text-center">
                                  ← Back
                                </button>
                              )}
                              {nextStageId && (
                                <button onClick={(e) => { e.stopPropagation(); moveLead(lead.id, nextStageId) }}
                                  className="flex-1 py-1.5 text-[10px] font-semibold text-gold active:text-gold-light bg-gold/10 active:bg-gold/20 rounded transition uppercase tracking-wider text-center">
                                  Next →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add card */}
                        {addingLeadCol === stage.id ? (
                          <div className="space-y-2">
                            <input autoFocus value={newLeadName} onChange={e => setNewLeadName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && newLeadName.trim()) addLead(stage.id); if (e.key === 'Escape') { setAddingLeadCol(null); setNewLeadName(''); setNewLeadIG('') } }}
                              placeholder="Lead name..."
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition" />
                            <input value={newLeadIG} onChange={e => setNewLeadIG(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && newLeadName.trim()) addLead(stage.id); if (e.key === 'Escape') { setAddingLeadCol(null); setNewLeadName(''); setNewLeadIG('') } }}
                              placeholder="@instagram (optional)"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition" />
                            <div className="flex gap-1.5">
                              <button onClick={() => addLead(stage.id)}
                                className="flex-1 py-1.5 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-[10px] uppercase tracking-widest rounded transition">
                                Add
                              </button>
                              <button onClick={() => { setAddingLeadCol(null); setNewLeadName(''); setNewLeadIG('') }}
                                className="px-3 py-1.5 border border-zinc-700 text-zinc-500 text-[10px] uppercase tracking-widest rounded transition">
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingLeadCol(stage.id); setNewLeadName(''); setNewLeadIG('') }}
                            className="w-full py-2 text-[10px] font-semibold text-zinc-600 hover:text-gold active:text-gold uppercase tracking-widest transition text-center rounded hover:bg-zinc-800/60">
                            + Add card
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lead Edit Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setEditingLead(null)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center mb-3 sm:hidden"><div className="w-10 h-1 bg-zinc-700 rounded-full" /></div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Edit Lead</h3>
                <button onClick={() => setEditingLead(null)} className="text-zinc-500 hover:text-white active:text-white transition p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Name</label>
                  <input value={leadForm.name} onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Instagram</label>
                  <input value={leadForm.instagram} onChange={e => setLeadForm(f => ({ ...f, instagram: e.target.value }))}
                    placeholder="@handle"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition text-sm" />
                  {leadForm.instagram && (
                    <a href={`https://instagram.com/${leadForm.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 mt-1.5 inline-block">
                      Open @{leadForm.instagram.replace('@', '')} on Instagram →
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Notes</label>
                  <textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))}
                    rows={4} placeholder="Add notes, links, context..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  {/* Render clickable links from notes */}
                  {leadForm.notes && (() => {
                    const urls = leadForm.notes.match(/https?:\/\/[^\s]+/g)
                    if (!urls || urls.length === 0) return null
                    return (
                      <div className="mt-2 space-y-1">
                        {urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="block text-xs text-gold hover:text-gold-light truncate transition">
                            {url}
                          </a>
                        ))}
                      </div>
                    )
                  })()}
                </div>
                <div className="bg-zinc-800/50 rounded-lg px-4 py-3">
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>Stage: <span className="text-zinc-400 font-semibold">{LEAD_STAGES.find(s => s.id === editingLead.status)?.label || editingLead.status}</span></span>
                    <span>Moved: {new Date(editingLead.updated_at || editingLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={saveLeadEdit}
                    className="flex-1 py-3 bg-gold hover:bg-gold-light text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                    Save
                  </button>
                  <button onClick={() => { deleteLead(editingLead.id); setEditingLead(null) }}
                    className="py-3 px-4 border border-red-900 hover:bg-red-900/20 text-red-400 font-bold text-xs uppercase tracking-widest rounded transition">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── THE DEBRIEF™ ──────────────────────────────────────────────── */}
        {activeTab === 'debrief' && (
          <div className="fade-in">
            {/* Date nav */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-zinc-600 text-xs mt-1">
                  {new Date(eveningPulseDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEveningPulseDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split('T')[0] })}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setEveningPulseDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 text-xs text-zinc-500 hover:text-gold uppercase tracking-wider font-semibold transition">Today</button>
                <button onClick={() => setEveningPulseDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0] })}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {eveningPulse.completed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/20 border border-emerald-900/40 rounded mb-6">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
              </div>
            )}

            <div className="space-y-6">
              {/* #1 Priority check */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-3">Did I complete my #1 priority?</label>
                <div className="flex gap-3">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => { setEveningPulse(prev => ({ ...prev, priority_completed: val })); saveEvening({ priority_completed: val }) }}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition border ${
                        eveningPulse.priority_completed === val
                          ? val ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-900/40 border-red-800 text-red-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                      }`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text prompts */}
              {[
                { key: 'went_well', label: 'What went well today?', color: 'text-emerald-400' },
                { key: 'do_differently', label: 'What will I do differently tomorrow?', color: 'text-sky-400' },
                { key: 'learned', label: 'One thing I learned today...', color: 'text-zinc-400' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${color}`}>{label}</label>
                  <textarea value={eveningPulse[key] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [key]: e.target.value }))} onBlur={saveEvening}
                    rows={2} placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
              ))}

              {/* Show up rating */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-3">
                  How did I show up today? — <span className="text-white">{eveningPulse.show_up_rating || '—'}/10</span>
                </label>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => { setEveningPulse(prev => ({ ...prev, show_up_rating: n })); saveEvening({ show_up_rating: n }) }}
                      className={`flex-1 py-2.5 rounded text-sm font-bold transition ${
                        n <= (eveningPulse.show_up_rating || 0)
                          ? n <= 3 ? 'bg-red-900/40 text-red-400' : n <= 6 ? 'bg-amber-900/40 text-amber-400' : 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* More prompts */}
              {[
                { key: 'not_to_plan', label: "What didn't go to plan?", color: 'text-red-400' },
                { key: 'proud_of', label: 'What am I proud of today?', color: 'text-gold' },
                { key: 'love_about_self', label: 'The one thing I love about myself is...', color: 'text-violet-400' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${color}`}>{label}</label>
                  <textarea value={eveningPulse[key] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [key]: e.target.value }))} onBlur={saveEvening}
                    rows={2} placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
              ))}

              {/* Gratitude — 6 adventure boxes */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-1">I am so grateful I just...</label>
                <p className="text-zinc-600 text-xs mb-4">Rewrite each mini adventure as if it's already happened.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }, (_, i) => {
                    const adv = adventuresForm[i] || {}
                    const key = `gratitude_${i + 1}`
                    return (
                      <div key={i} className={`bg-zinc-900 border rounded-lg p-3.5 ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${adv.completed ? 'bg-gold border-gold' : 'border-zinc-700'}`}>
                            {adv.completed && <svg className="w-2.5 h-2.5 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <p className={`text-xs font-semibold ${adv.title ? (adv.completed ? 'text-zinc-500' : 'text-white') : 'text-zinc-700 italic'}`}>
                            {adv.title || `Adventure ${i + 1}`}
                          </p>
                        </div>
                        <textarea value={eveningPulse[key] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [key]: e.target.value }))} onBlur={saveEvening}
                          rows={2} placeholder={adv.title ? `I'm so grateful I ${adv.title.toLowerCase()}...` : `Adventure ${i + 1}...`}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-xs leading-relaxed" />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Wins for the day */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-1">Wins for the Day</label>
                <p className="text-zinc-600 text-xs mb-4">Capture your victories — big or small.</p>
                <div className="space-y-4">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-gold font-bold text-sm">Win {n}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Win</label>
                          <input value={eveningPulse[`win_${n}_title`] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [`win_${n}_title`]: e.target.value }))} onBlur={saveEvening}
                            placeholder="What was the win?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">What I did</label>
                          <input value={eveningPulse[`win_${n}_action`] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [`win_${n}_action`]: e.target.value }))} onBlur={saveEvening}
                            placeholder="How did I make it happen?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Further progress</label>
                          <input value={eveningPulse[`win_${n}_progress`] || ''} onChange={e => setEveningPulse(prev => ({ ...prev, [`win_${n}_progress`]: e.target.value }))} onBlur={saveEvening}
                            placeholder="What's the next step?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete button */}
            <div className="mt-10 pt-6 border-t border-zinc-800">
              {eveningPulse.completed ? (
                <div className="bg-zinc-900 border border-emerald-900/40 rounded-lg p-5 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold text-sm mb-1">Debrief Complete</p>
                  <p className="text-zinc-500 text-xs">
                    Submitted {eveningPulse.completed_at ? new Date(eveningPulse.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' + new Date(eveningPulse.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">End of day. Lock it in.</p>
                  <button onClick={completeEvening} disabled={eveningSaving}
                    className="w-full sm:w-auto px-10 py-4 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {eveningSaving ? 'Submitting...' : 'Complete The Debrief™'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── THE LOCK IN™ — Weekly Review ───────────────────────────────── */}
        {activeTab === 'lock-in' && (
          <div className="fade-in">
            {/* Week nav */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs">Review the week that's ending. Complete on Sunday.</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setReviewWeek(w => shiftWeek(w, -1))}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-semibold text-white min-w-[180px] text-center">
                  {formatWeekRange(reviewWeek)}
                </span>
                <button onClick={() => setReviewWeek(w => shiftWeek(w, 1))}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {weeklyReview.completed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/20 border border-emerald-900/40 rounded mb-6">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
              </div>
            )}

            <div className="space-y-6 mt-6">
              {/* Revenue */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">Revenue Generated This Week (£)</label>
                <input type="number" min="0" step="0.01" value={weeklyReview.revenue || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, revenue: e.target.value }))} onBlur={saveReview}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-zinc-900 border-2 border-gold/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-lg font-bold" />
              </div>

              {/* Target hit */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Did I hit my weekly target?</label>
                <div className="flex gap-3">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => { setWeeklyReview(prev => ({ ...prev, target_hit: val })); saveReview({ target_hit: val }) }}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition border ${
                        weeklyReview.target_hit === val
                          ? val ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-900/40 border-red-800 text-red-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                      }`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week rating */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-3">
                  Overall Week Rating — <span className="text-white">{weeklyReview.week_rating || '—'}/10</span>
                </label>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => { setWeeklyReview(prev => ({ ...prev, week_rating: n })); saveReview({ week_rating: n }) }}
                      className={`flex-1 py-2.5 rounded text-sm font-bold transition ${
                        n <= (weeklyReview.week_rating || 0)
                          ? n <= 3 ? 'bg-red-900/40 text-red-400' : n <= 6 ? 'bg-amber-900/40 text-amber-400' : 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection prompts */}
              {[
                { key: 'went_well', label: 'What went well this week?', color: 'text-emerald-400' },
                { key: 'not_to_plan', label: "What didn't go to plan — and why?", color: 'text-red-400' },
                { key: 'patterns', label: 'What patterns am I noticing in myself?', color: 'text-violet-400' },
                { key: 'energy_drain', label: 'What drained my energy this week?', color: 'text-zinc-400' },
                { key: 'energy_boost', label: 'What gave me the most energy this week?', color: 'text-sky-400' },
                { key: 'one_fix', label: 'What is the one thing I need to fix going into next week?', color: 'text-gold' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${color}`}>{label}</label>
                  <textarea value={weeklyReview[key] || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, [key]: e.target.value }))} onBlur={saveReview}
                    rows={3} placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
              ))}

              {/* Top 5 Wins */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-1">Top 5 Wins</label>
                <p className="text-zinc-600 text-xs mb-4">Celebrate progress. Build momentum.</p>
                <div className="space-y-4">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <span className="text-gold font-bold text-sm mb-3 block">Win {n}</span>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Win</label>
                          <input value={weeklyReview[`win_${n}_title`] || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, [`win_${n}_title`]: e.target.value }))} onBlur={saveReview}
                            placeholder="What was the win?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">What I did to achieve this</label>
                          <input value={weeklyReview[`win_${n}_action`] || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, [`win_${n}_action`]: e.target.value }))} onBlur={saveReview}
                            placeholder="How did I make it happen?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Further progress</label>
                          <input value={weeklyReview[`win_${n}_progress`] || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, [`win_${n}_progress`]: e.target.value }))} onBlur={saveReview}
                            placeholder="What's the next step?"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-700 text-xs italic mt-3 text-center">"What you celebrate, you repeat. Acknowledge the wins."</p>
              </div>

              {/* Next Week Focus */}
              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-4">Next Week Focus</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">My #1 focus next week is...</label>
                    <textarea value={weeklyReview.next_focus || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, next_focus: e.target.value }))} onBlur={saveReview}
                      rows={2} placeholder="The single most important thing..."
                      className="w-full px-4 py-3 bg-zinc-900 border-2 border-gold/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">My income target for next week (£) and how I will hit it...</label>
                    <textarea value={weeklyReview.next_income_target || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, next_income_target: e.target.value }))} onBlur={saveReview}
                      rows={3} placeholder="£X,XXX — here's how..."
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">One thing I will do differently next week...</label>
                    <textarea value={weeklyReview.next_differently || ''} onChange={e => setWeeklyReview(prev => ({ ...prev, next_differently: e.target.value }))} onBlur={saveReview}
                      rows={2} placeholder="The change I'm committing to..."
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Complete button */}
            <div className="mt-10 pt-6 border-t border-zinc-800">
              {weeklyReview.completed ? (
                <div className="bg-zinc-900 border border-emerald-900/40 rounded-lg p-5 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold text-sm mb-1">Week Locked In</p>
                  <p className="text-zinc-500 text-xs">
                    Submitted {weeklyReview.completed_at ? new Date(weeklyReview.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  </p>
                  <p className="text-zinc-700 text-xs italic mt-3">"The weekly review is where clarity is created and standards are maintained."</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">Lock in your week. Move forward with clarity.</p>
                  <button onClick={completeReview} disabled={reviewSaving}
                    className="w-full sm:w-auto px-10 py-4 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {reviewSaving ? 'Submitting...' : 'Complete The Lock In™'}
                  </button>
                </div>
              )}
            </div>

            {/* Past Lock Ins */}
            {allLockIns.length > 0 && (
              <div className="mt-10 pt-6 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">History</h3>
                <div className="space-y-2">
                  {allLockIns.map(li => (
                    <button key={li.week_of} onClick={() => setReviewWeek(li.week_of)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition text-left ${
                        reviewWeek === li.week_of ? 'border-gold/30 bg-gold/5' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}>
                      <div>
                        <p className="text-sm text-white font-medium">{formatWeekRange(li.week_of)}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {li.week_rating && <span className="text-[10px] text-zinc-500">Rating: {li.week_rating}/10</span>}
                          {li.revenue > 0 && <span className="text-[10px] text-emerald-400">£{Number(li.revenue).toLocaleString()}</span>}
                        </div>
                      </div>
                      {li.completed ? (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Done</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Draft</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MONTHLY REVIEW ──────────────────────────────────────────────── */}
        {activeTab === 'monthly' && (
          <div className="fade-in">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs">Reflect on the month. Recalibrate for the next.</p>
              <div className="flex items-center gap-1">
                <button onClick={() => { if (reviewMonth === 0) { setReviewMonth(11); setReviewYear(y => y - 1) } else setReviewMonth(m => m - 1) }}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-semibold text-white min-w-[140px] text-center">{MONTH_NAMES[reviewMonth]} {reviewYear}</span>
                <button onClick={() => { if (reviewMonth === 11) { setReviewMonth(0); setReviewYear(y => y + 1) } else setReviewMonth(m => m + 1) }}
                  className="p-2 text-zinc-500 hover:text-white active:text-white transition rounded hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {monthlyReview.completed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/20 border border-emerald-900/40 rounded mb-6">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
              </div>
            )}

            <div className="space-y-6 mt-6">
              {/* Revenue */}
              <div>
                {/* Last month's target vs this month's actual */}
                {lastMonthReview?.revenue_target > 0 && (
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Last month's target vs this month's result
                    </p>
                    <div className="flex items-baseline justify-between mb-2">
                      <div>
                        <span className="text-zinc-600 text-xs">Target: </span>
                        <span className="text-white font-bold">£{Number(lastMonthReview.revenue_target).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 text-xs">Actual: </span>
                        <span className={`font-bold ${(monthlyReview.revenue || 0) >= lastMonthReview.revenue_target ? 'text-emerald-400' : 'text-red-400'}`}>
                          £{(monthlyReview.revenue || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${(monthlyReview.revenue || 0) >= lastMonthReview.revenue_target ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, Math.round(((monthlyReview.revenue || 0) / lastMonthReview.revenue_target) * 100))}%` }} />
                    </div>
                    <p className={`text-xs font-bold mt-1.5 ${(monthlyReview.revenue || 0) >= lastMonthReview.revenue_target ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(monthlyReview.revenue || 0) >= lastMonthReview.revenue_target ? 'Target hit' : `£${(lastMonthReview.revenue_target - (monthlyReview.revenue || 0)).toLocaleString()} short`}
                    </p>
                  </div>
                )}

                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-2">Total Revenue This Month (£)</label>
                <p className="text-zinc-600 text-xs mb-3">What did you actually earn this month?</p>
                <input type="number" min="0" step="0.01" value={monthlyReview.revenue || ''} onChange={e => setMonthlyReview(prev => ({ ...prev, revenue: e.target.value }))} onBlur={() => saveMonthly()}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-zinc-900 border-2 border-gold/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-lg font-bold mb-5" />

                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Revenue Target for Next Month (£)</label>
                <p className="text-zinc-600 text-xs mb-3">What are you committing to earn next month?</p>
                <input type="number" min="0" step="0.01" value={monthlyReview.revenue_target || ''} onChange={e => setMonthlyReview(prev => ({ ...prev, revenue_target: e.target.value }))} onBlur={() => saveMonthly()}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-zinc-900 border-2 border-emerald-500/30 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-lg font-bold" />
              </div>

              {/* Target hit */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Did I hit my monthly target?</label>
                <div className="flex gap-3">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => { setMonthlyReview(prev => ({ ...prev, target_hit: val })); saveMonthly({ target_hit: val }) }}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition border ${
                        monthlyReview.target_hit === val
                          ? val ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-900/40 border-red-800 text-red-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                      }`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month rating */}
              <div>
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-3">
                  How was this month overall? — <span className="text-white">{monthlyReview.month_rating || '—'}/10</span>
                </label>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => { setMonthlyReview(prev => ({ ...prev, month_rating: n })); saveMonthly({ month_rating: n }) }}
                      className={`flex-1 py-2.5 rounded text-sm font-bold transition ${
                        n <= (monthlyReview.month_rating || 0)
                          ? n <= 3 ? 'bg-red-900/40 text-red-400' : n <= 6 ? 'bg-amber-900/40 text-amber-400' : 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection prompts */}
              {[
                { key: 'biggest_win', label: 'Biggest win this month', color: 'text-emerald-400' },
                { key: 'biggest_challenge', label: 'Biggest challenge this month', color: 'text-red-400' },
                { key: 'key_learning', label: 'Key learning — what did this month teach me?', color: 'text-sky-400' },
                { key: 'mindset_shift', label: 'How has my mindset shifted this month?', color: 'text-violet-400' },
                { key: 'energy_focus', label: 'Where should I focus my energy next month?', color: 'text-amber-400' },
                { key: 'improve', label: 'What do I need to improve?', color: 'text-zinc-400' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${color}`}>{label}</label>
                  <textarea value={monthlyReview[key] || ''} onChange={e => setMonthlyReview(prev => ({ ...prev, [key]: e.target.value }))} onBlur={() => saveMonthly()}
                    rows={3} placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                </div>
              ))}

              {/* Goals for next month */}
              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-4">Top 3 Goals for Next Month</label>
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex items-center gap-3">
                      <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                      <input value={monthlyReview[`goal_${n}`] || ''} onChange={e => setMonthlyReview(prev => ({ ...prev, [`goal_${n}`]: e.target.value }))} onBlur={() => saveMonthly()}
                        placeholder={`Goal ${n}`}
                        className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete button */}
            <div className="mt-10 pt-6 border-t border-zinc-800">
              {monthlyReview.completed ? (
                <div className="bg-zinc-900 border border-emerald-900/40 rounded-lg p-5 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold text-sm mb-1">Monthly Review Complete</p>
                  <p className="text-zinc-500 text-xs">
                    Submitted {monthlyReview.completed_at ? new Date(monthlyReview.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">Close out the month. Set the tone for the next.</p>
                  <button onClick={completeMonthly} disabled={monthlySaving}
                    className="w-full sm:w-auto px-10 py-4 bg-gold hover:bg-gold-light disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                    {monthlySaving ? 'Submitting...' : 'Complete Monthly Review'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white uppercase tracking-wider">Projects</h2>
              <button onClick={() => { resetProjectForm(); setShowProjectForm(true) }}
                className="px-4 py-2 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gold/90 transition">
                + Add Project
              </button>
            </div>

            {/* Project Form */}
            {showProjectForm && (
              <div className="bg-zinc-900 border border-gold/30 rounded-xl p-5 mb-6">
                <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">{editingProject ? 'Edit Project' : 'New Project'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Name *</label>
                    <input value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Project name"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Description</label>
                    <textarea value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} placeholder="Brief description..."
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Status</label>
                    <select value={projectForm.status} onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Priority</label>
                    <select value={projectForm.priority} onChange={e => setProjectForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Start Date</label>
                    <input type="date" value={projectForm.start_date} onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">End Date</label>
                    <input type="date" value={projectForm.end_date} onChange={e => setProjectForm(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Links <span className="text-zinc-700">(one per line)</span></label>
                    <textarea value={projectForm.links} onChange={e => setProjectForm(f => ({ ...f, links: e.target.value }))}
                      rows={2} placeholder="https://..."
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Resources <span className="text-zinc-700">(one per line)</span></label>
                    <textarea value={projectForm.resources} onChange={e => setProjectForm(f => ({ ...f, resources: e.target.value }))}
                      rows={2} placeholder="Resource notes..."
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={saveProject} className="px-6 py-2.5 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gold/90 transition">
                    {editingProject ? 'Update' : 'Create'}
                  </button>
                  <button onClick={resetProjectForm} className="px-4 py-2.5 text-zinc-500 hover:text-white text-xs uppercase tracking-widest font-semibold transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Project List */}
            {projects.length === 0 && !showProjectForm ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg mb-4">
                  <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-zinc-500 text-sm font-medium">No projects yet</p>
                <p className="text-zinc-700 text-xs mt-1">Click "+ Add Project" to create one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map(p => {
                  const statusColors = {
                    not_started: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
                    in_progress: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    on_hold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    complete: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                  }
                  const tasks = projectTasks[p.id] || []
                  const completedTasks = tasks.filter(t => t.completed).length
                  const expanded = expandedProjects[p.id]
                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                              <h3 className="font-semibold text-white">{p.name}</h3>
                              <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${statusColors[p.status] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>{p.status}</span>
                              {p.priority && <span className="text-xs text-zinc-600 uppercase tracking-wider">{p.priority}</span>}
                            </div>
                            {p.description && <p className="text-zinc-400 text-sm leading-relaxed">{p.description}</p>}
                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-zinc-600 uppercase tracking-wide">
                              {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                              {p.end_date && <span>End: {formatDate(p.end_date)}</span>}
                              {tasks.length > 0 && <span>Tasks: {completedTasks}/{tasks.length}</span>}
                            </div>
                            {p.links && (
                              <div className="mt-3">
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Links</p>
                                {p.links.split('\n').filter(Boolean).map((link, i) => (
                                  <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer" className="block text-xs text-gold hover:text-gold/80 truncate transition">{link.trim()}</a>
                                ))}
                              </div>
                            )}
                            {p.resources && (
                              <div className="mt-2">
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Resources</p>
                                {p.resources.split('\n').filter(Boolean).map((r, i) => (
                                  <p key={i} className="text-xs text-zinc-400">{r.trim()}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => editProject(p)} className="p-2 text-zinc-600 hover:text-gold active:text-gold transition rounded">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => deleteProject(p.id)} className="p-2 text-zinc-600 hover:text-red-400 active:text-red-400 transition rounded">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button onClick={() => setExpandedProjects(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                              className="p-2 text-zinc-600 hover:text-white active:text-white transition rounded">
                              <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </div>
                        </div>
                        {tasks.length > 0 && (
                          <div className="mt-4">
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(completedTasks / tasks.length) * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                      {expanded && (
                        <div className="border-t border-zinc-800 px-5 py-4 bg-zinc-950/50">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tasks</p>
                          {tasks.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 group">
                                  <button onClick={() => toggleProjectTask(p.id, task.id, task.completed)}
                                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'}`}>
                                    {task.completed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                  </button>
                                  <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                                  <button onClick={() => deleteProjectTask(p.id, task.id)} className="p-1 text-zinc-700 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input value={newTaskInputs[p.id] || ''} onChange={e => setNewTaskInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') addProjectTask(p.id) }}
                              placeholder="Add a task..."
                              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                            <button onClick={() => addProjectTask(p.id)}
                              className="px-3 py-2 bg-gold/20 text-gold border border-gold/30 rounded text-xs font-bold uppercase tracking-widest hover:bg-gold/30 active:bg-gold/30 transition">
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  )
}
