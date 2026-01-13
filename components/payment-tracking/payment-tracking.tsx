'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { 
  getBills, 
  getAdvanceBookings, 
  getLayawayTransactions 
} from '@/lib/db/queries'
import type { Bill, AdvanceBooking, LayawayTransaction, Customer } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'

interface BillWithRelations extends Bill {
  customers?: Customer | null
  users?: {
    id: string
    username: string
    role: string
  } | null
}

// Define types for our combined data
interface PaymentTrackingItem {
  id: number
  type: 'advance_booking' | 'layaway'
  customer_name: string
  bill_number: string
  bill_id: number
  amount: number
  total_amount: number
  date: string
  delivery_date?: string
  status: string
  overdue?: boolean
  payment_method?: string
  reference_number?: string
}

export function PaymentTracking() {
  const [items, setItems] = useState<PaymentTrackingItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PaymentTrackingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'advance_booking' | 'layaway'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'completed' | 'partially_paid' | 'fully_paid'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [searchBillNo, setSearchBillNo] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load all required data in parallel
      const [billsData, bookingsData, transactionsData] = await Promise.all([
        getBills(),
        getAdvanceBookings(),
        getLayawayTransactions()
      ])
      
      const bills = billsData.filter(bill => bill.bill_status === 'final')
      
      // Combine advance bookings and layaway transactions into a unified list
      const combinedItems: PaymentTrackingItem[] = []
      
      // Add advance bookings
      bookingsData.forEach(booking => {
        const bill = bills.find(b => b.id === booking.bill_id)
        if (!bill) return
        
        const overdue = booking.booking_status !== 'delivered' && booking.booking_status !== 'cancelled' && booking.booking_status !== 'completed' && 
                       new Date(booking.delivery_date) < new Date()
        
        combinedItems.push({
          id: booking.id,
          type: 'advance_booking',
          customer_name: bill.customers?.name || 'Unknown Customer',
          bill_number: bill.bill_no,
          bill_id: booking.bill_id,
          amount: booking.advance_amount,
          total_amount: booking.total_amount,
          date: booking.booking_date,
          delivery_date: booking.delivery_date,
          status: booking.booking_status,
          overdue
        })
      })
      
      // Add layaway transactions
      transactionsData.forEach(transaction => {
        const bill = bills.find(b => b.id === transaction.bill_id)
        if (!bill) return
        
        combinedItems.push({
          id: transaction.id,
          type: 'layaway',
          customer_name: bill.customers?.name || 'Unknown Customer',
          bill_number: bill.bill_no,
          bill_id: transaction.bill_id,
          amount: transaction.amount,
          total_amount: bill.grand_total,
          date: transaction.payment_date,
          status: 'payment',
          payment_method: transaction.payment_method,
          reference_number: transaction.reference_number
        })
      })
      
      setItems(combinedItems)
      setCurrentPage(1)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payment tracking data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...items]
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter)
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    // Date filter
    if (startDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date)
        const start = new Date(startDate)
        return itemDate >= start
      })
    }
    if (endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return itemDate <= end
      })
    }
    
    // Amount filter
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) {
        filtered = filtered.filter(item => item.amount >= min)
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) {
        filtered = filtered.filter(item => item.amount <= max)
      }
    }
    
    // Bill number search
    if (searchBillNo) {
      filtered = filtered.filter(item =>
        item.bill_number?.toLowerCase().includes(searchBillNo.toLowerCase())
      )
    }
    
    // Customer search
    if (searchCustomer) {
      filtered = filtered.filter(item =>
        item.customer_name?.toLowerCase().includes(searchCustomer.toLowerCase())
      )
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    setFilteredItems(filtered)
    setCurrentPage(1)
  }, [items, typeFilter, statusFilter, startDate, endDate, minAmount, maxAmount, searchBillNo, searchCustomer])

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const clearFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
    setStartDate('')
    setEndDate('')
    setMinAmount('')
    setMaxAmount('')
    setSearchBillNo('')
    setSearchCustomer('')
  }

  // Helper function to calculate progress percentage
  const calculateProgress = (paid: number, total: number) => {
    if (!total || total <= 0) return 0
    return Math.min((paid / total) * 100, 100)
  }

  // Helper function to get status display info
  const getStatusDisplay = (type: string, status: string) => {
    if (type === 'advance_booking') {
      return {
        text: status.charAt(0).toUpperCase() + status.slice(1),
        variant: status === 'delivered' ? 'default' : 
                 status === 'confirmed' ? 'secondary' : 
                 status === 'cancelled' ? 'destructive' : 
                 status === 'completed' ? 'default' : 'outline'
      }
    } else {
      return {
        text: 'Payment',
        variant: 'secondary'
      }
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00'
    return `₹${amount.toFixed(2)}`
  }

  // Calculate summary statistics
  const advanceBookingCount = filteredItems.filter(item => item.type === 'advance_booking').length
  const layawayCount = filteredItems.filter(item => item.type === 'layaway').length
  const totalAmount = filteredItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Payment Tracking</h1>
          <p className="text-muted-foreground">
            Track all advance bookings and layaway payments in one place
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                <p className="text-xl font-bold text-foreground">{filteredItems.length}</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Advance Bookings</p>
                <p className="text-xl font-bold text-foreground">{advanceBookingCount}</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Layaway Payments</p>
                <p className="text-xl font-bold text-foreground">{layawayCount}</p>
              </div>
              <div className="text-2xl">⏳</div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-lg">🔍</span>
            <h2 className="text-base font-semibold text-foreground">Filters</h2>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Type Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Types</option>
                <option value="advance_booking">Advance Booking</option>
                <option value="layaway">Layaway</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="fully_paid">Fully Paid</option>
                <option value="payment">Payment</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Amount Range */}
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Min Amount (₹)</label>
              <Input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Max Amount (₹)</label>
              <Input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Search Bill No */}
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Bill Number</label>
              <Input
                type="text"
                placeholder="Bill number"
                value={searchBillNo}
                onChange={(e) => setSearchBillNo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Search Customer */}
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Customer</label>
              <Input
                type="text"
                placeholder="Customer name"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-9 text-sm px-4"
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">📋</span>
            <h2 className="text-lg font-semibold text-foreground">Payment Tracking Records</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 text-xs"
              size="sm"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No payment tracking records found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {items.length === 0 
                    ? 'No payment tracking records have been created yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Bill No</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Amount</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Total</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Progress</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => {
                      const progress = calculateProgress(item.amount, item.total_amount)
                      const statusDisplay = getStatusDisplay(item.type, item.status)
                      
                      return (
                        <tr 
                          key={`${item.type}-${item.id}`} 
                          className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                            item.overdue ? "bg-red-50 dark:bg-red-900/20" : ""
                          }`}
                        >
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.type === 'advance_booking' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {item.type === 'advance_booking' ? 'Advance' : 'Layaway'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium text-foreground">#{item.bill_number}</td>
                          <td className="py-4 px-4 text-foreground">{formatDate(item.date)}</td>
                          <td className="py-4 px-4 text-foreground">{item.customer_name}</td>
                          <td className="py-4 px-4 text-foreground font-semibold">{formatCurrency(item.amount)}</td>
                          <td className="py-4 px-4 text-foreground">{formatCurrency(item.total_amount)}</td>
                          <td className="py-4 px-4">
                            {item.type === 'advance_booking' ? (
                              <>
                                <div className="text-sm">{progress.toFixed(1)}%</div>
                                <div className="w-16 bg-secondary rounded-full h-1.5 mt-1">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              statusDisplay.variant === 'default' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              statusDisplay.variant === 'secondary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              statusDisplay.variant === 'destructive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {statusDisplay.text}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {item.type === 'layaway' ? (
                              <div className="text-sm">
                                {item.payment_method && (
                                  <div><span className="font-medium">Method:</span> {item.payment_method}</div>
                                )}
                                {item.reference_number && (
                                  <div><span className="font-medium">Ref:</span> {item.reference_number}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm">
                                {item.delivery_date && (
                                  <div><span className="font-medium">Delivery:</span> {formatDate(item.delivery_date)}</div>
                                )}
                                {item.overdue && (
                                  <div className="text-destructive text-xs">Overdue</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} records
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}