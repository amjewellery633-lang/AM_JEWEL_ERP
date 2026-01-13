'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'
import { GoldExchangePrint } from '@/components/gold-exchange/gold-exchange-print'

interface GoldExchange {
  id: number
  bill_id: number | null
  weight: number
  purity: string | null
  rate_per_gram: number
  total_value: number
  notes: string | null
  hsn_code?: string | null
  created_at: string
  bills?: {
    bill_no: string
    bill_date: string
    customers?: {
      name: string
      phone: string
    }
  }
}

export default function GoldExchangePage() {
  const [exchanges, setExchanges] = useState<GoldExchange[]>([])
  const [filteredExchanges, setFilteredExchanges] = useState<GoldExchange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Form state
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingExchange, setEditingExchange] = useState<GoldExchange | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [exchangeToDelete, setExchangeToDelete] = useState<GoldExchange | null>(null)
  const [exchangeToPrint, setExchangeToPrint] = useState<GoldExchange | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    particulars: '',
    hsn_code: '7113',
    weightInput: '',
    purity: '',
    rateInput: '',
    total: 0,
  })
  
  // Daily gold rate
  const [dailyGoldRate, setDailyGoldRate] = useState(0)

  useEffect(() => {
    fetchGoldExchanges()
    fetchDailyGoldRate()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [exchanges, searchTerm, startDate, endDate])

  // Calculate total when weight or rate changes
  useEffect(() => {
    const weight = parseFloat(formData.weightInput) || 0
    const rate = parseFloat(formData.rateInput) || dailyGoldRate || 0
    const total = weight * rate
    setFormData(prev => ({ ...prev, total: total }))
  }, [formData.weightInput, formData.rateInput, dailyGoldRate])

  const fetchDailyGoldRate = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gold_rates')
        .select('rate_per_gram')
        .eq('metal_type', 'gold')
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setDailyGoldRate(parseFloat(data.rate_per_gram) || 0)
        if (!formData.rateInput) {
          setFormData(prev => ({ ...prev, rateInput: (parseFloat(data.rate_per_gram) || 0).toString() }))
        }
      }
    } catch (error) {
      console.error('Error fetching daily gold rate:', error)
    }
  }

  const fetchGoldExchanges = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('old_gold_exchanges')
        .select(`
          *,
          bills(
            bill_no,
            bill_date,
            customers(
              name,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching gold exchanges:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch gold exchange data',
          variant: 'destructive',
        })
        return
      }

      setExchanges((data as any[]) || [])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while fetching gold exchanges',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...exchanges]

    // Search filter (bill number, customer name, phone, particulars)
    if (searchTerm) {
      filtered = filtered.filter(exchange => {
        const billNo = exchange.bills?.bill_no?.toLowerCase() || ''
        const customerName = exchange.bills?.customers?.name?.toLowerCase() || ''
        const customerPhone = exchange.bills?.customers?.phone || ''
        const notes = exchange.notes?.toLowerCase() || ''
        const searchLower = searchTerm.toLowerCase()
        return billNo.includes(searchLower) || 
               customerName.includes(searchLower) || 
               customerPhone.includes(searchTerm) ||
               notes.includes(searchLower)
      })
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(exchange => {
        const exchangeDate = new Date(exchange.created_at)
        const start = new Date(startDate)
        return exchangeDate >= start
      })
    }
    if (endDate) {
      filtered = filtered.filter(exchange => {
        const exchangeDate = new Date(exchange.created_at)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return exchangeDate <= end
      })
    }

    setFilteredExchanges(filtered)
  }

  const handleOpenForm = (exchange?: GoldExchange) => {
    if (exchange) {
      setEditingExchange(exchange)
      const { particulars, hsnCode } = parseNotes(exchange.notes)
      setFormData({
        particulars: particulars,
        hsn_code: hsnCode || '7113',
        weightInput: exchange.weight?.toString() || '',
        purity: exchange.purity || '',
        rateInput: exchange.rate_per_gram?.toString() || dailyGoldRate.toString(),
        total: exchange.total_value || 0,
      })
    } else {
      setEditingExchange(null)
      setFormData({
        particulars: '',
        hsn_code: '7113',
        weightInput: '',
        purity: '',
        rateInput: dailyGoldRate.toString(),
        total: 0,
      })
    }
    setShowFormDialog(true)
  }

  const handleCloseForm = () => {
    setShowFormDialog(false)
    setEditingExchange(null)
    setFormData({
      particulars: '',
      hsn_code: '7113',
      weightInput: '',
      purity: '',
      rateInput: dailyGoldRate.toString(),
      total: 0,
    })
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.weightInput || parseFloat(formData.weightInput) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    if (!formData.rateInput || parseFloat(formData.rateInput) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid rate',
        variant: 'destructive',
      })
      return
    }

    try {
      const supabase = createClient()
      const weight = parseFloat(formData.weightInput)
      const rate = parseFloat(formData.rateInput)
      const total = weight * rate

      // Build notes field
      const notes = [
        formData.particulars && `Description: ${formData.particulars}`,
        formData.hsn_code && `HSN Code: ${formData.hsn_code}`,
      ].filter(Boolean).join(' | ') || null

      if (editingExchange) {
        // Update existing exchange
        const { error } = await supabase
          .from('old_gold_exchanges')
          .update({
            weight: weight,
            purity: formData.purity || null,
            rate_per_gram: rate,
            total_value: total,
            notes: notes,
            hsn_code: formData.hsn_code || '7113',
          })
          .eq('id', editingExchange.id)

        if (error) {
          throw error
        }

        toast({
          title: 'Success',
          description: 'Gold exchange updated successfully',
        })
      } else {
        // Create new exchange (without bill_id for standalone entries)
        const { error } = await supabase
          .from('old_gold_exchanges')
          .insert({
            weight: weight,
            purity: formData.purity || null,
            rate_per_gram: rate,
            total_value: total,
            notes: notes,
            hsn_code: formData.hsn_code || '7113',
            bill_id: null, // Standalone entry
          })

        if (error) {
          throw error
        }

        toast({
          title: 'Success',
          description: 'Gold exchange recorded successfully',
        })
      }

      handleCloseForm()
      fetchGoldExchanges()
    } catch (error: any) {
      console.error('Error saving gold exchange:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save gold exchange',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!exchangeToDelete) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('old_gold_exchanges')
        .delete()
        .eq('id', exchangeToDelete.id)

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Gold exchange deleted successfully',
      })

      setShowDeleteDialog(false)
      setExchangeToDelete(null)
      fetchGoldExchanges()
    } catch (error: any) {
      console.error('Error deleting gold exchange:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete gold exchange',
        variant: 'destructive',
      })
    }
  }

  const handlePrint = (exchange: GoldExchange) => {
    // Store exchange temporarily and trigger print
    setExchangeToPrint(exchange)
    setTimeout(() => {
      window.print()
    }, 100)
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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const parseNotes = (notes: string | null) => {
    if (!notes) return { particulars: 'Old Gold Exchange', hsnCode: '7113' }
    
    let particulars = 'Old Gold Exchange'
    let hsnCode = '7113'
    
    if (notes.includes('Description:')) {
      const descMatch = notes.match(/Description:\s*([^|]+)/)
      if (descMatch) particulars = descMatch[1].trim()
    }
    if (notes.includes('HSN Code:')) {
      const hsnMatch = notes.match(/HSN Code:\s*([^|]+)/)
      if (hsnMatch) hsnCode = hsnMatch[1].trim()
    }
    
    return { particulars, hsnCode }
  }

  const totalExchanged = filteredExchanges.reduce((sum, exchange) => sum + (exchange.total_value || 0), 0)
  const totalWeight = filteredExchanges.reduce((sum, exchange) => sum + (exchange.weight || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Gold Exchange</h1>
            <p className="text-muted-foreground">
              View and manage all old gold exchanges
            </p>
          </div>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-primary hover:bg-primary/90"
          >
            + Record New Exchange
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Exchanges</p>
                <p className="text-xl font-bold text-foreground">{filteredExchanges.length}</p>
              </div>
              <div className="text-2xl">🪙</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Weight</p>
                <p className="text-xl font-bold text-foreground">{totalWeight.toFixed(2)}g</p>
              </div>
              <div className="text-2xl">⚖️</div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalExchanged)}</p>
              </div>
              <div className="text-2xl">💰</div>
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
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-foreground mb-1 block">Search</label>
              <Input
                type="text"
                placeholder="Bill number, customer name, phone or particulars"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
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
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStartDate('')
                  setEndDate('')
                }}
                className="h-9 text-sm px-4"
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Gold Exchange Table */}
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg">🪙</span>
                <h2 className="text-lg font-semibold text-foreground">Gold Exchange Records</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchGoldExchanges()}
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
            ) : filteredExchanges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No gold exchanges found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {exchanges.length === 0 
                    ? 'No gold exchanges have been recorded yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Bill No</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Particulars</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">HSN Code</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Weight (g)</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Purity</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Rate/g</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Total Value</th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExchanges.map((exchange) => {
                      const { particulars, hsnCode } = parseNotes(exchange.notes)
                      return (
                        <tr
                          key={exchange.id}
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="py-4 px-4 text-foreground">{formatDate(exchange.created_at)}</td>
                          <td className="py-4 px-4 font-medium text-foreground">
                            {exchange.bills?.bill_no || (exchange.bill_id ? `#${exchange.bill_id}` : 'Standalone')}
                          </td>
                          <td className="py-4 px-4 text-foreground">
                            {exchange.bills?.customers ? (
                              <div>
                                <div className="font-medium">{exchange.bills.customers.name || 'N/A'}</div>
                                {exchange.bills.customers.phone && (
                                  <div className="text-sm text-muted-foreground">{exchange.bills.customers.phone}</div>
                                )}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="py-4 px-4 text-foreground">{particulars}</td>
                          <td className="py-4 px-4 text-foreground">{hsnCode}</td>
                          <td className="py-4 px-4 text-foreground">{exchange.weight?.toFixed(2) || '0.00'}</td>
                          <td className="py-4 px-4 text-foreground">{exchange.purity || '-'}</td>
                          <td className="py-4 px-4 text-foreground">{formatCurrency(exchange.rate_per_gram)}</td>
                          <td className="py-4 px-4 font-bold text-primary text-lg">
                            {formatCurrency(exchange.total_value)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenForm(exchange)}
                                className="h-8 text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrint(exchange)}
                                className="h-8 text-xs"
                              >
                                Print
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setExchangeToDelete(exchange)
                                  setShowDeleteDialog(true)
                                }}
                                className="h-8 text-xs"
                              >
                                Delete
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
          </div>
        </Card>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingExchange ? 'Edit Gold Exchange' : 'Record New Gold Exchange'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="particulars" className="text-sm font-semibold">Particulars / Description</Label>
                <Input
                  id="particulars"
                  placeholder="Enter description (e.g., Old gold ornaments)"
                  value={formData.particulars}
                  onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="hsn_code" className="text-sm font-semibold">HSN Code</Label>
                <Input
                  id="hsn_code"
                  placeholder="HSN Code (default: 7113)"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="weight" className="text-sm font-semibold">Weight (grams) *</Label>
                <Input
                  id="weight"
                  type="text"
                  placeholder="Enter weight (e.g., 0.5, 3.960)"
                  value={formData.weightInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, weightInput: val })
                    }
                  }}
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="purity" className="text-sm font-semibold">Purity</Label>
                <select
                  id="purity"
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                  className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-2"
                >
                  <option value="">Select Purity</option>
                  <option value="92.5%">92.5%</option>
                  <option value="70%">70%</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rate" className="text-sm font-semibold">Rate per gram (₹) *</Label>
                <Input
                  id="rate"
                  type="text"
                  placeholder={dailyGoldRate > 0 ? `Default: ${dailyGoldRate.toFixed(2)}` : 'Enter rate'}
                  value={formData.rateInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, rateInput: val })
                    }
                  }}
                  onBlur={() => {
                    if (!formData.rateInput && dailyGoldRate > 0) {
                      setFormData({ ...formData, rateInput: dailyGoldRate.toString() })
                    }
                  }}
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="total" className="text-sm font-semibold">Total Value (₹)</Label>
                <Input
                  id="total"
                  type="text"
                  placeholder="Auto-calculated"
                  value={formData.total ? formData.total.toFixed(2) : ''}
                  className="h-11 mt-2 bg-muted font-semibold"
                  readOnly
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {editingExchange ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the gold exchange record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExchangeToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Component (hidden, only shows when printing) */}
      {exchangeToPrint && (
        <div style={{ display: 'none' }} className="print-only">
          <GoldExchangePrint exchange={exchangeToPrint} />
        </div>
      )}
    </div>
  )
}
