import { headers } from 'next/headers'
import PremiumPositionPage from './PremiumPositionClient'

export default async function Page() {
  await headers()
  const now = new Date().toISOString()
  return (
    <div>
      <div style={{background: 'red', color: 'white', padding: '12px', textAlign: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, fontSize: '14px', fontWeight: 'bold'}}>
        FRESH SERVER RENDER — {now}
      </div>
      <PremiumPositionPage />
    </div>
  )
}
