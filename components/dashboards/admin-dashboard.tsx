'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface AdminDashboardProps {
  username: string
}

export function AdminDashboard({ username }: AdminDashboardProps) {
  const router = useRouter()

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Administrator Dashboard</h1>
        <p className="text-muted-foreground">System overview and management controls</p>
      </div>

      {/* Key Metrics - System Wide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Total Revenue (Month)"
          value="₹12,34,560"
          change="+18%"
          changeType="positive"
        />
        <MetricCard
          label="Total Inventory Value"
          value="₹5,24,000"
          change="+5%"
          changeType="positive"
        />
        <MetricCard
          label="Pending Approvals"
          value="7"
          change="+2"
          changeType="negative"
          urgent={true}
        />
        <MetricCard
          label="Active Staff"
          value="12"
          change="+1"
          changeType="positive"
        />
      </div>

      {/* Admin-Specific Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <AdminActionCard
          title="Non-GST Authorization"
          description="Review and approve non-GST sales requests"
          icon="🚫"
          href="/dashboard/non-gst-auth"
          urgent={true}
          count={3}
        />
        <AdminActionCard
          title="User Management"
          description="Manage staff accounts and permissions"
          icon="👥"
          href="/dashboard/user-management"
        />
        <AdminActionCard
          title="Reports & Analytics"
          description="View sales reports and analytics"
          icon="📈"
          href="/dashboard/reports"
        />
        <AdminActionCard
          title="Audit Log"
          description="Review system activity and changes"
          icon="📋"
          href="/dashboard/audit-log"
        />
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-xl font-bold mb-4 text-foreground">System Health</h2>
          <div className="space-y-3">
            <HealthItem label="Database Status" status="healthy" />
            <HealthItem label="Backup Status" status="healthy" />
            <HealthItem label="System Uptime" status="healthy" value="99.9%" />
            <HealthItem label="Active Sessions" status="info" value="8" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Pending Approvals</h2>
          <div className="space-y-3">
            {[
              { type: 'Non-GST Auth', count: 3, priority: 'high' },
              { type: 'Return Requests', count: 2, priority: 'medium' },
              { type: 'Stock Updates', count: 1, priority: 'low' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground">{item.type}</p>
                  <p className={`text-xs ${item.priority === 'high' ? 'text-red-600' : item.priority === 'medium' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {item.priority} priority
                  </p>
                </div>
                <span className="font-bold text-primary text-lg">{item.count}</span>
              </div>
            ))}
          </div>
          <Button 
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white"
            onClick={() => router.push('/dashboard/non-gst-auth')}
          >
            Review All
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Recent System Activity</h2>
          <div className="space-y-3">
            {[
              { action: 'User created', user: 'Rajesh K.', time: '2 min ago' },
              { action: 'Bill finalized', user: 'Priya S.', time: '15 min ago' },
              { action: 'Stock updated', user: 'Amit P.', time: '1 hour ago' },
              { action: 'Return processed', user: 'Admin', time: '2 hours ago' },
            ].map((activity, i) => (
              <div key={i} className="flex justify-between items-start pb-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Financial Summary</h2>
          <div className="space-y-4">
            <StatItem label="Today's Sales" value="₹45,230" />
            <StatItem label="Monthly Revenue" value="₹12,34,560" />
            <StatItem label="GST Collected (Month)" value="₹2,22,221" />
            <StatItem label="Total Customers" value="156" />
            <StatItem label="Stock Items" value="1,245" />
            <StatItem label="Total Bills (Month)" value="342" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Quick Actions</h2>
          <div className="space-y-2">
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white justify-start"
              onClick={() => router.push('/dashboard/sales-billing')}
            >
              💰 Create Sales Bill
            </Button>
            <Button 
              className="w-full bg-secondary hover:bg-secondary text-foreground justify-start"
              onClick={() => router.push('/dashboard/purchase-billing')}
            >
              💎 Record Purchase
            </Button>
            <Button 
              className="w-full bg-secondary hover:bg-secondary text-foreground justify-start"
              onClick={() => router.push('/dashboard/inventory')}
            >
              📦 Manage Inventory
            </Button>
            <Button 
              className="w-full bg-secondary hover:bg-secondary text-foreground justify-start"
              onClick={() => router.push('/dashboard/customers')}
            >
              👤 View Customers
            </Button>
            <Button 
              className="w-full bg-secondary hover:bg-secondary text-foreground justify-start"
              onClick={() => router.push('/dashboard/settings')}
            >
              ⚙️ System Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  changeType,
  urgent,
}: {
  label: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  urgent?: boolean
}) {
  const changeColor =
    changeType === 'positive'
      ? 'text-green-600'
      : changeType === 'negative'
        ? 'text-red-600'
        : 'text-muted-foreground'

  return (
    <Card className={`p-6 ${urgent ? 'border-2 border-red-300 bg-red-50' : ''}`}>
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
      <p className={`text-sm font-medium ${changeColor}`}>{change} from last month</p>
    </Card>
  )
}

function AdminActionCard({
  title,
  description,
  icon,
  href,
  urgent,
  count,
}: {
  title: string
  description: string
  icon: string
  href: string
  urgent?: boolean
  count?: number
}) {
  const router = useRouter()
  return (
    <Card className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${urgent ? 'border-2 border-red-300 bg-red-50' : ''}`} onClick={() => router.push(href)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl">{icon}</p>
        </div>
        {count && count > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button className="w-full bg-primary hover:bg-primary/90 text-white">
        {urgent ? 'Review Now' : 'Open'}
      </Button>
    </Card>
  )
}

function HealthItem({ 
  label, 
  status, 
  value 
}: { 
  label: string
  status: 'healthy' | 'warning' | 'error' | 'info'
  value?: string
}) {
  const statusColor = 
    status === 'healthy' ? 'text-green-600' :
    status === 'warning' ? 'text-yellow-600' :
    status === 'error' ? 'text-red-600' :
    'text-blue-600'

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-bold text-sm ${statusColor}`}>
        {value || (status === 'healthy' ? '✓ Healthy' : status)}
      </span>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}
