import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const CHILD_TABLES = [
  'war_map_tasks',
  'war_map_weekly',
  'daily_pulse',
  'evening_pulse',
  'daily_kpis',
  'leads',
  'weekly_review',
  'monthly_review',
  'life_design',
  'mini_adventures',
  'identity_change',
  'offer_playbooks',
  'premium_position',
  'wealth_wired',
  'bounce_back',
  'unshakeable_playbook',
  'ai_accelerator',
  'distinction_engine',
  'content_captures',
  'misogi_milestones',
  'misogi_recurring_blocks',
  'days_off',
  'checkins',
]

export async function POST(req) {
  try {
    const { clientId, adminEmail } = await req.json()
    if (!clientId || !adminEmail) {
      return NextResponse.json({ error: 'Missing clientId or adminEmail' }, { status: 400 })
    }

    if (adminEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabase()

    // Delete task completions/exclusions tied to war_map_tasks
    const { data: warTasks } = await supabase.from('war_map_tasks').select('id').eq('client_id', clientId)
    if (warTasks?.length > 0) {
      const taskIds = warTasks.map(t => t.id)
      await supabase.from('war_map_task_completions').delete().in('task_id', taskIds)
      await supabase.from('war_map_task_exclusions').delete().in('task_id', taskIds)
    }

    // Delete project_tasks via projects
    const { data: projects } = await supabase.from('projects').select('id').eq('client_id', clientId)
    if (projects?.length > 0) {
      const projectIds = projects.map(p => p.id)
      await supabase.from('project_tasks').delete().in('project_id', projectIds)
    }
    await supabase.from('projects').delete().eq('client_id', clientId)

    // Delete all child tables
    for (const table of CHILD_TABLES) {
      await supabase.from(table).delete().eq('client_id', clientId)
    }

    // Get client email before deleting
    const { data: clientRecord } = await supabase.from('clients').select('email').eq('id', clientId).single()

    // Delete the client record
    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Delete the auth user so they can no longer log in
    if (clientRecord?.email) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const authUser = users?.find(u => u.email === clientRecord.email)
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
