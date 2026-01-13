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
  deleteLayawayTransaction
} from '@/lib/db/queries'
import type { Bill, LayawayTransaction, Customer } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { LayawayPrint } from './layaway-print'

// Define types for our combined data
interface BillWithCustomer extends Bill {
  customers?: Customer | null
}

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
  bill: BillWithCustomer
  transactions: LayawayTransaction[]
}

export function LayawayBills() {
  const [bills, setBills] = useState<LayawayBillSummary[]>([])
  const [filteredBills, setFilteredBills] = useState<LayawayBillSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Filter states
  const [searchBillNoFilter, setSearchBillNoFilter] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Add state for showing detailed transactions
  const [selectedBill, setSelectedBill] = useState<LayawayBillSummary | null>(null)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [billToDeleteTransactions, setBillToDeleteTransactions] = useState<number | null>(null)
  const [showDeleteBillDialog, setShowDeleteBillDialog] = useState(false)

  // Add transaction form states
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false)
  const [searchedBill, setSearchedBill] = useState<BillWithCustomer | null>(null)
  const [searchedBillPendingAmount, setSearchedBillPendingAmount] = useState<number>(0)
  const [searchBillNoTransaction, setSearchBillNoForTransaction] = useState('')
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Print states
  const [showPrintView, setShowPrintView] = useState(false)
  const [printTransactions, setPrintTransactions] = useState<LayawayTransaction[]>([])
  const [printBill, setPrintBill] = useState<BillWithCustomer | null>(null)
  const [printCustomer, setPrintCustomer] = useState<Customer | null>(null) // Customer data is already included in the BillWithCustomer object
  const [printTotal, setPrintTotal] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  // Function to handle row click
  const handleRowClick = (bill: LayawayBillSummary) => {
    setSelectedBill(bill)
    setShowTransactionsModal(true)
  }

  const handleBillSearch = async () => {
    if (!searchBillNoTransaction.trim()) {
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
        .ilike('bill_no', `%${searchBillNoTransaction.trim()}%`)
        .single()
      
      // If the search didn't find a bill with the provided input, try with the prefix
      if (error && searchBillNoTransaction.trim() && !searchBillNoTransaction.startsWith('AM-')) {
        const { data: prefixedData, error: prefixedError } = await supabase
          .from('bills')
          .select('*, customers(*)')
          .ilike('bill_no', `%AM-${searchBillNoTransaction.trim()}%`)
          .single()
          
        if (!prefixedError) {
          const bill = prefixedData as BillWithCustomer
          setSearchedBill(bill)
          
          // Fetch transactions for this bill to calculate pending amount
          const transactions = await getLayawayTransactions()
          const billTransactions = transactions.filter(t => t.bill_id === bill.id)
          const totalPaid = billTransactions.reduce((sum, t) => sum + t.amount, 0)
          const totalAmount = bill.grand_total || 0
          const pendingAmount = totalAmount - totalPaid
          setSearchedBillPendingAmount(pendingAmount)
          
          toast({
            title: 'Success',
            description: `Bill ${bill.bill_no} found`,
          })
          return
        }
      }
      
      if (error) {
        // Check if it's an empty error object from Supabase
        if (error && typeof error === 'object' && Object.keys(error).length === 0) {
          // Empty error object, treat as not found
          toast({
            title: 'Error',
            description: 'Bill not found',
            variant: 'destructive',
          })
          setSearchedBill(null)
          return
        }
        throw error
      }
      
      const bill = data as BillWithCustomer
      setSearchedBill(bill)
      
      // Fetch transactions for this bill to calculate pending amount
      const transactions = await getLayawayTransactions()
      const billTransactions = transactions.filter(t => t.bill_id === bill.id)
      const totalPaid = billTransactions.reduce((sum, t) => sum + t.amount, 0)
      const totalAmount = bill.grand_total || 0
      const pendingAmount = totalAmount - totalPaid
      setSearchedBillPendingAmount(pendingAmount)
      
      toast({
        title: 'Success',
        description: `Bill ${bill.bill_no} found`,
      })
    } catch (error: any) {
      // Properly handle Supabase empty error objects
      if (error && typeof error === 'object' && Object.keys(error).length === 0) {
        console.error('Error searching bill: Empty error object from Supabase')
      } else {
        console.error('Error searching bill:', error)
      }
      
      toast({
        title: 'Error',
        description: 'Bill not found',
        variant: 'destructive',
      })
      setSearchedBill(null)
      setSearchedBillPendingAmount(0)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!searchedBill) {
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

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      const transactionData = {
        bill_id: searchedBill!.id,
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes
      }
      
      await createLayawayTransaction(transactionData)
      toast({
        title: 'Success',
        description: 'Layaway transaction created successfully',
      })
      
      // Refresh the data
      await loadData()
      setShowAddTransactionForm(false)
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
    setSearchedBill(null)
    setSearchedBillPendingAmount(0)
    setSearchBillNoForTransaction('')
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: '',
      reference_number: '',
      notes: ''
    })
    setFormErrors({})
  }

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return
    
    try {
      await deleteLayawayTransaction(transactionToDelete)
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      })
      setShowDeleteDialog(false)
      setTransactionToDelete(null)
      
      // Reload data to refresh the transactions
      await loadData()
      
      // If a bill is selected, reload and update it
      if (selectedBill) {
        const [billsData, transactionsData] = await Promise.all([
          getBills(),
          getLayawayTransactions()
        ])
        
        const transactionsByBill = transactionsData.reduce((acc, transaction) => {
          if (!acc[transaction.bill_id]) {
            acc[transaction.bill_id] = []
          }
          acc[transaction.bill_id].push(transaction)
          return acc
        }, {} as Record<number, LayawayTransaction[]>)
        
        const bill = billsData.find(b => b.id === selectedBill.bill_id)
        if (bill && transactionsByBill[bill.id]) {
          const billTransactions = transactionsByBill[bill.id]
          const totalPaid = billTransactions.reduce((sum, trans) => sum + trans.amount, 0)
          const totalAmount = bill.grand_total || 0
          const remainingAmount = totalAmount - totalPaid
          
          const updatedBill: LayawayBillSummary = {
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
            bill: bill as BillWithCustomer,
            transactions: billTransactions
          }
          setSelectedBill(updatedBill)
        } else if (bill && !transactionsByBill[bill.id]) {
          // No transactions left, close the modal
          setShowTransactionsModal(false)
          setSelectedBill(null)
        }
      }
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAllTransactions = async () => {
    if (!billToDeleteTransactions) return
    
    try {
      // Get all transactions for this bill
      const transactions = await getLayawayTransactions()
      const billTransactions = transactions.filter(t => t.bill_id === billToDeleteTransactions)
      
      // Delete all transactions for this bill
      for (const transaction of billTransactions) {
        await deleteLayawayTransaction(transaction.id)
      }
      
      toast({
        title: 'Success',
        description: `Deleted ${billTransactions.length} transaction(s) for bill`,
      })
      
      setShowDeleteBillDialog(false)
      setBillToDeleteTransactions(null)
      
      // Reload data
      await loadData()
      
      // If this bill was selected, close the modal
      if (selectedBill && selectedBill.bill_id === billToDeleteTransactions) {
        setShowTransactionsModal(false)
        setSelectedBill(null)
      }
    } catch (error: any) {
      console.error('Error deleting all transactions:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transactions',
        variant: 'destructive',
      })
    }
  }

  const handleCancelForm = () => {
    setShowAddTransactionForm(false)
    resetForm()
  }

  const loadData = async () => {
    setIsLoading(true)
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
      setCurrentPage(1)
    } catch (error) {
      console.error('Error loading layaway bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to load layaway bills',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...bills]

    // Bill number search
    if (searchBillNoFilter) {
      filtered = filtered.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchBillNoFilter.toLowerCase())
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
    setCurrentPage(1)
  }, [bills, searchBillNoFilter, searchCustomer, fromDate, toDate])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Pagination calculations
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBills = filteredBills.slice(startIndex, endIndex)

  const clearFilters = () => {
    setSearchBillNoFilter('')
    setSearchCustomer('')
    setFromDate('')
    setToDate('')
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
  
  const handlePrintTransactions = (bill: LayawayBillSummary) => {
    try {
      // Set the print data
      setPrintTransactions(bill.transactions)
      setPrintBill(bill.bill)
      // Customer data is now handled directly in the LayawayPrint component
      setPrintTotal(bill.total_paid)
      
      // Show the print view
      setShowPrintView(true)
      
      // Trigger print after a short delay to ensure invoice is rendered
      setTimeout(() => {
        window.print()
        // Hide print view after printing
        setTimeout(() => {
          setShowPrintView(false)
        }, 500)
      }, 300)
    } catch (error) {
      console.error('Error printing transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to prepare print view',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Layaway Bills</h1>
          <p className="text-muted-foreground">
            Bills with layaway transactions
          </p>
        </div>

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

        {/* Filters */}
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
                value={searchBillNoFilter}
                onChange={(e) => setSearchBillNoFilter(e.target.value)}
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
            <Button
              variant="default"
              onClick={() => {
                setShowAddTransactionForm(true);
                setSearchedBill(null);
                setSearchBillNoForTransaction('');
                setFormData({
                  payment_date: new Date().toISOString().split('T')[0],
                  amount: '',
                  payment_method: '',
                  reference_number: '',
                  notes: ''
                });
                setFormErrors({});
              }}
              className="h-8 text-xs"
              size="sm"
            >
              ➕ Add Transaction
            </Button>
          </div>
        </div>

        {/* Bills Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
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
                      <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBills.map((bill) => (
                      <tr
                        key={bill.bill_id}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintTransactions(bill);
                              }}
                              className="h-8 text-xs"
                            >
                              🖨️ Print
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBillToDeleteTransactions(bill.bill_id);
                                setShowDeleteBillDialog(true);
                              }}
                              className="h-8 text-xs text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              🗑️ Delete
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
            {filteredBills.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} of {filteredBills.length} bills
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

      {/* Transactions Detail Dialog */}
      <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                        <th className="text-left py-2 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.transactions.map((transaction, index) => (
                        <tr 
                          key={transaction.id || index} 
                          className={index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700/50'}
                        >
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{formatDate(transaction.payment_date)}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600 font-medium">{formatCurrency(transaction.amount)}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{transaction.payment_method || 'Cash'}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">{transaction.notes || '-'}</td>
                          <td className="py-2 px-3 border-t border-slate-200 dark:border-slate-600">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTransactionToDelete(transaction.id)
                                setShowDeleteDialog(true)
                              }}
                              className="h-7 text-xs text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              Delete
                            </Button>
                          </td>
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

      {/* Add Transaction Form Dialog */}
      <Dialog open={showAddTransactionForm} onOpenChange={setShowAddTransactionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Bill Number</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter bill number"
                  value={searchBillNoTransaction}
                  onChange={(e) => setSearchBillNoForTransaction(e.target.value)}
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
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm space-y-2">
                  <div>
                    <p className="font-medium">{searchedBill.bill_no}</p>
                    <p className="text-muted-foreground">{searchedBill.customers?.name} ({searchedBill.customers?.phone})</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(searchedBill.grand_total || 0)}</span>
                    </div>
                    {searchedBillPendingAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pending Amount:</span>
                        <span className="font-semibold text-destructive">{formatCurrency(searchedBillPendingAmount)}</span>
                      </div>
                    )}
                  </div>
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
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this layaway transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setTransactionToDelete(null)
              setShowDeleteDialog(false)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Transactions for Bill Confirmation Dialog */}
      <AlertDialog open={showDeleteBillDialog} onOpenChange={setShowDeleteBillDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all layaway transactions for this bill? This action cannot be undone and will remove all payment records for this bill.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBillToDeleteTransactions(null)
              setShowDeleteBillDialog(false)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllTransactions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print View */}
      {showPrintView && printBill && (
        <LayawayPrint
          customer={printBill.customers || null}
          bill={printBill}
          transactions={printTransactions}
          billDate={printBill.bill_date}
          billNo={printBill.bill_no}
          totalAmount={printBill.grand_total || 0}
          totalPaid={printTotal}
          remainingAmount={(printBill.grand_total || 0) - printTotal}
        />
      )}
    </div>
  )
}