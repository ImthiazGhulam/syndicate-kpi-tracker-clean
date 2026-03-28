'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, target, color = 'amber' }) {
  const colors = {
    amber: { text: 'text-amber-400', bar: 'bg-amber-500' },
    green: { text: 'text-green-400', bar: 'bg-green-500' },
    blue: { text: 'text-blue-400', bar: 'bg-blue-500' },
    purple: { text: 'text-purple-400', bar: 'bg-purple-500' },
  }
  const pct = target && value ? Math.min(100, Math.round((value / target) * 100)) : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color].text}`}>{value ?? '—'}</p>
      {target && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Target: {target}</span>
            {pct != null && <span>{pct}%</span>}
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors[color].bar}`} style={{ width: `${pct || 0}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [kpis, setKpis] = useState([])
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // KPI form state
  const [kpiForm, setKpiForm] = useState({
    week_date: new Date().toISOString().split('T')[0],
    leads: '', outreach: '', sales: '', revenue: '', cost_per_lead: '', tasks_completed: ''
  })
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiSuccess, setKpiSuccess] = useState(false)

  // Check-in form state
  const [checkinForm, setCheckinForm] = useState({
    checkin_date: new Date().toISOString().split('T')[0],
    rating: 3, well: '', challenges: '', next_focus: ''
  })
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (session.user.email === adminEmail) {
        router.push('/admin')
        return
      }
      setUser(session.user)
      await fetchClientData(session.user.email)
    }
    init()
  }, [])

  const fetchClientData = async (email) => {
    const { data: client } = await supabase.from('clients').select('*').eq('email', email).single()

    if (!client) {
      setLoading(false)
      return
    }
    setClientData(client)

    const [kpisRes, checkinsRes, projectsRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('client_id', client.id).order('week_date', { ascending: false }),
      supabase.from('checkins').select('*').eq('client_id', client.id).order('checkin_date', { ascending: false }),
      supabase.from('projects').select('*').eq('client_id', client.id).order('start_date', { ascending: false }),
    ])

    if (kpisRes.data) setKpis(kpisRes.data)
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const submitKpi = async (e) => {
    e.preventDefault()
    setKpiLoading(true)
    const payload = {
      client_id: clientData.id,
      week_date: kpiForm.week_date,
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
      fetchClientData(user.email)
      setTimeout(() => setKpiSuccess(false), 3000)
    }
    setKpiLoading(false)
  }

  const submitCheckin = async (e) => {
    e.preventDefault()
    setCheckinLoading(true)
    const { error } = await supabase.from('checkins').insert([{
      client_id: clientData.id,
      ...checkinForm,
      rating: Number(checkinForm.rating),
    }])
    if (!error) {
      setCheckinSuccess(true)
      setCheckinForm({ checkin_date: new Date().toISOString().split('T')[0], rating: 3, well: '', challenges: '', next_focus: '' })
      fetchClientData(user.email)
      setTimeout(() => setCheckinSuccess(false), 3000)
    }
    setCheckinLoading(false)
  }

  const formatCurrency = (v) => v != null ? `£${Number(v).toLocaleString()}` : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const latestKpi = kpis[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-500 text-lg font-medium animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center max-w-md">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Account not found</h2>
          <p className="text-gray-400 text-sm mb-4">Your email isn't linked to a client account. Please contact your coach.</p>
          <button onClick={handleSignOut} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition">Sign out</button>
        </div>
      </div>
    )
  }

  const tabs = ['dashboard', 'submit kpis', 'check-in', 'projects']

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-white text-sm">The Syndicate</span>
            <span className="text-gray-500 text-xs ml-1 hidden sm:inline">/ {clientData.name}</span>
          </div>
        </div>
        <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Welcome, {clientData.name.split(' ')[0]}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{clientData.business} · {clientData.industry}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium capitalize transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-amber-500 text-gray-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Latest KPIs {latestKpi && <span className="text-sm text-gray-500 font-normal">— {formatDate(latestKpi.week_date)}</span>}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              <StatCard label="Leads" value={latestKpi?.leads} target={clientData.lead_target} color="amber" />
              <StatCard label="Outreach" value={latestKpi?.outreach} target={clientData.outreach_target} color="blue" />
              <StatCard label="Sales" value={latestKpi?.sales} color="purple" />
              <StatCard label="Revenue" value={latestKpi?.revenue != null ? formatCurrency(latestKpi.revenue) : null} target={clientData.revenue_target ? formatCurrency(clientData.revenue_target) : null} color="green" />
              <StatCard label="Cost per Lead" value={latestKpi?.cost_per_lead != null ? formatCurrency(latestKpi.cost_per_lead) : null} color="amber" />
              <StatCard label="Tasks Done" value={latestKpi?.tasks_completed} color="blue" />
            </div>

            {kpis.length > 1 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">KPI History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-800">
                        <th className="pb-3 text-gray-500 font-medium">Week</th>
                        <th className="pb-3 text-gray-500 font-medium">Leads</th>
                        <th className="pb-3 text-gray-500 font-medium">Revenue</th>
                        <th className="pb-3 text-gray-500 font-medium">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.slice(1).map((kpi) => (
                        <tr key={kpi.id} className="border-b border-gray-900 hover:bg-gray-900/50 transition">
                          <td className="py-3 text-gray-400">{formatDate(kpi.week_date)}</td>
                          <td className="py-3 text-white">{kpi.leads ?? '—'}</td>
                          <td className="py-3 text-green-400">{kpi.revenue != null ? formatCurrency(kpi.revenue) : '—'}</td>
                          <td className="py-3 text-white">{kpi.sales ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit KPIs */}
        {activeTab === 'submit kpis' && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-1">Submit Weekly KPIs</h2>
            <p className="text-gray-400 text-sm mb-6">Fill in your numbers for the week</p>

            {kpiSuccess && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">
                KPIs submitted successfully!
              </div>
            )}

            <form onSubmit={submitKpi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Week Date</label>
                <input
                  type="date"
                  value={kpiForm.week_date}
                  onChange={(e) => setKpiForm({ ...kpiForm, week_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'leads', label: 'Leads Generated' },
                  { key: 'outreach', label: 'Outreach Contacts' },
                  { key: 'sales', label: 'Sales Closed' },
                  { key: 'revenue', label: 'Revenue (£)' },
                  { key: 'cost_per_lead', label: 'Cost per Lead (£)' },
                  { key: 'tasks_completed', label: 'Tasks Completed' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                    <input
                      type="number"
                      min="0"
                      step={key === 'revenue' || key === 'cost_per_lead' ? '0.01' : '1'}
                      value={kpiForm[key]}
                      onChange={(e) => setKpiForm({ ...kpiForm, [key]: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={kpiLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-950 font-semibold rounded-xl transition"
              >
                {kpiLoading ? 'Submitting...' : 'Submit KPIs'}
              </button>
            </form>
          </div>
        )}

        {/* Check-in */}
        {activeTab === 'check-in' && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-1">Weekly Check-in</h2>
            <p className="text-gray-400 text-sm mb-6">Reflect on your week with your coach</p>

            {checkinSuccess && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">
                Check-in submitted successfully!
              </div>
            )}

            <form onSubmit={submitCheckin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={checkinForm.checkin_date}
                  onChange={(e) => setCheckinForm({ ...checkinForm, checkin_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Overall Rating: <span className="text-amber-400">{checkinForm.rating}/5</span>
                </label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCheckinForm({ ...checkinForm, rating: n })}
                      className="focus:outline-none"
                    >
                      <svg className={`w-8 h-8 transition ${n <= checkinForm.rating ? 'text-amber-400' : 'text-gray-700 hover:text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'well', label: 'What went well this week?', color: 'text-green-400' },
                { key: 'challenges', label: 'What were your challenges?', color: 'text-red-400' },
                { key: 'next_focus', label: 'What\'s your focus for next week?', color: 'text-blue-400' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-sm font-medium mb-2 ${color}`}>{label}</label>
                  <textarea
                    value={checkinForm[key]}
                    onChange={(e) => setCheckinForm({ ...checkinForm, [key]: e.target.value })}
                    rows={3}
                    placeholder="Write here..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition resize-none"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={checkinLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-950 font-semibold rounded-xl transition"
              >
                {checkinLoading ? 'Submitting...' : 'Submit Check-in'}
              </button>
            </form>
          </div>
        )}

        {/* Projects */}
        {activeTab === 'projects' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Your Projects</h2>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No projects yet — your coach will add them</div>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const statusColors = {
                    active: 'bg-green-500/20 text-green-400',
                    completed: 'bg-blue-500/20 text-blue-400',
                    paused: 'bg-yellow-500/20 text-yellow-400',
                    cancelled: 'bg-red-500/20 text-red-400',
                    planning: 'bg-purple-500/20 text-purple-400',
                  }
                  return (
                    <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-white">{p.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-700 text-gray-300'}`}>
                              {p.status}
                            </span>
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
