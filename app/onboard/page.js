'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function OnboardPage() {
  const [form, setForm] = useState({
    name: '', email: '', business: '', industry: '', phone: '', address: '',
    programme_start: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setSubmitting(true)
    setError('')

    // Check if email already exists
    const { data: existing } = await supabase.from('clients').select('id').eq('email', form.email.trim().toLowerCase()).maybeSingle()
    if (existing) {
      setError('This email is already registered. Contact your coach if you need help logging in.')
      setSubmitting(false)
      return
    }

    // Create client record
    const { error: insertErr } = await supabase.from('clients').insert([{
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      business: form.business.trim() || null,
      industry: form.industry.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      programme_start: form.programme_start || null,
    }])

    if (insertErr) {
      setError('Something went wrong: ' + insertErr.message)
      setSubmitting(false)
      return
    }

    // Send magic link so they can log in
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    await supabase.auth.signInWithOtp({
      email: form.email.trim().toLowerCase(),
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    })

    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <img src="/logo.png" alt="The Syndicate" className="h-16 w-auto mx-auto mb-6" />
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-7">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-900/20 border border-emerald-900/40 rounded-full mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">You're In</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Welcome to The Syndicate, <span className="text-white font-medium">{form.name.split(' ')[0]}</span>.
            </p>
            <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
              Check your email for a magic link to access The Motherboard.
            </p>
          </div>
          <p className="text-zinc-700 text-xs mt-6 tracking-widest uppercase">© 2025 The Syndicate</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="The Syndicate" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-zinc-600 text-xs tracking-widest uppercase">Client Onboarding</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-bold text-white mb-1">Welcome to The Syndicate</h2>
          <p className="text-zinc-500 text-sm mb-6">Fill in your details to get started.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Full Name *</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} required
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Email Address *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Business Name</label>
              <input value={form.business} onChange={e => update('business', e.target.value)}
                placeholder="Your business name"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Industry</label>
              <input value={form.industry} onChange={e => update('industry', e.target.value)}
                placeholder="e.g. Coaching, Construction, Finance"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                placeholder="+44 7000 000000"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Address</label>
              <input value={form.address} onChange={e => update('address', e.target.value)}
                placeholder="City or full address"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Programme Start Date</label>
              <input type="date" value={form.programme_start} onChange={e => update('programme_start', e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm" />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-xs">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition mt-2">
              {submitting ? 'Setting up...' : 'Get Started'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6 tracking-widest uppercase">© 2025 The Syndicate</p>
      </div>
    </div>
  )
}
