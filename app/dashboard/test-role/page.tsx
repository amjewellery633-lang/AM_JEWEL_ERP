'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestRolePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Role Test</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p className={user.role === 'admin' ? 'text-green-600' : 'text-red-600'}>
                {user.role === 'admin' 
                  ? 'You are an admin user - you should see the Payment Tracking link in the sidebar' 
                  : 'You are a staff user - the Payment Tracking link is only visible to admin users'}
              </p>
            </div>
          ) : (
            <p>No user data found. Please log in again.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}