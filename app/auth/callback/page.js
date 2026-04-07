'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing you in...')

  useEffect(() => {
    const handleCallback = async () => {
      // Implicit flow: Supabase picks up the session from the URL hash automatically
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth error:', error.message)
        setStatus('Sign in failed — redirecting to login...')
        setTimeout(() => router.push('/login'), 2500)
        return
      }

      if (session) {
        setStatus('Welcome back!')
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        router.push(session.user.email === adminEmail ? '/admin' : '/client')
        return
      }

      // No session yet — wait a moment and retry (hash may still be processing)
      await new Promise(r => setTimeout(r, 1500))
      const { data: { session: retrySession } } = await supabase.auth.getSession()

      if (retrySession) {
        setStatus('Welcome back!')
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        router.push(retrySession.user.email === adminEmail ? '/admin' : '/client')
        return
      }

      setStatus('Sign in failed — please request a new magic link')
      setTimeout(() => router.push('/login'), 2500)
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-amber-500 text-lg font-medium animate-pulse">{status}</div>
    </div>
  )
}
