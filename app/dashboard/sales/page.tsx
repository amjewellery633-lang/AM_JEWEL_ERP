'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Bill, Customer, BillItem } from '@/lib/db/queries'
import { deleteBill, getBillItems, updateBill } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import * as XLSX from 'xlsx'

interface BillWithRelations extends Bill {
  customers?: Customer | null
  users?: {
    id: string
    username: string
    role: string
  } | null
  bill_items?: BillItem[]
  tracking_flag?: boolean
}

export default function SalesPage() {
  const [bills, setBills] = useState<BillWithRelations[]>([])
  const [filteredBills, setFilteredBills] = useState<BillWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Detail view
  const [selectedBill, setSelectedBill] = useState<BillWithRelations | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [oldGoldExchange, setOldGoldExchange] = useState<any>(null)
  
  // Delete confirmation
  const [billToDelete, setBillToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchBillNo, setSearchBillNo] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'gst' | 'non_gst'>('all')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [staffList, setStaffList] = useState<Array<{ id: string; username: string }>>([])
  
  // Reports
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      const role = userData.role || 'staff'
      setUserRole(role)
      fetchBills(role)
    } else {
      fetchBills('staff')
    }
    
    // Fetch staff list for filter
    fetchStaffList()
  }, [])

  const fetchStaffList = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username', { ascending: true })

      if (error) {
        console.error('Error fetching staff list:', error)
        return
      }

      setStaffList((data || []) as Array<{ id: string; username: string }>)
    } catch (error) {
      console.error('Error fetching staff list:', error)
    }
  }

  const fetchBills = async (role?: 'admin' | 'staff') => {
    const currentRole = role || userRole
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // Build query based on user role
      let query = supabase
        .from('bills')
        .select(`
          *,
          customers(*),
          users(id, username, role),
          bill_items(*)
        `)
        .order('created_at', { ascending: false })

      // Staff can only see GST bills
      if (currentRole === 'staff') {
        query = query.eq('sale_type', 'gst')
      }
      // Admin can see all bills (no filter)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bills:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch sales bills',
          variant: 'destructive',
        })
        return
      }

      setBills((data as BillWithRelations[]) || [])
      setFilteredBills((data as BillWithRelations[]) || [])
      setCurrentPage(1) // Reset to first page on new data
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while fetching bills',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...bills]

    // Sale type filter
    if (saleTypeFilter !== 'all') {
      filtered = filtered.filter(bill => bill.sale_type === saleTypeFilter)
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.bill_date || bill.created_at)
        const start = new Date(startDate)
        return billDate >= start
      })
    }
    if (endDate) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.bill_date || bill.created_at)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return billDate <= end
      })
    }

    // Price filter
    if (minPrice) {
      const min = parseFloat(minPrice)
      if (!isNaN(min)) {
        filtered = filtered.filter(bill => {
          const total = bill.grand_total || bill.subtotal || 0
          return total >= min
        })
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice)
      if (!isNaN(max)) {
        filtered = filtered.filter(bill => {
          const total = bill.grand_total || bill.subtotal || 0
          return total <= max
        })
      }
    }

    // Bill number search
    if (searchBillNo) {
      filtered = filtered.filter(bill =>
        bill.bill_no?.toLowerCase().includes(searchBillNo.toLowerCase())
      )
    }

    // Customer search
    if (searchCustomer) {
      filtered = filtered.filter(bill =>
        bill.customers?.name?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        bill.customers?.phone?.includes(searchCustomer)
      )
    }

    // Staff filter
    if (staffFilter !== 'all') {
      filtered = filtered.filter(bill => bill.staff_id === staffFilter)
    }

    setFilteredBills(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [bills, startDate, endDate, minPrice, maxPrice, searchBillNo, searchCustomer, saleTypeFilter, staffFilter])

  // Pagination calculations
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBills = filteredBills.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setMinPrice('')
    setMaxPrice('')
    setSearchBillNo('')
    setSearchCustomer('')
    setSaleTypeFilter('all')
    setStaffFilter('all')
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

  const handleViewDetails = async (bill: BillWithRelations) => {
    setSelectedBill(bill)
    setShowDetailModal(true)
    setLoadingItems(true)
    try {
      const items = await getBillItems(bill.id)
      setBillItems(items)
      
      // Fetch old gold exchange data from old_gold_exchanges table
      // This is a credit/deduction on the sales bill, NOT a separate purchase transaction
      const supabase = createClient()
      const { data: oldGold, error: oldGoldError } = await supabase
        .from('old_gold_exchanges')
        .select('*')
        .eq('bill_id', bill.id)
        .single()
      
      if (!oldGoldError && oldGold) {
        // Parse notes to extract description and HSN code
        const notes = oldGold.notes || ''
        let particulars = 'Old Gold Exchange'
        let hsnCode = ''
        
        // Extract description and HSN from notes
        if (notes.includes('Description:')) {
          const descMatch = notes.match(/Description:\s*([^|]+)/)
          if (descMatch) particulars = descMatch[1].trim()
        }
        if (notes.includes('HSN Code:')) {
          const hsnMatch = notes.match(/HSN Code:\s*([^|]+)/)
          if (hsnMatch) hsnCode = hsnMatch[1].trim()
        }
        
        // Map old_gold_exchanges fields to display format
        setOldGoldExchange({
          weight: oldGold.weight,
          purity: oldGold.purity,
          rate_per_gram: oldGold.rate_per_gram,
          total_value: oldGold.total_value,
          total_amount: oldGold.total_value, // For compatibility
          particulars: particulars,
          hsn_code: hsnCode,
          remarks: oldGold.notes,
        })
      } else {
        setOldGoldExchange(null)
      }
    } catch (error) {
      console.error('Error fetching bill items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bill items',
        variant: 'destructive',
      })
    } finally {
      setLoadingItems(false)
    }
  }

  const handleToggleRow = async (billId: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId)
    } else {
      newExpanded.add(billId)
      // Fetch items if not already loaded
      if (!billItems.some(item => item.bill_id === billId)) {
        try {
          const items = await getBillItems(billId)
          setBillItems(prev => [...prev, ...items])
        } catch (error) {
          console.error('Error fetching bill items:', error)
        }
      }
    }
    setExpandedRows(newExpanded)
  }

  const handleDelete = async () => {
    if (!billToDelete) return
    
    try {
      await deleteBill(billToDelete)
      toast({
        title: 'Success',
        description: 'Bill deleted successfully',
      })
      await fetchBills(userRole)
      setShowDeleteDialog(false)
      setBillToDelete(null)
    } catch (error: any) {
      console.error('Error deleting bill:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bill',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (bill: BillWithRelations) => {
    // Navigate to edit page or open edit modal
    // For now, we'll use a simple approach - redirect to sales billing with bill ID
    window.location.href = `/dashboard/sales-billing?edit=${bill.id}`
  }

  const handlePrint = (bill: BillWithRelations) => {
    // Open print view for this bill in new window
    const printWindow = window.open(`/dashboard/sales/${bill.id}/print`, '_blank')
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Please allow popups to print bills',
        variant: 'destructive',
      })
    }
  }

  const totalSales = filteredBills.reduce((sum, bill) => {
    return sum + (bill.grand_total || bill.subtotal || 0)
  }, 0)

  const totalBills = filteredBills.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">All Sales</h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' 
              ? 'View and filter all sales bills (GST and Non-GST)'
              : 'View and filter GST sales bills'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Bills</p>
                <p className="text-xl font-bold text-foreground">{totalBills}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalSales)}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Average Bill</p>
                <p className="text-xl font-bold text-foreground">
                  {totalBills > 0 ? formatCurrency(totalSales / totalBills) : '₹0.00'}
                </p>
              </div>
              <div className="text-2xl">📊</div>
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
            {/* Sale Type Filter */}
            {userRole === 'admin' && (
              <div className="min-w-[140px]">
                <label className="text-xs font-medium text-foreground mb-1 block">Sale Type</label>
                <select
                  value={saleTypeFilter}
                  onChange={(e) => setSaleTypeFilter(e.target.value as 'all' | 'gst' | 'non_gst')}
                  className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="gst">GST Only</option>
                  <option value="non_gst">Non-GST Only</option>
                </select>
              </div>
            )}

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

            {/* Price Range */}
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Min Price (₹)</label>
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Max Price (₹)</label>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
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

            {/* Staff Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Staff</label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.username}
                  </option>
                ))}
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

        {/* Reports Section */}
        <Card className="p-4 mb-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-lg">📊</span>
            <h2 className="text-base font-semibold text-foreground">Reports</h2>
          </div>
          <div className="flex items-end gap-3">
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Select Month</label>
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={async () => {
                try {
                  const supabase = createClient()
                  const [year, month] = reportMonth.split('-')
                  const startDate = `${year}-${month}-01`
                  // Get last day of the month
                  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
                  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
                  
                  // Fetch bills for the selected month
                  let query = supabase
                    .from('bills')
                    .select(`
                      *,
                      customers(*),
                      users(id, username, role)
                    `)
                    .gte('bill_date', startDate)
                    .lte('bill_date', endDate)
                    .order('bill_date', { ascending: false })

                  if (userRole === 'staff') {
                    query = query.eq('sale_type', 'gst')
                  }

                  const { data: monthlyBills, error } = await query

                  if (error) {
                    throw error
                  }

                  if (!monthlyBills || monthlyBills.length === 0) {
                    toast({
                      title: 'No Data',
                      description: 'No bills found for the selected month',
                      variant: 'destructive',
                    })
                    return
                  }

                  // Prepare data for Excel
                  const excelData = monthlyBills.map((bill: BillWithRelations) => {
                    const customer = bill.customers as Customer | null
                    const staff = bill.users as { username: string } | null
                    
                    // Parse payment methods if stored as JSON
                    let paymentMethodStr = ''
                    if (bill.payment_method) {
                      try {
                        const paymentMethods = JSON.parse(bill.payment_method)
                        if (Array.isArray(paymentMethods)) {
                          paymentMethodStr = paymentMethods.map((p: any) => {
                            const typeLabel = p.type === 'cash' ? 'Cash' :
                              p.type === 'card' ? 'Card' :
                              p.type === 'upi' ? 'UPI' :
                              p.type === 'cheque' ? 'Cheque' :
                              p.type === 'bank_transfer' ? 'Bank Transfer' : 'Other'
                            return `${typeLabel}: ₹${parseFloat(p.amount || 0).toFixed(2)}`
                          }).join(', ')
                        } else {
                          paymentMethodStr = bill.payment_method
                        }
                      } catch {
                        paymentMethodStr = bill.payment_method
                      }
                    }

                    return {
                      'Bill No': bill.bill_no || '',
                      'Date': formatDate(bill.bill_date || bill.created_at),
                      'Customer': customer?.name || 'N/A',
                      'Type': bill.sale_type === 'gst' ? 'GST' : 'Non-GST',
                      'Subtotal': bill.subtotal || 0,
                      'GST': bill.gst_amount || 0,
                      'Discount': bill.discount || 0,
                      'Grand Total': bill.grand_total || 0,
                      'Status': bill.bill_status || 'draft',
                      'Staff': staff?.username || 'N/A',
                    }
                  })

                  // Create workbook and worksheet
                  const ws = XLSX.utils.json_to_sheet(excelData)
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Sales')

                  // Generate filename
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })
                  const filename = `Sales_Report_${monthName}_${year}.xlsx`

                  // Download file
                  XLSX.writeFile(wb, filename)

                  toast({
                    title: 'Success',
                    description: `Excel report exported successfully: ${filename}`,
                  })
                } catch (error: any) {
                  console.error('Error exporting report:', error)
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to export report',
                    variant: 'destructive',
                  })
                }
              }}
              className="h-9 text-sm px-4"
            >
              📥 Export to Excel
            </Button>
          </div>
        </Card>

        {/* Sales Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg">📊</span>
                <h2 className="text-lg font-semibold text-foreground">Sales Bills</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchBills()}
                disabled={isLoading}
                className="h-8 text-xs"
                size="sm"
              >
                {isLoading ? '🔄' : '↻'} Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedBills.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No sales bills found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {bills.length === 0 
                    ? 'No bills have been created yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground w-12"></th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Bill No</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Subtotal</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">GST</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">MC / Value Add</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Grand Total</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Staff</th>
                      {userRole === 'admin' && (
                        <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBills.map((bill) => {
                      const isExpanded = expandedRows.has(bill.id)
                      const billItemsForRow = billItems.filter(item => item.bill_id === bill.id)
                      const mcValue = (bill.bill_items || [])
                        .filter(item => item.item_name?.trim().toUpperCase() === 'MC / VALUE ADDED')
                        .reduce((sum, item) => sum + (item.line_total || 0), 0)
                      
                      return (
                        <React.Fragment key={bill.id}>
                          <tr
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <button
                                onClick={() => handleToggleRow(bill.id)}
                                className="text-primary hover:text-primary/80 font-bold text-lg"
                              >
                                {isExpanded ? '−' : '+'}
                              </button>
                            </td>
                            <td className="py-4 px-4 font-medium text-foreground cursor-pointer hover:text-primary" onClick={() => handleViewDetails(bill)}>
                              <div className="flex items-center gap-2">
                                <span>{bill.bill_no || `#${bill.id}`}</span>
                                {bill.tracking_flag && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title="Layaway: Final payment ≥ 3 days after advance">
                                    📅 Layaway
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-foreground">{formatDate(bill.bill_date || bill.created_at)}</td>
                            <td className="py-4 px-4 text-foreground">
                              {bill.customers ? (
                                <div>
                                  <div className="font-medium">{bill.customers.name || 'N/A'}</div>
                                  {bill.customers.phone && (
                                    <div className="text-sm text-muted-foreground">{bill.customers.phone}</div>
                                  )}
                                </div>
                              ) : (
                                'Walk-in Customer'
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  bill.sale_type === 'gst'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                }`}
                              >
                                {bill.sale_type === 'gst' ? 'GST' : 'Non-GST'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-foreground">{formatCurrency(bill.subtotal)}</td>
                            <td className="py-4 px-4 text-foreground">{formatCurrency(bill.gst_amount || bill.cgst || 0)}</td>
                            <td className="py-4 px-4 text-foreground">{formatCurrency(mcValue)}</td>
                            <td className="py-4 px-4 font-bold text-primary text-lg">
                              {formatCurrency(bill.grand_total || bill.subtotal)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  bill.bill_status === 'final'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : bill.bill_status === 'cancelled'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}
                              >
                                {bill.bill_status?.toUpperCase() || 'DRAFT'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-foreground text-sm">
                              {bill.users?.username || 'N/A'}
                            </td>
                            {userRole === 'admin' && (
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2 justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(bill)}
                                    className="h-8 text-xs"
                                  >
                                    👁️ View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(bill)}
                                    className="h-8 text-xs"
                                  >
                                    ✏️ Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrint(bill)}
                                    className="h-8 text-xs"
                                  >
                                    🖨️ Print
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setBillToDelete(bill.id)
                                      setShowDeleteDialog(true)
                                    }}
                                    className="h-8 text-xs"
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {/* Expanded row with bill items */}
                          {isExpanded && (
                            <tr className="bg-slate-50 dark:bg-slate-900">
                              <td colSpan={userRole === 'admin' ? 12 : 11} className="py-4 px-4">
                                <div className="pl-8">
                                  <h4 className="font-semibold mb-3 text-foreground">Bill Items:</h4>
                                  {billItemsForRow.length > 0 ? (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-300 dark:border-slate-700">
                                          <th className="text-left py-2 px-2">Item Name</th>
                                          <th className="text-left py-2 px-2">Barcode</th>
                                          <th className="text-right py-2 px-2">Weight</th>
                                          <th className="text-right py-2 px-2">Rate</th>
                                          <th className="text-right py-2 px-2">Making Charges</th>
                                          <th className="text-right py-2 px-2">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {billItemsForRow.map((item) => (
                                          <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800">
                                            <td className="py-2 px-2">{item.item_name || 'N/A'}</td>
                                            <td className="py-2 px-2 text-muted-foreground">{item.barcode || '-'}</td>
                                            <td className="py-2 px-2 text-right">{item.weight?.toFixed(2) || '0.00'}g</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(item.rate)}</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(item.making_charges)}</td>
                                            <td className="py-2 px-2 text-right font-semibold">{formatCurrency(item.line_total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-muted-foreground">Loading items...</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
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

      {/* Bill Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={(open) => {
        setShowDetailModal(open)
        if (!open) {
          setOldGoldExchange(null)
          setBillItems([])
        }
      }}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.bill_no}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDate(selectedBill.bill_date || selectedBill.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{selectedBill.customers?.name || 'Walk-in Customer'}</p>
                  {selectedBill.customers?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedBill.customers.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sale Type</p>
                  <p className="font-semibold">{selectedBill.sale_type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{selectedBill.bill_status?.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Bill Items:</h4>
                {loadingItems ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : billItems.length > 0 ? (
                  <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left py-2 px-3">Item Name</th>
                        <th className="text-left py-2 px-3">Barcode</th>
                        <th className="text-right py-2 px-3">Weight</th>
                        <th className="text-right py-2 px-3">Rate</th>
                        <th className="text-right py-2 px-3">Making</th>
                        <th className="text-right py-2 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700">
                          <td className="py-2 px-3">{item.item_name || 'N/A'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.barcode || '-'}</td>
                          <td className="py-2 px-3 text-right">{item.weight?.toFixed(2) || '0.00'}g</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.rate)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.making_charges)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground">No items found</p>
                )}
              </div>

              {/* Old Gold Exchange Section */}
              {oldGoldExchange && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3 text-pink-600 dark:text-pink-400">Old Gold Exchange (Pink Slip):</h4>
                  <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {oldGoldExchange.particulars && (
                        <div>
                          <p className="text-xs text-muted-foreground">Particulars</p>
                          <p className="font-semibold">{oldGoldExchange.particulars}</p>
                        </div>
                      )}
                      {oldGoldExchange.hsn_code && (
                        <div>
                          <p className="text-xs text-muted-foreground">HSN Code</p>
                          <p className="font-semibold">{oldGoldExchange.hsn_code}</p>
                        </div>
                      )}
                      {oldGoldExchange.weight && (
                        <div>
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="font-semibold">{oldGoldExchange.weight}g</p>
                        </div>
                      )}
                      {oldGoldExchange.purity && (
                        <div>
                          <p className="text-xs text-muted-foreground">Purity</p>
                          <p className="font-semibold">{oldGoldExchange.purity}</p>
                        </div>
                      )}
                      {oldGoldExchange.rate_per_gram && (
                        <div>
                          <p className="text-xs text-muted-foreground">Rate per gram</p>
                          <p className="font-semibold">{formatCurrency(oldGoldExchange.rate_per_gram)}</p>
                        </div>
                      )}
                      {(oldGoldExchange.total_value || oldGoldExchange.total_amount) && (
                        <div>
                          <p className="text-xs text-muted-foreground">Total Value</p>
                          <p className="font-semibold text-lg text-pink-600 dark:text-pink-400">
                            {formatCurrency(oldGoldExchange.total_value || oldGoldExchange.total_amount)}
                          </p>
                        </div>
                      )}
                    </div>
                    {oldGoldExchange.remarks && (
                      <div className="mt-3 pt-3 border-t border-pink-200 dark:border-pink-800">
                        <p className="text-xs text-muted-foreground">Remarks</p>
                        <p className="font-medium">{oldGoldExchange.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedBill.subtotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedBill.gst_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Discount</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedBill.discount)}</p>
                </div>
                {oldGoldExchange && (
                  <div>
                    <p className="text-sm text-muted-foreground">Old Gold Credit</p>
                    <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                      -{formatCurrency(oldGoldExchange.total_value || oldGoldExchange.total_amount)}
                    </p>
                  </div>
                )}
                <div className={oldGoldExchange ? 'col-span-2' : ''}>
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="font-semibold text-2xl text-primary">{formatCurrency(selectedBill.grand_total)}</p>
                </div>
              </div>

              {selectedBill.remarks && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="font-semibold">{selectedBill.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBillToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
