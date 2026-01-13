'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'staff' } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
    } else {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    router.push('/')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={user.role} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
