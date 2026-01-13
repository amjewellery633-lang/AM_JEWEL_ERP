'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: 'admin' | 'staff'
  onLogout: () => void
}

const staffMenuItems = [
  { href: '/dashboard/sales-billing', label: 'Sales Bill', icon: '💰' },
  { href: '/dashboard/sales', label: 'All Sales', icon: '📋' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
  { href: '/dashboard/customers', label: 'Customers', icon: '👤' },
  // Hidden sections - kept for future implementation
  // { href: '/dashboard/purchase-billing', label: 'Purchase Bill', icon: '💎' },
  // { href: '/dashboard/returns', label: 'Returns', icon: '🔄' },
]

const adminMenuItems = [
  { href: '/dashboard/sales-billing', label: 'Sales Bill', icon: '💰' },
  { href: '/dashboard/sales', label: 'All Sales', icon: '📋' },
  { href: '/dashboard/layaway', label: 'Layaway', icon: '⏳' },
  { href: '/dashboard/advance-booking', label: 'Advance Booking', icon: '📅' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
  { href: '/dashboard/customers', label: 'Customers', icon: '👤' },
  { href: '/dashboard/gold-exchange', label: 'Gold Exchange', icon: '🪙' },
  { href: '/dashboard/user-management', label: 'Users', icon: '👥' },
  // Hidden sections - kept for future implementation
  // { href: '/dashboard/purchase-billing', label: 'Purchase Bill', icon: '💎' },
  // { href: '/dashboard/returns', label: 'Returns', icon: '🔄' },
  // { href: '/dashboard/non-gst-auth', label: 'Non-GST Auth', icon: '🚫' },
  // { href: '/dashboard/reports', label: 'Reports', icon: '📈' },
  // { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  // { href: '/dashboard/payment-tracking', label: 'Payment Tracking', icon: '📊' },
]
export function Sidebar({ role, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const menuItems = role === 'admin' ? adminMenuItems : staffMenuItems

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Image
            src="/Logo.png"
            alt="AM JEWELLERY Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h1 className="font-bold text-lg">Jewelry ERP</h1>
            <p className="text-xs text-sidebar-foreground/70">{role === 'admin' ? 'Administrator' : 'Staff'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              pathname === item.href
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 bg-sidebar-accent hover:bg-sidebar-accent text-sidebar-accent-foreground rounded-lg font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
