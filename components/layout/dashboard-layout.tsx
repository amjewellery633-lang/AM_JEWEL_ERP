'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { StaffDashboard } from '@/components/dashboards/staff-dashboard'
import { SalesBilling } from '@/components/billing/sales-billing'
import { PurchaseBilling } from '@/components/billing/purchase-billing'
import { Inventory } from '@/components/inventory/inventory'
import { Customers } from '@/components/customers/customers'
import { Returns } from '@/components/returns/returns'

interface DashboardLayoutProps {
  user: { username: string; role: 'admin' | 'staff' }
  onLogout: () => void
}

export function DashboardLayout({ user, onLogout }: DashboardLayoutProps) {
  const pathname = usePathname()

  const handleLogoutClick = () => {
    onLogout()
  }

  const isOnDashboard = pathname === '/dashboard' || pathname === '/'
  const isOnSalesBilling = pathname === '/sales-billing'
  const isOnPurchaseBilling = pathname === '/purchase-billing'
  const isOnInventory = pathname === '/inventory'
  const isOnCustomers = pathname === '/customers'
  const isOnReturns = pathname === '/returns'

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={user.role} onLogout={handleLogoutClick} />
      <main className="flex-1 overflow-auto">
        {isOnDashboard && user.role === 'admin' ? (
          <AdminDashboard username={user.username} />
        ) : isOnDashboard ? (
          <StaffDashboard username={user.username} />
        ) : isOnSalesBilling ? (
          <SalesBilling />
        ) : isOnPurchaseBilling ? (
          <PurchaseBilling />
        ) : isOnInventory ? (
          <Inventory />
        ) : isOnCustomers ? (
          <Customers />
        ) : isOnReturns ? (
          <Returns />
        ) : (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Page Loading...</h1>
            <p className="text-muted-foreground">Feature page coming soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}
