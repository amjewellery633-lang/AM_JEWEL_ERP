'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'staff' } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setIsLoggedIn(true)
      router.push('/dashboard/sales-billing')
      router.push('/dashboard/sales-billing')
    }
    setIsLoading(false)
  }, [router])

  const handleLogin = (username: string, role: 'admin' | 'staff') => {
    setUser({ username, role })
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    setUser(null)
    setIsLoggedIn(false)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isLoggedIn || !user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return null
}
