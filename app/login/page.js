'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="The Syndicate" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-zinc-600 text-xs tracking-widest uppercase">The Motherboard</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-7">
          {!sent ? (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Sign In</h2>
              <p className="text-zinc-500 text-sm mb-6">Enter your email to receive a magic link.</p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition"
                >
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Check Your Email</h2>
              <p className="text-zinc-500 text-sm mb-6">
                We sent a magic link to <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-zinc-500 text-sm mb-6">Click the link in the email to sign in.</p>

              <button
                onClick={() => { setSent(false); setError('') }}
                className="w-full text-center text-gold hover:text-gold-light text-xs uppercase tracking-widest font-semibold transition"
              >
                Use a different email
              </button>
            </>
          )}
        </div>

        <p className="text-center text-zinc-700 text-xs mt-8 tracking-widest uppercase">
          © 2025 The Syndicate
        </p>
      </div>
    </div>
  )
}
