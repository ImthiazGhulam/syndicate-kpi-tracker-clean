'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function defaultAdventures() {
  return Array.from({ length: 6 }, (_, i) => ({ order_index: i + 1, title: '', who_with: '', when_planned: '', where_planned: '', completed: false }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'gold' }) {
  const colors = { gold: 'text-gold', green: 'text-emerald-400', blue: 'text-sky-400', purple: 'text-violet-400' }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

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

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()

  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [activeTab, setActiveTab] = useState('kpis')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Client data
  const [kpis, setKpis] = useState([])
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])
  const [lifeDesign, setLifeDesign] = useState(null)
  const [adventures, setAdventures] = useState(defaultAdventures())
  const [warMapTasks, setWarMapTasks] = useState([])
  const [warMapWeekly, setWarMapWeekly] = useState(null)
  const [dailyPulse, setDailyPulse] = useState(null)

  // Calendar state (for War Map view)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())

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
    if (data) setClients(data)
    setLoading(false)
  }

  const selectClient = async (client) => {
    setSelectedClient(client)
    setSidebarOpen(false)
    setActiveTab('kpis')
    setLifeDesign(null)
    setAdventures(defaultAdventures())
    setWarMapTasks([])

    const year = new Date().getFullYear()

    // Get current week's Monday
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    const mondayStr = monday.toISOString().split('T')[0]

    const [kpisRes, checkinsRes, projectsRes, designRes, adventuresRes, warRes, weeklyRes, pulseRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('client_id', client.id).order('week_date', { ascending: false }),
      supabase.from('checkins').select('*').eq('client_id', client.id).order('checkin_date', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
      supabase.from('life_design').select('*').eq('client_id', client.id).eq('year', year).maybeSingle(),
      supabase.from('mini_adventures').select('*').eq('client_id', client.id).eq('year', year).order('order_index'),
      supabase.from('war_map_tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('war_map_weekly').select('*').eq('client_id', client.id).eq('week_of', mondayStr).maybeSingle(),
      supabase.from('daily_pulse').select('*').eq('client_id', client.id).eq('date', new Date().toISOString().split('T')[0]).maybeSingle(),
    ])

    if (kpisRes.data) setKpis(kpisRes.data)
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (designRes.data) setLifeDesign(designRes.data)

    if (adventuresRes.data?.length > 0) {
      const merged = defaultAdventures().map(def =>
        adventuresRes.data.find(a => a.order_index === def.order_index) || def
      )
      setAdventures(merged)
    } else {
      setAdventures(defaultAdventures())
    }

    if (warRes.data) setWarMapTasks(warRes.data)
    setWarMapWeekly(weeklyRes.data || null)
    setDailyPulse(pulseRes.data || null)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const formatCurrency = (v) => v != null ? `£${Number(v).toLocaleString()}` : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  )

  // ── Tab Config ──────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'kpis',        label: 'KPIs' },
    { id: 'checkins',    label: 'Check-ins' },
    { id: 'projects',    label: 'Projects' },
    { id: 'design',      label: 'Design™' },
    { id: 'war-map',     label: 'War Map' },
    { id: 'morning-ops', label: 'Morning Ops' },
  ]

  // War map filters
  const delegated = warMapTasks.filter(t => t.status === 'delegate')
  const scheduled = warMapTasks.filter(t => t.status === 'schedule')
  const doNow     = warMapTasks.filter(t => t.status === 'do_now')
  const brainDump = warMapTasks.filter(t => t.status === 'brain_dump')

  // Calendar
  const scheduledDates = new Set(scheduled.filter(t => t.scheduled_date).map(t => t.scheduled_date))
  const todayStr = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calStartOffset = (firstDayOfMonth + 6) % 7
  const calCells = [...Array(calStartOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-zinc-500 hover:text-white p-2 -ml-2 rounded transition" aria-label="Toggle sidebar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gold rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
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
                <div className="font-medium text-sm">{client.name}</div>
                <div className="text-xs text-zinc-600 mt-0.5 truncate">{client.business || client.email}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-zinc-300 font-semibold mb-1">No client selected</h3>
              <p className="text-zinc-600 text-sm">Choose a client from the sidebar.</p>
              <button onClick={() => setSidebarOpen(true)} className="mt-6 md:hidden px-5 py-2.5 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition">
                Select Client
              </button>
            </div>
          ) : (
            <div>
              {/* Client Header */}
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-white tracking-tight">{selectedClient.name}</h1>
                <p className="text-zinc-400 text-sm mt-1">{selectedClient.business} · {selectedClient.industry}</p>
                <p className="text-zinc-600 text-xs mt-0.5">{selectedClient.email}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
                  <StatCard label="Lead Target"     value={selectedClient.lead_target || '—'}                                             sub="per week"  color="gold" />
                  <StatCard label="Revenue Target"  value={selectedClient.revenue_target ? formatCurrency(selectedClient.revenue_target) : '—'} sub="monthly"   color="green" />
                  <StatCard label="Outreach Target" value={selectedClient.outreach_target || '—'}                                          sub="per week"  color="blue" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-800 mb-7 gap-6 overflow-x-auto scrollbar-none">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── KPIs ──────────────────────────────────────────────────── */}
              {activeTab === 'kpis' && (
                <div>
                  {kpis.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No KPI data yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900">
                            {['Week','Leads','Outreach','Sales','Revenue','CPL','Tasks'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.map((kpi, i) => (
                            <tr key={kpi.id} className={`border-b border-zinc-900 hover:bg-zinc-900/60 transition ${i % 2 === 1 ? 'bg-zinc-900/20' : ''}`}>
                              <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">{formatDate(kpi.week_date)}</td>
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

              {/* ── CHECK-INS ─────────────────────────────────────────────── */}
              {activeTab === 'checkins' && (
                <div className="space-y-4">
                  {checkins.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No check-ins yet.</p>
                  ) : (
                    checkins.map(c => (
                      <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{formatDate(c.checkin_date)}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <svg key={star} className={`w-4 h-4 ${star <= c.rating ? 'text-gold' : 'text-zinc-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-zinc-500">{c.rating}/5</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {c.well && <div><p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">What Went Well</p><p className="text-zinc-300 text-sm leading-relaxed">{c.well}</p></div>}
                          {c.challenges && <div><p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Challenges</p><p className="text-zinc-300 text-sm leading-relaxed">{c.challenges}</p></div>}
                          {c.next_focus && <div><p className="text-xs font-semibold text-sky-500 uppercase tracking-widest mb-1">Next Focus</p><p className="text-zinc-300 text-sm leading-relaxed">{c.next_focus}</p></div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── PROJECTS ──────────────────────────────────────────────── */}
              {activeTab === 'projects' && (
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No projects yet.</p>
                  ) : (
                    projects.map(p => (
                      <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                          <h3 className="font-semibold text-white">{p.name}</h3>
                          <Badge status={p.status} />
                          {p.priority && <span className="text-xs text-zinc-600 uppercase tracking-wider">{p.priority} priority</span>}
                        </div>
                        {p.description && <p className="text-zinc-400 text-sm leading-relaxed">{p.description}</p>}
                        <div className="flex gap-5 mt-3 text-xs text-zinc-600 uppercase tracking-wide">
                          {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                          {p.end_date && <span>End: {formatDate(p.end_date)}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── DESIGN™ ───────────────────────────────────────────────── */}
              {activeTab === 'design' && (
                <div>
                  {!lifeDesign ? (
                    <div className="py-12 text-center">
                      <p className="text-zinc-600 text-sm">Client hasn't completed their Design™ yet.</p>
                    </div>
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

              {/* ── WAR MAP ───────────────────────────────────────────────── */}
              {activeTab === 'war-map' && (
                <div>
                  {/* Weekly Priorities + Completion */}
                  {warMapWeekly && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">This Week's Priorities</h3>
                        {warMapWeekly.completed ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/20 border border-emerald-900/40 rounded">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-yellow-900/20 border border-yellow-900/40 rounded text-yellow-400 text-xs font-semibold uppercase tracking-widest">Pending</span>
                        )}
                      </div>
                      {/* #1 Priority */}
                      <div className="bg-zinc-900 border-2 border-gold/30 rounded-lg px-4 py-3 mb-3">
                        <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-1">#1 Priority</p>
                        <p className={`text-sm font-medium ${warMapWeekly.number_one_priority ? 'text-white' : 'text-zinc-700 italic'}`}>{warMapWeekly.number_one_priority || 'Not set'}</p>
                      </div>
                      {/* Other Priorities */}
                      <div className="space-y-2">
                        {[
                          { num: 1, value: warMapWeekly.priority_2 },
                          { num: 2, value: warMapWeekly.priority_3 },
                          { num: 3, value: warMapWeekly.priority_4 },
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
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Brain Dump</p>
                          <p className="text-2xl font-bold text-zinc-400">{brainDump.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">pending triage</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Delegated</p>
                          <p className="text-2xl font-bold text-violet-400">{delegated.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{delegated.filter(t => t.completed).length} done</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Scheduled</p>
                          <p className="text-2xl font-bold text-sky-400">{scheduled.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{scheduled.filter(t => t.completed).length} done</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Do Now</p>
                          <p className="text-2xl font-bold text-gold">{doNow.length}</p>
                          <p className="text-zinc-600 text-xs mt-1">{doNow.filter(t => t.completed).length} done</p>
                        </div>
                      </div>

                      {/* Delegated */}
                      {delegated.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Delegated</p>
                          <div className="space-y-2">
                            {delegated.map(task => (
                              <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                  {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                                {task.delegated_to && <span className="text-xs text-violet-400 flex-shrink-0">→ {task.delegated_to}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scheduled */}
                      {scheduled.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Scheduled</p>
                          <div className="space-y-2">
                            {scheduled.map(task => (
                              <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                  {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                                {task.scheduled_date && <span className="text-xs text-sky-400 flex-shrink-0">{task.scheduled_date}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Do Now */}
                      {doNow.length > 0 && (
                        <div className="mb-8">
                          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Do Now</p>
                          <div className="space-y-2">
                            {doNow.map(task => (
                              <div key={task.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                  {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-sm flex-1 ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Calendar */}
                      <div className="border-t border-zinc-800 pt-7">
                        <div className="flex items-center justify-between mb-5">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{MONTH_NAMES[calendarMonth]} {calendarYear}</p>
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
                                className={`aspect-square flex flex-col items-center justify-center rounded text-xs ${
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
                  ) : null}
                </div>
              )}

              {/* ── MORNING OPS ─────────────────────────────────────────── */}
              {activeTab === 'morning-ops' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today's Morning Ops</h3>
                    {dailyPulse ? (
                      dailyPulse.completed ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/20 border border-emerald-900/40 rounded">
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Completed</span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-yellow-900/20 border border-yellow-900/40 rounded text-yellow-400 text-xs font-semibold uppercase tracking-widest">In Progress</span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-500 text-xs font-semibold uppercase tracking-widest">Not Started</span>
                    )}
                  </div>

                  {!dailyPulse ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">Client hasn't started their Morning Ops today.</p>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'Intention', value: dailyPulse.intention, color: 'text-gold' },
                        { label: 'Feeling', value: dailyPulse.feeling, color: 'text-zinc-400' },
                        { label: 'What would make today a win', value: dailyPulse.win, color: 'text-zinc-400' },
                        { label: 'Money-making task', value: dailyPulse.money_task, color: 'text-gold' },
                      ].map(({ label, value, color }) => value && (
                        <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${color}`}>{label}</p>
                          <p className="text-white text-sm leading-relaxed">{value}</p>
                        </div>
                      ))}

                      {/* To-dos */}
                      {(dailyPulse.todo_1 || dailyPulse.todo_2 || dailyPulse.todo_3) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Top 3 To-Dos</p>
                          <div className="space-y-1.5">
                            {[dailyPulse.todo_1, dailyPulse.todo_2, dailyPulse.todo_3].map((todo, i) => todo && (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 w-4">{i + 1}</span>
                                <p className="text-white text-sm">{todo}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(dailyPulse.gratitude_1 || dailyPulse.gratitude_2 || dailyPulse.gratitude_3 || dailyPulse.gratitude_4 || dailyPulse.gratitude_5 || dailyPulse.gratitude_6) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-gold uppercase tracking-widest mb-2">Gratitude — Mini Adventures</p>
                          <div className="space-y-2">
                            {[1,2,3,4,5,6].map(n => dailyPulse[`gratitude_${n}`] && (
                              <div key={n} className="flex items-start gap-2">
                                <span className="text-xs font-bold text-zinc-600 w-4 flex-shrink-0 mt-0.5">{n}</span>
                                <p className="text-white text-sm leading-relaxed">{dailyPulse[`gratitude_${n}`]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dailyPulse.let_go && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Letting go of</p>
                          <p className="text-white text-sm leading-relaxed">{dailyPulse.let_go}</p>
                        </div>
                      )}

                      {dailyPulse.completed_at && (
                        <p className="text-zinc-600 text-xs mt-2">Submitted {new Date(dailyPulse.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
