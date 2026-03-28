'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, sub, color = 'amber' }) {
  const colors = {
    amber: 'text-amber-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function Badge({ status }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-blue-500/20 text-blue-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    planning: 'bg-purple-500/20 text-purple-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-700 text-gray-300'}`}>
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-500 text-lg font-medium animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Nav */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-bold text-white hidden sm:block">The Syndicate</span>
            <span className="text-gray-500 text-sm hidden sm:block">/ Admin</span>
          </div>
        </div>
        <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-20 md:z-auto
          w-72 bg-gray-900 border-r border-gray-800
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col overflow-y-auto mt-[57px] md:mt-0
        `}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clients ({clients.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => selectClient(client)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition ${
                  selectedClient?.id === client.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-sm">{client.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{client.business || client.email}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-gray-400 text-lg font-medium">Select a client</h3>
              <p className="text-gray-600 text-sm mt-1">Choose a client from the sidebar to view their KPIs</p>
            </div>
          ) : (
            <div>
              {/* Client Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{selectedClient.name}</h1>
                    <p className="text-gray-400 text-sm mt-0.5">{selectedClient.business} · {selectedClient.industry}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{selectedClient.email}</p>
                  </div>
                </div>

                {/* Target Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  <StatCard label="Lead Target" value={selectedClient.lead_target || '—'} sub="per week" color="amber" />
                  <StatCard label="Revenue Target" value={selectedClient.revenue_target ? formatCurrency(selectedClient.revenue_target) : '—'} sub="monthly" color="green" />
                  <StatCard label="Outreach Target" value={selectedClient.outreach_target || '—'} sub="per week" color="blue" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800">
                {['kpis', 'checkins', 'projects'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition ${
                      activeTab === tab
                        ? 'bg-amber-500 text-gray-950'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'kpis' && (
                <div>
                  {kpis.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No KPI data yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-gray-800">
                            <th className="pb-3 text-gray-500 font-medium">Week</th>
                            <th className="pb-3 text-gray-500 font-medium">Leads</th>
                            <th className="pb-3 text-gray-500 font-medium">Outreach</th>
                            <th className="pb-3 text-gray-500 font-medium">Sales</th>
                            <th className="pb-3 text-gray-500 font-medium">Revenue</th>
                            <th className="pb-3 text-gray-500 font-medium">CPL</th>
                            <th className="pb-3 text-gray-500 font-medium">Tasks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.map((kpi) => (
                            <tr key={kpi.id} className="border-b border-gray-900 hover:bg-gray-900/50 transition">
                              <td className="py-3 text-gray-300">{formatDate(kpi.week_date)}</td>
                              <td className="py-3 text-white font-medium">{kpi.leads ?? '—'}</td>
                              <td className="py-3 text-white">{kpi.outreach ?? '—'}</td>
                              <td className="py-3 text-white">{kpi.sales ?? '—'}</td>
                              <td className="py-3 text-green-400">{kpi.revenue != null ? formatCurrency(kpi.revenue) : '—'}</td>
                              <td className="py-3 text-white">{kpi.cost_per_lead != null ? formatCurrency(kpi.cost_per_lead) : '—'}</td>
                              <td className="py-3 text-white">{kpi.tasks_completed ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'checkins' && (
                <div className="space-y-4">
                  {checkins.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No check-ins yet</div>
                  ) : (
                    checkins.map((c) => (
                      <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-gray-400 text-sm">{formatDate(c.checkin_date)}</span>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((star) => (
                              <svg key={star} className={`w-4 h-4 ${star <= c.rating ? 'text-amber-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm text-gray-400 ml-1">{c.rating}/5</span>
                          </div>
                        </div>
                        {c.well && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-green-400 mb-1">What went well</p>
                            <p className="text-gray-300 text-sm">{c.well}</p>
                          </div>
                        )}
                        {c.challenges && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-red-400 mb-1">Challenges</p>
                            <p className="text-gray-300 text-sm">{c.challenges}</p>
                          </div>
                        )}
                        {c.next_focus && (
                          <div>
                            <p className="text-xs font-medium text-blue-400 mb-1">Next focus</p>
                            <p className="text-gray-300 text-sm">{c.next_focus}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No projects yet</div>
                  ) : (
                    projects.map((p) => (
                      <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{p.name}</h3>
                              <Badge status={p.status} />
                              {p.priority && (
                                <span className="text-xs text-gray-500 capitalize">{p.priority} priority</span>
                              )}
                            </div>
                            {p.description && <p className="text-gray-400 text-sm">{p.description}</p>}
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
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
