'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { 
  getBills, 
  getLayawayTransactions, 
  createLayawayTransaction,
  updateLayawayTransaction,
  deleteLayawayTransaction
} from '@/lib/db/queries'
import type { Bill, LayawayTransaction, Customer } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface BillWithRelations extends Bill {
  customers?: Customer | null
  users?: {
    id: string
    username: string
    role: string
  } | null
}

interface LayawayTransactionWithBill extends LayawayTransaction {
  bill?: BillWithRelations | null
}

export function LayawayTransactions() {
  const [transactions, setTransactions] = useState<LayawayTransactionWithBill[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<LayawayTransactionWithBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Detail view
  const [selectedTransaction, setSelectedTransaction] = useState<LayawayTransactionWithBill | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Delete confirmation
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [searchBillNo, setSearchBillNo] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | string>('all')
  const [billIdFilter, setBillIdFilter] = useState<number | null>(null)
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<LayawayTransaction | null>(null)
  const [searchedBill, setSearchedBill] = useState<BillWithRelations | null>(null)
  const [formData, setFormData] = useState({
    bill_id: 0,
    payment_date: '',
    amount: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  })
  const [bills, setBills] = useState<BillWithRelations[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTransactions()
    fetchBills()
  }, [])

  const handleBillSearch = async () => {
    if (!searchBillNo.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a bill number',
        variant: 'destructive',
      })
      return
    }
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bills')
        .select('*, customers(*)')
        .ilike('bill_no', `%${searchBillNo.trim()}%`)
        .single()
      
      // If the search didn't find a bill with the provided input, try with the prefix
      if (error && searchBillNo.trim() && !searchBillNo.startsWith('AM-'))
        const { data: prefixedData, error: prefixedError } = await supabase
          .from('bills')
          .select('*, customers(*)')
          .ilike('bill_no', `%AM-${searchBillNo.trim()}%`)
          .single()
          
        if (!prefixedError) {
          const bill = prefixedData as BillWithRelations
          setSearchedBill(bill)
          
          // Pre-populate form if creating new transaction
          if (!editingTransaction) {
            setFormData(prev => ({
              ...prev,
              bill_id: bill.id
            }))
          }
          
          toast({
            title: 'Success',
            description: `Bill ${bill.bill_no} found`,
          })
          return
        }
      }
      
      if (error) throw error
      
      const bill = data as BillWithRelations
      setSearchedBill(bill)
      
      // Pre-populate form if creating new transaction
      if (!editingTransaction) {
        setFormData(prev => ({
          ...prev,
          bill_id: bill.id
        }))
      }
      
      toast({
        title: 'Success',
        description: `Bill ${bill.bill_no} found`,
      })
    } catch (error: any) {
      console.error('Error searching bill:', error)
      toast({
        title: 'Error',
        description: 'Bill not found',
        variant: 'destructive',
      })
      setSearchedBill(null)
    }
  }

  const fetchBills = async () => {
    try {
      const billsData = await getBills()
      setBills(billsData.filter(bill => bill.bill_status === 'final'))
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive',
      })
    }
  }

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      // Fetch transactions and bills in parallel
      const [transactionsData, billsData] = await Promise.all([
        getLayawayTransactions(),
        getBills()
      ])
      
      // Merge transaction data with bill data
      const transactionsWithBills: LayawayTransactionWithBill[] = transactionsData.map(transaction => {
        const bill = billsData.find(b => b.id === transaction.bill_id)
        return {
          ...transaction,
          bill: bill || undefined
        }
      })
      
      setTransactions(transactionsWithBills)
      setCurrentPage(1)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch layaway transactions',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...transactions]

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.payment_method === paymentMethodFilter)
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(transaction => {
        const paymentDate = new Date(transaction.payment_date)
        const start = new Date(startDate)
        return paymentDate >= start
      })
    }
    if (endDate) {
      filtered = filtered.filter(transaction => {
        const paymentDate = new Date(transaction.payment_date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return paymentDate <= end
      })
    }

    // Amount filter
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) {
        filtered = filtered.filter(transaction => transaction.amount >= min)
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) {
        filtered = filtered.filter(transaction => transaction.amount <= max)
      }
    }

    // Bill number search
    if (searchBillNo) {
      filtered = filtered.filter(transaction =>
        transaction.bill?.bill_no?.toLowerCase().includes(searchBillNo.toLowerCase())
      )
    }

    // Customer search
    if (searchCustomer) {
      filtered = filtered.filter(transaction =>
        transaction.bill?.customers?.name?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        transaction.bill?.customers?.phone?.includes(searchCustomer)
      )
    }
    
    // Bill ID filter
    if (billIdFilter) {
      filtered = filtered.filter(transaction => transaction.bill_id === billIdFilter)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [transactions, startDate, endDate, minAmount, maxAmount, searchBillNo, searchCustomer, paymentMethodFilter, billIdFilter])

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setMinAmount('')
    setMaxAmount('')
    setSearchBillNo('')
    setSearchCustomer('')
    setPaymentMethodFilter('all')
    setBillIdFilter(null)
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

  const handleViewDetails = (transaction: LayawayTransactionWithBill) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  const handleViewBillTransactions = async (billId: number) => {
    try {
      // Set the bill ID filter to show only transactions for this bill
      setBillIdFilter(billId)
      
      // Find the specific bill to display its info
      const bill = bills.find(b => b.id === billId)
      if (bill) {
        setSearchedBill(bill)
      }
    } catch (error) {
      console.error('Error filtering transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to filter transactions',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (transaction: LayawayTransactionWithBill) => {
    setEditingTransaction(transaction)
    setFormData({
      bill_id: transaction.bill_id,
      payment_date: transaction.payment_date,
      amount: transaction.amount.toString(),
      payment_method: transaction.payment_method || '',
      reference_number: transaction.reference_number || '',
      notes: transaction.notes || ''
    })
    
    // Find the corresponding bill to show in the UI
    const bill = bills.find(b => b.id === transaction.bill_id)
    if (bill) {
      setSearchedBill(bill)
      setSearchBillNo(bill.bill_no.replace(/^AM-/, '')) // Remove prefix for display
    }
    
    // Clear the bill filter when editing
    setBillIdFilter(null)
    
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return
    
    try {
      await deleteLayawayTransaction(transactionToDelete)
      toast({
        title: 'Success',
        description: 'Layaway transaction deleted successfully',
      })
      await fetchTransactions()
      setShowDeleteDialog(false)
      setTransactionToDelete(null)
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete layaway transaction',
        variant: 'destructive',
      })
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    // For new transactions, ensure a bill has been searched and selected
    if (!editingTransaction && !searchedBill) {
      errors.bill_id = 'Please search and select a bill'
    }
    
    if (!formData.payment_date) {
      errors.payment_date = 'Payment date is required'
    }
    
    if (!formData.amount) {
      errors.amount = 'Amount is required'
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be a positive number'
    }
    
    if (!formData.payment_method) {
      errors.payment_method = 'Payment method is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        bill_id: searchedBill?.id || formData.bill_id
      }
      
      if (editingTransaction) {
        await updateLayawayTransaction(editingTransaction.id, transactionData)
        toast({
          title: 'Success',
          description: 'Layaway transaction updated successfully',
        })
      } else {
        await createLayawayTransaction(transactionData)
        toast({
          title: 'Success',
          description: 'Layaway transaction created successfully',
        })
      }
      
      await fetchTransactions()
      setShowForm(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving transaction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save layaway transaction',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      bill_id: 0,
      payment_date: '',
      amount: '',
      payment_method: '',
      reference_number: '',
      notes: ''
    })
    setEditingTransaction(null)
    setSearchedBill(null)
    setSearchBillNo('')
    setFormErrors({})
  }

  const handleAddTransaction = () => {
    resetForm()
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Layaway Transactions</h1>
          <p className="text-muted-foreground">
            Manage layaway transactions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
                <p className="text-xl font-bold text-foreground">{filteredTransactions.length}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Unique Bills</p>
                <p className="text-xl font-bold text-foreground">
                  {[...new Set(filteredTransactions.map(t => t.bill_id))].length}
                </p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg. Amount</p>
                <p className="text-xl font-bold text-foreground">
                  {filteredTransactions.length > 0 
                    ? formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length)
                    : '₹0.00'}
                </p>
              </div>
              <div className="text-2xl">📈</div>
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
            {/* Date Range */}
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[130px]">
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
                placeholder="Name or phone"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Payment Method */}
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full h-9 px-3 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
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
            <h2 className="text-lg font-semibold text-foreground">Layaway Transactions</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchTransactions}
              disabled={isLoading}
              className="h-8 text-xs"
              size="sm"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </Button>
            <Button
              variant="default"
              onClick={handleAddTransaction}
              className="h-8 text-xs"
              size="sm"
            >
              ➕ Add Transaction
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No layaway transactions found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {transactions.length === 0 
                    ? 'No layaway transactions exist yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Bill No</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Amount</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Method</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-foreground">
                          <button 
                            onClick={() => handleViewBillTransactions(transaction.bill_id)}
                            className="text-blue-600 hover:underline"
                          >
                            {transaction.bill?.bill_no || 'N/A'}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-foreground">
                          <div className="font-medium">{transaction.bill?.customers?.name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{transaction.bill?.customers?.phone || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-4 text-foreground">{formatDate(transaction.payment_date)}</td>
                        <td className="py-4 px-4 text-foreground font-semibold">{formatCurrency(transaction.amount)}</td>
                        <td className="py-4 px-4 text-foreground capitalize">{transaction.payment_method || 'N/A'}</td>
                        <td className="py-4 px-4 text-foreground">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                              className="h-8 text-xs"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                              className="h-8 text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTransactionToDelete(transaction.id)
                                setShowDeleteDialog(true)
                              }}
                              className="h-8 text-xs text-destructive border-destructive"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
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

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Number</p>
                  <p className="font-medium">{selectedTransaction.bill?.bill_no || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedTransaction.payment_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium capitalize">{selectedTransaction.payment_method || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{selectedTransaction.reference_number || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedTransaction.notes || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Transaction Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Bill Number</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter bill number"
                  value={searchBillNo}
                  onChange={(e) => setSearchBillNo(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBillSearch}
                  className="h-9 text-xs"
                >
                  Search
                </Button>
              </div>
              {formErrors.bill_id && (
                <p className="text-xs text-destructive mt-1">{formErrors.bill_id}</p>
              )}
              {searchedBill && (
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                  <p className="font-medium">{searchedBill.bill_no}</p>
                  <p>{searchedBill.customers?.name} ({searchedBill.customers?.phone})</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Payment Date</label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({...prev, payment_date: e.target.value}))}
                className="h-9 text-sm"
              />
              {formErrors.payment_date && (
                <p className="text-xs text-destructive mt-1">{formErrors.payment_date}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({...prev, amount: e.target.value}))}
                className="h-9 text-sm"
              />
              {formErrors.amount && (
                <p className="text-xs text-destructive mt-1">{formErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({...prev, payment_method: e.target.value}))}
                className="w-full h-9 px-3 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Method</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
              {formErrors.payment_method && (
                <p className="text-xs text-destructive mt-1">{formErrors.payment_method}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Reference Number</label>
              <Input
                type="text"
                placeholder="Reference number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({...prev, reference_number: e.target.value}))}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Notes</label>
              <textarea
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="w-full h-20 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
                className="h-8 text-xs flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 text-xs flex-1"
              >
                {editingTransaction ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this layaway transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false)
              setTransactionToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}