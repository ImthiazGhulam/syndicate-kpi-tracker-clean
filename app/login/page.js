'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [error, setError] = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('otp')
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (data.session.user.email === adminEmail) {
        router.push('/admin')
      } else {
        router.push('/client')
      }
    }
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
          {step === 'email' ? (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Sign In</h2>
              <p className="text-zinc-500 text-sm mb-6">Enter your email to receive a sign-in code.</p>

              <form onSubmit={handleSendOtp} className="space-y-5">
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
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Enter Your Code</h2>
              <p className="text-zinc-500 text-sm mb-6">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition text-sm text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 px-4 bg-gold hover:bg-gold-light disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-widest rounded transition"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>
              </form>

              <button
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="mt-5 w-full text-center text-gold hover:text-gold-light text-xs uppercase tracking-widest font-semibold transition"
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
