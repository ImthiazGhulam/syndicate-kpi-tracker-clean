import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function saveProfiles(profiles) {
  let saved = 0
  for (const profile of profiles) {
    const handle = (profile.username || '').replace('@', '').toLowerCase()
    if (!handle) continue
    await supabase.from('competitors').upsert({
      instagram_handle: handle,
      name: profile.fullName || profile.username || handle,
      followers: profile.followersCount || 0,
      following: profile.followsCount || profile.followingCount || 0,
      bio: profile.biography || '',
      profile_pic_url: profile.profilePicUrl || profile.profilePicUrlHD || '',
      is_verified: profile.verified || false,
      category: profile.businessCategoryName || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'instagram_handle' })
    saved++
  }
  return saved
}

async function savePosts(posts) {
  let saved = 0
  for (const post of posts) {
    const handle = (post.ownerUsername || '').toLowerCase()
    if (!handle || !post.url) continue

    // Find or create the competitor
    let { data: comp } = await supabase.from('competitors').select('id').eq('instagram_handle', handle).maybeSingle()
    if (!comp) {
      const { data: newComp } = await supabase.from('competitors').upsert({
        instagram_handle: handle,
        name: post.ownerFullName || handle,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instagram_handle' }).select().single()
      comp = newComp
    }
    if (!comp) continue

    // Extract hashtags from caption
    const hashtags = post.caption ? (post.caption.match(/#\w+/g) || []) : []

    // Determine post type from URL or content
    let postType = 'image'
    if (post.url?.includes('/reel/')) postType = 'video'
    else if (post.type) postType = post.type

    const igId = post.id || post.url.split('/p/')[1]?.replace('/', '') || post.url

    await supabase.from('competitor_posts').upsert({
      competitor_id: comp.id,
      instagram_id: String(igId),
      post_url: post.url,
      post_type: postType,
      caption: post.caption || '',
      likes: post.likesCount || post.likes || 0,
      comments: post.commentsCount || post.comments || 0,
      shares: post.sharesCount || 0,
      saves: post.savesCount || 0,
      views: post.videoViewCount || post.videoPlayCount || post.views || 0,
      posted_at: post.timestamp || null,
      hashtags: hashtags,
      thumbnail_url: post.displayUrl || post.imageUrl || '',
    }, { onConflict: 'instagram_id' })
    saved++
  }
  return saved
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Case 1: Apify webhook notification — has resource.defaultDatasetId
    if (body.resource && body.resource.defaultDatasetId) {
      const datasetId = body.resource.defaultDatasetId
      const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`)
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch Apify dataset', status: res.status }, { status: 500 })
      }
      const items = await res.json()
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: true, message: 'No items in dataset' })
      }

      // Detect format: profile scraper has 'username', post scraper has 'ownerUsername'
      if (items[0].ownerUsername) {
        const saved = await savePosts(items)
        return NextResponse.json({ success: true, source: 'apify_posts', posts: saved })
      } else if (items[0].username) {
        const saved = await saveProfiles(items)
        return NextResponse.json({ success: true, source: 'apify_profiles', profiles: saved })
      }
      return NextResponse.json({ success: true, message: 'Unrecognised item format', keys: Object.keys(items[0]) })
    }

    // Case 2: Direct array
    if (Array.isArray(body) && body.length > 0) {
      if (body[0].ownerUsername) {
        const saved = await savePosts(body)
        return NextResponse.json({ success: true, source: 'direct_posts', posts: saved })
      } else if (body[0].username) {
        const saved = await saveProfiles(body)
        return NextResponse.json({ success: true, source: 'direct_profiles', profiles: saved })
      }
    }

    // Case 3: Single profile
    if (body.username) {
      const saved = await saveProfiles([body])
      return NextResponse.json({ success: true, source: 'single_profile', profiles: saved })
    }

    return NextResponse.json({ error: 'Unrecognised format', keys: Object.keys(body) }, { status: 400 })
  } catch (err) {
    console.error('Scraper webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Scraper webhook active. Send POST with Apify data.' })
}
