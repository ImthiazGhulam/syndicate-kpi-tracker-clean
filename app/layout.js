import './globals.css'

export const metadata = {
  title: 'The Syndicate KPI Tracker',
  description: 'Business coaching KPI tracking platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
