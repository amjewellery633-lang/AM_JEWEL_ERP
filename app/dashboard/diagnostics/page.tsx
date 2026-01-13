'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>({})
  
  useEffect(() => {
    // Get user role from sessionStorage
    const storedUser = sessionStorage.getItem('user')
    const user = storedUser ? JSON.parse(storedUser) : null
    
    // Get current path
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    
    // Check if we're logged in
    const isLoggedIn = !!user
    
    // Check user role
    const userRole = user ? user.role : 'Not logged in'
    
    // Check if we're on the dashboard
    const isOnDashboard = currentPath.includes('/dashboard')
    
    setDiagnostics({
      isLoggedIn,
      userRole,
      currentPath,
      isOnDashboard,
      timestamp: new Date().toISOString()
    })
  }, [])
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Diagnostics</h1>
        <p className="text-muted-foreground mt-2">
          Diagnostic information for troubleshooting
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Logged In:</span> {diagnostics.isLoggedIn ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">User Role:</span> {diagnostics.userRole}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Navigation Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Current Path:</span> {diagnostics.currentPath}
              </div>
              <div>
                <span className="font-medium">On Dashboard:</span> {diagnostics.isOnDashboard ? 'Yes' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">If you don't see the sidebar links:</h3>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                  <li>Make sure you're logged in as an <strong>admin</strong> user (staff users don't see all links)</li>
                  <li>Try clearing your browser cache and refreshing the page</li>
                  <li>Restart your development server: stop it with Ctrl+C and run `npm run dev` again</li>
                  <li>Check the browser console for any JavaScript errors</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">Direct access URLs:</h3>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><a href="/dashboard/layaway" className="text-blue-500 hover:underline">Layaway Page</a></li>
                  <li><a href="/dashboard/advance-booking" className="text-blue-500 hover:underline">Advance Booking Page</a></li>
                  <li><a href="/dashboard/payment-tracking" className="text-blue-500 hover:underline">Payment Tracking Page</a></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}