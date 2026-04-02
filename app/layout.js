import { headers } from 'next/headers'
import './globals.css'

export const metadata = {
  title: 'The Syndicate — The Motherboard',
  description: 'Business coaching KPI tracking platform',
}

export default async function RootLayout({ children }) {
  await headers()
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
