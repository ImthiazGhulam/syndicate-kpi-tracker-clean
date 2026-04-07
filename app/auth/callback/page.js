'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    // With implicit flow, Supabase auto-detects the hash fragment
    // and fires SIGNED_IN. Just listen for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        subscription.unsubscribe()
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (session.user.email === adminEmail) {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
    })

    // Fallback: check if session already exists
    const checkSession = async () => {
      // Small delay to let Supabase process the hash
      await new Promise(r => setTimeout(r, 500))
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        subscription.unsubscribe()
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (session.user.email === adminEmail) {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
    }
    checkSession()

    // Timeout: if nothing happens after 8s, redirect to login
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        router.push(session.user.email === adminEmail ? '/admin' : '/client')
      } else {
        setError('Sign in failed — please try again')
        subscription.unsubscribe()
        setTimeout(() => router.push('/login'), 2000)
      }
    }, 8000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
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
