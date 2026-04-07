'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (session.user.email === adminEmail) {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (session.user.email === adminEmail) {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
    })

    // Fallback: if already signed in (e.g. session exists from another tab)
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (session.user.email === adminEmail) {
          router.push('/admin')
        } else {
          router.push('/client')
        }
      }
    }

    // Small delay to let Supabase process the URL hash/code first
    setTimeout(checkExisting, 1000)

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-amber-500 text-lg font-medium animate-pulse">Signing you in...</div>
    </div>
  )
}
