'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing you in...')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setStatus('Welcome back!')
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        router.push(session.user.email === adminEmail ? '/admin' : '/client')
      }
    })

    // Fallback: if no auth event fires within 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      setStatus('Sign in failed — redirecting to login...')
      setTimeout(() => router.push('/login'), 1500)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-amber-500 text-lg font-medium animate-pulse">{status}</div>
    </div>
  )
}
