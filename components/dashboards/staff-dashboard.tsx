'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface StaffDashboardProps {
  username: string
}

export function StaffDashboard({ username }: StaffDashboardProps) {
  const router = useRouter()

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Staff Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {username} • Focus on your daily tasks</p>
      </div>

      {/* Personal Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          label="Your GST Sales Today"
          value="₹45,230"
          subtitle="5 GST bills created"
          trend="+12%"
        />
        <MetricCard
          label="This Week's GST Sales"
          value="₹1,24,500"
          subtitle="23 GST bills created"
          trend="+8%"
        />
        <MetricCard
          label="Pending Tasks"
          value="3"
          subtitle="Requires attention"
          urgent={true}
        />
      </div>

      {/* Primary Actions - Staff Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ActionCard
          title="Create GST Sales Bill"
          description="White bill for GST customer sales"
          icon="💰"
          color="bg-blue-50"
          buttonText="New GST Bill"
          href="/dashboard/sales-billing"
          onClick={() => router.push('/dashboard/sales-billing')}
        />
        <ActionCard
          title="Record Old Gold Purchase"
          description="Pink slip for old gold"
          icon="💎"
          color="bg-pink-50"
          buttonText="New Purchase"
          href="/dashboard/purchase-billing"
          onClick={() => router.push('/dashboard/purchase-billing')}
        />
        <ActionCard
          title="View Inventory"
          description="Check stock availability"
          icon="📦"
          color="bg-amber-50"
          buttonText="View Inventory"
          href="/dashboard/inventory"
          onClick={() => router.push('/dashboard/inventory')}
        />
        <ActionCard
          title="Customer Returns"
          description="Process returns and refunds"
          icon="🔄"
          color="bg-purple-50"
          buttonText="Process Return"
          href="/dashboard/returns"
          onClick={() => router.push('/dashboard/returns')}
        />
      </div>

      {/* Today's Activity & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Your Recent Bills</h2>
          <div className="space-y-3">
            {[
              { id: 'AM-20250115-0001', customer: 'Rajesh Kumar', amount: '₹18,500', time: '2:30 PM', status: 'final' },
              { id: 'AM-20250115-0002', customer: 'Priya Sharma', amount: '₹24,200', time: '1:15 PM', status: 'final' },
              { id: 'AM-20250115-0003', customer: 'Amit Patel', amount: '₹9,800', time: '12:45 PM', status: 'draft' },
            ].map((bill) => (
              <div key={bill.id} className="flex justify-between items-center pb-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground">{bill.id}</p>
                  <p className="text-sm text-muted-foreground">{bill.customer} • {bill.time}</p>
                  <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                    bill.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {bill.status}
                  </span>
                </div>
                <p className="font-bold text-primary">{bill.amount}</p>
              </div>
            ))}
          </div>
          <Button 
            className="w-full mt-4 bg-secondary hover:bg-secondary text-foreground"
            onClick={() => router.push('/dashboard/sales-billing')}
          >
            View All Bills
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Today's Summary</h2>
          <div className="space-y-4 mb-4">
            <InfoItem label="GST Bills Created Today" value="5" />
            <InfoItem label="Total GST Sales Today" value="₹52,500" />
            <InfoItem label="Average GST Bill Value" value="₹10,500" />
            <InfoItem label="Customers Served" value="5" />
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="font-semibold text-foreground mb-2">Quick Access</h3>
            <div className="space-y-2">
              <Button 
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/customers')}
              >
                👤 Search Customers
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/inventory')}
              >
                📦 Check Stock
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips & Reminders */}
      <Card className="p-6 mt-6 bg-blue-50 border-2 border-blue-200">
        <h2 className="text-lg font-bold mb-3 text-foreground">💡 Quick Tips</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Always verify customer details before finalizing bills</li>
            <li>• Check stock availability before adding items to bills</li>
            <li>• Save drafts frequently to avoid data loss</li>
            <li>• You can only create GST bills - contact admin for non-GST sales</li>
          </ul>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtitle,
  trend,
  urgent,
}: {
  label: string
  value: string
  subtitle: string
  trend?: string
  urgent?: boolean
}) {
  return (
    <Card className={`p-6 ${urgent ? 'border-2 border-orange-300 bg-orange-50' : ''}`}>
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {trend && (
          <p className="text-xs font-medium text-green-600">{trend}</p>
        )}
      </div>
    </Card>
  )
}

function ActionCard({
  title,
  description,
  icon,
  color,
  buttonText,
  href,
  onClick,
}: {
  title: string
  description: string
  icon: string
  color: string
  buttonText: string
  href: string
  onClick?: () => void
}) {
  return (
    <Card className={`p-6 ${color} border-2 border-primary/10 hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-white"
        onClick={onClick}
      >
        {buttonText}
      </Button>
    </Card>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}
