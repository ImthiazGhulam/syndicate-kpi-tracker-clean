'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, target, color = 'gold' }) {
  const colors = {
    gold: { text: 'text-gold', bar: 'bg-gold' },
    green: { text: 'text-emerald-400', bar: 'bg-emerald-500' },
    blue: { text: 'text-sky-400', bar: 'bg-sky-500' },
    purple: { text: 'text-violet-400', bar: 'bg-violet-500' },
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

export default function ClientPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [kpis, setKpis] = useState([])
  const [checkins, setCheckins] = useState([])
  const [projects, setProjects] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  const [kpiForm, setKpiForm] = useState({
    week_date: new Date().toISOString().split('T')[0],
    leads: '', outreach: '', sales: '', revenue: '', cost_per_lead: '', tasks_completed: ''
  })
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiSuccess, setKpiSuccess] = useState(false)

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-gold text-xs font-semibold tracking-widest uppercase animate-pulse">Loading</div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-500/10 border border-red-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-2">Account Not Found</h2>
          <p className="text-zinc-400 text-sm mb-5 leading-relaxed">Your email isn't linked to a client account. Please contact your coach.</p>
          <button onClick={handleSignOut} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs uppercase tracking-widest font-semibold transition">Sign Out</button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'submit kpis', label: 'Submit KPIs' },
    { id: 'check-in', label: 'Check-In' },
    { id: 'projects', label: 'Projects' },
  ]

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

      <div className="max-w-4xl mx-auto p-4 md:p-7">

        {/* Welcome */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {clientData.name.split(' ')[0]}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{clientData.business} · {clientData.industry}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-7 gap-5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-baseline gap-2 mb-5">
              <h2 className="text-base font-semibold text-white uppercase tracking-wider">Latest KPIs</h2>
              {latestKpi && <span className="text-zinc-600 text-xs">{formatDate(latestKpi.week_date)}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-9">
              <StatCard label="Leads" value={latestKpi?.leads} target={clientData.lead_target} color="gold" />
              <StatCard label="Outreach" value={latestKpi?.outreach} target={clientData.outreach_target} color="blue" />
              <StatCard label="Sales" value={latestKpi?.sales} color="purple" />
              <StatCard label="Revenue" value={latestKpi?.revenue != null ? formatCurrency(latestKpi.revenue) : null} target={clientData.revenue_target ? formatCurrency(clientData.revenue_target) : null} color="green" />
              <StatCard label="Cost per Lead" value={latestKpi?.cost_per_lead != null ? formatCurrency(latestKpi.cost_per_lead) : null} color="gold" />
              <StatCard label="Tasks Done" value={latestKpi?.tasks_completed} color="blue" />
            </div>

            {kpis.length > 1 && (
              <div>
                <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-5">KPI History</h2>
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900">
                        {['Week', 'Leads', 'Revenue', 'Sales'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.slice(1).map((kpi) => (
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

        {/* Submit KPIs */}
        {activeTab === 'submit kpis' && (
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
                <input
                  type="date"
                  value={kpiForm.week_date}
                  onChange={(e) => setKpiForm({ ...kpiForm, week_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                />
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
                    <input
                      type="number"
                      min="0"
                      step={key === 'revenue' || key === 'cost_per_lead' ? '0.01' : '1'}
                      value={kpiForm[key]}
                      onChange={(e) => setKpiForm({ ...kpiForm, [key]: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={kpiLoading}
                className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition"
              >
                {kpiLoading ? 'Submitting...' : 'Submit KPIs'}
              </button>
            </form>
          </div>
        )}

        {/* Check-in */}
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
                <input
                  type="date"
                  value={checkinForm.checkin_date}
                  onChange={(e) => setCheckinForm({ ...checkinForm, checkin_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  Overall Rating — <span className="text-gold">{checkinForm.rating}/5</span>
                </label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCheckinForm({ ...checkinForm, rating: n })}
                      className="focus:outline-none p-1"
                    >
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
                  <textarea
                    value={checkinForm[key]}
                    onChange={(e) => setCheckinForm({ ...checkinForm, [key]: e.target.value })}
                    rows={3}
                    placeholder="Write here..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition resize-none text-sm"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={checkinLoading}
                className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition"
              >
                {checkinLoading ? 'Submitting...' : 'Submit Check-In'}
              </button>
            </form>
          </div>
        )}

        {/* Projects */}
        {activeTab === 'projects' && (
          <div>
            <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-5">Your Projects</h2>
            {projects.length === 0 ? (
              <p className="text-center py-12 text-zinc-600 text-sm">No projects yet — your coach will add them.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const statusColors = {
                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    completed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
                    planning: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
                  }
                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                            <h3 className="font-semibold text-white">{p.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${statusColors[p.status] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
                              {p.status}
                            </span>
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
