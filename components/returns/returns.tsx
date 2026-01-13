'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReturns, createReturn } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'

interface ReturnRequest {
  id: string
  bill_id: string
  item_barcode: string
  item_name: string
  original_amount: number
  deduction_percent: number
  refund_amount: number
  status?: 'pending' | 'approved' | 'completed' // Optional - not in DB but used in UI
  processed_by?: string // Staff ID who processed
  created_at: string
}

export function Returns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewReturnForm, setShowNewReturnForm] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'completed'>('all')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [processedBy, setProcessedBy] = useState('') // Staff ID who processed the return
  const [newReturn, setNewReturn] = useState({
    bill_id: '',
    item_barcode: '',
    item_name: '',
    original_amount: 0,
    deduction_percent: 5,
  })

  // Fetch returns from Supabase
  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true)
        const data = await getReturns()
        // Map Supabase data to ReturnRequest format
        const mappedReturns = (data || []).map((ret: any) => ({
          id: ret.id?.toString() || '',
          bill_id: ret.bill_id?.toString() || '',
          item_barcode: ret.item_barcode || '',
          item_name: ret.item_name || '',
          original_amount: ret.original_amount || 0,
          deduction_percent: ret.deduction_percent || 0,
          refund_amount: ret.refund_amount || 0,
          status: 'pending' as const, // Default status
          processed_by: ret.processed_by || '',
          created_at: ret.created_at || new Date().toISOString(),
        }))
        setReturns(mappedReturns)
      } catch (error) {
        console.error('Error fetching returns:', error)
        toast({
          title: 'Error',
          description: 'Failed to load returns. Please check console.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchReturns()
  }, [])

  // Get staff ID from session
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setProcessedBy(userData.id || 'staff-001')
    }
  }, [])

  const handleCreateReturn = async () => {
    if (!newReturn.bill_id || !newReturn.item_name || !newReturn.original_amount) {
      toast({
        title: 'Required Fields',
        description: 'Bill ID, item name, and original amount are required',
        variant: 'destructive',
      })
      return
    }

    try {
      const refundAmount = newReturn.original_amount * (1 - newReturn.deduction_percent / 100)
      const returnData = {
        bill_id: parseInt(newReturn.bill_id) || 0,
        item_barcode: newReturn.item_barcode || '',
        item_name: newReturn.item_name,
        original_amount: newReturn.original_amount,
        deduction_percent: newReturn.deduction_percent,
        refund_amount: refundAmount,
        processed_by: processedBy || null,
      }
      
      const created = await createReturn(returnData)
      setReturns([
        {
          id: created.id?.toString() || Date.now().toString(),
          bill_id: newReturn.bill_id,
          item_barcode: newReturn.item_barcode,
          item_name: newReturn.item_name,
          original_amount: newReturn.original_amount,
          deduction_percent: newReturn.deduction_percent,
          refund_amount: refundAmount,
          status: 'pending',
          created_at: created.created_at || new Date().toISOString(),
        },
        ...returns,
      ])
      setNewReturn({ bill_id: '', item_barcode: '', item_name: '', original_amount: 0, deduction_percent: 5 })
      setShowNewReturnForm(false)
      toast({
        title: 'Success',
        description: 'Return created successfully',
      })
    } catch (error) {
      console.error('Error creating return:', error)
      toast({
        title: 'Error',
        description: 'Failed to create return. Please check console.',
        variant: 'destructive',
      })
    }
  }

  const handleApproveReturn = () => {
    if (selectedReturn) {
      setReturns(
        returns.map(r =>
          r.id === selectedReturn.id
            ? { ...r, status: 'approved' as const }
            : r
        )
      )
      setSelectedReturn(null)
    }
  }

  const handleCompleteReturn = () => {
    if (selectedReturn) {
      setReturns(
        returns.map(r =>
          r.id === selectedReturn.id
            ? { ...r, status: 'completed' as const, processed_by: processedBy }
            : r
        )
      )
      setSelectedReturn(null)
    }
  }

  const handleDeleteReturn = (id: string) => {
    setReturns(returns.filter(r => r.id !== id))
    if (selectedReturn?.id === id) {
      setSelectedReturn(null)
    }
  }

  const filteredReturns = returns.filter(r => filterStatus === 'all' || r.status === filterStatus)

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'approved':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading returns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Returns & Approvals</h1>
          <p className="text-muted-foreground">Manage customer returns with auto deduction</p>
        </div>
        <Button
          onClick={() => setShowNewReturnForm(!showNewReturnForm)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {showNewReturnForm ? 'Cancel' : 'New Return'}
        </Button>
      </div>

      {/* Create Return Form */}
      {showNewReturnForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Create Return Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Bill ID"
              value={newReturn.bill_id}
              onChange={(e) => setNewReturn({ ...newReturn, bill_id: e.target.value })}
            />
            <Input
              placeholder="Item Barcode"
              value={newReturn.item_barcode}
              onChange={(e) => setNewReturn({ ...newReturn, item_barcode: e.target.value })}
            />
            <Input
              placeholder="Item Name"
              value={newReturn.item_name}
              onChange={(e) => setNewReturn({ ...newReturn, item_name: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Original Amount"
              step="0.01"
              value={newReturn.original_amount}
              onChange={(e) => setNewReturn({ ...newReturn, original_amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              type="number"
              placeholder="Deduction Percent (%)"
              step="0.1"
              value={newReturn.deduction_percent}
              onChange={(e) => setNewReturn({ ...newReturn, deduction_percent: parseFloat(e.target.value) || 5 })}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateReturn}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Create Return
            </Button>
            <Button variant="outline" onClick={() => setShowNewReturnForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">Filter by Status</label>
              <Input
                placeholder="Filter (all, pending, approved, completed)"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredReturns.map(ret => (
                <div
                  key={ret.id}
                  onClick={() => setSelectedReturn(ret)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedReturn?.id === ret.id
                      ? 'bg-primary text-white'
                      : 'bg-secondary hover:bg-muted text-foreground'
                  }`}
                >
                  <p className="font-medium">{ret.bill_id}</p>
                  <p className="text-xs opacity-75">{ret.item_name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs">₹{ret.refund_amount.toFixed(0)}</span>
                    <span className="text-sm">{ret.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Return Details */}
        <div className="lg:col-span-2">
          {selectedReturn ? (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">{selectedReturn.bill_id}</h2>
                    <p className="text-muted-foreground">{selectedReturn.created_at}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReturn.status)}`}>
                    {selectedReturn.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Item</p>
                    <p className="font-medium text-foreground">{selectedReturn.item_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Barcode</p>
                    <p className="font-medium text-foreground">{selectedReturn.item_barcode}</p>
                  </div>
                </div>

                {/* Calculation */}
                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Amount:</span>
                    <span className="font-medium text-foreground">₹{selectedReturn.original_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Deduction ({selectedReturn.deduction_percent}%):</span>
                    <span className="font-medium">- ₹{(selectedReturn.original_amount * (selectedReturn.deduction_percent / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="font-bold text-foreground">Refund Amount:</span>
                    <span className="font-bold text-primary text-lg">₹{selectedReturn.refund_amount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              {/* Approval Notes */}
              {selectedReturn.status === 'pending' && (
                <Card className="p-6 bg-yellow-50 border-2 border-yellow-200">
                  <h3 className="font-bold text-foreground mb-4">Approval Required</h3>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-foreground mb-2 block">Approval Notes</label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add approval notes..."
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleApproveReturn}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve Return
                  </Button>
                </Card>
              )}

              {selectedReturn.status === 'approved' && (
                <Card className="p-6 bg-blue-50 border-2 border-blue-200">
                  <h3 className="font-bold text-foreground mb-4">Process Refund</h3>
                  <Button
                    onClick={handleCompleteReturn}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Mark as Completed
                  </Button>
                </Card>
              )}

              {selectedReturn.status === 'completed' && (
                <Card className="p-6 bg-green-50 border-2 border-green-200">
                  <p className="text-green-700 font-medium">Return completed successfully</p>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground text-lg">Select a return to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
