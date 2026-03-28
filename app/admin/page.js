'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, sub, color = 'gold' }) {
  const colors = {
    gold: 'text-gold',
    green: 'text-emerald-400',
    blue: 'text-sky-400',
    purple: 'text-violet-400',
  }
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
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
    planning: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${styles[status] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
      {status}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [kpis, setKpis] = useState([])
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])
  const [activeTab, setActiveTab] = useState('kpis')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (session.user.email !== adminEmail) {
        router.push('/client')
        return
      }
      setUser(session.user)
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

    const [kpisRes, checkinsRes, projectsRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('client_id', client.id).order('week_date', { ascending: false }),
      supabase.from('checkins').select('*').eq('client_id', client.id).order('checkin_date', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
    ])

    if (kpisRes.data) setKpis(kpisRes.data)
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatCurrency = (v) => v != null ? `£${Number(v).toLocaleString()}` : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
      </div>
    )
  }

  const tabs = [
    { id: 'kpis', label: 'KPIs' },
    { id: 'checkins', label: 'Check-ins' },
    { id: 'projects', label: 'Projects' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Top Nav */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-zinc-500 hover:text-white p-2 -ml-2 rounded transition"
            aria-label="Toggle sidebar"
          >
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
        <button
          onClick={handleSignOut}
          className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition"
        >
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
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => selectClient(client)}
                className={`w-full text-left px-5 py-3.5 transition border-l-2 ${
                  selectedClient?.id === client.id
                    ? 'border-gold bg-gold/5 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="font-medium text-sm">{client.name}</div>
                <div className="text-xs text-zinc-600 mt-0.5 truncate">{client.business || client.email}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-zinc-300 font-semibold mb-1">No client selected</h3>
              <p className="text-zinc-600 text-sm">Choose a client from the sidebar to view their data.</p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="mt-6 md:hidden px-5 py-2.5 bg-gold text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition"
              >
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
                  <StatCard label="Lead Target" value={selectedClient.lead_target || '—'} sub="per week" color="gold" />
                  <StatCard label="Revenue Target" value={selectedClient.revenue_target ? formatCurrency(selectedClient.revenue_target) : '—'} sub="monthly" color="green" />
                  <StatCard label="Outreach Target" value={selectedClient.outreach_target || '—'} sub="per week" color="blue" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-800 mb-7 gap-7">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-gold text-gold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* KPIs */}
              {activeTab === 'kpis' && (
                <div>
                  {kpis.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No KPI data yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900">
                            {['Week', 'Leads', 'Outreach', 'Sales', 'Revenue', 'CPL', 'Tasks'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.map((kpi, i) => (
                            <tr key={kpi.id} className={`border-b border-zinc-900 hover:bg-zinc-900/60 transition ${i % 2 === 0 ? '' : 'bg-zinc-900/20'}`}>
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

              {/* Check-ins */}
              {activeTab === 'checkins' && (
                <div className="space-y-4">
                  {checkins.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No check-ins yet.</p>
                  ) : (
                    checkins.map((c) => (
                      <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{formatDate(c.checkin_date)}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((star) => (
                                <svg key={star} className={`w-4 h-4 ${star <= c.rating ? 'text-gold' : 'text-zinc-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-zinc-500">{c.rating}/5</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {c.well && (
                            <div>
                              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">What Went Well</p>
                              <p className="text-zinc-300 text-sm leading-relaxed">{c.well}</p>
                            </div>
                          )}
                          {c.challenges && (
                            <div>
                              <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Challenges</p>
                              <p className="text-zinc-300 text-sm leading-relaxed">{c.challenges}</p>
                            </div>
                          )}
                          {c.next_focus && (
                            <div>
                              <p className="text-xs font-semibold text-sky-500 uppercase tracking-widest mb-1">Next Focus</p>
                              <p className="text-zinc-300 text-sm leading-relaxed">{c.next_focus}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Projects */}
              {activeTab === 'projects' && (
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <p className="text-center py-12 text-zinc-600 text-sm">No projects yet.</p>
                  ) : (
                    projects.map((p) => (
                      <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                              <h3 className="font-semibold text-white">{p.name}</h3>
                              <Badge status={p.status} />
                              {p.priority && (
                                <span className="text-xs text-zinc-600 uppercase tracking-wider">{p.priority} priority</span>
                              )}
                            </div>
                            {p.description && <p className="text-zinc-400 text-sm leading-relaxed">{p.description}</p>}
                            <div className="flex gap-5 mt-3 text-xs text-zinc-600 uppercase tracking-wide">
                              {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                              {p.end_date && <span>End: {formatDate(p.end_date)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
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
