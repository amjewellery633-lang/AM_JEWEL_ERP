'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { 
  getBills, 
  getAdvanceBookings, 
  createAdvanceBooking,
  updateAdvanceBooking,
  deleteAdvanceBooking
} from '@/lib/db/queries'
import type { Bill, AdvanceBooking, Customer, BillItem } from '@/lib/db/queries'
import { getBillItems } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AdvanceBookingForm } from './advance-booking-form'
import { AdvanceBookingPrint } from './advance-booking-print'

interface BillWithRelations extends Bill {
  customers?: Customer | null
  users?: {
    id: string
    username: string
    role: string
  } | null
}

interface AdvanceBookingWithBill extends AdvanceBooking {
  bill?: BillWithRelations | null
}

export function AdvanceBooking() {
  const [bookings, setBookings] = useState<AdvanceBookingWithBill[]>([])
  const [filteredBookings, setFilteredBookings] = useState<AdvanceBookingWithBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Detail view
  const [selectedBooking, setSelectedBooking] = useState<AdvanceBookingWithBill | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Delete confirmation
  const [bookingToDelete, setBookingToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [searchBillNo, setSearchBillNo] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled' | 'completed'>('all')
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState<AdvanceBooking | null>(null)
  const [bills, setBills] = useState<BillWithRelations[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Print states
  const [showPrintView, setShowPrintView] = useState(false)
  const [printBooking, setPrintBooking] = useState<AdvanceBookingWithBill | null>(null)
  const [printItems, setPrintItems] = useState<BillItem[]>([])

  useEffect(() => {
    fetchBookings()
    fetchBills()
  }, [])
    
  const fetchBills = async () => {
    try {
      console.log('Fetching bills for advance booking component...')
      const billsData = await getBills()
      console.log('Raw bills data:', billsData)
      // Include all bills for advance bookings (not just finalized) to ensure proper linking
      const filteredBills = billsData // Removed filter to include all bills
      // const filteredBills = billsData.filter(bill => bill.bill_status === 'finalized') // Original filter
      
      console.log('Fetched bills count:', billsData.length);
      console.log('Sample bills:', billsData.slice(0, 3)); // Log first 3 bills as sample
      console.log('All bills (no filter applied):', filteredBills)
      setBills(filteredBills)
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive',
      })
    }
  }

  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching advance bookings and bills...')
      // Fetch bookings and bills in parallel
      const [bookingsData, billsData] = await Promise.all([
        getAdvanceBookings(),
        getBills()
      ])
      
      console.log('Raw data:', { bookingsData, billsData })
      
      console.log('Processing bookingsData:', bookingsData);
      console.log('Processing billsData:', billsData);
      
      // Only include bookings that have matching bills
      const matchedBookings: AdvanceBookingWithBill[] = [];
      const processedBillIds = new Set(); // Track bills that have been matched
      
      for (const booking of bookingsData) {
        console.log('Processing booking:', booking);
        const bill = billsData.find(b => b.id === booking.bill_id);
        console.log('Looking for bill with ID:', booking.bill_id, 'Found:', !!bill);
        
        if (bill) {
          console.log('Found matching bill:', bill);
          // Check if we already processed this bill to avoid duplicates
          if (!processedBillIds.has(booking.bill_id)) {
            matchedBookings.push({
              ...booking,
              bill: bill
            });
            processedBillIds.add(booking.bill_id);
            console.log('Added booking with bill to matchedBookings');
          } else {
            console.log('Bill ID already processed, skipping duplicate');
          }
        } else {
          console.log('No matching bill found for booking:', booking.id, 'with bill_id:', booking.bill_id);
        }
      }
      
      console.log('Final matched bookings:', matchedBookings);
      console.log('Total bookings from DB:', bookingsData.length);
      console.log('Total bills from DB:', billsData.length);
      console.log('Total matched bookings:', matchedBookings.length);
      
      // Check if there are bookings but they're not showing due to filtering
      if (bookingsData.length > 0 && matchedBookings.length === 0) {
        console.log('WARNING: There are bookings in DB but none matched with bills');
        console.log('Sample booking bill_id:', bookingsData[0]?.bill_id);
        console.log('Sample bills IDs:', billsData.slice(0, 5).map(b => b.id));
      }
      
      setBookings(matchedBookings)
      setCurrentPage(1)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch advance bookings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    console.log('Applying filters to bookings:', { bookings, statusFilter, startDate, endDate, minAmount, maxAmount, searchBillNo, searchCustomer });
    let filtered = [...bookings]

    console.log('Initial filtered count:', filtered.length);
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.booking_status === statusFilter)
      console.log('After status filter:', filtered.length);
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date)
        const start = new Date(startDate)
        return bookingDate >= start
      })
      console.log('After date filter:', filtered.length);
    }
    if (endDate) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return bookingDate <= end
      })
      console.log('After end date filter:', filtered.length);
    }

    // Amount filter
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) {
        filtered = filtered.filter(booking => booking.advance_amount >= min)
        console.log('After min amount filter:', filtered.length);
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) {
        filtered = filtered.filter(booking => booking.advance_amount <= max)
        console.log('After max amount filter:', filtered.length);
      }
    }

    // Bill number search
    if (searchBillNo) {
      filtered = filtered.filter(booking =>
        booking.bill?.bill_no?.toLowerCase().includes(searchBillNo.toLowerCase())
      )
      console.log('After bill number filter:', filtered.length);
    }

    // Customer search
    if (searchCustomer) {
      filtered = filtered.filter(booking =>
        booking.bill?.customers?.name?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        booking.bill?.customers?.phone?.includes(searchCustomer)
      )
      console.log('After customer filter:', filtered.length);
    }

    console.log('Final filtered bookings:', filtered);
    setFilteredBookings(filtered)
    setCurrentPage(1)
  }, [bookings, startDate, endDate, minAmount, maxAmount, searchBillNo, searchCustomer, statusFilter])

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setMinAmount('')
    setMaxAmount('')
    setSearchBillNo('')
    setSearchCustomer('')
    setStatusFilter('all')
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

  const calculateAdvancePercentage = (advance: number, total: number) => {
    if (!total || total <= 0) return '0.0'
    return ((advance / total) * 100).toFixed(1)
  }

  const calculateProgressWidth = (percentage: string) => {
    const num = parseFloat(percentage) || 0
    return Math.min(num, 100).toString() + '%'
  }

  const isOverdue = (deliveryDate: string, status: string) => {
    if (status === 'delivered' || status === 'cancelled' || status === 'completed') return false
    const today = new Date()
    const delivery = new Date(deliveryDate)
    return delivery < today
  }

  const handleViewDetails = (booking: AdvanceBookingWithBill) => {
    setSelectedBooking(booking)
    setShowDetailModal(true)
  }

  const handleEdit = (booking: AdvanceBookingWithBill) => {
    setEditingBooking(booking)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!bookingToDelete) return
    
    try {
      await deleteAdvanceBooking(bookingToDelete)
      toast({
        title: 'Success',
        description: 'Advance booking deleted successfully',
      })
      await fetchBookings()
      setShowDeleteDialog(false)
      setBookingToDelete(null)
    } catch (error: any) {
      console.error('Error deleting booking:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete advance booking',
        variant: 'destructive',
      })
    }
  }

  const totalAdvanceAmount = filteredBookings.reduce((sum, booking) => sum + (booking.advance_amount || 0), 0)
  const totalBookings = filteredBookings.length
  const totalAmountDue = filteredBookings.reduce((sum, booking) => sum + (booking.total_amount - booking.advance_amount), 0)
  
  const handlePrintBooking = async (booking: AdvanceBookingWithBill) => {
    try {
      // Set the print data
      setPrintBooking(booking)
      
      // Fetch bill items for the booking
      if (booking.bill_id) {
        try {
          const items = await getBillItems(booking.bill_id)
          setPrintItems(items)
        } catch (error) {
          console.error('Error fetching bill items for print:', error)
          setPrintItems([])
        }
      } else {
        setPrintItems([])
      }
      
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
      console.error('Error printing advance booking:', error)
      toast({
        title: 'Error',
        description: 'Failed to prepare print view',
        variant: 'destructive',
      })
    }
  }
  
  // Apply filters when bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      applyFilters();
    }
  }, [bookings, applyFilters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Advance Bookings</h1>
          <p className="text-muted-foreground">
            Manage advance bookings for customer orders
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Bookings</p>
                <p className="text-xl font-bold text-foreground">{totalBookings}</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Advance</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalAdvanceAmount)}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmountDue)}</p>
              </div>
              <div className="text-2xl">💳</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Advance</p>
                <p className="text-xl font-bold text-foreground">
                  {totalBookings > 0 ? formatCurrency(totalAdvanceAmount / totalBookings) : '₹0.00'}
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
            {/* Status Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-9 px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
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
                placeholder="Name or phone"
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
            <h2 className="text-lg font-semibold text-foreground">Advance Bookings</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchBookings()}
              disabled={isLoading}
              className="h-8 text-xs"
              size="sm"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingBooking(null)
                setShowForm(true)
              }}
              className="h-8 text-xs"
              size="sm"
            >
              ➕ New Booking
            </Button>
          </div>
        </div>

        {/* Booking Form Modal */}
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open)
          if (!open) {
            setEditingBooking(null)
            setFormErrors({})
          }
        }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto" aria-describedby="advance-booking-form-description">
            <DialogHeader>
              <DialogTitle>{editingBooking ? 'Edit Advance Booking' : 'New Advance Booking'}</DialogTitle>
            </DialogHeader>
            <div id="advance-booking-form-description" className="sr-only">
              Form for creating or editing advance bookings. Enter customer details, gold requirements, amounts, and delivery date.
            </div>
            {showForm && (
              <AdvanceBookingForm 
                isEditMode={!!editingBooking}
                bookingData={editingBooking ? {
                  ...editingBooking,
                  bill: bills.find(b => b.id === editingBooking.bill_id) || null
                } : undefined}
                onCancel={() => {
                  setShowForm(false)
                  setEditingBooking(null)
                  setFormErrors({})
                }}
                onSubmitSuccess={() => {
                  setShowForm(false)
                  setEditingBooking(null)
                  setFormErrors({})
                  fetchBookings(); // Refresh the list
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Bookings Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No advance bookings found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {bookings.length === 0 
                    ? 'No advance bookings have been created yet'
                    : 'Try adjusting your filters'
                }
              </p>
            </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer Name</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer Phone</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Advance Paid</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Total Amount</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Amount Due</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Delivery Date</th>
                      <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((booking) => {
                      const advancePercentage = calculateAdvancePercentage(booking.advance_amount, booking.total_amount)
                      const overdue = isOverdue(booking.delivery_date, booking.booking_status)
                      
                      return (
                        <tr
                          key={booking.id}
                          className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                            overdue ? 'bg-red-50 dark:bg-red-900/20' : ''
                          }`}
                        >
                          <td className="py-4 px-4 font-medium text-foreground cursor-pointer hover:text-primary" onClick={() => handleViewDetails(booking)}>
                            {booking.bill?.customers?.name || 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-foreground">{booking.bill?.customers?.phone || 'N/A'}</td>
                          <td className="py-4 px-4 text-foreground">{formatCurrency(booking.advance_amount)}</td>
                          <td className="py-4 px-4 text-foreground">{formatCurrency(booking.total_amount)}</td>
                          <td className="py-4 px-4 text-foreground">{formatCurrency(booking.total_amount - booking.advance_amount)}</td>
                          <td className="py-4 px-4 text-foreground">
                            <div>{formatDate(booking.delivery_date)}</div>
                            {overdue && (
                              <div className="text-xs text-destructive">Overdue</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintBooking(booking);
                                }}
                                className="h-8 text-xs"
                              >
                                🖨️ Print
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(booking)}
                                className="h-8 text-xs"
                              >
                                👁️ View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(booking)}
                                className="h-8 text-xs"
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setBookingToDelete(booking.id)
                                  setShowDeleteDialog(true)
                                }}
                                className="h-8 text-xs"
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredBookings.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
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

      {/* Booking Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={(open) => {
        setShowDetailModal(open)
        if (!open) {
          setSelectedBooking(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-semibold">{selectedBooking.bill?.customers?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Number</p>
                  <p className="font-semibold">{selectedBooking.bill?.customers?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Advance Paid</p>
                  <p className="font-semibold">{formatCurrency(selectedBooking.advance_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">{formatCurrency(selectedBooking.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="font-semibold">{formatCurrency(selectedBooking.total_amount - selectedBooking.advance_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-semibold">{formatDate(selectedBooking.delivery_date)}</p>
                </div>
              </div>

              {selectedBooking.item_description && (
                <div>
                  <p className="text-sm text-muted-foreground">Item Description</p>
                  <p className="font-semibold">{selectedBooking.item_description}</p>
                </div>
              )}

              {selectedBooking.customer_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer Notes</p>
                  <p className="font-semibold">{selectedBooking.customer_notes}</p>
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
              This action cannot be undone. This will permanently delete the advance booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Print View */}
      {showPrintView && printBooking && (
        <AdvanceBookingPrint
          customer={printBooking.bill?.customers || null}
          bill={printBooking.bill || null}
          bookingDate={printBooking.booking_date}
          bookingNo={`AB-${printBooking.id}`}
          totalAmount={printBooking.total_amount}
          advanceAmount={printBooking.advance_amount}
          dueAmount={printBooking.total_amount - printBooking.advance_amount}
          deliveryDate={printBooking.delivery_date}
          itemDescription={printBooking.item_description}
          customerNotes={printBooking.customer_notes}
          items={printItems}
        />
      )}
    </div>
  )
}