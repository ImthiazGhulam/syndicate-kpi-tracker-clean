'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let redirected = false

    const redirect = (session) => {
      if (redirected) return
      redirected = true
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      router.push(session.user.email === adminEmail ? '/admin' : '/client')
    }

    const handleCallback = async () => {
      // 1. Check for PKCE code in URL (old magic links or fallback)
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) { redirect(data.session); return }
        // Code exchange failed — fall through to other methods
      }

      // 2. Implicit flow: Supabase auto-detects hash fragment (#access_token=...)
      //    The onAuthStateChange listener below will catch it

      // 3. Check if session already exists (e.g. hash was already processed)
      await new Promise(r => setTimeout(r, 800))
      if (redirected) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { redirect(session); return }

      // 4. Timeout: if nothing works after 8s, redirect to login
      await new Promise(r => setTimeout(r, 7200))
      if (redirected) return
      const { data: { session: finalSession } } = await supabase.auth.getSession()
      if (finalSession) { redirect(finalSession); return }

      setError('Sign in failed — please request a new magic link')
      setTimeout(() => router.push('/login'), 2500)
    }

    // Listen for auth state changes (catches implicit flow hash processing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        redirect(session)
      }
    })

    handleCallback()

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 text-sm font-medium mb-2">{error}</p>
          <p className="text-zinc-600 text-xs mt-2">Redirecting to login...</p>
        </div>
      ) : (
        <div className="text-amber-500 text-lg font-medium animate-pulse">Signing you in...</div>
      )}
    </div>
  )
}
