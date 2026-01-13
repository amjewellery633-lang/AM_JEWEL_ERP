'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from '@/lib/db/queries'
import { getBills } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'

interface Transaction {
  id: number
  type: 'sales' | 'purchase' | 'return'
  billNumber: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'cancelled'
  billId?: number
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        const data = await getCustomers()
        setCustomers(data)
      } catch (error) {
        console.error('Error fetching customers:', error)
        toast({
          title: 'Error',
          description: 'Failed to load customers. Please check console.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch transactions when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerTransactions(selectedCustomer.id)
    } else {
      setTransactions([])
    }
  }, [selectedCustomer])

  const fetchCustomerTransactions = async (customerId: number) => {
    try {
      setLoadingTransactions(true)
      const supabase = createClient()
      
      // Fetch all bills for this customer
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        toast({
          title: 'Error',
          description: 'Failed to load transaction history',
          variant: 'destructive',
        })
        return
      }

      // Transform bills to transactions
      const customerTransactions: Transaction[] = (bills || []).map(bill => ({
        id: bill.id,
        type: 'sales' as const,
        billNumber: bill.bill_no || `#${bill.id}`,
        amount: bill.grand_total || bill.subtotal || 0,
        date: bill.bill_date || bill.created_at,
        status: bill.bill_status === 'final' ? 'completed' as const : 
                bill.bill_status === 'cancelled' ? 'cancelled' as const : 
                'pending' as const,
        billId: bill.id,
      }))

      setTransactions(customerTransactions)
    } catch (error) {
      console.error('Error fetching customer transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
        variant: 'destructive',
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast({
        title: 'Required Fields',
        description: 'Name and phone are required',
        variant: 'destructive',
      })
      return
    }

    try {
      const created = await createCustomer({
        name: newCustomer.name || '',
        phone: newCustomer.phone || '',
        email: newCustomer.email || '',
        address: newCustomer.address || '',
        notes: newCustomer.notes || '',
      })
      setCustomers([created, ...customers])
      setNewCustomer({ name: '', phone: '', email: '', address: '', notes: '' })
      setShowAddForm(false)
      toast({
        title: 'Success',
        description: 'Customer created successfully',
      })
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to create customer. Please check console.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    
    try {
      await deleteCustomer(id)
      setCustomers(customers.filter(c => c.id !== id))
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null)
      }
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete customer. Please check console.',
        variant: 'destructive',
      })
    }
  }

  const filteredCustomers = customers.filter(
    c => {
      const searchLower = searchTerm.toLowerCase()
      const nameMatch = c.name?.toLowerCase().includes(searchLower) ?? false
      const phoneMatch = c.phone?.includes(searchTerm) ?? false
      const emailMatch = c.email?.toLowerCase().includes(searchLower) ?? false
      return nameMatch || phoneMatch || emailMatch
    }
  )

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sales':
        return 'text-green-600'
      case 'purchase':
        return 'text-blue-600'
      case 'return':
        return 'text-orange-600'
      default:
        return 'text-foreground'
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Customer Management</h1>
          <p className="text-muted-foreground">View and manage customer profiles and transactions</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {showAddForm ? 'Cancel' : 'Add Customer'}
        </Button>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Add New Customer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Full Name"
              value={newCustomer.name || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            />
            <Input
              placeholder="Phone Number"
              type="tel"
              value={newCustomer.phone || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
            <Input
              placeholder="Email Address"
              type="email"
              value={newCustomer.email || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={newCustomer.address || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            />
            <Input
              placeholder="Notes"
              value={newCustomer.notes || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
              className="md:col-span-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddCustomer}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Save Customer
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-primary text-white'
                      : 'bg-secondary hover:bg-muted text-foreground'
                  }`}
                >
                  <p className="font-medium">{customer.name || 'Unnamed'}</p>
                  <p className="text-xs opacity-75">{customer.customer_code}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              {/* Customer Info */}
              <Card className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">{selectedCustomer.name || 'Unnamed'}</h2>
                    <p className="text-muted-foreground">{selectedCustomer.customer_code}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="text-destructive"
                  >
                    Delete
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium text-foreground">{selectedCustomer.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium text-foreground">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p className="font-medium text-foreground">{selectedCustomer.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="font-medium text-foreground">{selectedCustomer.notes || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {/* Transaction History */}
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 text-foreground">Transaction History</h3>
                {loadingTransactions ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transactions found for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(transaction => {
                      const transactionDate = new Date(transaction.date)
                      const formattedDate = transactionDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                      
                      return (
                        <div 
                          key={transaction.id} 
                          className="flex justify-between items-center pb-3 border-b border-border last:border-0 hover:bg-muted/50 p-2 rounded transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold capitalize ${getTransactionColor(transaction.type)}`}>
                                {transaction.type === 'sales' ? '💰' : transaction.type === 'purchase' ? '💎' : '🔄'}
                              </span>
                              <span className="font-medium text-foreground">{transaction.billNumber}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {transaction.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
                          </div>
                          <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                            ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground text-lg">Select a customer to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
