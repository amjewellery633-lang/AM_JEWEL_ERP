'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// Define types for bills with layaway transactions
interface LayawayBillSummary {
  bill_id: number
  bill_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  total_paid: number
  remaining_amount: number
  transaction_count: number
  last_payment_date: string
  bill_date: string
  bill: Bill
  transactions: LayawayTransaction[]
}

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

export function LayawayCombined() {
  const [activeTab, setActiveTab] = useState('bills')
  
  // Bills view state
  const [bills, setBills] = useState<LayawayBillSummary[]>([])
  const [filteredBills, setFilteredBills] = useState<LayawayBillSummary[]>([])
  const [selectedBill, setSelectedBill] = useState<LayawayBillSummary | null>(null)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  
  // Transactions view state
  const [transactions, setTransactions] = useState<LayawayTransactionWithBill[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<LayawayTransactionWithBill[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<LayawayTransactionWithBill | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Common state
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination for bills
  const [billsCurrentPage, setBillsCurrentPage] = useState(1)
  const billsPerPage = 20
  
  // Pagination for transactions
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1)
  const transactionsPerPage = 20
  
  // Bills filter states
  const [searchBillNo, setSearchBillNo] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  // Transactions filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [searchBillNoTrans, setSearchBillNoTrans] = useState('')
  const [searchCustomerTrans, setSearchCustomerTrans] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | string>('all')
  
  // Transaction form states
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
  const [billsData, setBillsData] = useState<BillWithRelations[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load data for both views
      await Promise.all([
        loadBillsData(),
        loadTransactionsData()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load layaway data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadBillsData = async () => {
    try {
      // Fetch bills and layaway transactions in parallel
      const [billsData, transactionsData] = await Promise.all([
        getBills(),
        getLayawayTransactions()
      ])

      // Group transactions by bill_id
      const transactionsByBill = transactionsData.reduce((acc, transaction) => {
        if (!acc[transaction.bill_id]) {
          acc[transaction.bill_id] = []
        }
        acc[transaction.bill_id].push(transaction)
        return acc
      }, {} as Record<number, LayawayTransaction[]>)

      // Filter bills that have layaway transactions
      const billsWithLayaway = billsData
        .filter(bill => transactionsByBill[bill.id] && transactionsByBill[bill.id].length > 0)
        .map(bill => {
          const billTransactions = transactionsByBill[bill.id]
          const totalPaid = billTransactions.reduce((sum, trans) => sum + trans.amount, 0)
          const totalAmount = bill.grand_total || 0
          const remainingAmount = totalAmount - totalPaid

          return {
            bill_id: bill.id,
            bill_number: bill.bill_no,
            customer_name: bill.customers?.name || 'N/A',
            customer_phone: bill.customers?.phone || 'N/A',
            total_amount: totalAmount,
            total_paid: totalPaid,
            remaining_amount: remainingAmount,
            transaction_count: billTransactions.length,
            last_payment_date: billTransactions.length > 0 
              ? billTransactions.reduce((latest, trans) => 
                  new Date(trans.payment_date) > new Date(latest.payment_date) ? trans : latest
                ).payment_date 
              : '',
            bill_date: bill.bill_date,
            bill,
            transactions: billTransactions
          }
        })

      setBills(billsWithLayaway)
      setBillsCurrentPage(1)
    } catch (error) {
      console.error('Error loading layaway bills:', error)
      throw error
    }
  }

  const loadTransactionsData = async () => {
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
      setTransactionsCurrentPage(1)
    } catch (error) {
      console.error('Error loading layaway transactions:', error)
      throw error
    }
  }

  // Bills filter function
  const applyBillsFilters = useCallback(() => {
    let filtered = [...bills]

    // Bill number search
    if (searchBillNo) {
      filtered = filtered.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchBillNo.toLowerCase())
      )
    }

    // Customer search
    if (searchCustomer) {
      filtered = filtered.filter(bill =>
        bill.customer_name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        bill.customer_phone.includes(searchCustomer)
      )
    }

    // Date range filter
    if (fromDate) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.bill_date)
        const fromDateObj = new Date(fromDate)
        return billDate >= fromDateObj
      })
    }
    if (toDate) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.bill_date)
        const toDateObj = new Date(toDate)
        // Include the full day by setting time to end of day
        toDateObj.setHours(23, 59, 59, 999)
        return billDate <= toDateObj
      })
    }

    setFilteredBills(filtered)
    setBillsCurrentPage(1)
  }, [bills, searchBillNo, searchCustomer, fromDate, toDate])

  // Transactions filter function
  const applyTransactionsFilters = useCallback(() => {
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
    if (searchBillNoTrans) {
      filtered = filtered.filter(transaction =>
        transaction.bill?.bill_no?.toLowerCase().includes(searchBillNoTrans.toLowerCase())
      )
    }

    // Customer search
    if (searchCustomerTrans) {
      filtered = filtered.filter(transaction =>
        transaction.bill?.customers?.name?.toLowerCase().includes(searchCustomerTrans.toLowerCase()) ||
        transaction.bill?.customers?.phone?.includes(searchCustomerTrans)
      )
    }

    setFilteredTransactions(filtered)
    setTransactionsCurrentPage(1)
  }, [transactions, startDate, endDate, minAmount, maxAmount, searchBillNoTrans, searchCustomerTrans, paymentMethodFilter])

  useEffect(() => {
    applyBillsFilters()
  }, [applyBillsFilters])

  useEffect(() => {
    applyTransactionsFilters()
  }, [applyTransactionsFilters])

  // Bills pagination calculations
  const billsTotalPages = Math.ceil(filteredBills.length / billsPerPage)
  const billsStartIndex = (billsCurrentPage - 1) * billsPerPage
  const billsEndIndex = billsStartIndex + billsPerPage
  const paginatedBills = filteredBills.slice(billsStartIndex, billsEndIndex)

  // Transactions pagination calculations
  const transactionsTotalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)
  const transactionsStartIndex = (transactionsCurrentPage - 1) * transactionsPerPage
  const transactionsEndIndex = transactionsStartIndex + transactionsPerPage
  const paginatedTransactions = filteredTransactions.slice(transactionsStartIndex, transactionsEndIndex)

  const clearBillsFilters = () => {
    setSearchBillNo('')
    setSearchCustomer('')
    setFromDate('')
    setToDate('')
  }

  const clearTransactionsFilters = () => {
    setStartDate('')
    setEndDate('')
    setMinAmount('')
    setMaxAmount('')
    setSearchBillNoTrans('')
    setSearchCustomerTrans('')
    setPaymentMethodFilter('all')
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

  // Bills functions
  const handleRowClick = (bill: LayawayBillSummary) => {
    setSelectedBill(bill)
    setShowTransactionsModal(true)
  }

  // Transactions functions
  const handleBillSearch = async () => {
    if (!searchBillNoTrans.trim()) {
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
        .ilike('bill_no', `%${searchBillNoTrans.trim()}%`)
        .single()
      
      // If the search didn't find a bill with the provided input, try with the prefix
      if (error && searchBillNoTrans.trim() && !searchBillNoTrans.startsWith('AM-'))
        const { data: prefixedData, error: prefixedError } = await supabase
          .from('bills')
          .select('*, customers(*)')
          .ilike('bill_no', `%AM-${searchBillNoTrans.trim()}%`)
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

  const fetchBillsForForm = async () => {
    try {
      const billsData = await getBills()
      setBillsData(billsData.filter(bill => bill.bill_status === 'final'))
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive',
      })
    }
  }

  const handleViewDetails = (transaction: LayawayTransactionWithBill) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
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
    const bill = billsData.find(b => b.id === transaction.bill_id)
    if (bill) {
      setSearchedBill(bill)
      setSearchBillNoTrans(bill.bill_no.replace(/^AM-/, '')) // Remove prefix for display
    }
    
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
      await loadTransactionsData()
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
      
      await loadTransactionsData()
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
    setSearchBillNoTrans('')
    setFormErrors({})
  }

  const handleAddTransaction = () => {
    resetForm()
    fetchBillsForForm()
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Layaway Management</h1>
          <p className="text-muted-foreground">
            Manage layaway bills and transactions
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Bills Tab */}
          <TabsContent value="bills">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Bills</p>
                    <p className="text-xl font-bold text-foreground">{filteredBills.length}</p>
                  </div>
                  <div className="text-2xl">📋</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0))}
                    </p>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(filteredBills.reduce((sum, bill) => sum + bill.total_paid, 0))}
                    </p>
                  </div>
                  <div className="text-2xl">💳</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(filteredBills.reduce((sum, bill) => sum + bill.remaining_amount, 0))}
                    </p>
                  </div>
                  <div className="text-2xl">⏳</div>
                </div>
              </Card>
            </div>

            {/* Bills Filters */}
            <Card className="p-4 mb-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-primary text-lg">🔍</span>
                <h2 className="text-base font-semibold text-foreground">Filters</h2>
              </div>

              <div className="flex flex-wrap items-end gap-3">
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

                {/* From Date */}
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-foreground mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                
                {/* To Date */}
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-foreground mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearBillsFilters}
                    className="h-9 text-sm px-4"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Card>

            {/* Bills Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg">📋</span>
                <h2 className="text-lg font-semibold text-foreground">Layaway Bills</h2>
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

            {/* Bills Table */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="p-6">
                {isLoading && activeTab === 'bills' ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : paginatedBills.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No layaway bills found</p>
                    <p className="text-muted-foreground text-sm mt-2">
                      {bills.length === 0 
                        ? 'No bills with layaway transactions exist yet'
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
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Bill Date</th>
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Total Amount</th>
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Total Paid</th>
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Remaining</th>
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Transactions</th>
                          <th className="text-left py-4 px-4 font-semibold text-foreground">Last Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBills.map((bill) => (
                          <tr
                            key={bill.bill_id}
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(bill)}
                          >
                            <td className="py-4 px-4 font-medium text-foreground">{bill.bill_number}</td>
                            <td className="py-4 px-4 text-foreground">
                              <div className="font-medium">{bill.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{bill.customer_phone}</div>
                            </td>
                            <td className="py-4 px-4 text-foreground">{formatDate(bill.bill_date)}</td>
                            <td className="py-4 px-4 text-foreground font-semibold">{formatCurrency(bill.total_amount)}</td>
                            <td className="py-4 px-4 text-foreground font-semibold">{formatCurrency(bill.total_paid)}</td>
                            <td className="py-4 px-4 text-foreground font-semibold">
                              <span className={bill.remaining_amount <= 0 ? 'text-green-600' : 'text-destructive'}>
                                {formatCurrency(bill.remaining_amount)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-foreground">{bill.transaction_count}</td>
                            <td className="py-4 px-4 text-foreground">{formatDate(bill.last_payment_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bills Pagination */}
                {filteredBills.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted-foreground">
                      Showing {billsStartIndex + 1}-{Math.min(billsEndIndex, filteredBills.length)} of {filteredBills.length} bills
                      {billsTotalPages > 1 && ` (Page ${billsCurrentPage} of ${billsTotalPages})`}
                    </div>
                    {billsTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBillsCurrentPage(1)}
                          disabled={billsCurrentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBillsCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={billsCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-foreground px-2">
                          {billsCurrentPage} / {billsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBillsCurrentPage(prev => Math.min(billsTotalPages, prev + 1))}
                          disabled={billsCurrentPage === billsTotalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBillsCurrentPage(billsTotalPages)}
                          disabled={billsCurrentPage === billsTotalPages}
                        >
                          Last
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            {/* Transactions Summary Cards */}
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

            {/* Transactions Filters */}
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
                    value={searchBillNoTrans}
                    onChange={(e) => setSearchBillNoTrans(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Search Customer */}
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-foreground mb-1 block">Customer</label>
                  <Input
                    type="text"
                    placeholder="Name or phone"
                    value={searchCustomerTrans}
                    onChange={(e) => setSearchCustomerTrans(e.target.value)}
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
                    onClick={clearTransactionsFilters}
                    className="h-9 text-sm px-4"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Card>

            {/* Transactions Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg">📋</span>
                <h2 className="text-lg font-semibold text-foreground">Layaway Transactions</h2>
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
                {isLoading && activeTab === 'transactions' ? (
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
                                onClick={() => {
                                  // In this view, we can filter by bill
                                  setSearchBillNoTrans(transaction.bill?.bill_no || '')
                                }}
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

                {/* Transactions Pagination */}
                {filteredTransactions.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted-foreground">
                      Showing {transactionsStartIndex + 1}-{Math.min(transactionsEndIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      {transactionsTotalPages > 1 && ` (Page ${transactionsCurrentPage} of ${transactionsTotalPages})`}
                    </div>
                    {transactionsTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransactionsCurrentPage(1)}
                          disabled={transactionsCurrentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransactionsCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={transactionsCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-foreground px-2">
                          {transactionsCurrentPage} / {transactionsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransactionsCurrentPage(prev => Math.min(transactionsTotalPages, prev + 1))}
                          disabled={transactionsCurrentPage === transactionsTotalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransactionsCurrentPage(transactionsTotalPages)}
                          disabled={transactionsCurrentPage === transactionsTotalPages}
                        >
                          Last
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transactions Detail Dialog */}
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

      {/* Bills Transactions Detail Dialog */}
      <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBill ? `Layaway Transactions - ${selectedBill.bill_number}` : 'Layaway Transactions'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedBill.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedBill.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bill Date</p>
                  <p className="font-medium">{formatDate(selectedBill.bill_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(selectedBill.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="font-medium">{formatCurrency(selectedBill.total_paid)}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">Date</th>
                        <th className="text-left py-2 px-3 font-medium">Amount</th>
                        <th className="text-left py-2 px-3 font-medium">Mode</th>
                        <th className="text-left py-2 px-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.transactions.map((transaction, index) => (
                        <tr 
                          key={index} 
                          className={index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700/50'}
                        >
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{formatDate(transaction.payment_date)}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600 font-medium">{formatCurrency(transaction.amount)}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{transaction.payment_method || 'Cash'}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{transaction.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  value={searchBillNoTrans}
                  onChange={(e) => setSearchBillNoTrans(e.target.value)}
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