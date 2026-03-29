'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const LEAD_STAGES = [
  { id: 'new_lead', label: 'New Lead', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  { id: 'dm_sent', label: 'DM Sent', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { id: 'follow_up', label: 'Follow-up', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'call_booked', label: 'Call Booked', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30' },
  { id: 'client_won', label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'ghosted', label: 'Ghosted', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
]

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  return date.toISOString().split('T')[0]
}

function getWeekDays(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(v) {
  if (v == null) return '—'
  return `£${Number(v).toLocaleString()}`
}

function defaultAdventures() {
  return Array.from({ length: 6 }, (_, i) => ({ order_index: i + 1, title: '', who_with: '', when_planned: '', where_planned: '', completed: false }))
}

function formatDayHeader(dateStr) {
  const d = new Date(dateStr)
  return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.getDate() }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ status }) {
  const styles = {
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    paused:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
    planning:  'bg-violet-500/10 text-violet-400 border-violet-500/30',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${styles[status] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
      {status}
    </span>
  )
}

function CompletedBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/20 border border-emerald-900/40 rounded">
      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
    </div>
  )
}

function PendingBadge() {
  return <span className="px-2.5 py-1 bg-yellow-900/20 border border-yellow-900/40 rounded text-yellow-400 text-xs font-semibold uppercase tracking-widest">Pending</span>
}

function NotStartedBadge() {
  return <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-500 text-xs font-semibold uppercase tracking-widest">Not Started</span>
}

function ReadOnlyField({ label, value, color = 'text-zinc-400' }) {
  if (!value) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${color}`}>{label}</p>
      <p className="text-white text-sm leading-relaxed">{value}</p>
    </div>
  )
}

function YesNoBadge({ value }) {
  if (value === true) return <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-800 rounded text-emerald-400 text-xs font-bold uppercase">Yes</span>
  if (value === false) return <span className="px-2 py-0.5 bg-red-900/40 border border-red-800 rounded text-red-400 text-xs font-bold uppercase">No</span>
  return <span className="text-zinc-600 text-xs">—</span>
}

function RatingBar({ value, max = 10 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1
        const active = n <= (value || 0)
        return (
          <div key={n} className={`flex-1 h-2.5 rounded-sm ${
            active ? (n <= 3 ? 'bg-red-500' : n <= 6 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-zinc-800'
          }`} />
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()

  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // All-clients health data
  const [clientHealth, setClientHealth] = useState({})

  // Client data
  const [dailyKpis, setDailyKpis] = useState([])
  const [weekMorningOps, setWeekMorningOps] = useState([])
  const [weekDebriefs, setWeekDebriefs] = useState([])
  const [warMapWeekly, setWarMapWeekly] = useState(null)
  const [weeklyReview, setWeeklyReview] = useState(null)
  const [monthlyReview, setMonthlyReview] = useState(null)
  const [allMonthlyReviews, setAllMonthlyReviews] = useState([])
  const [clientPlaybook, setClientPlaybook] = useState(null)
  const [identityChange, setIdentityChange] = useState(null)
  const [lifeDesign, setLifeDesign] = useState(null)
  const [adventures, setAdventures] = useState(defaultAdventures())
  const [warMapTasks, setWarMapTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [projectTasks, setProjectTasks] = useState({})
  const [leads, setLeads] = useState([])
  const [weekKpis, setWeekKpis] = useState([])

  // Project form state
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'planning', priority: 'medium',
    start_date: '', end_date: '', links: '', resources: '',
  })
  const [newTaskInputs, setNewTaskInputs] = useState({})
  const [expandedProjects, setExpandedProjects] = useState({})

  // ── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { router.push('/client'); return }
      fetchClients()
    }
    checkAuth()
  }, [])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    if (data) {
      setClients(data)
      fetchAllClientHealth(data)
    }
    setLoading(false)
  }

  const fetchAllClientHealth = async (clientList) => {
    const monday = getMonday()
    const sunday = getWeekDays(monday)[6]
    const today = new Date().toISOString().split('T')[0]
    const todayIdx = getWeekDays(monday).indexOf(today)
    const elapsed = todayIdx >= 0 ? todayIdx + 1 : 7

    // Fetch this week's morning ops and debriefs for ALL clients
    const [morningRes, eveningRes, warWeeklyRes, reviewRes, identityRes] = await Promise.all([
      supabase.from('daily_pulse').select('client_id, date, completed, identity_read').gte('date', monday).lte('date', sunday),
      supabase.from('evening_pulse').select('client_id, date, completed').gte('date', monday).lte('date', sunday),
      supabase.from('war_map_weekly').select('client_id, completed').eq('week_of', monday),
      supabase.from('weekly_review').select('client_id, completed').eq('week_of', monday),
      supabase.from('identity_change').select('client_id, affirmations'),
    ])

    const health = {}
    clientList.forEach(c => {
      const mp = morningRes.data?.filter(r => r.client_id === c.id) || []
      const ep = eveningRes.data?.filter(r => r.client_id === c.id) || []
      const mornings = mp.filter(r => r.completed).length
      const debriefs = ep.filter(r => r.completed).length
      const identityReads = mp.filter(r => r.identity_read).length
      const warMap = warWeeklyRes.data?.find(r => r.client_id === c.id)?.completed ? 1 : 0
      const lockIn = reviewRes.data?.find(r => r.client_id === c.id)?.completed ? 1 : 0
      const hasIdentity = identityRes.data?.find(r => r.client_id === c.id)?.affirmations?.trim().length > 0 ? 1 : 0

      const score = Math.round(
        (elapsed > 0 ? mornings / elapsed : 0) * 25 +
        (elapsed > 0 ? debriefs / elapsed : 0) * 20 +
        (elapsed > 0 ? identityReads / elapsed : 0) * 10 +
        warMap * 15 + lockIn * 15 +
        0 * 15 // tracker — would need another fetch, skip for overview
      )

      const alerts = []
      if (mornings === 0 && elapsed >= 3) alerts.push('No morning ops')
      if (debriefs === 0 && elapsed >= 3) alerts.push('No debriefs')
      if (!hasIdentity) alerts.push('No identity set')
      if (c.programme_renewal && c.programme_start) {
        const totalDays = Math.ceil((new Date(c.programme_renewal) - new Date(c.programme_start)) / 86400000)
        const dLeft = Math.ceil((new Date(c.programme_renewal) - new Date()) / 86400000)
        const quarterMark = Math.ceil(totalDays / 4)
        if (dLeft <= 0) alerts.push('Programme expired')
        else if (dLeft <= Math.ceil(quarterMark / 2)) alerts.push(`Renews in ${dLeft}d — ACT NOW`)
        else if (dLeft <= quarterMark) alerts.push(`Renews in ${dLeft}d`)
      } else if (c.programme_renewal) {
        const dLeft = Math.ceil((new Date(c.programme_renewal) - new Date()) / 86400000)
        if (dLeft <= 90 && dLeft > 0) alerts.push(`Renews in ${dLeft}d`)
      }

      const status = score >= 70 ? 'healthy' : score >= 40 ? 'at-risk' : mornings === 0 && debriefs === 0 && elapsed >= 3 ? 'critical' : 'at-risk'

      health[c.id] = { score, mornings, debriefs, identityReads, warMap, lockIn, hasIdentity, alerts, status, elapsed }
    })
    setClientHealth(health)
  }

  // ── Select Client & Fetch All ──────────────────────────────────────────────

  const selectClient = async (client) => {
    setSelectedClient(client)
    setSidebarOpen(false)
    setActiveTab('overview')
    setShowProjectForm(false)
    setEditingProject(null)

    const year = new Date().getFullYear()
    const monday = getMonday()
    const sunday = getWeekDays(monday)[6]
    const today = new Date().toISOString().split('T')[0]
    const mStart = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const mEnd = new Date(year, new Date().getMonth() + 1, 0).toISOString().split('T')[0]

    const [
      dkpiRes, morningRes, eveningRes, warWeeklyRes, reviewRes,
      monthlyRes, allMonthlyRes, identityRes, designRes, adventuresRes, warTasksRes,
      projectsRes, leadsRes, weekKpisRes, playbookRes,
    ] = await Promise.all([
      supabase.from('daily_kpis').select('*').eq('client_id', client.id).gte('date', mStart).lte('date', mEnd).order('date'),
      supabase.from('daily_pulse').select('*').eq('client_id', client.id).gte('date', monday).lte('date', sunday),
      supabase.from('evening_pulse').select('*').eq('client_id', client.id).gte('date', monday).lte('date', sunday),
      supabase.from('war_map_weekly').select('*').eq('client_id', client.id).eq('week_of', monday).maybeSingle(),
      supabase.from('weekly_review').select('*').eq('client_id', client.id).eq('week_of', monday).maybeSingle(),
      supabase.from('monthly_review').select('*').eq('client_id', client.id).eq('month', new Date().getMonth()).eq('year', year).maybeSingle(),
      supabase.from('monthly_review').select('*').eq('client_id', client.id).order('year').order('month'),
      supabase.from('identity_change').select('*').eq('client_id', client.id).maybeSingle(),
      supabase.from('life_design').select('*').eq('client_id', client.id).eq('year', year).maybeSingle(),
      supabase.from('mini_adventures').select('*').eq('client_id', client.id).eq('year', year).order('order_index'),
      supabase.from('war_map_tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
      supabase.from('leads').select('*').eq('client_id', client.id).order('created_at', { ascending: true }),
      supabase.from('daily_kpis').select('*').eq('client_id', client.id).gte('date', monday).lte('date', sunday),
      supabase.from('offer_playbooks').select('*').eq('client_id', client.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    setDailyKpis(dkpiRes.data || [])
    setWeekMorningOps(morningRes.data || [])
    setWeekDebriefs(eveningRes.data || [])
    setWarMapWeekly(warWeeklyRes.data || null)
    setWeeklyReview(reviewRes.data || null)
    setMonthlyReview(monthlyRes.data || null)
    setAllMonthlyReviews(allMonthlyRes.data || [])
    setIdentityChange(identityRes.data || null)
    setLifeDesign(designRes.data || null)
    setWeekKpis(weekKpisRes.data || [])
    setClientPlaybook(playbookRes.data || null)

    if (adventuresRes.data?.length > 0) {
      const merged = defaultAdventures().map(def =>
        adventuresRes.data.find(a => a.order_index === def.order_index) || def
      )
      setAdventures(merged)
    } else {
      setAdventures(defaultAdventures())
    }

    setWarMapTasks(warTasksRes.data || [])
    setLeads(leadsRes.data || [])

    const projs = projectsRes.data || []
    setProjects(projs)

    // Fetch tasks for each project
    if (projs.length > 0) {
      const taskPromises = projs.map(p =>
        supabase.from('project_tasks').select('*').eq('project_id', p.id).order('created_at')
      )
      const taskResults = await Promise.all(taskPromises)
      const taskMap = {}
      projs.forEach((p, i) => {
        taskMap[p.id] = taskResults[i].data || []
      })
      setProjectTasks(taskMap)
    } else {
      setProjectTasks({})
    }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  // ── Programme Score ────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split('T')[0]
  const dashWeekDays = getWeekDays(getMonday())
  const todayDayIndex = dashWeekDays.indexOf(todayStr)
  const daysElapsed = todayDayIndex >= 0 ? todayDayIndex + 1 : 7

  const morningOpsCompleted = weekMorningOps.filter(p => p.completed).length
  const debriefsCompleted = weekDebriefs.filter(p => p.completed).length
  const identityReads = weekMorningOps.filter(p => p.identity_read).length
  const kpiDaysFilled = weekKpis.length
  const warMapDone = warMapWeekly?.completed ? 1 : 0
  const lockInDone = weeklyReview?.completed ? 1 : 0

  const scores = {
    morningOps: { value: morningOpsCompleted, max: daysElapsed, pct: Math.round((morningOpsCompleted / daysElapsed) * 100), label: 'Morning Ops', icon: 'sun', color: 'text-amber-400', bar: 'bg-amber-400' },
    debrief:    { value: debriefsCompleted, max: daysElapsed, pct: Math.round((debriefsCompleted / daysElapsed) * 100), label: 'The Debrief', icon: 'moon', color: 'text-indigo-400', bar: 'bg-indigo-400' },
    identity:   { value: identityReads, max: daysElapsed, pct: Math.round((identityReads / daysElapsed) * 100), label: 'Identity Read', icon: 'mirror', color: 'text-violet-400', bar: 'bg-violet-400' },
    warMap:     { value: warMapDone, max: 1, pct: warMapDone * 100, label: 'War Map', icon: 'sword', color: 'text-sky-400', bar: 'bg-sky-400' },
    lockIn:     { value: lockInDone, max: 1, pct: lockInDone * 100, label: 'The Lock In', icon: 'lock', color: 'text-gold', bar: 'bg-gold' },
    tracker:    { value: kpiDaysFilled, max: daysElapsed, pct: Math.round((kpiDaysFilled / daysElapsed) * 100), label: 'Business Tracker', icon: 'chart', color: 'text-emerald-400', bar: 'bg-emerald-400' },
  }

  const overallPct = selectedClient ? Math.round(
    scores.morningOps.pct * 0.25 + scores.debrief.pct * 0.20 + scores.identity.pct * 0.10 +
    scores.warMap.pct * 0.15 + scores.lockIn.pct * 0.15 + scores.tracker.pct * 0.15
  ) : 0

  // ── Project CRUD ───────────────────────────────────────────────────────────

  const resetProjectForm = () => {
    setProjectForm({ name: '', description: '', status: 'planning', priority: 'medium', start_date: '', end_date: '', links: '', resources: '' })
    setEditingProject(null)
    setShowProjectForm(false)
  }

  const saveProject = async () => {
    if (!projectForm.name.trim() || !selectedClient) return
    const payload = {
      client_id: selectedClient.id,
      name: projectForm.name.trim(),
      description: projectForm.description.trim() || null,
      status: projectForm.status,
      priority: projectForm.priority,
      start_date: projectForm.start_date || null,
      end_date: projectForm.end_date || null,
      links: projectForm.links.trim() || null,
      resources: projectForm.resources.trim() || null,
    }

    if (editingProject) {
      const { data } = await supabase.from('projects').update(payload).eq('id', editingProject.id).select().single()
      if (data) setProjects(prev => prev.map(p => p.id === data.id ? data : p))
    } else {
      const { data } = await supabase.from('projects').insert([payload]).select().single()
      if (data) setProjects(prev => [data, ...prev])
    }
    resetProjectForm()
  }

  const deleteProject = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return
    await supabase.from('project_tasks').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    const next = { ...projectTasks }
    delete next[id]
    setProjectTasks(next)
  }

  const editProject = (p) => {
    setProjectForm({
      name: p.name || '',
      description: p.description || '',
      status: p.status || 'planning',
      priority: p.priority || 'medium',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      links: p.links || '',
      resources: p.resources || '',
    })
    setEditingProject(p)
    setShowProjectForm(true)
  }

  const addTask = async (projectId) => {
    const title = (newTaskInputs[projectId] || '').trim()
    if (!title) return
    const { data } = await supabase.from('project_tasks').insert([{ project_id: projectId, title, completed: false }]).select().single()
    if (data) {
      setProjectTasks(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), data] }))
      setNewTaskInputs(prev => ({ ...prev, [projectId]: '' }))
    }
  }

  const toggleTask = async (projectId, taskId, completed) => {
    await supabase.from('project_tasks').update({ completed: !completed }).eq('id', taskId)
    setProjectTasks(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(t => t.id === taskId ? { ...t, completed: !completed } : t)
    }))
  }

  const deleteTask = async (projectId, taskId) => {
    await supabase.from('project_tasks').delete().eq('id', taskId)
    setProjectTasks(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(t => t.id !== taskId)
    }))
  }

  // ── Tab Config ─────────────────────────────────────────────────────────────

  const navSections = [
    { items: [
      { id: 'overview',     label: 'Command Centre' },
      { id: 'projects',     label: 'Projects' },
    ]},
    { heading: 'Daily', items: [
      { id: 'identity',     label: 'Identity Chamber' },
      { id: 'morning-ops',  label: 'Morning Ops' },
      { id: 'debrief',      label: 'The Debrief' },
      { id: 'tracker',      label: 'Business Tracker' },
      { id: 'hot-list',     label: 'Hot List' },
    ]},
    { heading: 'Weekly', items: [
      { id: 'war-map',      label: 'War Map' },
      { id: 'lock-in',      label: 'The Lock In' },
    ]},
    { heading: 'Monthly', items: [
      { id: 'monthly',      label: 'Monthly Review' },
    ]},
    { heading: 'Yearly', items: [
      { id: 'design',       label: 'Design' },
    ]},
    { heading: 'Build™', items: [
      { id: 'playbook',     label: 'Sold Out™ Playbook' },
    ]},
  ]

  // Today's data
  const todayMorning = weekMorningOps.find(p => p.date === todayStr) || null
  const todayEvening = weekDebriefs.find(p => p.date === todayStr) || null

  // War map filters
  const delegated = warMapTasks.filter(t => t.status === 'delegate')
  const scheduled = warMapTasks.filter(t => t.status === 'schedule')
  const doNow     = warMapTasks.filter(t => t.status === 'do_now')
  const brainDump = warMapTasks.filter(t => t.status === 'brain_dump')

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-zinc-500 hover:text-white p-2 -ml-2 rounded transition" aria-label="Toggle sidebar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="The Syndicate" className="h-8 w-auto flex-shrink-0" />
            <div className="hidden sm:block">
              <p className="text-white text-sm font-bold tracking-wider uppercase leading-none">The Syndicate</p>
              <p className="text-zinc-600 text-xs tracking-widest uppercase mt-0.5">Admin</p>
            </div>
          </div>
        </div>
        <button onClick={handleSignOut} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-20 md:z-auto
          w-72 bg-zinc-900 border-r border-zinc-800
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col overflow-y-auto mt-[57px] md:mt-0
        `}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Clients <span className="text-zinc-600">({clients.length})</span>
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {clients.map(client => (
              <button key={client.id} onClick={() => selectClient(client)}
                className={`w-full text-left px-5 py-3.5 transition border-l-2 ${
                  selectedClient?.id === client.id
                    ? 'border-gold bg-gold/5 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{client.name}</div>
                  {clientHealth[client.id] && (
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      clientHealth[client.id].status === 'critical' ? 'bg-red-400 animate-pulse' :
                      clientHealth[client.id].status === 'at-risk' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                  )}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5 truncate">{client.business || client.email}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          {!selectedClient ? (() => {
            const healthEntries = clients.map(c => ({ ...c, health: clientHealth[c.id] || {} }))
            const critical = healthEntries.filter(c => c.health.status === 'critical')
            const atRisk = healthEntries.filter(c => c.health.status === 'at-risk')
            const healthy = healthEntries.filter(c => c.health.status === 'healthy')
            const avgScore = healthEntries.length > 0 ? Math.round(healthEntries.reduce((s, c) => s + (c.health.score || 0), 0) / healthEntries.length) : 0

            return (
            <div className="fade-in">
              {/* Coach Command Centre Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Coach Command Centre</h1>
                <p className="text-zinc-500 text-sm mt-1">Week of {new Date(getMonday()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                  <p className="text-3xl font-black text-white">{clients.length}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Total Clients</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                  <p className={`text-3xl font-black ${avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{avgScore}%</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Avg Score</p>
                </div>
                <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-5 text-center">
                  <p className="text-3xl font-black text-red-400">{critical.length}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Critical</p>
                </div>
                <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-5 text-center">
                  <p className="text-3xl font-black text-amber-400">{atRisk.length}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">At Risk</p>
                </div>
              </div>

              {/* Critical Clients — needs immediate attention */}
              {critical.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> Needs Immediate Attention
                  </h2>
                  <div className="space-y-2">
                    {critical.map(c => (
                      <button key={c.id} onClick={() => selectClient(c)}
                        className="w-full bg-red-900/10 border border-red-900/30 rounded-xl p-4 flex items-center gap-4 text-left hover:bg-red-900/20 transition">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
                            <span className="text-red-400 font-black text-lg">{c.health.score || 0}%</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{c.name}</p>
                          <p className="text-zinc-500 text-xs truncate">{c.business}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(c.health.alerts || []).map((a, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-red-900/30 text-red-400 rounded font-semibold">{a}</span>
                            ))}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* At Risk */}
              {atRisk.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> At Risk — Monitor Closely
                  </h2>
                  <div className="space-y-2">
                    {atRisk.sort((a, b) => (a.health.score || 0) - (b.health.score || 0)).map(c => (
                      <button key={c.id} onClick={() => selectClient(c)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 text-left hover:border-amber-900/40 transition">
                        <div className="relative flex-shrink-0">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#27272a" strokeWidth="3" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#f59e0b" strokeWidth="3"
                              strokeDasharray={`${((c.health.score || 0) / 100) * 125.7} 125.7`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-amber-400 font-bold text-xs">{c.health.score || 0}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{c.name}</p>
                          <p className="text-zinc-500 text-xs truncate">{c.business}</p>
                          <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-600">
                            <span>☀️ {c.health.mornings || 0}/{c.health.elapsed || 0}</span>
                            <span>🌙 {c.health.debriefs || 0}/{c.health.elapsed || 0}</span>
                            <span>{c.health.warMap ? '⚔️ ✓' : '⚔️ ✗'}</span>
                            <span>{c.health.lockIn ? '🔒 ✓' : '🔒 ✗'}</span>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Healthy */}
              {healthy.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> On Track
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {healthy.sort((a, b) => (b.health.score || 0) - (a.health.score || 0)).map(c => (
                      <button key={c.id} onClick={() => selectClient(c)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 text-left hover:border-emerald-900/40 transition">
                        <div className="relative flex-shrink-0">
                          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#27272a" strokeWidth="3" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#34d399" strokeWidth="3"
                              strokeDasharray={`${((c.health.score || 0) / 100) * 125.7} 125.7`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-emerald-400 font-bold text-[10px]">{c.health.score || 0}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">{c.name}</p>
                          <p className="text-zinc-600 text-xs truncate">{c.business}</p>
                        </div>
                        <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Renewals */}
              {(() => {
                const renewals = clients
                  .filter(c => c.programme_start && c.programme_renewal)
                  .map(c => {
                    const totalDays = Math.ceil((new Date(c.programme_renewal) - new Date(c.programme_start)) / 86400000)
                    const daysLeft = Math.ceil((new Date(c.programme_renewal) - new Date()) / 86400000)
                    const quarterMark = Math.ceil(totalDays / 4)
                    const pctComplete = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))
                    return { ...c, daysLeft, quarterMark, totalDays, pctComplete }
                  })
                  .filter(c => c.daysLeft <= c.quarterMark && c.daysLeft > -30)
                  .sort((a, b) => a.daysLeft - b.daysLeft)

                if (renewals.length === 0) return null
                return (
                  <div className="mb-8">
                    <h2 className="text-xs font-bold text-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="text-base">📆</span> Upcoming Renewals
                    </h2>
                    <div className="space-y-2">
                      {renewals.map(c => (
                        <button key={c.id} onClick={() => selectClient(c)}
                          className={`w-full bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 text-left transition hover:border-gold/40 ${
                            c.daysLeft <= 0 ? 'border-red-900/50' :
                            c.daysLeft <= Math.ceil(c.quarterMark / 2) ? 'border-amber-900/40' : 'border-zinc-800'
                          }`}>
                          <div className="flex-shrink-0 text-center" style={{ minWidth: '56px' }}>
                            <p className={`text-2xl font-black ${c.daysLeft <= 0 ? 'text-red-400' : c.daysLeft <= Math.ceil(c.quarterMark / 2) ? 'text-amber-400' : 'text-gold'}`}>
                              {c.daysLeft <= 0 ? '!' : c.daysLeft}
                            </p>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">{c.daysLeft <= 0 ? 'Overdue' : 'days left'}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{c.name}</p>
                            <p className="text-zinc-500 text-xs">{c.business}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gold rounded-full" style={{ width: `${c.pctComplete}%` }} />
                              </div>
                              <span className="text-[10px] text-zinc-600 flex-shrink-0">{c.pctComplete}% through</span>
                            </div>
                            <p className="text-zinc-600 text-[10px] mt-1">
                              {new Date(c.programme_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → {new Date(c.programme_renewal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}{c.totalDays} day programme
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Full Roster Table */}
              <div>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Full Roster</h2>
                <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">☀️</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">🌙</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">🪞</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">⚔️</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">🔒</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthEntries.sort((a, b) => (a.health.score || 0) - (b.health.score || 0)).map(c => {
                        const h = c.health
                        return (
                          <tr key={c.id} onClick={() => selectClient(c)}
                            className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer transition">
                            <td className="px-4 py-3">
                              <p className="text-white font-medium">{c.name}</p>
                              <p className="text-zinc-600 text-xs">{c.business}</p>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-bold ${(h.score || 0) >= 70 ? 'text-emerald-400' : (h.score || 0) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                {h.score || 0}%
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-zinc-400">{h.mornings || 0}/{h.elapsed || 0}</td>
                            <td className="px-3 py-3 text-center text-zinc-400">{h.debriefs || 0}/{h.elapsed || 0}</td>
                            <td className="px-3 py-3 text-center text-zinc-400">{h.identityReads || 0}/{h.elapsed || 0}</td>
                            <td className="px-3 py-3 text-center">{h.warMap ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-700">✗</span>}</td>
                            <td className="px-3 py-3 text-center">{h.lockIn ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-700">✗</span>}</td>
                            <td className="px-3 py-3">
                              <span className={`text-xs font-bold uppercase tracking-widest ${
                                h.status === 'critical' ? 'text-red-400' : h.status === 'at-risk' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>{h.status === 'at-risk' ? 'At Risk' : h.status === 'critical' ? 'Critical' : 'Healthy'}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={() => setSidebarOpen(true)} className="mt-8 md:hidden w-full py-3 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg transition">
                Select Client
              </button>
            </div>
            )
          })() : (
            <div>
              {/* Client Header */}
              <div className="mb-5">
                <button onClick={() => setSelectedClient(null)} className="flex items-center gap-1.5 text-zinc-500 hover:text-gold text-xs font-semibold uppercase tracking-widest mb-3 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  All Clients
                </button>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{selectedClient.name}</h1>
                    <p className="text-zinc-400 text-sm mt-1">{selectedClient.business} · {selectedClient.industry}</p>
                    <p className="text-zinc-600 text-xs mt-0.5">{selectedClient.email}</p>
                  </div>
                  {/* Programme Status Badge */}
                  {selectedClient.programme_start && (() => {
                    const start = new Date(selectedClient.programme_start)
                    const renewal = selectedClient.programme_renewal ? new Date(selectedClient.programme_renewal) : new Date(start.getTime() + 365 * 86400000)
                    const now = new Date()
                    const totalDays = (renewal - start) / 86400000
                    const elapsed = (now - start) / 86400000
                    const daysLeft = Math.max(0, Math.ceil((renewal - now) / 86400000))
                    const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
                    return (
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold uppercase tracking-widest ${daysLeft <= 30 ? 'text-red-400' : daysLeft <= 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {daysLeft} days left
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Renews {renewal.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                          <div className={`h-full rounded-full ${daysLeft <= 30 ? 'bg-red-400' : daysLeft <= 90 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Contact details row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-zinc-600">
                  {selectedClient.phone && <span>📞 {selectedClient.phone}</span>}
                  {selectedClient.address && <span>📍 {selectedClient.address}</span>}
                  {selectedClient.programme_start && <span>Started: {new Date(selectedClient.programme_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                {selectedClient.notes && <p className="text-zinc-600 text-xs mt-2 italic">{selectedClient.notes}</p>}
              </div>

              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-x-1 gap-y-1 mb-7">
                {navSections.map((section, si) => (
                  <div key={si} className="flex items-center gap-1">
                    {section.heading && (
                      <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] px-2 hidden sm:inline">{section.heading}</span>
                    )}
                    {section.items.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-gold/10 text-gold border border-gold/30'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                    {si < navSections.length - 1 && <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block" />}
                  </div>
                ))}
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── OVERVIEW — Command Centre ────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'overview' && (() => {
                // Drop-off detection
                const alerts = []
                const morningsDone = weekMorningOps.filter(p => p.completed).length
                const debriefsDone = weekDebriefs.filter(p => p.completed).length
                const identityReads = weekMorningOps.filter(p => p.identity_read).length
                const kpiDaysDone = weekKpis.length

                if (morningsDone === 0 && daysElapsed >= 3) alerts.push({ type: 'critical', msg: 'No Morning Ops completed this week', action: 'Check in — they may be disengaged' })
                else if (morningsDone < daysElapsed - 2) alerts.push({ type: 'warning', msg: `Only ${morningsDone}/${daysElapsed} Morning Ops completed`, action: 'Gentle nudge needed' })

                if (debriefsDone === 0 && daysElapsed >= 3) alerts.push({ type: 'critical', msg: 'No Debriefs completed this week', action: 'Not reflecting — follow up' })
                else if (debriefsDone < daysElapsed - 2) alerts.push({ type: 'warning', msg: `Only ${debriefsDone}/${daysElapsed} Debriefs completed`, action: 'Encourage end-of-day reviews' })

                if (identityReads === 0 && daysElapsed >= 3) alerts.push({ type: 'warning', msg: 'Identity Chamber not being read', action: 'Remind them why identity matters' })

                if (kpiDaysDone === 0 && daysElapsed >= 3) alerts.push({ type: 'warning', msg: 'Business Tracker not being used', action: 'They need to track to grow' })

                if (!warMapWeekly?.completed && new Date().getDay() >= 3) alerts.push({ type: 'info', msg: 'War Map not yet completed this week', action: 'Sunday planning session needed' })

                if (!identityChange?.affirmations?.trim()) alerts.push({ type: 'warning', msg: 'Identity Chamber is empty', action: 'Needs to write affirmations' })

                if (!lifeDesign) alerts.push({ type: 'info', msg: 'Design™ not yet filled in', action: 'Get them to set their masoji and adventures' })

                if (selectedClient.programme_renewal) {
                  const daysLeft = Math.ceil((new Date(selectedClient.programme_renewal) - new Date()) / 86400000)
                  const totalDays = selectedClient.programme_start
                    ? Math.ceil((new Date(selectedClient.programme_renewal) - new Date(selectedClient.programme_start)) / 86400000)
                    : 365
                  const quarterMark = Math.ceil(totalDays / 4)
                  if (daysLeft <= 0) alerts.push({ type: 'critical', msg: 'Programme has expired', action: 'Renewal overdue — reach out immediately' })
                  else if (daysLeft <= Math.ceil(quarterMark / 2)) alerts.push({ type: 'critical', msg: `Programme renews in ${daysLeft} days`, action: 'Start renewal conversation now' })
                  else if (daysLeft <= quarterMark) alerts.push({ type: 'warning', msg: `Programme renews in ${daysLeft} days`, action: `Within renewal window (${quarterMark}-day notice)` })
                }

                return (
                <div className="fade-in">

                  {/* Alerts / Drop-off Flags */}
                  {alerts.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="text-base">⚠️</span> Action Required
                      </h3>
                      {alerts.map((a, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${
                          a.type === 'critical' ? 'bg-red-900/10 border-red-900/40' :
                          a.type === 'warning' ? 'bg-amber-900/10 border-amber-900/40' :
                          'bg-sky-900/10 border-sky-900/40'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            a.type === 'critical' ? 'bg-red-400' : a.type === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
                          }`} />
                          <div>
                            <p className={`text-sm font-medium ${
                              a.type === 'critical' ? 'text-red-400' : a.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
                            }`}>{a.msg}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{a.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hero Score Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-6 sm:p-8 mb-6">
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
                          Week of {formatDate(getMonday())}
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
                          {overallPct >= 90 ? '"Operating at the highest level. This is what elite looks like."' :
                           overallPct >= 70 ? '"Solid week. In the game. Time to go harder."' :
                           overallPct >= 50 ? '"Foundation is there. Time to raise the standard."' :
                           '"The programme works when you do. Needs more commitment."'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown — 6 Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {Object.values(scores).map(s => (
                      <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold uppercase tracking-widest ${s.color}`}>{s.label}</span>
                          <span className={`text-xl font-black ${s.pct >= 80 ? s.color : s.pct > 0 ? 'text-zinc-400' : 'text-zinc-700'}`}>{s.pct}%</span>
                        </div>
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
                            <div className="flex justify-center gap-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${hasMorning ? 'bg-amber-400' : 'bg-zinc-800'}`} title="Morning Ops" />
                              <div className={`w-1.5 h-1.5 rounded-full ${hasEvening ? 'bg-indigo-400' : 'bg-zinc-800'}`} title="Debrief" />
                              <div className={`w-1.5 h-1.5 rounded-full ${hasKpi ? 'bg-emerald-400' : 'bg-zinc-800'}`} title="KPI" />
                              <div className={`w-1.5 h-1.5 rounded-full ${hasIdentity ? 'bg-violet-400' : 'bg-zinc-800'}`} title="Identity" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Client Targets */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Lead Target</p>
                      <p className="text-2xl font-bold text-gold">{selectedClient.lead_target || '—'}</p>
                      <p className="text-zinc-600 text-xs mt-1.5">per week</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Revenue Target</p>
                      <p className="text-2xl font-bold text-emerald-400">{selectedClient.revenue_target ? formatCurrency(selectedClient.revenue_target) : '—'}</p>
                      <p className="text-zinc-600 text-xs mt-1.5">monthly</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Outreach Target</p>
                      <p className="text-2xl font-bold text-sky-400">{selectedClient.outreach_target || '—'}</p>
                      <p className="text-zinc-600 text-xs mt-1.5">per week</p>
                    </div>
                  </div>

                  {/* Revenue Month-on-Month */}
                  {allMonthlyReviews.length > 0 && (() => {
                    const months = allMonthlyReviews.filter(r => r.revenue > 0 || r.revenue_target > 0)
                      .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year)
                    if (months.length === 0) return null
                    const maxVal = Math.max(...months.map(m => Math.max(Number(m.revenue) || 0, Number(m.revenue_target) || 0)), 1)
                    return (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mt-6">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Revenue — Month on Month</h3>
                        <div className="flex items-end gap-2 sm:gap-3" style={{ minHeight: '200px' }}>
                          {months.map(m => {
                            const rev = Number(m.revenue) || 0
                            const target = Number(m.revenue_target) || 0
                            const revH = Math.max(4, (rev / maxVal) * 180)
                            const targetH = target > 0 ? Math.max(4, (target / maxVal) * 180) : 0
                            const hit = target > 0 && rev >= target
                            const monthLabel = MONTH_NAMES[m.month]?.slice(0, 3) || ''
                            return (
                              <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                                {/* Values */}
                                <div className="text-center mb-1">
                                  <p className={`text-[10px] font-bold ${hit ? 'text-emerald-400' : rev > 0 ? 'text-white' : 'text-zinc-700'}`}>
                                    £{rev >= 1000 ? `${(rev/1000).toFixed(1)}k` : rev}
                                  </p>
                                </div>
                                {/* Bars */}
                                <div className="flex items-end gap-0.5 w-full justify-center">
                                  {/* Target bar (outline) */}
                                  {targetH > 0 && (
                                    <div className="w-3 sm:w-4 rounded-t border border-dashed border-zinc-600 bg-transparent" style={{ height: `${targetH}px` }} />
                                  )}
                                  {/* Revenue bar (solid) */}
                                  <div className={`w-3 sm:w-4 rounded-t transition-all duration-500 ${hit ? 'bg-emerald-400' : rev > 0 ? 'bg-gold' : 'bg-zinc-800'}`} style={{ height: `${revH}px` }} />
                                </div>
                                {/* Label */}
                                <p className="text-[9px] sm:text-[10px] text-zinc-600 font-semibold uppercase tracking-wider mt-1">{monthLabel}</p>
                              </div>
                            )
                          })}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-5 mt-4 justify-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-gold" />
                            <span className="text-[10px] text-zinc-500">Revenue</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                            <span className="text-[10px] text-zinc-500">Target Hit</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm border border-dashed border-zinc-600" />
                            <span className="text-[10px] text-zinc-500">Target</span>
                          </div>
                        </div>
                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800">
                          <div className="text-center">
                            <p className="text-lg font-black text-gold">£{months.reduce((s, m) => s + (Number(m.revenue) || 0), 0).toLocaleString()}</p>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-white">£{Math.round(months.reduce((s, m) => s + (Number(m.revenue) || 0), 0) / months.length).toLocaleString()}</p>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Monthly Avg</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-emerald-400">{months.filter(m => m.revenue_target > 0 && m.revenue >= m.revenue_target).length}/{months.filter(m => m.revenue_target > 0).length}</p>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Targets Hit</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )})()}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── PROJECTS — Full CRUD ─────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
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
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
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
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm font-mono" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Resources <span className="text-zinc-700">(one per line)</span></label>
                          <textarea value={projectForm.resources} onChange={e => setProjectForm(f => ({ ...f, resources: e.target.value }))}
                            rows={2} placeholder="Resource notes..."
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-5">
                        <button onClick={saveProject}
                          className="px-6 py-2.5 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gold/90 transition">
                          {editingProject ? 'Update' : 'Create'}
                        </button>
                        <button onClick={resetProjectForm}
                          className="px-4 py-2.5 text-zinc-500 hover:text-white text-xs uppercase tracking-widest font-semibold transition">
                          Cancel
                        </button>
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
                      <p className="text-zinc-700 text-xs mt-1">Click "Add Project" to create the first one.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map(p => {
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
                                    <Badge status={p.status} />
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
                                      <div className="space-y-0.5">
                                        {p.links.split('\n').filter(Boolean).map((link, i) => (
                                          <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer" className="block text-xs text-gold hover:text-gold/80 truncate transition">{link.trim()}</a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {p.resources && (
                                    <div className="mt-2">
                                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Resources</p>
                                      <div className="space-y-0.5">
                                        {p.resources.split('\n').filter(Boolean).map((r, i) => (
                                          <p key={i} className="text-xs text-zinc-400">{r.trim()}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => editProject(p)} className="p-2 text-zinc-600 hover:text-gold transition rounded" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => deleteProject(p.id)} className="p-2 text-zinc-600 hover:text-red-400 transition rounded" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                  <button onClick={() => setExpandedProjects(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                    className="p-2 text-zinc-600 hover:text-white transition rounded" title="Tasks">
                                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                </div>
                              </div>

                              {/* Tasks progress bar */}
                              {tasks.length > 0 && (
                                <div className="mt-4">
                                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(completedTasks / tasks.length) * 100}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Expandable Task List */}
                            {expanded && (
                              <div className="border-t border-zinc-800 px-5 py-4 bg-zinc-950/50">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tasks</p>
                                {tasks.length > 0 && (
                                  <div className="space-y-1.5 mb-3">
                                    {tasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-3 group">
                                        <button onClick={() => toggleTask(p.id, task.id, task.completed)}
                                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${
                                            task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'
                                          }`}>
                                          {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                        <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                                        <button onClick={() => deleteTask(p.id, task.id)} className="p-1 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Add task */}
                                <div className="flex gap-2">
                                  <input
                                    value={newTaskInputs[p.id] || ''}
                                    onChange={e => setNewTaskInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') addTask(p.id) }}
                                    placeholder="Add a task..."
                                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
                                  <button onClick={() => addTask(p.id)}
                                    className="px-3 py-2 bg-gold/20 text-gold border border-gold/30 rounded text-xs font-bold uppercase tracking-widest hover:bg-gold/30 transition">
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

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── IDENTITY CHAMBER — Read-only ────────────────────────── */}
              {activeTab === 'identity' && (
                <div className="fade-in max-w-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Identity Chamber™</h3>
                    {identityChange?.affirmations?.trim() ? (
                      <CompletedBadge />
                    ) : (
                      <NotStartedBadge />
                    )}
                  </div>

                  {!identityChange?.affirmations?.trim() ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't written their affirmations yet.</p>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
                        <span className="text-2xl">🪞</span>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Client's Identity</h3>
                          <p className="text-zinc-600 text-xs mt-0.5">{identityChange.affirmations.split('\n').filter(l => l.trim()).length} affirmations written</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {identityChange.affirmations.split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="text-xs font-bold text-zinc-700 w-5 text-right flex-shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-white text-sm leading-relaxed">{line}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MORNING OPS — Read-only ──────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'morning-ops' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today's Morning Ops</h3>
                    {todayMorning ? (todayMorning.completed ? <CompletedBadge /> : <PendingBadge />) : <NotStartedBadge />}
                  </div>

                  {!todayMorning ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't started their Morning Ops today.</p>
                  ) : (
                    <div className="space-y-4">
                      <ReadOnlyField label="Intention" value={todayMorning.intention} color="text-gold" />
                      <ReadOnlyField label="Feeling" value={todayMorning.feeling} />
                      <ReadOnlyField label="What would make today a win" value={todayMorning.win} />
                      <ReadOnlyField label="Money-making task" value={todayMorning.money_task} color="text-gold" />

                      {/* To-dos */}
                      {(todayMorning.todo_1 || todayMorning.todo_2 || todayMorning.todo_3) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Top 3 To-Dos</p>
                          <div className="space-y-1.5">
                            {[todayMorning.todo_1, todayMorning.todo_2, todayMorning.todo_3].map((todo, i) => todo && (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 w-4">{i + 1}</span>
                                <p className="text-white text-sm">{todo}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gratitude */}
                      {(todayMorning.gratitude_1 || todayMorning.gratitude_2 || todayMorning.gratitude_3 || todayMorning.gratitude_4 || todayMorning.gratitude_5 || todayMorning.gratitude_6) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">Gratitude — Mini Adventures</p>
                          <div className="space-y-2">
                            {[1,2,3,4,5,6].map(n => todayMorning[`gratitude_${n}`] && (
                              <div key={n} className="flex items-start gap-2">
                                <span className="text-xs font-bold text-zinc-600 w-4 flex-shrink-0 mt-0.5">{n}</span>
                                <p className="text-white text-sm leading-relaxed">{todayMorning[`gratitude_${n}`]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <ReadOnlyField label="Letting go of" value={todayMorning.let_go} />

                      {/* Identity Read */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1.5">Identity Read</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${todayMorning.identity_read ? 'bg-violet-500 border-violet-500' : 'border-zinc-700'}`}>
                            {todayMorning.identity_read && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className={`text-sm ${todayMorning.identity_read ? 'text-violet-400 font-semibold' : 'text-zinc-600'}`}>
                            {todayMorning.identity_read ? 'Read today' : 'Not read today'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── DEBRIEF — Read-only ──────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'debrief' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today's Debrief</h3>
                    {todayEvening ? (todayEvening.completed ? <CompletedBadge /> : <PendingBadge />) : <NotStartedBadge />}
                  </div>

                  {!todayEvening ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't started their Debrief today.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Priority completed */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-1.5">Did I complete my #1 priority?</p>
                        <YesNoBadge value={todayEvening.priority_completed} />
                      </div>

                      <ReadOnlyField label="What went well today?" value={todayEvening.went_well} color="text-emerald-400" />
                      <ReadOnlyField label="What will I do differently tomorrow?" value={todayEvening.do_differently} color="text-sky-400" />
                      <ReadOnlyField label="One thing I learned today" value={todayEvening.learned} />

                      {/* Show up rating */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">How did I show up today? — <span className="text-white">{todayEvening.show_up_rating || '—'}/10</span></p>
                        <RatingBar value={todayEvening.show_up_rating} />
                      </div>

                      <ReadOnlyField label="What didn't go to plan?" value={todayEvening.not_to_plan} color="text-red-400" />
                      <ReadOnlyField label="What am I proud of today?" value={todayEvening.proud_of} color="text-gold" />
                      <ReadOnlyField label="The one thing I love about myself is..." value={todayEvening.love_about_self} color="text-violet-400" />

                      {/* Gratitude */}
                      {(todayEvening.gratitude_1 || todayEvening.gratitude_2 || todayEvening.gratitude_3 || todayEvening.gratitude_4 || todayEvening.gratitude_5 || todayEvening.gratitude_6) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">I am so grateful I just...</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[1,2,3,4,5,6].map(n => {
                              const val = todayEvening[`gratitude_${n}`]
                              const adv = adventures[n - 1] || {}
                              if (!val) return null
                              return (
                                <div key={n} className="bg-zinc-800/50 rounded-lg p-3">
                                  <p className="text-[10px] font-semibold text-zinc-500 mb-1">{adv.title || `Adventure ${n}`}</p>
                                  <p className="text-white text-xs leading-relaxed">{val}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Wins */}
                      {[1,2,3,4,5].some(n => todayEvening[`win_${n}_title`]) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-3">Wins for the Day</p>
                          <div className="space-y-3">
                            {[1,2,3,4,5].map(n => {
                              const title = todayEvening[`win_${n}_title`]
                              if (!title) return null
                              return (
                                <div key={n} className="bg-zinc-800/50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-gold font-bold text-xs">Win {n}</span>
                                  </div>
                                  <p className="text-white text-sm font-medium">{title}</p>
                                  {todayEvening[`win_${n}_action`] && <p className="text-zinc-400 text-xs mt-1">What I did: {todayEvening[`win_${n}_action`]}</p>}
                                  {todayEvening[`win_${n}_progress`] && <p className="text-zinc-500 text-xs mt-0.5">Further: {todayEvening[`win_${n}_progress`]}</p>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── TRACKER — Daily KPIs Table ───────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'tracker' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      {MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()} — Daily KPIs
                    </h3>
                    <span className="text-xs text-zinc-600">{dailyKpis.length} days tracked</span>
                  </div>

                  {dailyKpis.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No KPI data this month.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900">
                            {['Date','Leads','Outreach','Sales','Revenue','CPL','Tasks'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dailyKpis.map((kpi, i) => (
                            <tr key={kpi.id || i} className={`border-b border-zinc-900 hover:bg-zinc-900/60 transition ${i % 2 === 1 ? 'bg-zinc-900/20' : ''}`}>
                              <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">{formatDate(kpi.date)}</td>
                              <td className="px-4 py-3.5 text-white font-medium">{kpi.leads ?? '—'}</td>
                              <td className="px-4 py-3.5 text-zinc-300">{kpi.outreach ?? '—'}</td>
                              <td className="px-4 py-3.5 text-zinc-300">{kpi.sales ?? '—'}</td>
                              <td className="px-4 py-3.5 text-emerald-400 font-medium">{kpi.revenue != null ? formatCurrency(kpi.revenue) : '—'}</td>
                              <td className="px-4 py-3.5 text-zinc-300">{kpi.cost_per_lead != null ? formatCurrency(kpi.cost_per_lead) : '—'}</td>
                              <td className="px-4 py-3.5 text-zinc-300">{kpi.tasks_completed ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── HOT LIST — Lead Pipeline ─────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'hot-list' && (() => {
                const stageCounts = {}
                LEAD_STAGES.forEach(s => { stageCounts[s.id] = leads.filter(l => l.status === s.id).length })
                const totalLeads = leads.length
                const wonCount = stageCounts['client_won'] || 0
                const ghostedCount = stageCounts['ghosted'] || 0
                const activeLeads = totalLeads - wonCount - ghostedCount
                const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0

                return (
                <div className="fade-in">
                  {/* Funnel Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                      <p className="text-3xl font-black text-white">{totalLeads}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Total Leads</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                      <p className="text-3xl font-black text-sky-400">{activeLeads}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Active Pipeline</p>
                    </div>
                    <div className="bg-zinc-900 border border-emerald-900/30 rounded-xl p-5 text-center">
                      <p className="text-3xl font-black text-emerald-400">{wonCount}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Won</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                      <p className={`text-3xl font-black ${conversionRate >= 20 ? 'text-emerald-400' : conversionRate >= 10 ? 'text-amber-400' : 'text-zinc-400'}`}>{conversionRate}%</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Win Rate</p>
                    </div>
                  </div>

                  {/* Visual Funnel */}
                  {totalLeads > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Pipeline Funnel</h3>
                      <div className="space-y-2">
                        {LEAD_STAGES.map(stage => {
                          const count = stageCounts[stage.id] || 0
                          const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                          return (
                            <div key={stage.id} className="flex items-center gap-3">
                              <p className={`text-[10px] font-bold uppercase tracking-widest w-24 text-right ${stage.color}`}>{stage.label}</p>
                              <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden relative">
                                <div className={`h-full rounded-full ${stage.id === 'new_lead' ? 'bg-sky-500' : stage.id === 'dm_sent' ? 'bg-violet-500' : stage.id === 'follow_up' ? 'bg-amber-500' : stage.id === 'call_booked' ? 'bg-gold' : stage.id === 'client_won' ? 'bg-emerald-500' : 'bg-red-500'} transition-all duration-500`} style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">{count}</span>
                              </div>
                              <span className="text-xs text-zinc-600 w-10 text-right">{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Kanban Board */}
                  {leads.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No leads in the pipeline yet.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0 pb-4">
                      <div className="flex gap-3 px-4 sm:px-0" style={{ minWidth: '900px' }}>
                        {LEAD_STAGES.map(stage => {
                          const stageLeads = leads.filter(l => l.status === stage.id)
                          return (
                            <div key={stage.id} className="flex-1 min-w-[140px]">
                              <div className={`rounded-t-lg border-t-2 ${stage.border} px-3 py-2.5 bg-zinc-900`}>
                                <div className="flex items-center justify-between">
                                  <h3 className={`text-[10px] font-bold uppercase tracking-wider ${stage.color}`}>{stage.label}</h3>
                                  <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                                </div>
                              </div>
                              <div className="bg-zinc-900/50 border border-t-0 border-zinc-800 rounded-b-lg p-2 min-h-[120px] space-y-1.5">
                                {stageLeads.map(lead => (
                                  <div key={lead.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5">
                                    <p className="text-sm font-semibold text-white leading-tight">{lead.name}</p>
                                    {lead.instagram && <p className="text-xs text-violet-400 mt-0.5">@{lead.instagram.replace('@', '')}</p>}
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                      {new Date(lead.updated_at || lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                ))}
                                {stageLeads.length === 0 && <p className="text-zinc-700 text-xs text-center py-4">Empty</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* All Leads Table */}
                  {leads.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">All Leads</h3>
                      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-zinc-900 border-b border-zinc-800">
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name</th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instagram</th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stage</th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leads.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).map(lead => {
                              const stage = LEAD_STAGES.find(s => s.id === lead.status) || {}
                              return (
                                <tr key={lead.id} className="border-b border-zinc-900 hover:bg-zinc-900/60 transition">
                                  <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                                  <td className="px-4 py-3 text-violet-400">{lead.instagram ? `@${lead.instagram.replace('@', '')}` : '—'}</td>
                                  <td className="px-4 py-3"><span className={`text-xs font-bold uppercase tracking-widest ${stage.color || 'text-zinc-500'}`}>{stage.label || lead.status}</span></td>
                                  <td className="px-4 py-3 text-zinc-500">{formatDate(lead.updated_at || lead.created_at)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )})()}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── WAR MAP — Weekly Priorities + Tasks ───────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'war-map' && (
                <div className="fade-in">
                  {/* Weekly Priorities + Completion */}
                  {warMapWeekly && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">This Week's Priorities</h3>
                        {warMapWeekly.completed ? <CompletedBadge /> : <PendingBadge />}
                      </div>
                      {/* #1 Priority */}
                      <div className="bg-zinc-900 border-2 border-gold/30 rounded-lg px-4 py-3 mb-3">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-1">#1 Priority</p>
                        <p className={`text-sm font-medium ${warMapWeekly.number_one_priority ? 'text-white' : 'text-zinc-700 italic'}`}>{warMapWeekly.number_one_priority || 'Not set'}</p>
                      </div>
                      {/* Other Priorities */}
                      <div className="space-y-2">
                        {[
                          { num: 2, value: warMapWeekly.priority_2 },
                          { num: 3, value: warMapWeekly.priority_3 },
                          { num: 4, value: warMapWeekly.priority_4 },
                        ].map(({ num, value }) => (
                          <div key={num} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                            <span className="text-sm font-bold w-5 flex-shrink-0 text-zinc-500">{num}</span>
                            <p className={`text-sm ${value ? 'text-white' : 'text-zinc-700 italic'}`}>{value || 'Not set'}</p>
                          </div>
                        ))}
                      </div>
                      {warMapWeekly.completed_at && (
                        <p className="text-zinc-600 text-xs mt-2">Submitted {new Date(warMapWeekly.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      )}
                    </div>
                  )}

                  {warMapTasks.length === 0 && !warMapWeekly ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't used the Weekly War Map yet.</p>
                  ) : warMapTasks.length > 0 ? (
                    <div>
                      {/* Summary Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Brain Dump</p>
                          <p className="text-2xl font-bold text-zinc-400">{brainDump.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">pending triage</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Delegated</p>
                          <p className="text-2xl font-bold text-violet-400">{delegated.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{delegated.filter(t => t.completed).length} done</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Scheduled</p>
                          <p className="text-2xl font-bold text-sky-400">{scheduled.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{scheduled.filter(t => t.completed).length} done</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Do Now</p>
                          <p className="text-2xl font-bold text-gold">{doNow.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{doNow.filter(t => t.completed).length} done</p>
                        </div>
                      </div>

                      {/* Task lists */}
                      {[
                        { label: 'Do Now', items: doNow, color: 'text-gold' },
                        { label: 'Delegated', items: delegated, color: 'text-violet-400' },
                        { label: 'Scheduled', items: scheduled, color: 'text-sky-400' },
                        { label: 'Brain Dump', items: brainDump, color: 'text-zinc-400' },
                      ].map(({ label, items, color }) => items.length > 0 && (
                        <div key={label} className="mb-6">
                          <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${color}`}>{label}</p>
                          <div className="space-y-2">
                            {items.map(task => (
                              <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                  {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                                {task.delegated_to && <span className="text-xs text-violet-400 flex-shrink-0">→ {task.delegated_to}</span>}
                                {task.scheduled_date && <span className="text-xs text-sky-400 flex-shrink-0">{formatDate(task.scheduled_date)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── LOCK IN — Weekly Review Read-only ─────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'lock-in' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">The Lock In — Weekly Review</h3>
                      <p className="text-zinc-600 text-xs mt-1">Week of {formatDate(getMonday())}</p>
                    </div>
                    {weeklyReview ? (weeklyReview.completed ? <CompletedBadge /> : <PendingBadge />) : <NotStartedBadge />}
                  </div>

                  {!weeklyReview ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't started their weekly review yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Revenue */}
                      <div className="bg-zinc-900 border-2 border-gold/30 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-1.5">Revenue Generated This Week</p>
                        <p className="text-white text-2xl font-bold">{weeklyReview.revenue ? formatCurrency(weeklyReview.revenue) : '—'}</p>
                      </div>

                      {/* Target hit */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Did I hit my weekly target?</p>
                        <YesNoBadge value={weeklyReview.target_hit} />
                      </div>

                      {/* Week rating */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">Overall Week Rating — <span className="text-white">{weeklyReview.week_rating || '—'}/10</span></p>
                        <RatingBar value={weeklyReview.week_rating} />
                      </div>

                      {/* Reflection fields */}
                      {[
                        { key: 'went_well', label: 'What went well this week?', color: 'text-emerald-400' },
                        { key: 'not_to_plan', label: "What didn't go to plan — and why?", color: 'text-red-400' },
                        { key: 'patterns', label: 'What patterns am I noticing in myself?', color: 'text-violet-400' },
                        { key: 'energy_drain', label: 'What drained my energy this week?', color: 'text-zinc-400' },
                        { key: 'energy_boost', label: 'What gave me the most energy this week?', color: 'text-sky-400' },
                        { key: 'one_fix', label: 'What is the one thing I need to fix going into next week?', color: 'text-gold' },
                      ].map(({ key, label, color }) => (
                        <ReadOnlyField key={key} label={label} value={weeklyReview[key]} color={color} />
                      ))}

                      {/* Top 5 Wins */}
                      {[1,2,3,4,5].some(n => weeklyReview[`win_${n}_title`]) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-3">Top 5 Wins</p>
                          <div className="space-y-3">
                            {[1,2,3,4,5].map(n => {
                              const title = weeklyReview[`win_${n}_title`]
                              if (!title) return null
                              return (
                                <div key={n} className="bg-zinc-800/50 rounded-lg p-3">
                                  <span className="text-gold font-bold text-xs">Win {n}</span>
                                  <p className="text-white text-sm font-medium mt-1">{title}</p>
                                  {weeklyReview[`win_${n}_action`] && <p className="text-zinc-400 text-xs mt-1">What I did: {weeklyReview[`win_${n}_action`]}</p>}
                                  {weeklyReview[`win_${n}_progress`] && <p className="text-zinc-500 text-xs mt-0.5">Further: {weeklyReview[`win_${n}_progress`]}</p>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Next Week Focus */}
                      {(weeklyReview.next_focus || weeklyReview.next_income_target || weeklyReview.next_differently) && (
                        <div className="bg-zinc-900 border border-gold/20 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-3">Next Week Focus</p>
                          <div className="space-y-3">
                            <ReadOnlyField label="My #1 focus next week is..." value={weeklyReview.next_focus} color="text-gold" />
                            <ReadOnlyField label="My income target for next week and how I will hit it..." value={weeklyReview.next_income_target} />
                            <ReadOnlyField label="One thing I will do differently next week..." value={weeklyReview.next_differently} />
                          </div>
                        </div>
                      )}

                      {weeklyReview.completed_at && (
                        <p className="text-zinc-600 text-xs text-center mt-4">
                          Submitted {new Date(weeklyReview.completed_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── MONTHLY REVIEW — Read-only ───────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'monthly' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Monthly Review</h3>
                      <p className="text-zinc-600 text-xs mt-1">{MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()}</p>
                    </div>
                    {monthlyReview ? (monthlyReview.completed ? <CompletedBadge /> : <PendingBadge />) : <NotStartedBadge />}
                  </div>

                  {!monthlyReview ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't started their monthly review yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Revenue */}
                      <div className="bg-zinc-900 border-2 border-gold/30 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-1.5">Total Revenue This Month</p>
                        <p className="text-white text-2xl font-bold">{monthlyReview.revenue ? formatCurrency(monthlyReview.revenue) : '—'}</p>
                      </div>

                      {/* Target hit */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Did I hit my monthly target?</p>
                        <YesNoBadge value={monthlyReview.target_hit} />
                      </div>

                      {/* Month rating */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">How was this month overall? — <span className="text-white">{monthlyReview.month_rating || '—'}/10</span></p>
                        <RatingBar value={monthlyReview.month_rating} />
                      </div>

                      {/* Reflection fields */}
                      {[
                        { key: 'biggest_win', label: 'Biggest win this month', color: 'text-emerald-400' },
                        { key: 'biggest_challenge', label: 'Biggest challenge this month', color: 'text-red-400' },
                        { key: 'key_learning', label: 'Key learning — what did this month teach me?', color: 'text-sky-400' },
                        { key: 'mindset_shift', label: 'How has my mindset shifted this month?', color: 'text-violet-400' },
                        { key: 'energy_focus', label: 'Where should I focus my energy next month?', color: 'text-amber-400' },
                        { key: 'improve', label: 'What do I need to improve?', color: 'text-zinc-400' },
                      ].map(({ key, label, color }) => (
                        <ReadOnlyField key={key} label={label} value={monthlyReview[key]} color={color} />
                      ))}

                      {/* Goals for next month */}
                      {(monthlyReview.goal_1 || monthlyReview.goal_2 || monthlyReview.goal_3) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-3">Top 3 Goals for Next Month</p>
                          <div className="space-y-2">
                            {[1, 2, 3].map(n => monthlyReview[`goal_${n}`] && (
                              <div key={n} className="flex items-center gap-3">
                                <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                                <span className="text-white text-sm">{monthlyReview[`goal_${n}`]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {monthlyReview.completed_at && (
                        <p className="text-zinc-600 text-xs text-center mt-4">
                          Submitted {new Date(monthlyReview.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── DESIGN — Yearly Read-only ────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'design' && (
                <div className="fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Design — {new Date().getFullYear()}</h3>
                    {lifeDesign ? <CompletedBadge /> : <NotStartedBadge />}
                  </div>

                  {!lifeDesign ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't completed their Design yet.</p>
                  ) : (
                    <div className="space-y-9">

                      {/* Masoji */}
                      <section>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Masoji</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                          <p className="text-white text-sm leading-relaxed">{lifeDesign.misoji || <span className="text-zinc-600">Not set</span>}</p>
                        </div>
                      </section>

                      {/* Mini Adventures */}
                      <section>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Mini Adventures</h3>
                        <div className="space-y-2">
                          {adventures.map((adv, i) => (
                            <div key={i} className={`bg-zinc-900 border rounded-lg p-4 flex items-start gap-4 ${adv.completed ? 'border-gold/30' : 'border-zinc-800'}`}>
                              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${adv.completed ? 'bg-gold border-gold' : 'border-zinc-700'}`}>
                                {adv.completed && (
                                  <svg className="w-3 h-3 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
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
                              <p className="text-white text-sm font-medium">{lifeDesign[key] || <span className="text-zinc-700">—</span>}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Skills */}
                      <section>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Skills</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                          {lifeDesign.skill_1 && <div className="flex items-center gap-3"><span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 1</span><span className="text-zinc-300 text-sm">{lifeDesign.skill_1}</span></div>}
                          {lifeDesign.skill_2 && <div className="flex items-center gap-3"><span className="text-zinc-600 text-xs uppercase tracking-widest w-16">Skill 2</span><span className="text-zinc-300 text-sm">{lifeDesign.skill_2}</span></div>}
                          {lifeDesign.key_skill && (
                            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                              <span className="text-gold text-xs uppercase tracking-widest w-16 font-semibold">Primary</span>
                              <span className="text-white text-sm font-semibold">{lifeDesign.key_skill}</span>
                            </div>
                          )}
                          {!lifeDesign.skill_1 && !lifeDesign.skill_2 && <p className="text-zinc-600 text-sm">Not set</p>}
                        </div>
                      </section>

                      {/* Money-Making Tasks */}
                      <section>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Top 3 Money-Making Tasks</h3>
                        <div className="space-y-2">
                          {[1, 2, 3].map(n => (
                            <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-3.5 flex items-center gap-4">
                              <span className="text-gold font-bold text-sm w-5 flex-shrink-0">{n}</span>
                              <span className="text-white text-sm">{lifeDesign[`money_task_${n}`] || <span className="text-zinc-700">Not set</span>}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* ── SOLD OUT™ PLAYBOOK ────────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'playbook' && (() => {
                if (!clientPlaybook) return (
                  <div className="fade-in text-center py-16">
                    <span className="text-4xl mb-4 block">📖</span>
                    <p className="text-zinc-500 text-sm font-medium">Client hasn't started their Sold Out™ Playbook yet.</p>
                  </div>
                )

                const icp = clientPlaybook.icp || {}
                const dip = clientPlaybook.dip || {}
                const bb = clientPlaybook.bang_bang || {}
                const scores = clientPlaybook.scores || {}
                const totalScore = (scores.icp_score || 0) + (scores.dip_score || 0) + (scores.bb_score || 0)
                const maxScore = 40
                const band = totalScore >= 35 ? 'Offer-Ready' : totalScore >= 29 ? 'Strong Foundation' : totalScore >= 21 ? 'Getting There' : 'Needs Work'
                const bandColor = totalScore >= 35 ? 'text-emerald-400' : totalScore >= 29 ? 'text-gold' : totalScore >= 21 ? 'text-amber-400' : 'text-red-400'

                return (
                <div className="fade-in">
                  {/* Score Hero */}
                  <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-6 sm:p-8 mb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative flex-shrink-0">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="#27272a" strokeWidth="6" />
                          <circle cx="60" cy="60" r="52" fill="none" stroke="#C9A84C" strokeWidth="6"
                            strokeDasharray={`${(totalScore / maxScore) * 326.7} 326.7`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-white">{totalScore}</span>
                          <span className="text-[10px] font-bold text-zinc-500">/ {maxScore}</span>
                        </div>
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-lg font-black text-white uppercase tracking-wider">{clientPlaybook.name || 'Sold Out™ Playbook'}</h2>
                        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                          totalScore >= 35 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          totalScore >= 29 ? 'bg-gold/20 text-gold border-gold/30' :
                          totalScore >= 21 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>{band}</div>
                        <p className="text-zinc-600 text-xs mt-2">Stage {clientPlaybook.current_stage || 1} of 4 · Updated {clientPlaybook.updated_at ? new Date(clientPlaybook.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</p>
                      </div>
                    </div>
                    {/* Section scores */}
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      {[
                        { label: 'ICP', score: scores.icp_score || 0, max: 15, color: 'bg-sky-400' },
                        { label: 'The Dip', score: scores.dip_score || 0, max: 10, color: 'bg-violet-400' },
                        { label: 'Bang Bang', score: scores.bb_score || 0, max: 15, color: 'bg-gold' },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</span>
                            <span className="text-xs font-bold text-white">{s.score}/{s.max}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.score / s.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ICP Summary */}
                  {Object.keys(icp).length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
                      <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-base">🎯</span> Ideal Client Profile
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {icp.client_type && (
                          <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Client Type</p><p className="text-white text-sm">{icp.client_type}</p></div>
                        )}
                        {icp.sector && (
                          <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Sector</p><p className="text-white text-sm">{icp.sector}</p></div>
                        )}
                        {icp.specific_description && (
                          <div className="sm:col-span-2"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Ideal Client</p><p className="text-zinc-300 text-sm leading-relaxed">{icp.specific_description}</p></div>
                        )}
                        {icp.dream_outcome && (
                          <div className="sm:col-span-2"><p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Dream Outcome</p><p className="text-white text-sm leading-relaxed">{icp.dream_outcome}</p></div>
                        )}
                        {icp.desired_identity && (
                          <div className="sm:col-span-2"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Desired Identity</p><p className="text-zinc-300 text-sm leading-relaxed">{icp.desired_identity}</p></div>
                        )}
                        {icp.trigger_moment && (
                          <div className="sm:col-span-2"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Trigger Moment</p><p className="text-zinc-300 text-sm leading-relaxed">{icp.trigger_moment}</p></div>
                        )}
                      </div>
                      {/* Tags row */}
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
                        {icp.emotional_state?.length > 0 && (
                          <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Emotional State</p>
                            <div className="flex flex-wrap gap-1">{icp.emotional_state.map(t => <span key={t} className="px-2 py-0.5 bg-amber-900/20 text-amber-400 rounded text-[10px] font-semibold">{t}</span>)}</div>
                          </div>
                        )}
                        {icp.values?.length > 0 && (
                          <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Values</p>
                            <div className="flex flex-wrap gap-1">{icp.values.map(t => <span key={t} className="px-2 py-0.5 bg-violet-900/20 text-violet-400 rounded text-[10px] font-semibold">{t}</span>)}</div>
                          </div>
                        )}
                        {icp.channels?.length > 0 && (
                          <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Channels</p>
                            <div className="flex flex-wrap gap-1">{icp.channels.map(t => <span key={t} className="px-2 py-0.5 bg-sky-900/20 text-sky-400 rounded text-[10px] font-semibold">{t}</span>)}</div>
                          </div>
                        )}
                      </div>
                      {/* Pains */}
                      {icp.pains?.filter(Boolean).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Top Pains</p>
                          <div className="space-y-1">{icp.pains.filter(Boolean).map((p, i) => <p key={i} className="text-zinc-300 text-sm flex items-start gap-2"><span className="text-red-400 mt-0.5">•</span>{p}</p>)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* The Dip Summary */}
                  {Object.keys(dip).length > 0 && (dip.problem || dip.format || dip.price) && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
                      <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-base">⚡</span> The Dip — Micro Offer
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {dip.format && <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Format</p><p className="text-white text-sm font-medium">{dip.format}</p></div>}
                        {dip.price && <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Price</p><p className="text-emerald-400 text-sm font-bold">£{Number(dip.price).toLocaleString()}</p></div>}
                        {dip.duration && <div><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Duration</p><p className="text-white text-sm">{dip.duration}</p></div>}
                      </div>
                      {dip.problem && <div className="mt-3"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Problem It Solves</p><p className="text-zinc-300 text-sm">{dip.problem}</p></div>}
                      {dip.outcome && <div className="mt-3"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Outcome Delivered</p><p className="text-zinc-300 text-sm">{dip.outcome}</p></div>}
                      {dip.bridge && <div className="mt-3"><p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Bridge to Main Offer</p><p className="text-zinc-300 text-sm">{dip.bridge}</p></div>}
                    </div>
                  )}

                  {/* Bang Bang Offer Summary */}
                  {Object.keys(bb).length > 0 && (bb.name || bb.promise || bb.price) && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
                      <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-base">💥</span> Bang Bang Offer — {bb.name || 'Main Offer'}
                      </h3>
                      {bb.promise && <div className="bg-zinc-800/50 rounded-lg p-4 mb-4"><p className="text-white text-sm leading-relaxed italic">"{bb.promise}"</p></div>}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {bb.price && <div className="bg-zinc-800/50 rounded-lg p-3 text-center"><p className="text-lg font-black text-emerald-400">£{Number(bb.price).toLocaleString()}</p><p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Price</p></div>}
                        {bb.stack_value && <div className="bg-zinc-800/50 rounded-lg p-3 text-center"><p className="text-lg font-black text-white">£{Number(bb.stack_value).toLocaleString()}</p><p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Stack Value</p></div>}
                        {bb.duration && <div className="bg-zinc-800/50 rounded-lg p-3 text-center"><p className="text-lg font-black text-sky-400">{bb.duration}</p><p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Duration</p></div>}
                        {bb.dream_score && <div className="bg-zinc-800/50 rounded-lg p-3 text-center"><p className="text-lg font-black text-gold">{bb.dream_score}/7</p><p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Dream Score</p></div>}
                      </div>
                      {bb.unique_mechanism && <div className="mb-3"><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Unique Mechanism</p><p className="text-zinc-300 text-sm">{bb.unique_mechanism}</p></div>}
                      {bb.phases?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Programme Phases</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {bb.phases.filter(p => p.name).map((phase, i) => (
                              <div key={i} className="flex-shrink-0 bg-zinc-800 rounded-lg p-3 min-w-[140px]">
                                <p className="text-gold text-[10px] font-bold uppercase tracking-widest">Phase {i + 1}</p>
                                <p className="text-white text-sm font-semibold mt-0.5">{phase.name}</p>
                                {phase.duration && <p className="text-zinc-600 text-xs mt-0.5">{phase.duration}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {bb.guarantees?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Guarantees</p>
                          <div className="flex flex-wrap gap-1">{bb.guarantees.map(g => <span key={g} className="px-2 py-0.5 bg-emerald-900/20 text-emerald-400 rounded text-[10px] font-semibold">{g}</span>)}</div>
                        </div>
                      )}
                      {bb.continuity_offer && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Continuity</p>
                          <p className="text-zinc-300 text-sm">{bb.continuity_offer}{bb.continuity_price ? ` — £${Number(bb.continuity_price).toLocaleString()}` : ''}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )
              })()}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
