'use client'

import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { StaffDashboard } from '@/components/dashboards/staff-dashboard'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'staff' } | null>(null)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  if (!user) return null

  return user.role === 'admin' ? (
    <AdminDashboard username={user.username} />
  ) : (
    <StaffDashboard username={user.username} />
  )
}
