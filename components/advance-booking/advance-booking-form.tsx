'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  getCustomersByPhone,
  createCustomer,
  getBills,
  createBill,
  createBillItems,
  createAdvanceBooking,
  updateAdvanceBooking,
  getItemByBarcode,
  getBillItems,
  BillItem,
  AdvanceBooking,
  Item,
  Bill
} from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

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

interface Customer {
  id: number
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

interface OldGoldExchange {
  id?: string // Temporary ID for new entries, or database ID for existing
  weight: number
  weightInput: string
  purity: string
  rate: number
  rateInput: string
  total_value: number
  hsn_code: string
  particulars: string
}

interface AdvanceBookingFormData {
  customer: Customer | null
  customerPhone: string
  customerName: string
  customerEmail: string
  customerAddress: string
  customerNotes: string
  goldRequirements: (Omit<BillItem, 'bill_id'> & { purity?: string; sl_no?: number })[]
  oldGoldExchanges: OldGoldExchange[]
  newItemName: string
  newItemWeight: string
  newItemPurity: string
  newItemMetalType: string  // Added metal type field
  newItemMakingCharges: string
  newItemBarcode: string
  rate: number  // Added rate field
  totalAmount: number
  advanceAmount: number
  amountDue: number
  deliveryDate: string
  itemDescription: string
}

interface AdvanceBookingFormProps {
  isEditMode?: boolean;
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
  bookingData?: AdvanceBookingWithBill; // For editing existing bookings
}

export function AdvanceBookingForm({ isEditMode = false, onCancel, onSubmitSuccess, bookingData }: AdvanceBookingFormProps = {}) {
  const [formData, setFormData] = useState<AdvanceBookingFormData>(() => {
    // If editing, initialize with booking data
    if (bookingData) {
      return {
        customer: bookingData.bill?.customers || null,
        customerPhone: bookingData.bill?.customers?.phone || '',
        customerName: bookingData.bill?.customers?.name || '',
        customerEmail: bookingData.bill?.customers?.email || '',
        customerAddress: bookingData.bill?.customers?.address || '',
        customerNotes: bookingData.customer_notes || bookingData.bill?.customers?.notes || '',
        goldRequirements: [], // Would need to fetch bill items separately
        oldGoldExchanges: [], // Would need to fetch old gold exchanges separately
        newItemName: '',
        newItemWeight: '',
        newItemPurity: '',
        newItemMetalType: 'gold',
        newItemMakingCharges: '',
        newItemBarcode: '',
        rate: 0,
        totalAmount: bookingData.total_amount,
        advanceAmount: bookingData.advance_amount,
        amountDue: bookingData.total_amount - bookingData.advance_amount,
        deliveryDate: bookingData.delivery_date,
        itemDescription: bookingData.item_description || ''
      }
    }
    
    // Default values for new booking
    return {
      customer: null,
      customerPhone: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      customerNotes: '',
      goldRequirements: [],
      oldGoldExchanges: [],
      newItemName: '',
      newItemWeight: '',
      newItemPurity: '',
      newItemMetalType: 'gold',
      newItemMakingCharges: '',
      newItemBarcode: '',
      rate: 0,
      totalAmount: 0,
      advanceAmount: 0,
      amountDue: 0,
      deliveryDate: '',
      itemDescription: ''
    }
  })

  // Initialize total amount lock state and fetch bill items when editing
  useEffect(() => {
    if (bookingData) {
      // When editing, the total amount is effectively "locked" since it comes from the database
      setIsTotalAmountLocked(true)
      
      // Fetch bill items for this booking
      const fetchBillItems = async () => {
        if (bookingData.bill_id) {
          try {
            const items = await getBillItems(bookingData.bill_id)
            
            // Map bill items to form format
            const mappedItems: (Omit<BillItem, 'bill_id'> & { purity?: string; sl_no?: number })[] = items.map((item, index) => ({
              id: item.id,
              item_name: item.item_name || '',
              weight: item.weight || 0,
              rate: item.rate || 0,
              making_charges: item.making_charges || 0,
              gst_rate: item.gst_rate || 0,
              line_total: item.line_total || 0,
              barcode: item.barcode,
              metal_type: item.metal_type,
              hsn_code: item.hsn_code,
              purity: (item as any).purity || undefined,
              sl_no: (item as any).sl_no || index + 1
            }))
            
            setFormData(prev => ({
              ...prev,
              goldRequirements: mappedItems
            }))
          } catch (error) {
            console.error('Error fetching bill items:', error)
            toast({
              title: 'Error',
              description: 'Failed to load bill items',
              variant: 'destructive',
            })
          }
          
          // Fetch old gold exchanges
          try {
            const supabase = createClient()
            const { data: oldGoldData, error: oldGoldError } = await supabase
              .from('old_gold_exchanges')
              .select('*')
              .eq('bill_id', bookingData.bill_id)
            
            if (!oldGoldError && oldGoldData && oldGoldData.length > 0) {
              const mappedOldGold: OldGoldExchange[] = oldGoldData.map((og) => {
                // Parse notes to extract particulars and HSN code
                const notes = og.notes || ''
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
                
                return {
                  id: og.id.toString(),
                  weight: og.weight || 0,
                  weightInput: (og.weight || 0).toString(),
                  purity: og.purity || '',
                  rate: og.rate_per_gram || 0,
                  rateInput: (og.rate_per_gram || 0).toString(),
                  total_value: og.total_value || 0,
                  hsn_code: hsnCode,
                  particulars: particulars
                }
              })
              
              setFormData(prev => ({
                ...prev,
                oldGoldExchanges: mappedOldGold
              }))
            }
          } catch (error) {
            console.error('Error fetching old gold exchanges:', error)
          }
        }
      }
      
      fetchBillItems()
    } else {
      setIsTotalAmountLocked(false)
    }
  }, [bookingData])
  
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [dailyGoldRate, setDailyGoldRate] = useState(0)
  const [isSearchingItem, setIsSearchingItem] = useState(false)
  const [isTotalAmountLocked, setIsTotalAmountLocked] = useState(false)
  
  // State for all metal rates (like sales billing)
  const [allMetalRates, setAllMetalRates] = useState<Record<string, number>>({
    gold: 0,
    gold_916: 0,
    gold_750: 0,
    silver_92: 0,
    silver_70: 0,
    selam_silver: 0,
  })
  
  // Selected metal type for new items
  const [selectedMetalType, setSelectedMetalType] = useState<'gold' | 'gold_916' | 'gold_750' | 'silver_92' | 'silver_70' | 'selam_silver'>('gold')
  
  // State for editing old gold exchange
  const [editingOldGoldId, setEditingOldGoldId] = useState<string | null>(null)
  const [newOldGold, setNewOldGold] = useState<OldGoldExchange>({
    weight: 0,
    weightInput: '',
    purity: '',
    rate: 0,
    rateInput: '',
    total_value: 0,
    hsn_code: '7113',
    particulars: ''
  })

  // Load all daily metal rates on component mount (like sales billing)
  useEffect(() => {
    const fetchAllDailyRates = async () => {
      try {
        const supabase = createClient()
        
        // Fetch all rates for today
        const { data, error } = await supabase
          .from('gold_rates')
          .select('*')
          .eq('effective_date', new Date().toISOString().split('T')[0])

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching all metal rates:', JSON.stringify(error))
          toast({
            title: 'Error',
            description: 'Failed to load daily gold rate',
            variant: 'destructive',
          })
        } else if (data && data.length > 0) {
          // Create a map of metal types to rates
          const ratesMap: Record<string, number> = {
            gold: 0,
            gold_916: 0,
            gold_750: 0,
            silver_92: 0,
            silver_70: 0,
            selam_silver: 0,
          }
          
          data.forEach(item => {
            ratesMap[item.metal_type] = parseFloat(item.rate_per_gram) || 0
          })
          
          setAllMetalRates(ratesMap)
          
          // Set the default selected metal rate
          const selectedRate = ratesMap[selectedMetalType] || 0
          setDailyGoldRate(selectedRate)
        } else {
          // If no rates found for today, try to get latest rates
          const { data: latestData, error: latestError } = await supabase
            .from('gold_rates')
            .select('*')
            .order('effective_date', { ascending: false })
            .limit(6)
          
          if (!latestError && latestData && latestData.length > 0) {
            const ratesMap: Record<string, number> = {
              gold: 0,
              gold_916: 0,
              gold_750: 0,
              silver_92: 0,
              silver_70: 0,
              selam_silver: 0,
            }
            
            latestData.forEach(item => {
              ratesMap[item.metal_type] = parseFloat(item.rate_per_gram) || 0
            })
            
            setAllMetalRates(ratesMap)
            const selectedRate = ratesMap[selectedMetalType] || 0
            setDailyGoldRate(selectedRate)
          }
        }
      } catch (error: any) {
        console.error('Error fetching all daily metal rates:', JSON.stringify(error))
        toast({
          title: 'Error',
          description: 'Failed to load daily gold rate',
          variant: 'destructive',
        })
      }
    }

    fetchAllDailyRates()
  }, [])
  
  // Update daily rate when selected metal type changes
  useEffect(() => {
    const selectedRate = allMetalRates[selectedMetalType] || 0
    setDailyGoldRate(selectedRate)
  }, [selectedMetalType, allMetalRates])

  // Auto-fetch item details when barcode is scanned/entered
  useEffect(() => {
    const barcodeValue = formData.newItemBarcode.trim()
    if (!barcodeValue) {
      console.log('No barcode value, skipping search')
      setIsSearchingItem(false)
      return
    }

    console.log('Starting barcode search for:', barcodeValue)
    
    // Debounce the search to avoid too many API calls
    const searchItem = async () => {
      setIsSearchingItem(true)
      try {
        console.log('Fetching item by barcode:', barcodeValue)
        const item = await getItemByBarcode(barcodeValue)
        
        if (item) {
          console.log('Item found in database:', item)
          // Auto-populate item fields from database
          setFormData(prev => ({
            ...prev,
            newItemName: item.item_name || prev.newItemName,
            newItemWeight: item.weight?.toString() || prev.newItemWeight,
            newItemPurity: item.purity || prev.newItemPurity,
            newItemMakingCharges: item.making_charges?.toString() || prev.newItemMakingCharges,
          }))
          
          toast({
            title: 'Item Found',
            description: `Successfully loaded: ${item.item_name || 'Unnamed item'}`,
          })
        } else {
          console.log('No item found for barcode:', barcodeValue)
        }
      } catch (error: any) {
        console.error('Error searching for item by barcode:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
        })
        
        // Item not found - that's okay, user can enter manually
        if (error.code === 'PGRST116') {
          console.log('Item not found for barcode:', barcodeValue)
        } else {
          console.error('Error searching for item:', error)
        }
      } finally {
        setIsSearchingItem(false)
      }
    }

    // Wait 300ms after user stops typing before searching
    const debounceTimer = setTimeout(searchItem, 300)
    return () => clearTimeout(debounceTimer)
  }, [formData.newItemBarcode])

  // Calculate amount due when total amount or advance amount changes
  useEffect(() => {
    const amountDue = formData.totalAmount - formData.advanceAmount
    setFormData(prev => ({
      ...prev,
      amountDue: Math.max(0, amountDue)
    }))
  }, [formData.totalAmount, formData.advanceAmount])

  // Handle manual input for total amount
  const handleTotalAmountChange = (value: string) => {
    const total = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      totalAmount: total
    }))
    // Lock the total amount when manually changed
    setIsTotalAmountLocked(true)
  }

  // Handle manual input for advance amount
  const handleAdvanceAmountChange = (value: string) => {
    const advance = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      advanceAmount: advance
    }))
  }

  const handleSearchCustomer = async () => {
    if (!formData.customerPhone.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number to search',
        variant: 'destructive',
      })
      return
    }

    console.log('Searching for customer with phone:', formData.customerPhone.trim())
    setIsSearching(true)
    try {
      const customers = await getCustomersByPhone(formData.customerPhone.trim())
      console.log('Search results:', customers)
      
      if (customers.length > 0) {
        console.log('Customer found:', customers[0])
        setExistingCustomer(customers[0])
        setFormData(prev => ({
          ...prev,
          customer: customers[0],
          customerName: customers[0].name || '',
          customerEmail: customers[0].email || '',
          customerAddress: customers[0].address || '',
          customerNotes: customers[0].notes || ''
        }))
        toast({
          title: 'Customer Found',
          description: `Found customer: ${customers[0].name || 'N/A'}`
        })
      } else {
        console.log('No customer found with phone:', formData.customerPhone.trim())
        setExistingCustomer(null)
        setFormData(prev => ({
          ...prev,
          customer: null
        }))
        toast({
          title: 'Customer Not Found',
          description: 'Customer does not exist. Please add new customer details.'
        })
      }
    } catch (error: any) {
      console.error('Error searching customer:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      toast({
        title: 'Error',
        description: error.message || 'Failed to search customer',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      toast({
        title: 'Error',
        description: 'Name and phone are required to create a customer',
        variant: 'destructive',
      })
      return
    }

    console.log('Creating customer with data:', {
      name: formData.customerName.trim(),
      phone: formData.customerPhone.trim(),
      email: formData.customerEmail.trim() || null,
      address: formData.customerAddress.trim() || null,
      notes: formData.customerNotes.trim() || null,
    })
    
    setIsCreatingCustomer(true)
    try {
      const newCustomer = await createCustomer({
        name: formData.customerName.trim(),
        phone: formData.customerPhone.trim(),
        email: formData.customerEmail.trim() || undefined,
        address: formData.customerAddress.trim() || undefined,
        notes: formData.customerNotes.trim() || undefined,
      })
      
      console.log('Customer created successfully:', newCustomer)

      setExistingCustomer(newCustomer)
      setFormData(prev => ({
        ...prev,
        customer: newCustomer
      }))

      toast({
        title: 'Customer Created',
        description: `Customer ${newCustomer.name} has been created successfully`
      })
    } catch (error: any) {
      console.error('Error creating customer:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  const handleAddGoldItem = () => {
    if (!formData.newItemName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an item name',
        variant: 'destructive',
      })
      return
    }

    const weight = parseFloat(formData.newItemWeight) || 0
    if (weight <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    const purity = formData.newItemPurity.trim()
    if (!purity) {
      toast({
        title: 'Error',
        description: 'Please enter purity (e.g., 916, 22K)',
        variant: 'destructive',
      })
      return
    }

    console.log('Adding gold item with data:', {
      name: formData.newItemName.trim(),
      weight,
      purity,
      makingCharges: parseFloat(formData.newItemMakingCharges) || 0,
      barcode: formData.newItemBarcode.trim() || null
    })
    
    const makingCharges = parseFloat(formData.newItemMakingCharges) || 0
    const metalType = formData.newItemMetalType || 'gold'
    const metalRate = allMetalRates[metalType] || 0
    const metalValue = weight * metalRate
    const itemTotal = metalValue + makingCharges

    const newItem: Omit<BillItem, 'bill_id'> & { purity?: string; sl_no?: number } = {
      id: Date.now().toString(), // temporary ID
      item_name: formData.newItemName.trim(),
      weight,
      rate: metalRate,
      making_charges: makingCharges,
      gst_rate: 0, // GST will be calculated at bill level
      line_total: itemTotal,
      purity,
      hsn_code: '711319',
      sl_no: formData.goldRequirements.length + 1,
      barcode: formData.newItemBarcode.trim() || undefined, // Adding barcode if available
      metal_type: metalType // Add metal type
    }

    // Calculate new total amount based on all items
    const newTotalAmountFromItems = formData.goldRequirements.reduce((sum, item) => sum + (item.line_total || 0), 0) + itemTotal;
    
    console.log('New total amount calculation:', {
      currentItemsTotal: formData.goldRequirements.reduce((sum, item) => sum + (item.line_total || 0), 0),
      newItemTotal: itemTotal,
      newTotalAmountFromItems,
      isTotalAmountLocked,
      finalTotalAmount: isTotalAmountLocked ? formData.totalAmount : newTotalAmountFromItems
    })
    
    setFormData(prev => ({
      ...prev,
      goldRequirements: [...prev.goldRequirements, newItem],
      // Only update totalAmount if it's not locked, otherwise keep the locked value
      totalAmount: isTotalAmountLocked ? prev.totalAmount : newTotalAmountFromItems,
      newItemName: '',
      newItemWeight: '',
      newItemPurity: '',
      newItemMetalType: 'gold',
      newItemMakingCharges: '',
      newItemBarcode: ''
    }))

    toast({
      title: 'Item Added',
      description: `${formData.newItemName} has been added to requirements`
    })
  }

  const handleRemoveGoldItem = (index: number) => {
    const updatedGoldRequirements = formData.goldRequirements.filter((_, i) => i !== index)
    const newTotalAmountFromItems = updatedGoldRequirements.reduce((sum, item) => sum + (item.line_total || 0), 0)

    setFormData(prev => ({
      ...prev,
      goldRequirements: updatedGoldRequirements,
      // Only update totalAmount if it's not locked, otherwise keep the locked value
      totalAmount: isTotalAmountLocked ? prev.totalAmount : newTotalAmountFromItems
    }))
  }

  // Calculate old gold exchange total
  useEffect(() => {
    const weight = parseFloat(newOldGold.weightInput) || 0
    const rate = parseFloat(newOldGold.rateInput) || (allMetalRates.gold > 0 ? allMetalRates.gold : 0)
    const total = weight * rate
    
    // Auto-fill rateInput with gold rate if weight is entered and rateInput is empty
    if (weight > 0 && !newOldGold.rateInput && allMetalRates.gold > 0) {
      setNewOldGold(prev => ({ 
        ...prev, 
        weight, 
        rate, 
        rateInput: allMetalRates.gold.toString(),
        total_value: Math.round(total * 100) / 100
      }))
    } else {
      setNewOldGold(prev => ({ ...prev, weight, rate, total_value: Math.round(total * 100) / 100 }))
    }
  }, [newOldGold.weightInput, newOldGold.rateInput, allMetalRates.gold])

  const handleAddOldGold = () => {
    if (!newOldGold.weightInput || parseFloat(newOldGold.weightInput) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    const oldGoldEntry: OldGoldExchange = {
      id: Date.now().toString(),
      weight: newOldGold.weight,
      weightInput: newOldGold.weightInput,
      purity: newOldGold.purity,
      rate: newOldGold.rate,
      rateInput: newOldGold.rateInput,
      total_value: newOldGold.total_value,
      hsn_code: newOldGold.hsn_code || '7113',
      particulars: newOldGold.particulars || ''
    }

    setFormData(prev => ({
      ...prev,
      oldGoldExchanges: [...prev.oldGoldExchanges, oldGoldEntry]
    }))

    // Reset form
    setNewOldGold({
      weight: 0,
      weightInput: '',
      purity: '',
      rate: 0,
      rateInput: '',
      total_value: 0,
      hsn_code: '7113',
      particulars: ''
    })

    toast({
      title: 'Success',
      description: 'Old gold exchange entry added'
    })
  }

  const handleEditOldGold = (id: string) => {
    const oldGold = formData.oldGoldExchanges.find(og => og.id === id)
    if (oldGold) {
      setNewOldGold({
        weight: oldGold.weight,
        weightInput: oldGold.weightInput,
        purity: oldGold.purity,
        rate: oldGold.rate,
        rateInput: oldGold.rateInput,
        total_value: oldGold.total_value,
        hsn_code: oldGold.hsn_code,
        particulars: oldGold.particulars
      })
      setEditingOldGoldId(id)
    }
  }

  const handleUpdateOldGold = () => {
    if (!editingOldGoldId) return

    if (!newOldGold.weightInput || parseFloat(newOldGold.weightInput) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      oldGoldExchanges: prev.oldGoldExchanges.map(og => 
        og.id === editingOldGoldId 
          ? {
              ...og,
              weight: newOldGold.weight,
              weightInput: newOldGold.weightInput,
              purity: newOldGold.purity,
              rate: newOldGold.rate,
              rateInput: newOldGold.rateInput,
              total_value: newOldGold.total_value,
              hsn_code: newOldGold.hsn_code || '7113',
              particulars: newOldGold.particulars || ''
            }
          : og
      )
    }))

    // Reset form
    setNewOldGold({
      weight: 0,
      weightInput: '',
      purity: '',
      rate: 0,
      rateInput: '',
      total_value: 0,
      hsn_code: '7113',
      particulars: ''
    })
    setEditingOldGoldId(null)

    toast({
      title: 'Success',
      description: 'Old gold exchange entry updated'
    })
  }

  const handleCancelEditOldGold = () => {
    setNewOldGold({
      weight: 0,
      weightInput: '',
      purity: '',
      rate: 0,
      rateInput: '',
      total_value: 0,
      hsn_code: '7113',
      particulars: ''
    })
    setEditingOldGoldId(null)
  }

  const handleDeleteOldGold = (id: string) => {
    setFormData(prev => ({
      ...prev,
      oldGoldExchanges: prev.oldGoldExchanges.filter(og => og.id !== id)
    }))
    toast({
      title: 'Success',
      description: 'Old gold exchange entry deleted'
    })
  }

  const validateForm = () => {
    if (!formData.customer) {
      toast({
        title: 'Error',
        description: 'Please select or create a customer',
        variant: 'destructive',
      })
      return false
    }

    if (formData.totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Total amount must be greater than 0',
        variant: 'destructive',
      })
      return false
    }

    if (formData.goldRequirements.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one gold requirement',
        variant: 'destructive',
      })
      return false
    }

    if (formData.advanceAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Advance amount must be greater than 0',
        variant: 'destructive',
      })
      return false
    }

    if (formData.totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Total amount must be greater than 0',
        variant: 'destructive',
      })
      return false
    }

    if (formData.advanceAmount > formData.totalAmount) {
      toast({
        title: 'Error',
        description: 'Advance amount cannot be greater than total amount',
        variant: 'destructive',
      })
      return false
    }

    // If total amount is locked (manually entered), validate that it's reasonable
    if (isTotalAmountLocked && formData.totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Total amount must be greater than 0 when manually entered',
        variant: 'destructive',
      })
      return false
    }

    if (formData.advanceAmount < 0) {
      toast({
        title: 'Error',
        description: 'Advance amount cannot be negative',
        variant: 'destructive',
      })
      return false
    }

    if (formData.totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Total amount must be greater than 0',
        variant: 'destructive',
      })
      return false
    }

    if (!formData.deliveryDate) {
      toast({
        title: 'Error',
        description: 'Please select a delivery date',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }

    try {
      console.log('Starting advance booking submission...')
      console.log('Form data:', formData)
      console.log('Customer data:', formData.customer)
      
      if (isEditMode && bookingData) {
        console.log('Updating existing booking with ID:', bookingData.id)
        // Update existing advance booking
        await updateAdvanceBooking(bookingData.id, {
          delivery_date: formData.deliveryDate,
          advance_amount: formData.advanceAmount,
          total_amount: formData.totalAmount,
          item_description: formData.itemDescription,
          customer_notes: formData.customerNotes,
        })
        console.log('Booking updated successfully')

        // Handle old gold exchanges for existing booking
        if (bookingData.bill_id) {
          try {
            const supabase = createClient()
            
            // Get existing old gold exchanges for this bill
            const { data: existingOldGold } = await supabase
              .from('old_gold_exchanges')
              .select('id')
              .eq('bill_id', bookingData.bill_id)
            
            const existingIds = existingOldGold?.map(og => og.id.toString()) || []
            const currentIds = formData.oldGoldExchanges
              .filter(og => og.id && !isNaN(parseInt(og.id)))
              .map(og => og.id!)

            // Delete old gold exchanges that are no longer in the form
            const idsToDelete = existingIds.filter(id => !currentIds.includes(id))
            if (idsToDelete.length > 0) {
              await supabase
                .from('old_gold_exchanges')
                .delete()
                .in('id', idsToDelete.map(id => parseInt(id)))
            }

            // Update or insert old gold exchanges
            for (const oldGold of formData.oldGoldExchanges) {
              const oldGoldNotes = [
                oldGold.particulars && `Description: ${oldGold.particulars}`,
                oldGold.hsn_code && `HSN Code: ${oldGold.hsn_code}`,
              ].filter(Boolean).join(' | ') || null

              if (oldGold.id && !isNaN(parseInt(oldGold.id))) {
                // Update existing
                await supabase
                  .from('old_gold_exchanges')
                  .update({
                    weight: oldGold.weight,
                    purity: oldGold.purity || null,
                    rate_per_gram: oldGold.rate,
                    total_value: oldGold.total_value,
                    notes: oldGoldNotes,
                  })
                  .eq('id', parseInt(oldGold.id))
              } else {
                // Insert new
                await supabase
                  .from('old_gold_exchanges')
                  .insert({
                    bill_id: bookingData.bill_id,
                    weight: oldGold.weight,
                    purity: oldGold.purity || null,
                    rate_per_gram: oldGold.rate,
                    total_value: oldGold.total_value,
                    notes: oldGoldNotes,
                  })
              }
            }
          } catch (error) {
            console.error('Error handling old gold exchanges during update:', error)
          }
        }
      } else {
        console.log('Creating new booking...')
        console.log('Customer ID:', formData.customer?.id)
        
        // Create the bill first
        const billData = {
          customer_id: formData.customer!.id,
          bill_date: new Date().toISOString().split('T')[0],
          subtotal: formData.totalAmount,
          gst_amount: 0, // Will be calculated based on sale type
          cgst: 0,
          sgst: 0,
          igst: 0,
          discount: 0,
          grand_total: formData.totalAmount,
          sale_type: 'gst' as const,
          payment_method: JSON.stringify([{
            id: 'advance',
            type: 'cash',
            amount: formData.advanceAmount.toString(),
            reference: 'Advance booking payment'
          }]),
          bill_status: 'final' as const,
        }
        
        console.log('Creating bill with data:', billData)
        const bill = await createBill(billData)
        console.log('Bill created successfully with ID:', bill.id)

        // Validate bill ID and gold requirements before creating bill items
        if (!bill.id) {
          throw new Error('Bill ID is missing after bill creation')
        }
        
        if (formData.goldRequirements.length === 0) {
          throw new Error('No gold requirements specified')
        }
        
        // Create bill items
        const billItemsData = formData.goldRequirements.map((item, index) => {
          // Validate each item has required data
          if (!item.item_name) {
            throw new Error(`Item ${index + 1} is missing name`)
          }
          if (!item.weight || item.weight <= 0) {
            throw new Error(`Item ${index + 1} (${item.item_name}) has invalid weight: ${item.weight}`)
          }
          if (!item.rate || item.rate <= 0) {
            throw new Error(`Item ${index + 1} (${item.item_name}) has invalid rate: ${item.rate}`)
          }
          if (!item.line_total || item.line_total <= 0) {
            throw new Error(`Item ${index + 1} (${item.item_name}) has invalid line total: ${item.line_total}`)
          }
          
          return {
            bill_id: bill.id,
            item_name: item.item_name,
            weight: item.weight,
            rate: item.rate,
            making_charges: item.making_charges || 0,
            gst_rate: item.gst_rate || 0,
            line_total: item.line_total,
            barcode: item.barcode || undefined, // Use undefined instead of null to avoid schema issues
            metal_type: item.metal_type || undefined,
            purity: (item as any).purity || undefined,
            hsn_code: item.hsn_code || '711319',
            sl_no: (item as any).sl_no || index + 1
          }
        })
        
        console.log('Creating bill items:', billItemsData)
        console.log('Bill ID for items:', bill.id)
        await createBillItems(bill.id, billItemsData)
        console.log('Bill items created successfully')

        // Save old gold exchanges
        if (formData.oldGoldExchanges.length > 0) {
          try {
            const supabase = createClient()
            
            for (const oldGold of formData.oldGoldExchanges) {
              // Build notes field with all relevant information
              const oldGoldNotes = [
                oldGold.particulars && `Description: ${oldGold.particulars}`,
                oldGold.hsn_code && `HSN Code: ${oldGold.hsn_code}`,
              ].filter(Boolean).join(' | ') || null

              // Check if this is an existing entry (has numeric ID) or new entry
              if (oldGold.id && !isNaN(parseInt(oldGold.id))) {
                // Update existing old gold exchange
                const { error: oldGoldError } = await supabase
                  .from('old_gold_exchanges')
                  .update({
                    weight: oldGold.weight,
                    purity: oldGold.purity || null,
                    rate_per_gram: oldGold.rate,
                    total_value: oldGold.total_value,
                    notes: oldGoldNotes,
                  })
                  .eq('id', parseInt(oldGold.id))

                if (oldGoldError) {
                  console.error('Error updating old_gold_exchanges:', oldGoldError)
                }
              } else {
                // Insert new old gold exchange
                const { error: oldGoldError } = await supabase
                  .from('old_gold_exchanges')
                  .insert({
                    bill_id: bill.id,
                    weight: oldGold.weight,
                    purity: oldGold.purity || null,
                    rate_per_gram: oldGold.rate,
                    total_value: oldGold.total_value,
                    notes: oldGoldNotes,
                  })

                if (oldGoldError) {
                  console.error('Error saving to old_gold_exchanges:', oldGoldError)
                }
              }
            }
          } catch (error) {
            console.error('Error handling old gold exchanges:', error)
          }
        }

        // Create advance booking
        const bookingData = {
          bill_id: bill.id,
          booking_date: new Date().toISOString().split('T')[0],
          delivery_date: formData.deliveryDate,
          advance_amount: formData.advanceAmount,
          total_amount: formData.totalAmount,
          item_description: formData.itemDescription,
          customer_notes: formData.customerNotes,
          booking_status: 'active' as const
        }
        
        console.log('Creating advance booking with data:', bookingData)
        await createAdvanceBooking(bookingData)
        console.log('Advance booking created successfully')
      }

      toast({
        title: 'Success',
        description: isEditMode ? 'Advance booking updated successfully' : 'Advance booking created successfully'
      })

      // Reset form
      setFormData({
        customer: null,
        customerPhone: '',
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        customerNotes: '',
        goldRequirements: [],
        oldGoldExchanges: [],
        newItemName: '',
        newItemWeight: '',
        newItemPurity: '',
        newItemMetalType: 'gold',
        newItemMakingCharges: '',
        newItemBarcode: '',
        rate: 0,
        totalAmount: 0,
        advanceAmount: 0,
        amountDue: 0,
        deliveryDate: '',
        itemDescription: '',
      })
      setNewOldGold({
        weight: 0,
        weightInput: '',
        purity: '',
        rate: 0,
        rateInput: '',
        total_value: 0,
        hsn_code: '7113',
        particulars: ''
      })
      setEditingOldGoldId(null)
      setExistingCustomer(null)
      setIsTotalAmountLocked(false)
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
    } catch (error: any) {
      console.error('Error creating advance booking:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      
      // Check for specific error types
      if (error.message?.includes('foreign key')) {
        console.error('Foreign key constraint error - likely customer ID issue')
      } else if (error.message?.includes('null value')) {
        console.error('Null value constraint error - missing required field')
      } else if (error.message?.includes('unique constraint')) {
        console.error('Unique constraint error')
      } else if (error.message?.includes('customer_id')) {
        console.error('Customer ID error - customer might not exist')
      } else if (error.message?.includes('bill_id')) {
        console.error('Bill ID error')
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to create advance booking',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Advance Booking</h1>
          <p className="text-muted-foreground">
            Create advance bookings for customer orders
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Section */}
          <Card className="p-8 mb-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <span className="text-blue-500 text-xl">👤</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Customer Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="customerPhone"
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="Enter customer phone number"
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchCustomer}
                    disabled={isSearching}
                    className="h-10"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
              
              {existingCustomer ? (
                <div className="flex items-end">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Existing Customer</p>
                    <p className="font-semibold text-foreground">{existingCustomer.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{existingCustomer.phone}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Customer name"
                    className="h-10"
                  />
                </div>
              )}
            </div>

            {!existingCustomer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    placeholder="Customer email"
                    className="h-10"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerAddress">Address</Label>
                  <Input
                    id="customerAddress"
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    placeholder="Customer address"
                    className="h-10"
                  />
                </div>
              </div>
            )}

            {!existingCustomer && (
              <div className="mb-4">
                <Label htmlFor="customerNotes">Customer Notes</Label>
                <Input
                  id="customerNotes"
                  type="text"
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                  placeholder="Additional notes about customer"
                  className="h-10"
                />
              </div>
            )}

            {!existingCustomer && (
              <Button
                type="button"
                variant="default"
                onClick={handleCreateCustomer}
                disabled={isCreatingCustomer}
                className="h-10"
              >
                {isCreatingCustomer ? 'Creating Customer...' : 'Create New Customer'}
              </Button>
            )}
          </Card>

          {/* Gold Requirements Section */}
          <Card className="p-8 mb-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary text-xl">📦</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Item Requirements</h2>
            </div>
            
            {/* Daily Metal Rates Display */}
            <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="text-base font-semibold text-foreground mb-4 block">Daily Metal Rates (₹/gram)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { value: 'gold', label: 'Gold (Standard)' },
                  { value: 'gold_916', label: 'Gold (22k)' },
                  { value: 'gold_750', label: 'Gold (18k)' },
                  { value: 'silver_92', label: 'Silver (92.5%)' },
                  { value: 'silver_70', label: 'Silver (70%)' },
                  { value: 'selam_silver', label: 'Selam Silver' },
                ].map((metal) => (
                  <div key={metal.value} className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <label className="text-sm font-medium text-muted-foreground">{metal.label}</label>
                    <div className="text-lg font-bold text-foreground">
                      ₹{allMetalRates[metal.value]?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
              <div>
                <Label htmlFor="newItemName" className="text-sm font-semibold">Item Name *</Label>
                <Input
                  id="newItemName"
                  type="text"
                  value={formData.newItemName}
                  onChange={(e) => setFormData({...formData, newItemName: e.target.value})}
                  placeholder="Item name"
                  className="h-11 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="newItemWeight" className="text-sm font-semibold">Weight (grams) *</Label>
                <Input
                  id="newItemWeight"
                  type="text"
                  value={formData.newItemWeight}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setFormData({...formData, newItemWeight: val})
                    }
                  }}
                  placeholder="Weight in grams"
                  className="h-11 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="newItemMetalType" className="text-sm font-semibold">Metal Type *</Label>
                <select
                  id="newItemMetalType"
                  value={formData.newItemMetalType}
                  onChange={(e) => {
                    const metalType = e.target.value as 'gold' | 'gold_916' | 'gold_750' | 'silver_92' | 'silver_70' | 'selam_silver'
                    setSelectedMetalType(metalType)
                    // Auto-set purity based on metal type
                    let defaultPurity = ''
                    if (metalType === 'gold_916') {
                      defaultPurity = '22k'
                    } else if (metalType === 'gold_750') {
                      defaultPurity = '18k'
                    } else if (metalType === 'silver_92') {
                      defaultPurity = '92.5%'
                    } else if (metalType === 'silver_70') {
                      defaultPurity = '70%'
                    } else if (metalType === 'gold') {
                      defaultPurity = '24k'
                    }
                    setFormData(prev => ({
                      ...prev,
                      newItemMetalType: metalType,
                      newItemPurity: defaultPurity,
                      rate: allMetalRates[metalType] || 0
                    }))
                  }}
                  className="h-11 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-base"
                >
                  <option value="gold">Gold (Standard)</option>
                  <option value="gold_916">Gold (22k/91.6%)</option>
                  <option value="gold_750">Gold (18k/75%)</option>
                  <option value="silver_92">Silver (92.5%)</option>
                  <option value="silver_70">Silver (70%)</option>
                  <option value="selam_silver">Selam Silver</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="newItemPurity" className="text-sm font-semibold">Purity *</Label>
                <select
                  id="newItemPurity"
                  value={formData.newItemPurity}
                  onChange={(e) => setFormData({...formData, newItemPurity: e.target.value})}
                  className="h-11 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-base"
                >
                  <option value="">Select Purity</option>
                  {formData.newItemMetalType.startsWith('gold') ? (
                    <>
                      <option value="24k">24k (100%)</option>
                      <option value="22k">22k (91.6%)</option>
                      <option value="18k">18k (75%)</option>
                      <option value="14k">14k (58.3%)</option>
                      <option value="916">916</option>
                      <option value="750">750</option>
                    </>
                  ) : (
                    <>
                      <option value="92.5%">92.5%</option>
                      <option value="70%">70%</option>
                      <option value="999">999 (Pure Silver)</option>
                    </>
                  )}
                </select>
              </div>
              
              <div>
                <Label htmlFor="newItemMakingCharges" className="text-sm font-semibold">Making Charges</Label>
                <Input
                  id="newItemMakingCharges"
                  type="text"
                  value={formData.newItemMakingCharges}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setFormData({...formData, newItemMakingCharges: val})
                    }
                  }}
                  placeholder="Making charges"
                  className="h-11 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="newItemBarcode" className="text-sm font-semibold">Barcode</Label>
                <div className="relative">
                  <Input
                    id="newItemBarcode"
                    type="text"
                    value={formData.newItemBarcode}
                    onChange={(e) => setFormData({...formData, newItemBarcode: e.target.value})}
                    placeholder="Item barcode"
                    className="h-11 text-base pr-10"
                  />
                  {isSearchingItem && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleAddGoldItem}
              className="w-full h-12 text-base font-semibold"
            >
              + Add Item Requirement
            </Button>

          </Card>

          {/* Gold Requirements Items Table - Similar to Sales Bill */}
          {formData.goldRequirements.length > 0 && (
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    Gold Requirements
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Item</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Weight</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Rate</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Making</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Purity</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Metal</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">HSN</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground">Total</th>
                        <th className="text-center py-4 px-4 font-semibold text-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.goldRequirements.map((item, index) => (
                        <tr key={index} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="py-4 px-4 font-medium text-foreground">
                            {item.item_name}
                            {item.barcode && (
                              <div className="text-xs text-muted-foreground mt-1">Barcode: {item.barcode}</div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-foreground">{item.weight}g</td>
                          <td className="py-4 px-4 text-foreground">₹{(item.rate || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-foreground">₹{(item.making_charges || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-foreground">{item.purity || '-'}</td>
                          <td className="py-4 px-4 text-foreground">
                            {item.metal_type === 'gold' ? 'GOLD' :
                             item.metal_type === 'gold_916' ? 'GOLD_916' :
                             item.metal_type === 'gold_750' ? 'GOLD_750' :
                             item.metal_type === 'silver_92' ? 'SILVER_92' :
                             item.metal_type === 'silver_70' ? 'SILVER_70' :
                             item.metal_type === 'selam_silver' ? 'SELAM_SILVER' :
                             item.metal_type?.toUpperCase() || 'GOLD'}
                          </td>
                          <td className="py-4 px-4 text-foreground">{item.hsn_code || '711319'}</td>
                          <td className="py-4 px-4 font-bold text-primary text-lg">₹{(item.line_total || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveGoldItem(index)}
                              className="text-destructive hover:text-destructive/80 font-medium px-3 py-1 rounded hover:bg-destructive/10 transition-colors text-sm"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Old Gold Exchange Section */}
          <Card className="p-8 mb-6 border-2 border-pink-200 dark:border-pink-700 shadow-lg bg-pink-50/30 dark:bg-pink-900/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <span className="text-pink-500 text-xl">🪙</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Old Gold Exchange</h2>
            </div>

            {/* Add/Edit Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              <div className="md:col-span-2">
                <Label htmlFor="oldGoldParticulars" className="text-sm font-semibold">Particulars / Description</Label>
                <Input
                  id="oldGoldParticulars"
                  placeholder="Enter description (e.g., Old gold ornaments)"
                  value={newOldGold.particulars}
                  onChange={(e) => setNewOldGold({ ...newOldGold, particulars: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="oldGoldHsn" className="text-sm font-semibold">HSN Code</Label>
                <Input
                  id="oldGoldHsn"
                  placeholder="HSN Code (default: 7113)"
                  value={newOldGold.hsn_code}
                  onChange={(e) => setNewOldGold({ ...newOldGold, hsn_code: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="oldGoldWeight" className="text-sm font-semibold">Weight (grams) *</Label>
                <Input
                  id="oldGoldWeight"
                  type="text"
                  placeholder="Enter weight (e.g., 0.5, 3.960)"
                  value={newOldGold.weightInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setNewOldGold({ ...newOldGold, weightInput: val })
                    }
                  }}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="oldGoldPurity" className="text-sm font-semibold">Purity</Label>
                <select
                  id="oldGoldPurity"
                  value={newOldGold.purity}
                  onChange={(e) => setNewOldGold({ ...newOldGold, purity: e.target.value })}
                  className="h-12 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-base"
                >
                  <option value="">Select Purity</option>
                  <option value="24k">24k (100%)</option>
                  <option value="22k">22k (91.6%)</option>
                  <option value="18k">18k (75%)</option>
                  <option value="14k">14k (58.3%)</option>
                  <option value="916">916</option>
                  <option value="750">750</option>
                  <option value="92.5%">92.5%</option>
                  <option value="70%">70%</option>
                </select>
              </div>
              <div>
                <Label htmlFor="oldGoldRate" className="text-sm font-semibold">Rate per gram (₹)</Label>
                <Input
                  id="oldGoldRate"
                  type="text"
                  placeholder={allMetalRates.gold > 0 ? `Default: ${allMetalRates.gold.toFixed(2)}` : 'Enter rate'}
                  value={newOldGold.rateInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setNewOldGold({ ...newOldGold, rateInput: val })
                    }
                  }}
                  onBlur={() => {
                    if (!newOldGold.rateInput && allMetalRates.gold > 0) {
                      setNewOldGold({ ...newOldGold, rateInput: allMetalRates.gold.toString() })
                    }
                  }}
                  onFocus={() => {
                    if (!newOldGold.rateInput && allMetalRates.gold > 0) {
                      setNewOldGold({ ...newOldGold, rateInput: allMetalRates.gold.toString() })
                    }
                  }}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="oldGoldTotal" className="text-sm font-semibold">Total Value (₹)</Label>
                <Input
                  id="oldGoldTotal"
                  type="text"
                  placeholder="Auto-calculated"
                  value={newOldGold.total_value ? newOldGold.total_value.toFixed(2) : ''}
                  readOnly
                  className="h-12 text-base bg-muted font-semibold"
                />
              </div>
              <div className="flex items-end gap-2">
                {editingOldGoldId ? (
                  <>
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleUpdateOldGold}
                      className="h-12 flex-1"
                    >
                      Update
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEditOldGold}
                      className="h-12"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOldGold}
                    className="h-12 w-full"
                  >
                    + Add Old Gold Exchange
                  </Button>
                )}
              </div>
            </div>

            {/* Old Gold Exchange Table */}
            {formData.oldGoldExchanges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Old Gold Exchange Entries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-pink-200 dark:border-pink-700 bg-pink-100/50 dark:bg-pink-900/20">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Particulars</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">HSN Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Weight (g)</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Purity</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Rate (₹/g)</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Total Value (₹)</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.oldGoldExchanges.map((og, index) => (
                        <tr key={og.id || index} className="border-b border-pink-200 dark:border-pink-700 hover:bg-pink-50/50 dark:hover:bg-pink-900/10">
                          <td className="py-3 px-4">{og.particulars || '-'}</td>
                          <td className="py-3 px-4">{og.hsn_code || '7113'}</td>
                          <td className="py-3 px-4">{og.weight.toFixed(3)}</td>
                          <td className="py-3 px-4">{og.purity || '-'}</td>
                          <td className="py-3 px-4">₹{og.rate.toFixed(2)}</td>
                          <td className="py-3 px-4 font-semibold">₹{og.total_value.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOldGold(og.id!)}
                                className="h-8 text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteOldGold(og.id!)}
                                className="h-8 text-xs"
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
              </div>
            )}
          </Card>

          {/* Payment and Delivery Section */}
          <Card className="p-8 mb-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <span className="text-green-500 text-xl">💰</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Payment & Delivery</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <Label htmlFor="totalAmount" className="text-sm font-semibold">Total Amount (₹) *</Label>
                <div className="relative">
                  <Input
                    id="totalAmount"
                    type="text"
                    value={formData.totalAmount}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                        handleTotalAmountChange(val)
                      }
                    }}
                    placeholder="Enter total amount"
                    className="h-12 text-base pr-20"
                  />
                  {isTotalAmountLocked && (
                    <div className="absolute right-24 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-muted-foreground">locked</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs px-3"
                    onClick={() => {
                      // Unlock and recalculate from items
                      setIsTotalAmountLocked(false);
                      const recalculatedTotal = formData.goldRequirements.reduce((sum, item) => sum + (item.line_total || 0), 0);
                      setFormData(prev => ({
                        ...prev,
                        totalAmount: recalculatedTotal
                      }));
                    }}
                  >
                    {isTotalAmountLocked ? 'Unlock' : 'Auto'}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="advanceAmount" className="text-sm font-semibold">Advance Amount (₹) *</Label>
                <Input
                  id="advanceAmount"
                  type="text"
                  value={formData.advanceAmount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      handleAdvanceAmountChange(val)
                    }
                  }}
                  placeholder="Amount paid in advance"
                  className="h-12 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="amountDue" className="text-sm font-semibold">Amount Due (₹)</Label>
                <Input
                  id="amountDue"
                  type="text"
                  value={formData.amountDue.toFixed(2)}
                  readOnly
                  className="h-12 text-base bg-muted font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="deliveryDate" className="text-sm font-semibold">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  className="h-12 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="itemDescription" className="text-sm font-semibold">Item Description</Label>
                <Input
                  id="itemDescription"
                  type="text"
                  value={formData.itemDescription}
                  onChange={(e) => setFormData({...formData, itemDescription: e.target.value})}
                  placeholder="Brief description of items"
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerNotesFinal" className="text-sm font-semibold">Customer Notes</Label>
              <textarea
                id="customerNotesFinal"
                value={formData.customerNotes}
                onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                placeholder="Any special notes from customer"
                className="w-full h-24 px-3 py-2 text-base border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            {isEditMode && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-12 px-8 text-lg"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="h-12 px-8 text-lg"
            >
              {isEditMode ? 'Update Advance Booking' : 'Create Advance Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}