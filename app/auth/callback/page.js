'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      // PKCE flow: magic link sends ?code= parameter
      const code = searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Code exchange error:', error)
          setError(error.message)
          setTimeout(() => router.push('/login?error=auth_failed'), 2000)
          return
        }
        if (data.session) {
          redirect(data.session)
          return
        }
      }

      // Implicit flow fallback: token in URL hash (older Supabase config)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirect(session)
        return
      }

      // Listen for auth state change as final fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          subscription.unsubscribe()
          redirect(session)
        }
      })

      // Timeout: if nothing happens after 5s, redirect to login
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          redirect(session)
        } else {
          subscription.unsubscribe()
          router.push('/login?error=auth_failed')
        }
      }, 5000)
    }

    const redirect = (session) => {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (session.user.email === adminEmail) {
        router.push('/admin')
      } else {
        router.push('/client')
      }
    }

    handleCallback()
  }, [])

  return error ? (
    <div className="text-center">
      <p className="text-red-400 text-sm font-medium mb-2">Sign in failed</p>
      <p className="text-zinc-500 text-xs">{error}</p>
      <p className="text-zinc-600 text-xs mt-2">Redirecting to login...</p>
    </div>
  ) : (
    <div className="text-amber-500 text-lg font-medium animate-pulse">Signing you in...</div>
  )
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Suspense fallback={<div className="text-amber-500 text-lg font-medium animate-pulse">Signing you in...</div>}>
        <AuthCallbackInner />
      </Suspense>
    </div>
  )
}
