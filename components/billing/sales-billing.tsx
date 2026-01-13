'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/lib/db/queries'
import { createBill, createBillItems, getBillById, getBillItems, updateBill } from '@/lib/db/queries'
import { toast } from '@/components/ui/use-toast'
import { InvoicePrint } from './invoice-print'
import { PurchaseBillPrint } from './purchase-bill-print'
import { LayawayForm } from './layaway-form'

interface BillItem {
  id: string
  barcode: string
  item_name: string
  weight: number
  rate: number
  making_charges: number
  gst_rate: number
  line_total: number
  purity?: string
  hsn_code?: string
  sl_no?: number
  metal_type?: string
}

interface SalesBillingProps {
  editBillId?: number
}

export function SalesBilling({ editBillId }: SalesBillingProps = {}) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })
  
  const [items, setItems] = useState<BillItem[]>([])
  const [newItem, setNewItem] = useState({ 
    barcode: '', 
    item_name: '', 
    weight: 0, 
    weightInput: '', // Raw string input
    rate: 0, 
    rateInput: '', // Raw string input for rate
    making_charges: 0,
    makingChargesInput: '', // Raw string input (for backward compatibility)
    makingChargesAmount: '', // Amount input
    makingChargesPercentage: '', // Percentage input
    purity: '',
    hsn_code: '711319',
    metal_type: 'gold', // 'gold' or 'silver'
  })
  const [isLoadingItem, setIsLoadingItem] = useState(false)
  const [dailyGoldRate, setDailyGoldRate] = useState(0) // Daily selected metal rate per gram
  const [dailyGoldRateInput, setDailyGoldRateInput] = useState('') // Raw string input for daily metal rate
  const [goldRate, setGoldRate] = useState(0) // Daily gold rate per gram (used as default)
  const [selectedMetalType, setSelectedMetalType] = useState<'gold_916' | 'gold_750' | 'gold' | 'silver_92' | 'silver_70' | 'selam_silver'>('gold') // Selected metal type for daily rate input
  
  // State for all metal rates
  const [allMetalRates, setAllMetalRates] = useState<Record<string, number>>({
    gold: 0,
    gold_916: 0,
    gold_750: 0,
    silver_92: 0,
    silver_70: 0,
    selam_silver: 0,
  })
  
  // Multiple payment methods
  type PaymentMethodType = 'cash' | 'card' | 'upi' | 'cheque' | 'bank_transfer' | 'other'
  interface PaymentMethod {
    id: string
    type: PaymentMethodType
    amount: string
    reference: string
  }
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  
  const [discount, setDiscount] = useState(0)
  const [discountInput, setDiscountInput] = useState('') // Raw string input for discount
  const [saleType, setSaleType] = useState<'gst' | 'non_gst'>('gst')
  
  // GST is fixed at 3% (1.5% CGST + 1.5% SGST)
  const GST_RATE = 0.03
  const [cgst, setCgst] = useState(0) // Calculated CGST amount
  const [sgst, setSgst] = useState(0) // Calculated SGST amount
  const [igst, setIgst] = useState(0) // IGST (not used, kept for compatibility)
  const [subtotal, setSubtotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [amountPayable, setAmountPayable] = useState(0)
  const [billLevelGST, setBillLevelGST] = useState(0)
  
  // Editable amount payable
  const [amountPayableInput, setAmountPayableInput] = useState<string | null>(null)
  const [mcValueAdded, setMcValueAdded] = useState({
    weight: 0,
    weightInput: '', // Raw string input
    rate: 0,
    rateInput: '', // Raw string input
    total: 0,
  })
  const [oldGoldExchange, setOldGoldExchange] = useState({
    weight: 0,
    weightInput: '', // Raw string input for weight
    purity: '',
    rate: 0,
    rateInput: '', // Raw string input for rate
    total: 0,
    hsn_code: '7113', // Default HSN code for old gold
    particulars: '', // Description/particulars
  })
  const [purchaseBillId, setPurchaseBillId] = useState<string>('') // Store purchase bill ID when created
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [billNo, setBillNo] = useState('')
  const [nongstAuthId, setNongstAuthId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff')
  const [canAuthorizeNonGst, setCanAuthorizeNonGst] = useState(false)
  const [username, setUsername] = useState<string>('')
  const [showInvoice, setShowInvoice] = useState(false)
  const [showPurchaseBill, setShowPurchaseBill] = useState(false)
  const [currentBillId, setCurrentBillId] = useState<number | null>(null)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemData, setEditingItemData] = useState({
    barcode: '',
    item_name: '',
    weightInput: '',
    rateInput: '',
    makingChargesInput: '',
    makingChargesAmount: '',
    makingChargesPercentage: '',
    purity: '',
    hsn_code: '711319',
    metal_type: 'gold',
  })
  
  // Layaway state
  const [isLayaway, setIsLayaway] = useState(false)
  const [layawayData, setLayawayData] = useState({
    advancePaymentDate: '',
    itemTakenDate: '',
    finalPaymentDate: '',
    advanceAmount: 0,
    remainingAmount: 0,
    trackingFlag: false
  })

  const resetBillForm = () => {
    setCustomer(null)
    setCustomerSearch('')
    setCustomerMatches([])
    setShowCustomerDropdown(false)
    setShowAddCustomerForm(false)
    setNewCustomerData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    })
    setItems([])
    setNewItem({
      barcode: '',
      item_name: '',
      weight: 0,
      weightInput: '',
      rate: 0,
      rateInput: '',
      making_charges: 0,
      makingChargesInput: '',
      makingChargesAmount: '',
      makingChargesPercentage: '',
      purity: '',
      hsn_code: '711319',
      metal_type: 'gold',
    })
    setPaymentMethods([])
    setDiscount(0)
    setDiscountInput('')
    setSaleType('gst')
    setNongstAuthId('')
    setBillDate(new Date().toISOString().split('T')[0])
    setBillNo('')
    setCurrentBillId(null)
    setAmountPayableInput(null)
    setMcValueAdded({
      weight: 0,
      weightInput: '',
      rate: 0,
      rateInput: '',
      total: 0,
    })
    setOldGoldExchange({
      weight: 0,
      weightInput: '',
      purity: '',
      rate: 0,
      rateInput: '',
      total: 0,
      hsn_code: '7113',
      particulars: '',
    })
    setPurchaseBillId('')
    setEditingItemId(null)
    setEditingItemData({
      barcode: '',
      item_name: '',
      weightInput: '',
      rateInput: '',
      makingChargesInput: '',
      makingChargesAmount: '',
      makingChargesPercentage: '',
      purity: '',
      hsn_code: '711319',
      metal_type: 'gold',
    })
    setShowInvoice(false)
    setShowPurchaseBill(false)
    
    // Reset layaway data
    setIsLayaway(false)
    setLayawayData({
      advancePaymentDate: '',
      itemTakenDate: '',
      finalPaymentDate: '',
      advanceAmount: 0,
      remainingAmount: 0,
      trackingFlag: false
    })
  }

  // Get user info from session and fetch daily gold rate
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setStaffId(userData.id || 'staff-001')
      setUserRole(userData.role || 'staff')
      setUsername(userData.username || '')
      setCanAuthorizeNonGst(userData.can_authorize_nongst || false)
    }

    // Fetch latest daily rates for all metal types
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
        } else if (data && data.length > 0) {
          // Create a map of metal types to rates
          const ratesMap: Record<string, number> = {
            gold: 0,
            gold_916: 0,
            gold_750: 0,
            silver_92: 0,
            silver_70: 0,
            selam_silver: 0,
          };
          
          data.forEach(item => {
            ratesMap[item.metal_type] = parseFloat(item.rate_per_gram) || 0
          });
          
          setAllMetalRates(ratesMap);
          
          // Set the default selected metal rate
          const selectedRate = ratesMap[selectedMetalType] || 0;
          setDailyGoldRate(selectedRate);
          setDailyGoldRateInput(selectedRate.toString());
          
          // Set gold rate as default
          setGoldRate(ratesMap['gold'] || 0);
        }
      } catch (error: any) {
        console.error('Error fetching all daily metal rates:', JSON.stringify(error))
      }
    };

    fetchAllDailyRates()
  }, [])
  
  // Update daily rate when selected metal type changes
  useEffect(() => {
    // Update the displayed rate based on selected metal type
    const selectedRate = allMetalRates[selectedMetalType] || 0;
    setDailyGoldRate(selectedRate);
    setDailyGoldRateInput(selectedRate.toString());
  }, [selectedMetalType, allMetalRates])

  // Load bill data when editing
  useEffect(() => {
    const loadBillData = async () => {
      if (!editBillId) return

      setIsLoadingBill(true)
      try {
        const billData = await getBillById(editBillId)
        const billItemsData = await getBillItems(editBillId)

        // Set bill basic info
        let billDateStr: string | null = null
        if (billData.bill_date) {
          // bill_date from DB may include time, keep only date part
          billDateStr = billData.bill_date.split('T')[0]
          setBillDate(billDateStr || billDate)
        } else if (billData.created_at) {
          billDateStr = billData.created_at.split('T')[0]
          setBillDate(billDateStr || billDate)
        }

        if (billData.bill_no) {
          setBillNo(billData.bill_no)
        }
        setCurrentBillId(editBillId)

        // Set customer
        if (billData.customers) {
          setCustomer(billData.customers as Customer)
        }

        // Set sale type
        if (billData.sale_type) {
          setSaleType(billData.sale_type)
        }

        // Set discount
        if (billData.discount) {
          setDiscount(billData.discount)
          setDiscountInput(billData.discount.toString())
        }

        // Set payment methods
        if (billData.payment_method) {
          try {
            const paymentMethodsData = JSON.parse(billData.payment_method)
            if (Array.isArray(paymentMethodsData)) {
              setPaymentMethods(paymentMethodsData)
            }
          } catch (e) {
            console.error('Error parsing payment methods:', e)
          }
        }

        // Separate MC / VALUE ADDED item from regular items
        if (billItemsData && billItemsData.length > 0) {
          const mcItem = billItemsData.find(
            (item: any) =>
              item.item_name &&
              item.item_name.trim().toUpperCase() === 'MC / VALUE ADDED'
          )

          const regularItems = billItemsData.filter(
            (item: any) =>
              !item.item_name ||
              item.item_name.trim().toUpperCase() !== 'MC / VALUE ADDED'
          )

          if (mcItem) {
            setMcValueAdded({
              weight: mcItem.weight || 0,
              weightInput: (mcItem.weight || 0).toString(),
              rate: mcItem.rate || 0,
              rateInput: (mcItem.rate || 0).toString(),
              total: mcItem.line_total || 0,
            })
          }

          const formattedItems: BillItem[] = regularItems.map((item: any) => {
            const metalType = item.metal_type || 'gold'
            return {
              id: item.id.toString(),
              barcode: item.barcode || '',
              item_name: item.item_name || '',
              weight: item.weight || 0,
              weightInput: (item.weight || 0).toString(),
              rate: item.rate || 0,
              making_charges: item.making_charges || 0,
              makingChargesInput: (item.making_charges || 0).toString(),
              gst_rate: item.gst_rate || 0,
              line_total: item.line_total || 0,
              hsn_code: item.hsn_code || '711319',
              metal_type: metalType,
              purity: item.purity || getPurityFromMetalType(metalType),
              sl_no: item.sl_no,
            }
          })
          setItems(formattedItems)
        }

        // Load old gold exchange if exists
        const supabase = createClient()
        const { data: oldGold, error: oldGoldError } = await supabase
          .from('old_gold_exchanges')
          .select('*')
          .eq('bill_id', editBillId)
          .single()

        if (!oldGoldError && oldGold) {
          setOldGoldExchange({
            weight: oldGold.weight || 0,
            weightInput: (oldGold.weight || 0).toString(),
            purity: oldGold.purity || '',
            rate: oldGold.rate_per_gram || 0,
            rateInput: (oldGold.rate_per_gram || 0).toString(),
            total: oldGold.total_value || 0,
            hsn_code: oldGold.hsn_code || '7113',
            particulars: oldGold.notes || '',
          })
        }

        // Load layaway data if exists
        if (billData.advance_payment_date || billData.advance_amount) {
          setIsLayaway(true)
          setLayawayData({
            advancePaymentDate: billData.advance_payment_date?.split('T')[0] || '',
            itemTakenDate: billData.item_taken_date?.split('T')[0] || '',
            finalPaymentDate: billData.final_payment_date?.split('T')[0] || '',
            advanceAmount: billData.advance_amount || 0,
            remainingAmount: billData.remaining_amount || 0,
            trackingFlag: billData.tracking_flag || false,
          })
        }

        // When editing, use the gold rate that was effective on the bill date
        if (billDateStr) {
          try {
            const supabaseForRate = createClient()
            const { data: rateRow, error: rateError } = await supabaseForRate
              .from('gold_rates')
              .select('*')
              .lte('effective_date', billDateStr)
              .order('effective_date', { ascending: false })
              .limit(1)
              .single()

            if (!rateError && rateRow) {
              const rate = parseFloat(rateRow.rate_per_gram) || 0
              setDailyGoldRate(rate)
              setDailyGoldRateInput(rate.toString())
            }
          } catch (err: any) {
            console.error('Error fetching historical gold rate for bill date:', JSON.stringify(err))
          }
        }

        toast({
          title: 'Bill Loaded',
          description: 'Bill data loaded successfully. You can now edit it.',
        })
      } catch (error: any) {
        console.error('Error loading bill:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to load bill data',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingBill(false)
      }
    }

    loadBillData()
  }, [editBillId])

  // Live customer search with debouncing
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerMatches([])
      setShowCustomerDropdown(false)
      return
    }

    const searchCustomers = async () => {
      setIsSearching(true)
      try {
        const supabase = createClient()
        const searchTerm = customerSearch.trim()
        
        // Search by phone (partial match) or name
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(10)

        if (error) {
          console.error('Search error:', error)
          setCustomerMatches([])
        } else {
          setCustomerMatches(data || [])
          setShowCustomerDropdown(true)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
        setCustomerMatches([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchCustomers, 300)
    return () => clearTimeout(debounceTimer)
  }, [customerSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown])

  // Auto-fetch item details when barcode is scanned/entered
  useEffect(() => {
    const barcodeValue = newItem.barcode.trim()
    if (!barcodeValue) {
      setIsLoadingItem(false)
      return
    }

    // Debounce the search to avoid too many API calls
    const searchItem = async () => {
      setIsLoadingItem(true)
      try {
        const supabase = createClient()
        
        // Check if Supabase is properly configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error('Supabase environment variables not configured')
          setIsLoadingItem(false)
          return
        }

        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('barcode', barcodeValue)
          .single()

        if (error) {
          // Item not found - that's okay, user can enter manually
        if (error.code === 'PGRST116') {
          console.log('Item not found for barcode:', barcodeValue)
        } else if (error.message?.includes('406') || error.code === 'PGRST301') {
          console.error('406 Error - Check RLS policies or API key:', error)
          console.error('Full error details:', JSON.stringify(error, null, 2))
        } else {
          console.error('Error fetching item:', error)
          console.error('Error code:', error.code, 'Error message:', error.message)
        }
          setIsLoadingItem(false)
          return
        }

        if (data) {
          console.log('Item found:', data)
          // Auto-populate item fields from database
          // Note: rate will be calculated from daily gold rate, not from item's price_per_gram
          setNewItem(prev => ({
            ...prev,
            barcode: data.barcode || prev.barcode,
            item_name: data.item_name || '',
            weight: data.weight || 0,
            weightInput: data.weight?.toString() || '',
            rate: dailyGoldRate || 0, // Use daily gold rate
            making_charges: data.making_charges || 0,
            makingChargesInput: data.making_charges?.toString() || '',
          }))
        }
      } catch (error: any) {
        console.error('Error searching for item:', error)
        if (error.status === 406 || error.statusCode === 406) {
          console.error('406 Not Acceptable - This usually means:')
          console.error('1. RLS policies are blocking the request')
          console.error('2. Missing or incorrect API key in headers')
          console.error('3. Check Supabase dashboard for RLS policies on items table')
        }
      } finally {
        setIsLoadingItem(false)
      }
    }

    // Wait 300ms after user stops typing before searching (reduced from 500ms)
    const debounceTimer = setTimeout(searchItem, 300)
    return () => clearTimeout(debounceTimer)
  }, [newItem.barcode])

  // Search barcode function
  const handleSearchBarcode = async () => {
    const barcodeValue = newItem.barcode.trim()
    if (!barcodeValue) {
      toast({
        title: 'Barcode Required',
        description: 'Please enter a barcode to search',
        variant: 'destructive',
      })
      return
    }

    setIsLoadingItem(true)
    try {
      const supabase = createClient()
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast({
          title: 'Configuration Error',
          description: 'Supabase is not configured. Please check your .env.local file.',
          variant: 'destructive',
        })
        setIsLoadingItem(false)
        return
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('barcode', barcodeValue)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Item not found for barcode:', barcodeValue)
          // Allow user to add item manually even if not in inventory
          toast({
            title: 'Item Not Found',
            description: `Item not found in inventory. You can enter details manually.`,
          })
          setIsLoadingItem(false)
          return
        } else if (error.message?.includes('406') || error.code === 'PGRST301') {
          console.error('406 Not Acceptable Error:', error)
          console.error('Full error:', JSON.stringify(error, null, 2))
          toast({
            title: 'Access Denied (406)',
            description: 'RLS policies may be blocking access. Check Supabase dashboard → Authentication → Policies',
            variant: 'destructive',
          })
        } else {
          console.error('Error fetching item:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          toast({
            title: 'Error',
            description: `Error searching for item: ${error.message || 'Unknown error'}. Check console for details.`,
            variant: 'destructive',
          })
        }
        setIsLoadingItem(false)
        return
      }

      if (data) {
        console.log('Item found:', data)
        // Auto-populate item fields from database
        // Note: rate will be calculated from daily gold rate, not from item's price_per_gram
        setNewItem(prev => ({
          ...prev,
          barcode: data.barcode || prev.barcode,
          item_name: data.item_name || '',
          weight: data.weight || 0,
          weightInput: data.weight?.toString() || '',
          rate: dailyGoldRate || 0, // Use daily gold rate
          making_charges: data.making_charges || 0,
          makingChargesInput: data.making_charges?.toString() || '',
        }))
        toast({
          title: 'Item Found',
          description: `Successfully loaded: ${data.item_name || 'Unnamed item'}`,
        })
      }
    } catch (error: any) {
      console.error('Error searching for item:', error)
      if (error.message?.includes('406') || error.code === 'PGRST301') {
        toast({
          title: 'Access Denied',
          description: 'Check RLS policies in Supabase dashboard',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Error searching for item. Please check console.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoadingItem(false)
    }
  }

  const handleSelectCustomer = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer)
    setCustomerSearch('')
    setShowCustomerDropdown(false)
    setShowAddCustomerForm(false)
  }

  const handleAddNewCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast({
        title: 'Required Fields',
        description: 'Name and Phone are required',
        variant: 'destructive',
      })
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          email: newCustomerData.email || null,
          address: newCustomerData.address || null,
          notes: newCustomerData.notes || null,
        })
        .select()
        .single()

      if (error) throw error
      
      if (data) {
        setCustomer(data as Customer)
        setCustomerSearch('')
        setShowAddCustomerForm(false)
        setShowCustomerDropdown(false)
        setNewCustomerData({ name: '', phone: '', email: '', address: '', notes: '' })
        toast({
          title: 'Customer Added',
          description: 'Customer has been successfully added',
        })
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to create customer. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const calculateLineTotal = (weight: number, goldRate: number, making: number) => {
    // Base amount = (weight × daily gold rate) + making charges
    // GST will be applied at bill level, not item level
    return weight * goldRate + making
  }

  // Helper function to get purity from metal_type
  const getPurityFromMetalType = (metalType: string): string => {
    switch (metalType) {
      case 'gold_916':
        return '91.6'
      case 'gold_750':
        return '75'
      case 'silver_92':
        return '92.5'
      case 'silver_70':
        return '70'
      case 'gold':
      case 'selam_silver':
      default:
        return '' // Standard gold and selam_silver don't have specific purity values
    }
  }

  const handleAddItem = () => {
    // Allow adding items even if not in inventory - just need item name and weight
    const weight = parseFloat(newItem.weightInput) || 0
    
    if (!newItem.item_name || !newItem.item_name.trim()) {
      toast({
        title: 'Item Name Required',
        description: 'Please enter an item name',
        variant: 'destructive',
      })
      return
    }
    
    if (!weight || weight <= 0) {
      toast({
        title: 'Weight Required',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }
    
      // Use custom rate input if provided, otherwise use appropriate default rate
      const customRate = parseFloat(newItem.rateInput) || 0
      
      // Default to gold rate if item is gold-related, otherwise use selected metal rate
      const defaultRate = (newItem.metal_type === 'gold' || newItem.metal_type === 'gold_916' || newItem.metal_type === 'gold_750') 
        ? goldRate 
        : dailyGoldRate
      
      const rate = customRate || defaultRate || newItem.rate || 0
      if (!rate) {
        toast({
          title: 'Rate Required',
          description: 'Please set the daily gold rate or enter a custom rate',
          variant: 'destructive',
        })
        return
      }
    
      // Calculate making charges based on whether it's a percentage or amount
      let makingCharges = 0;
      
      // Check if amount is entered
      if (newItem.makingChargesAmount && !newItem.makingChargesPercentage) {
        makingCharges = parseFloat(newItem.makingChargesAmount) || 0;
      } 
      // Check if percentage is entered
      else if (newItem.makingChargesPercentage && !newItem.makingChargesAmount) {
        const percentage = parseFloat(newItem.makingChargesPercentage) || 0;
        makingCharges = (weight * rate) * (percentage / 100);
      }
      // Fallback to the old field if both are empty
      else {
        const makingInput = newItem.makingChargesInput;
        if (makingInput.endsWith('%')) {
          // Calculate percentage of (weight * rate)
          const percentage = parseFloat(makingInput.slice(0, -1)) || 0;
          makingCharges = (weight * rate) * (percentage / 100);
        } else {
          // Use as fixed amount
          makingCharges = parseFloat(makingInput) || 0;
        }
      }
      
      const lineTotal = calculateLineTotal(weight, rate, makingCharges)

      setItems([
        ...items,
        {
          id: Date.now().toString(),
          barcode: newItem.barcode || '',
          item_name: newItem.item_name.trim(),
          weight,
          rate: rate, // Store the calculated rate used
          making_charges: makingCharges,
          gst_rate: 0, // No item-level GST, GST is applied at bill level
          line_total: lineTotal,
          hsn_code: newItem.hsn_code || '711319',
          sl_no: items.length + 1, // Auto-incrementing serial number per invoice
          metal_type: newItem.metal_type,
          purity: newItem.purity || getPurityFromMetalType(newItem.metal_type),
        },
      ])
      toast({
        title: 'Item Added',
        description: 'Item has been added to the bill',
      })

      // Reset form
      setNewItem({
        barcode: '',
        item_name: '',
        weight: 0,
        weightInput: '',
        rate: 0,
        rateInput: '',
        making_charges: 0,
        makingChargesInput: '',
        makingChargesAmount: '',
        makingChargesPercentage: '',
        purity: '',
        hsn_code: '711319',
        metal_type: 'gold',
      })
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
    if (editingItemId === id) {
      setEditingItemId(null)
      setEditingItemData({
        barcode: '',
        item_name: '',
        weightInput: '',
        rateInput: '',
        makingChargesInput: '',
        makingChargesAmount: '',
        makingChargesPercentage: '',
        purity: '',
        hsn_code: '711319',
        metal_type: 'gold',
      })
    }
  }

  const handleStartInlineItemEdit = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    setEditingItemId(id)
    const itemMetalType = item.metal_type || 'gold'
    setEditingItemData({
      barcode: item.barcode || '',
      item_name: item.item_name || '',
      weightInput: (item.weight || 0).toString(),
      rateInput: (item.rate || 0).toString(),
      makingChargesInput: (item.making_charges || 0).toString(),
      makingChargesAmount: '',
      makingChargesPercentage: '',
      purity: item.purity || getPurityFromMetalType(itemMetalType),
      hsn_code: item.hsn_code || '711319',
      metal_type: itemMetalType,
    })
  }

  const handleCancelInlineItemEdit = () => {
    setEditingItemId(null)
    setEditingItemData({
      barcode: '',
      item_name: '',
      weightInput: '',
      rateInput: '',
      makingChargesInput: '',
      makingChargesAmount: '',
      makingChargesPercentage: '',
      purity: '',
      hsn_code: '711319',
      metal_type: 'gold',
    })
  }

  const handleSaveInlineItemEdit = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const updatedName = editingItemData.item_name.trim()
    const weight = parseFloat(editingItemData.weightInput) || 0
    
    // Use custom rate input if provided, otherwise use appropriate default rate
    const customRate = parseFloat(editingItemData.rateInput) || 0
    
    // Default to gold rate if item is gold-related, otherwise use selected metal rate
    const defaultRate = (editingItemData.metal_type === 'gold' || editingItemData.metal_type === 'gold_916' || editingItemData.metal_type === 'gold_750') 
      ? goldRate 
      : dailyGoldRate
    
    const finalRate = customRate || defaultRate || 0
    
    // Calculate making charges based on whether it's a percentage or amount
    let makingCharges = 0;
    
    // Check if amount is entered
    if (editingItemData.makingChargesAmount && !editingItemData.makingChargesPercentage) {
      makingCharges = parseFloat(editingItemData.makingChargesAmount) || 0;
    } 
    // Check if percentage is entered
    else if (editingItemData.makingChargesPercentage && !editingItemData.makingChargesAmount) {
      const percentage = parseFloat(editingItemData.makingChargesPercentage) || 0;
      makingCharges = (weight * finalRate) * (percentage / 100);
    }
    // Fallback to the old field if both are empty
    else {
      const makingInput = editingItemData.makingChargesInput;
      if (makingInput.endsWith('%')) {
        // Calculate percentage of (weight * rate)
        const percentage = parseFloat(makingInput.slice(0, -1)) || 0;
        makingCharges = (weight * finalRate) * (percentage / 100);
      } else {
        // Use as fixed amount
        makingCharges = parseFloat(makingInput) || 0;
      }
    }

    if (!updatedName) {
      toast({
        title: 'Item Name Required',
        description: 'Please enter an item name',
        variant: 'destructive',
      })
      return
    }

    if (!weight || weight <= 0) {
      toast({
        title: 'Weight Required',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    if (!finalRate || finalRate <= 0) {
      toast({
        title: 'Rate Required',
        description: 'Please enter a valid rate for this item',
        variant: 'destructive',
      })
      return
    }

    const lineTotal = calculateLineTotal(weight, finalRate, makingCharges)

    const updatedItems = items.map(i =>
      i.id === id
        ? {
            ...i,
            barcode: editingItemData.barcode || '',
            item_name: updatedName,
            weight,
            rate: customRate,
            making_charges: makingCharges,
            line_total: lineTotal,
            hsn_code: editingItemData.hsn_code || '711319',
            metal_type: editingItemData.metal_type || 'gold',
            purity: editingItemData.purity || getPurityFromMetalType(editingItemData.metal_type || 'gold'),
          }
        : i
    )

    setItems(updatedItems)
    toast({
      title: 'Item Updated',
      description: 'Item has been updated successfully',
    })
    handleCancelInlineItemEdit()
  }

  // Rounding function for GST (whole numbers)
  // Rules: .5 and above rounds up, below .5 rounds down
  // Example: 393.5 → 394, 393.2 → 393
  const roundGstAmount = (value: number) => {
    if (!isFinite(value) || value <= 0) {
      return 0
    }
    // Get decimal part
    const decimal = value % 1
    // If .5 or above, round up (ceil), otherwise round down (floor)
    if (decimal >= 0.5) {
      return Math.ceil(value)
    } else {
      return Math.floor(value)
    }
  }

  // Rounding function for currency (2 decimal places)
  // Rules: .5 and above rounds up, below .5 rounds down
  // Example: 2106.795 → 2106.80, 2106.794 → 2106.79
  const roundCurrency = (value: number) => {
    if (!isFinite(value) || value < 0) {
      return 0
    }
    // Multiply by 100, round with .5 rule, then divide by 100
    const multiplied = value * 100
    const decimal = multiplied % 1
    const rounded = decimal >= 0.5 ? Math.ceil(multiplied) : Math.floor(multiplied)
    return rounded / 100
  }

  // Rounding function for whole numbers (MC/Value Added)
  // Rules: .5 and above rounds up, below .5 rounds down
  // Example: 2106.5 → 2107, 2106.4 → 2106
  const roundToWhole = (value: number) => {
    if (!isFinite(value) || value < 0) {
      return 0
    }
    const decimal = value % 1
    return decimal >= 0.5 ? Math.ceil(value) : Math.floor(value)
  }

  // Calculate MC/Value Added total
  useEffect(() => {
    const weight = parseFloat(mcValueAdded.weightInput) || 0
    const rate = parseFloat(mcValueAdded.rateInput) || 0
    const mcTotal = weight * rate
    setMcValueAdded(prev => ({ ...prev, weight, rate, total: roundToWhole(mcTotal) })) // Round to whole number
  }, [mcValueAdded.weightInput, mcValueAdded.rateInput])

  // Calculate Old Gold Exchange total
  useEffect(() => {
    const weight = parseFloat(oldGoldExchange.weightInput) || 0
    // Use rateInput if provided, otherwise use dailyGoldRate as fallback
    const rate = parseFloat(oldGoldExchange.rateInput) || (dailyGoldRate > 0 ? dailyGoldRate : 0)
    const oldGoldTotal = weight * rate
    
    // Auto-fill rateInput with dailyGoldRate if weight is entered and rateInput is empty
    if (weight > 0 && !oldGoldExchange.rateInput && dailyGoldRate > 0) {
      setOldGoldExchange(prev => ({ 
        ...prev, 
        weight, 
        rate, 
        rateInput: dailyGoldRate.toString(),
        total: roundCurrency(oldGoldTotal) 
      }))
    } else {
      setOldGoldExchange(prev => ({ ...prev, weight, rate, total: roundCurrency(oldGoldTotal) }))
    }
  }, [oldGoldExchange.weightInput, oldGoldExchange.rateInput, dailyGoldRate])

  // Safety check: Staff can NEVER use Non-GST, force it to GST
  useEffect(() => {
    if (userRole === 'staff' && saleType === 'non_gst') {
      setSaleType('gst')
      setNongstAuthId('')
    }
  }, [userRole, saleType])

  // Calculate totals
  // Subtotal = sum of line_totals (base amounts without GST, GST applied at bill level)
  
  // Calculate gold subtotal normally
  const goldSubtotal = items.reduce((sum, item) => {
    if (item.metal_type === 'gold' || item.metal_type === 'gold_916' || item.metal_type === 'gold_750') {
      return sum + item.line_total
    }
    return sum
  }, 0)
  
  // Calculate silver making charges total separately
  const silverMakingChargesTotal = items.reduce((sum, item) => {
    if ((item.metal_type === 'silver_92' || item.metal_type === 'silver_70' || item.metal_type === 'selam_silver')) {
      return sum + (item.making_charges || 0)
    }
    return sum
  }, 0)
  
  // Calculate silver subtotal - if amountPayableInput is set, use that as silver subtotal
  const silverSubtotal = amountPayableInput !== null && amountPayableInput !== '' && 
                        items.some(item => item.metal_type === 'silver_92' || item.metal_type === 'silver_70' || item.metal_type === 'selam_silver')
                        ? parseFloat(amountPayableInput)
                        : items.reduce((sum, item) => {
                            if (item.metal_type === 'silver_92' || item.metal_type === 'silver_70' || item.metal_type === 'selam_silver') {
                              return sum + item.line_total
                            }
                            return sum
                          }, 0)
  
  const calculatedSubtotal = goldSubtotal + silverSubtotal
  const baseTaxableWithoutMc = calculatedSubtotal - oldGoldExchange.total
  
  // Calculate MC/Value Added adjustment based on editable amount payable
  useEffect(() => {
    if (amountPayableInput === null || amountPayableInput === '') {
      return
    }
    const targetAmount = parseFloat(amountPayableInput)
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return
    }

    const timer = setTimeout(() => {
      // For GST bills: Amount Payable = (Subtotal + MC) * 1.03
      // So: MC = (Amount Payable / 1.03) - Subtotal
      // For non-GST: MC = Amount Payable - Subtotal
      const targetTaxable = saleType === 'gst'
        ? targetAmount / (1 + GST_RATE)
        : targetAmount
      const requiredMcTotal = targetTaxable - baseTaxableWithoutMc
      
      // Ensure MC is not negative
      if (requiredMcTotal < 0) {
        console.warn('MC calculation resulted in negative value, setting to 0')
        setMcValueAdded(prev => ({
          ...prev,
          total: 0,
        }))
        return
      }
      
      // Read current values using functional update to get latest state
      setMcValueAdded(prev => {
        const currentWeight = parseFloat(prev.weightInput) || 0
        const currentRate = parseFloat(prev.rateInput) || 0
        
        if (currentWeight > 0) {
          const newRate = requiredMcTotal / currentWeight
          if (!isNaN(newRate) && isFinite(newRate)) {
            const roundedTotal = roundToWhole(requiredMcTotal)
            return {
              ...prev,
              rate: newRate,
              rateInput: newRate.toFixed(2),
              total: roundedTotal,
            }
          }
        } else if (currentRate > 0) {
          const newWeight = requiredMcTotal / currentRate
          if (!isNaN(newWeight) && isFinite(newWeight)) {
            const roundedTotal = roundToWhole(requiredMcTotal)
            return {
              ...prev,
              weight: newWeight,
              weightInput: newWeight.toFixed(3),
              total: roundedTotal,
            }
          }
        }
        
        // If neither weight nor rate is set, update total directly
        return {
          ...prev,
          total: roundToWhole(requiredMcTotal),
        }
      })
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [amountPayableInput, saleType, baseTaxableWithoutMc])

  // Final totals
  const preGstTotal = baseTaxableWithoutMc + mcValueAdded.total + silverMakingChargesTotal
  
  // GST calculation: 3% of pre-GST total
  const gstRaw = saleType === 'gst' 
    ? preGstTotal * GST_RATE
    : 0
  const calculatedBillLevelGST = roundGstAmount(gstRaw)
  const cgstAmount = saleType === 'gst' ? roundGstAmount(calculatedBillLevelGST / 2) : 0
  const sgstAmount = saleType === 'gst' ? roundGstAmount(calculatedBillLevelGST / 2) : 0
  const igstAmount = 0
  
  // Final grand total = pre-GST total + rounded GST
  const calculatedGrandTotal = saleType === 'gst'
    ? preGstTotal + calculatedBillLevelGST
    : preGstTotal
  
  // Final amount payable is always the calculated grand total (includes MC and GST)
  const finalAmount = calculatedGrandTotal

  // Ensure all values are numbers to prevent dependency array size changes
  const safeCgstAmount = Number.isFinite(cgstAmount) ? cgstAmount : 0
  const safeSgstAmount = Number.isFinite(sgstAmount) ? sgstAmount : 0
  const safeIgstAmount = Number.isFinite(igstAmount) ? igstAmount : 0
  const safeFinalAmount = Number.isFinite(finalAmount) ? finalAmount : 0
  const safeCalculatedBillLevelGST = Number.isFinite(calculatedBillLevelGST) ? calculatedBillLevelGST : 0
  const safeCalculatedGrandTotal = Number.isFinite(calculatedGrandTotal) ? calculatedGrandTotal : 0
  const safeCalculatedSubtotal = Number.isFinite(calculatedSubtotal) ? calculatedSubtotal : 0

  useEffect(() => {
    setCgst(safeCgstAmount)
    setSgst(safeSgstAmount)
    setIgst(safeIgstAmount)
    setAmountPayable(safeFinalAmount)
    setBillLevelGST(safeCalculatedBillLevelGST)
    setGrandTotal(safeCalculatedGrandTotal)
    setSubtotal(safeCalculatedSubtotal)
  }, [safeCgstAmount, safeSgstAmount, safeIgstAmount, safeFinalAmount, safeCalculatedBillLevelGST, safeCalculatedGrandTotal, safeCalculatedSubtotal])

  // Function to generate bill number
  const generateBillNumber = async () => {
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      
      // Get the latest bill number for today
      const { data: latestBill } = await supabase
        .from('bills')
        .select('bill_no')
        .like('bill_no', `SALE-${today.replace(/-/g, '')}-%`)
        .order('bill_no', { ascending: false })
        .limit(1)
        .single()

      let billNumber = ''
      if (latestBill?.bill_no) {
        // Extract the sequence number and increment
        const parts = latestBill.bill_no.split('-')
        const lastPart = parts[parts.length - 1]
        const sequence = parseInt(lastPart) + 1
        billNumber = `AM-SALE-${today.replace(/-/g, '')}-${String(sequence).padStart(4, '0')}`
      } else {
        // First bill of the day
        billNumber = `AM-SALE-${today.replace(/-/g, '')}-0001`
      }
      
      return billNumber
    } catch (error) {
      // Fallback to timestamp-based number
      return `AM-SALE-${Date.now()}`
    }
  }

  // Function to save bill to database
  const handleSaveBill = async () => {
    if (!customer) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer before saving the bill',
        variant: 'destructive',
      })
      return false
    }
    if (items.length === 0) {
      toast({
        title: 'Items Required',
        description: 'Please add at least one item to the bill',
        variant: 'destructive',
      })
      return false
    }

    try {
      // Generate bill number if not set
      let finalBillNo = billNo
      if (!finalBillNo) {
        finalBillNo = await generateBillNumber()
        setBillNo(finalBillNo)
      }

      // Prepare bill data
      let billData: any = {
        bill_date: billDate,
        customer_id: customer.id,
        staff_id: staffId || undefined,
        nongst_auth_id: saleType === 'non_gst' ? (nongstAuthId || undefined) : undefined,
        sale_type: saleType,
        subtotal: subtotal,
        gst_amount: billLevelGST,
        cgst: saleType === 'gst' ? cgstAmount : undefined,
        sgst: saleType === 'gst' ? sgstAmount : undefined,
        igst: saleType === 'gst' ? igstAmount : undefined,
        discount: discount || undefined,
        grand_total: grandTotal,
        payment_method: paymentMethods.length > 0 ? JSON.stringify(paymentMethods) : undefined,
        payment_reference: undefined, // No longer used, data in payment_method JSON
        
        // Layaway data
        advance_payment_date: isLayaway ? layawayData.advancePaymentDate : undefined,
        item_taken_date: isLayaway ? layawayData.itemTakenDate : undefined,
        final_payment_date: isLayaway ? layawayData.finalPaymentDate : undefined,
        advance_amount: isLayaway ? layawayData.advanceAmount : undefined,
        remaining_amount: isLayaway ? layawayData.remainingAmount : undefined,
        tracking_flag: isLayaway ? layawayData.trackingFlag : undefined,
      }
      
      // Always set bill_status to a valid enum value
      // For new bills, set to 'final'. For updates, preserve existing status by not including it
      if (!currentBillId) {
        billData.bill_status = 'final' as 'draft' | 'final' | 'cancelled'
      }
      // For updates, we don't include bill_status to preserve the existing value

      let billId: number
      let createdBill: any

      // Update existing bill or create new one
      if (currentBillId) {
        // Update existing bill - remove bill_status to preserve existing value
        const updateData = { ...billData }
        delete updateData.bill_status // Don't update bill_status when updating existing bill
        createdBill = await updateBill(currentBillId, updateData)
        billId = currentBillId
      } else {
        // Create new bill - ensure bill_status is set
        if (!billData.bill_status) {
          billData.bill_status = 'final' as 'draft' | 'final' | 'cancelled'
        }
        createdBill = await createBill(billData)
        billId = createdBill.id
        setCurrentBillId(billId)
      }
      
      // Update bill number if it was generated
      if (createdBill.bill_no && createdBill.bill_no !== finalBillNo) {
        setBillNo(createdBill.bill_no)
        finalBillNo = createdBill.bill_no
      }

      // Prepare bill items
      const billItemsData = items.map((item, index) => ({
        barcode: item.barcode && item.barcode.trim() ? item.barcode : undefined,
        item_name: item.item_name,
        weight: item.weight,
        rate: item.rate,
        making_charges: item.making_charges || 0,
        gst_rate: 0, // GST is at bill level
        line_total: item.line_total,
        hsn_code: item.hsn_code || '711319',
        sl_no: index + 1, // Auto-incrementing serial number per invoice
      }))

      // Add MC/Value Added as an item if present
      if (mcValueAdded.total > 0) {
        billItemsData.push({
          barcode: undefined,
          item_name: 'MC / VALUE ADDED',
          weight: mcValueAdded.weight,
          rate: mcValueAdded.rate,
          making_charges: 0,
          gst_rate: 0,
          line_total: mcValueAdded.total,
          hsn_code: '711319',
          sl_no: items.length + 1, // Continue the serial numbering
        })
      }

      // Delete old bill items if editing, then create new ones
      if (currentBillId) {
        const supabase = createClient()
        await supabase.from('bill_items').delete().eq('bill_id', billId)
      }
      
      // Save bill items
      await createBillItems(billId, billItemsData)

      // Handle old gold exchange (pink slip) if present
      // This is a credit/deduction on the sales bill, NOT a separate purchase transaction
      if (oldGoldExchange.total > 0) {
        try {
          const supabase = createClient()
          
          // Save to old_gold_exchanges table
          // Build notes field with all relevant information
          const oldGoldNotes = [
            oldGoldExchange.particulars && `Description: ${oldGoldExchange.particulars}`,
            oldGoldExchange.hsn_code && `HSN Code: ${oldGoldExchange.hsn_code}`,
          ].filter(Boolean).join(' | ') || null

          // Check if old gold exchange already exists for this bill
          const { data: existingOldGold } = await supabase
            .from('old_gold_exchanges')
            .select('id')
            .eq('bill_id', billId)
            .single()

          if (existingOldGold) {
            // Update existing old gold exchange
            const { error: oldGoldError } = await supabase
              .from('old_gold_exchanges')
              .update({
                weight: oldGoldExchange.weight || parseFloat(oldGoldExchange.weightInput) || 0,
                purity: oldGoldExchange.purity || null,
                rate_per_gram: oldGoldExchange.rate || parseFloat(oldGoldExchange.rateInput) || 0,
                total_value: oldGoldExchange.total,
                notes: oldGoldNotes,
              })
              .eq('id', existingOldGold.id)

            if (oldGoldError) {
              console.error('Error updating old_gold_exchanges:', oldGoldError)
              toast({
                title: 'Warning',
                description: 'Bill saved but old gold exchange data may not have been updated correctly',
                variant: 'destructive',
              })
            }
          } else {
            // Insert new old gold exchange
            const { error: oldGoldError } = await supabase
              .from('old_gold_exchanges')
              .insert({
                bill_id: billId,
                weight: oldGoldExchange.weight || parseFloat(oldGoldExchange.weightInput) || 0,
                purity: oldGoldExchange.purity || null,
                rate_per_gram: oldGoldExchange.rate || parseFloat(oldGoldExchange.rateInput) || 0,
                total_value: oldGoldExchange.total,
                notes: oldGoldNotes,
              })

            if (oldGoldError) {
              console.error('Error saving to old_gold_exchanges:', JSON.stringify(oldGoldError))
              toast({
                title: 'Warning',
                description: 'Bill saved but old gold exchange data may not have been saved correctly',
                variant: 'destructive',
              })
            }
          }
        } catch (error) {
          console.error('Error handling old gold exchange:', error)
          toast({
            title: 'Warning',
            description: 'Bill saved but old gold exchange data may not have been saved correctly',
            variant: 'destructive',
          })
        }
      } else if (currentBillId) {
        // If editing and old gold exchange is removed (total is 0), delete it
        try {
          const supabase = createClient()
          const { error: deleteError } = await supabase
            .from('old_gold_exchanges')
            .delete()
            .eq('bill_id', billId)

          if (deleteError) {
            console.error('Error deleting old_gold_exchanges:', deleteError)
          }
        } catch (error) {
          console.error('Error deleting old gold exchange:', error)
        }
      }

      toast({
        title: currentBillId ? 'Bill Updated Successfully' : 'Bill Saved Successfully',
        description: `Bill ${finalBillNo} has been ${currentBillId ? 'updated' : 'saved'} and finalized`,
      })

      return true
    } catch (error: any) {
      console.error('Error saving bill:', error)
      toast({
        title: 'Error Saving Bill',
        description: error.message || 'Failed to save bill. Please try again.',
        variant: 'destructive',
      })
      return false
    }
  }

  // Show loading state while bill is being loaded
  if (isLoadingBill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground font-semibold">Loading bill data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
          {currentBillId && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                ✏️ Editing Bill: {billNo || `#${currentBillId}`}
              </p>
            </div>
          )}
          <div className="space-y-4">
            {/* Customer Information Card - In Header */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Information</h3>
                {!customer && (
                  <div className="space-y-4 customer-search-container">
                    {/* Search Input */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Type phone number or name to search..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerDropdown(true)
                        }}
                        onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                        className="w-full h-10 text-sm pr-10"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                                          
                      {/* Add New Customer button below search bar */}
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddCustomerForm(true)
                            setShowCustomerDropdown(false)
                          }}
                          className="w-full h-9 text-xs"
                        >
                          + Add New Customer
                        </Button>
                      </div>
                                          
                      {/* Customer Dropdown */}
                      {showCustomerDropdown && customerSearch && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                          {customerMatches.length > 0 ? (
                            <>
                              {customerMatches.map((match) => (
                                <div
                                  key={match.id}
                                  onClick={() => handleSelectCustomer(match)}
                                  className="p-3 hover:bg-primary/5 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
            <div>
                                      <p className="font-semibold text-sm text-foreground">{match.name || 'No Name'}</p>
                                      <p className="text-xs text-muted-foreground">📞 {match.phone}</p>
            </div>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                      {match.customer_code}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <div
                                onClick={() => {
                                  setShowAddCustomerForm(true)
                                  setShowCustomerDropdown(false)
                                }}
                                className="p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer border-t-2 border-primary/20 transition-colors"
                              >
                                <p className="font-medium text-xs text-primary text-center">
                                  + Add New Customer
                                </p>
                              </div>
                            </>
                          ) : customerSearch && !isSearching ? (
                            <div
                              onClick={() => {
                                setShowAddCustomerForm(true)
                                setShowCustomerDropdown(false)
                              }}
                              className="p-4 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                            >
                              <p className="text-xs text-muted-foreground mb-2">No customer found</p>
                              <p className="text-xs text-primary font-medium">+ Add New Customer</p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {customer && (
                  <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{customer.name || 'No Name'}</p>
                        <p className="text-xs text-muted-foreground mt-1">📞 {customer.phone}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomer(null)
                          setCustomerSearch('')
                        }}
                        className="text-destructive border-destructive hover:bg-destructive/10 h-7 text-xs"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Customer Form */}
                {showAddCustomerForm && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-primary/20 rounded-lg">
                    <h4 className="font-bold text-sm text-foreground mb-3">Add New Customer</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Full Name *"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        className="bg-white dark:bg-slate-800 h-9 text-sm"
                      />
                      <Input
                        placeholder="Phone Number *"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        className="bg-white dark:bg-slate-800 h-9 text-sm"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={handleAddNewCustomer}
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-white h-8 text-xs"
                        >
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddCustomerForm(false)
                            setNewCustomerData({ name: '', phone: '', email: '', address: '', notes: '' })
                          }}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Daily Gold Rate and Bill Number - In Header */}
            <Card className="p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              {/* Daily Gold Rate */}
              {userRole === 'admin' ? (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Daily Metal Rates (₹/gram)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { value: 'gold', label: 'Gold (Standard)' },
                      { value: 'gold_916', label: 'Gold (22k/91.6%)' },
                      { value: 'gold_750', label: 'Gold (18k/75%)' },
                      { value: 'silver_92', label: 'Silver (92.5%)' },
                      { value: 'silver_70', label: 'Silver (70%)' },
                      { value: 'selam_silver', label: 'Selam Silver' },
                    ].map((metal) => (
                      <div key={metal.value} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="text-sm font-semibold text-foreground block">{metal.label}</label>
                        <Input
                          type="text"
                          placeholder="Enter rate"
                          value={allMetalRates[metal.value] || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                              const rate = val === '' ? 0 : parseFloat(val);
                              if (isNaN(rate) && val !== '') return;
                              
                              // Update the rate in the allMetalRates state
                              setAllMetalRates(prev => ({
                                ...prev,
                                [metal.value]: rate
                              }));
                              
                              // If this is the currently selected metal type, update the display
                              if (selectedMetalType === metal.value) {
                                setDailyGoldRate(rate);
                                setDailyGoldRateInput(rate.toString());
                                
                                // Update gold rate if this is a gold type
                                if (metal.value === 'gold' || metal.value === 'gold_916' || metal.value === 'gold_750') {
                                  setGoldRate(rate);
                                }
                              }
                              
                              if (rate > 0 || val === '0') {
                                try {
                                  const supabase = createClient();
                                  const today = new Date().toISOString().split('T')[0];
                                  
                                  // Try to get existing rate, handle case where no record exists
                                  let existingRate: any = null;
                                  let fetchError: any = null;
                                  
                                  const { data, error: selectError } = await supabase
                                    .from('gold_rates')
                                    .select('*')
                                    .eq('effective_date', today)
                                    .eq('metal_type', metal.value)
                                    .single();
                                  
                                  // If there's an error but it's the 'not found' error, it's not a real error
                                  if (selectError && selectError.code !== 'PGRST116') {
                                    // Check if it's the enum error for unsupported metal type
                                    if (selectError.code === '22P02' && selectError.message?.includes('metal_type_enum')) {
                                      console.warn(`Unsupported metal type: ${metal.value}. Using gold rate as fallback.`);
                                      // For unsupported metal types, try to fetch gold rate as fallback
                                      const { data: fallbackData, error: fallbackError } = await supabase
                                        .from('gold_rates')
                                        .select('*')
                                        .eq('metal_type', 'gold')
                                        .order('effective_date', { ascending: false })
                                        .limit(1)
                                        .single();
                                      
                                      if (!fallbackError && fallbackData) {
                                        const fallbackRate = parseFloat(fallbackData.rate_per_gram) || 0
                                        // Use the fallback rate
                                        setAllMetalRates(prev => ({
                                          ...prev,
                                          [metal.value]: fallbackRate
                                        }));
                                        
                                        // If this is the currently selected metal type, update the display
                                        if (selectedMetalType === metal.value) {
                                          setDailyGoldRate(fallbackRate);
                                          setDailyGoldRateInput(fallbackRate.toString());
                                          
                                          // Update gold rate if this is a gold type
                                          if (metal.value === 'gold' || metal.value === 'gold_916' || metal.value === 'gold_750') {
                                            setGoldRate(fallbackRate);
                                          }
                                        }
                                        
                                        // The effective rate will be fallbackRate in the update/insert logic below
                                        existingRate = null; // Don't try to update an existing record
                                        fetchError = null; // No error with fallback
                                      } else {
                                        console.error('Error fetching fallback gold rate:', JSON.stringify(fallbackError))
                                        fetchError = selectError; // Use the original error
                                      }
                                    } else {
                                      console.error('Error fetching existing metal rate:', JSON.stringify(selectError));
                                      fetchError = selectError; // This is a real error
                                    }
                                  } else if (!selectError) {
                                    existingRate = data; // Found existing record
                                  }
                                  
                                  let error: any = null;
                                  // Use fallback rate if we had an enum error
                                  const effectiveRate = fetchError && selectError?.code === '22P02' ? allMetalRates[metal.value] || 0 : rate;
                                                                
                                  if (existingRate) {
                                    // Update existing record
                                    const { error: updateError } = await supabase
                                      .from('gold_rates')
                                      .update({ rate_per_gram: effectiveRate })
                                      .eq('id', existingRate.id);
                                    error = updateError;
                                  } else if (!fetchError) {
                                    // Insert new record only if there was no fetch error
                                    const { error: insertError } = await supabase
                                      .from('gold_rates')
                                      .insert({
                                        rate_per_gram: effectiveRate,
                                        effective_date: today,
                                        metal_type: metal.value
                                      });
                                    error = insertError;
                                  } else {
                                    // Propagate the fetch error
                                    error = fetchError;
                                  }

                                  // Check if there's a real error (not just an empty object)
                                  const hasError = error && Object.keys(error).length > 0;
                                  
                                  if (hasError && error) {
                                    // Handle specific duplicate key error
                                    if (error.code === '23505' && error.message?.includes('unique_date_metal_type')) {
                                      // Duplicate key error - update instead of insert
                                      const effectiveRate = fetchError && selectError?.code === '22P02' ? allMetalRates[metal.value] || 0 : rate;
                                      const { error: updateError } = await supabase
                                        .from('gold_rates')
                                        .update({ rate_per_gram: effectiveRate })
                                        .eq('effective_date', today)
                                        .eq('metal_type', metal.value);
                                                                          
                                      if (updateError) {
                                        console.error('Error updating metal rate:', JSON.stringify(updateError));
                                        const errorMessage = updateError?.message || 'Failed to update metal rate. Please check console for details.';
                                        toast({
                                          title: 'Error',
                                          description: errorMessage,
                                          variant: 'destructive',
                                        });
                                      } else {
                                        toast({
                                          title: 'Metal Rate Updated',
                                          description: `Daily ${metal.label} rate updated to ₹${effectiveRate.toFixed(2)}/gram`,
                                        });
                                      }
                                    } else {
                                      console.error('Error saving metal rate:', JSON.stringify(error));
                                      // Properly handle Supabase error object
                                      const errorMessage = error?.message || 'Failed to save metal rate. Please check console for details.';
                                      toast({
                                        title: 'Error',
                                        description: errorMessage,
                                        variant: 'destructive',
                                      });
                                    }
                                  } else if ((fetchError && selectError?.code === '22P02' ? allMetalRates[metal.value] || 0 : rate) > 0) {
                                    const displayRate = fetchError && selectError?.code === '22P02' ? allMetalRates[metal.value] || 0 : rate;
                                    toast({
                                      title: 'Metal Rate Updated',
                                      description: `Daily ${metal.label} rate set to ₹${displayRate.toFixed(2)}/gram`,
                                    });
                                  }
                                } catch (error: any) {
                                  console.error('Error saving metal rate:', error);
                                  const errorMessage = error?.message || error?.error || 'An unexpected error occurred while saving metal rate';
                                  toast({
                                    title: 'Error',
                                    description: errorMessage,
                                    variant: 'destructive',
                                  });
                                }
                              }
                            }
                          }}
                          className="h-11 text-base font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                dailyGoldRate > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Daily Metal Rate</h3>
                    <p className="text-sm text-muted-foreground mb-2">Daily {selectedMetalType === 'silver_92' ? 'Silver (92.5%)' : selectedMetalType === 'silver_70' ? 'Silver (70%)' : selectedMetalType === 'selam_silver' ? 'Selam Silver' : selectedMetalType === 'gold_916' ? 'Gold (22k/91.6%)' : selectedMetalType === 'gold_750' ? 'Gold (18k/75%)' : 'Gold (Standard)'} Rate</p>
                    <p className="text-2xl font-bold text-primary">₹{dailyGoldRate.toFixed(2)}/gram</p>
                  </div>
                )
              )}
              
              {/* Bill Number */}
              {billNo && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Bill Number</p>
                  <p className="text-xl font-bold text-primary">{billNo}</p>
                </div>
              )}
            </Card>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
            {/* Bill Items Section (shown above Add Items, especially useful when editing) */}
            {items.length > 0 && (
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-foreground">
                      {currentBillId ? 'Existing Bill Items' : 'Bill Items'}
                    </h2>
                    {currentBillId && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                        Edit mode
                      </span>
                    )}
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
                        {items.map(item => {
                          const isEditingRow = editingItemId === item.id
                          const inlineRate = isEditingRow ? parseFloat(editingItemData.rateInput) || 0 : item.rate
                          const inlineWeight = isEditingRow ? parseFloat(editingItemData.weightInput) || 0 : item.weight
                          // Calculate inline making charges based on whether it's a percentage or amount
                          let inlineMaking = item.making_charges; // Default to stored value
                          if (isEditingRow) {
                            // Check if amount is entered
                            if (editingItemData.makingChargesAmount && !editingItemData.makingChargesPercentage) {
                              inlineMaking = parseFloat(editingItemData.makingChargesAmount) || 0;
                            } 
                            // Check if percentage is entered
                            else if (editingItemData.makingChargesPercentage && !editingItemData.makingChargesAmount) {
                              const percentage = parseFloat(editingItemData.makingChargesPercentage) || 0;
                              inlineMaking = (inlineWeight * inlineRate) * (percentage / 100);
                            }
                            // Fallback to the old field if both are empty
                            else {
                              const makingInput = editingItemData.makingChargesInput;
                              if (makingInput.endsWith('%')) {
                                // Calculate percentage of (weight * rate)
                                const percentage = parseFloat(makingInput.slice(0, -1)) || 0;
                                inlineMaking = (inlineWeight * inlineRate) * (percentage / 100);
                              } else {
                                // Use as fixed amount
                                inlineMaking = parseFloat(makingInput) || 0;
                              }
                            }
                          }
                          
                          const inlineTotal = calculateLineTotal(inlineWeight, inlineRate, inlineMaking)

                          return (
                            <tr key={item.id} className={`border-b border-slate-200 dark:border-slate-700 ${isEditingRow ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800'} transition-colors`}>
                              <td className="py-4 px-4 font-medium text-foreground">
                                {isEditingRow ? (
                                  <div className="space-y-2">
                                    <Input
                                      placeholder="Item Name *"
                                      value={editingItemData.item_name}
                                      onChange={(e) => setEditingItemData(prev => ({ ...prev, item_name: e.target.value }))}
                                      className="h-9 text-sm"
                                    />
                                    <Input
                                      placeholder="Barcode"
                                      value={editingItemData.barcode}
                                      onChange={(e) => setEditingItemData(prev => ({ ...prev, barcode: e.target.value }))}
                                      className="h-9 text-xs"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    {item.item_name}
                                    {item.barcode && (
                                      <div className="text-xs text-muted-foreground mt-1">Barcode: {item.barcode}</div>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <Input
                                    type="text"
                                    value={editingItemData.weightInput}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                        setEditingItemData(prev => ({ ...prev, weightInput: val }))
                                      }
                                    }}
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  `${item.weight}g`
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <Input
                                    type="text"
                                    placeholder={editingItemData.metal_type.startsWith('gold') ? `Default: ₹${goldRate.toFixed(2)}` : ''}
                                    value={editingItemData.rateInput}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                        setEditingItemData(prev => ({ ...prev, rateInput: val }))
                                      }
                                    }}
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  `₹${item.rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <div className="flex items-center gap-1 w-full">
                                    <div className="flex-1">
                                      <Input
                                        type="text"
                                        placeholder="Amt"
                                        value={editingItemData.makingChargesAmount || ''}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          // Allow numbers and decimals only
                                          if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                            setEditingItemData(prev => ({ 
                                              ...prev, 
                                              makingChargesAmount: val,
                                              // Clear percentage when amount is entered
                                              makingChargesPercentage: '',
                                              // Update the main field to be compatible with existing logic
                                              makingChargesInput: val
                                            }))
                                          }
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </div>
                                    <span className="text-muted-foreground text-xs">OR</span>
                                    <div className="flex-1">
                                      <Input
                                        type="text"
                                        placeholder="%"
                                        value={editingItemData.makingChargesPercentage || ''}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          // Allow numbers and decimals only (no % sign here)
                                          if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                            setEditingItemData(prev => ({ 
                                              ...prev, 
                                              makingChargesPercentage: val,
                                              // Clear amount when percentage is entered
                                              makingChargesAmount: '',
                                              // Update the main field to be compatible with existing logic
                                              makingChargesInput: val ? `${val}%` : ''
                                            }))
                                          }
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  `₹${item.making_charges.toFixed(2)}`
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <Input
                                    type="text"
                                    value={editingItemData.purity || getPurityFromMetalType(editingItemData.metal_type || 'gold')}
                                    readOnly
                                    className="h-9 text-sm bg-muted"
                                  />
                                ) : (
                                  item.purity || getPurityFromMetalType(item.metal_type || 'gold') || '-'
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <select
                                    value={editingItemData.metal_type}
                                    onChange={async (e) => {
                                      const newMetalType = e.target.value;
                                      const autoPurity = getPurityFromMetalType(newMetalType);
                                      setEditingItemData(prev => ({ ...prev, metal_type: newMetalType, purity: autoPurity }));
                                      
                                      // Fetch the latest rate for the selected metal type
                                      try {
                                        const supabase = createClient();
                                        const { data, error } = await supabase
                                          .from('gold_rates')
                                          .select('rate_per_gram')
                                          .eq('metal_type', newMetalType)
                                          .order('effective_date', { ascending: false })
                                          .limit(1)
                                          .single();
                                        
                                        if (error && error.code !== 'PGRST116') {
                                          console.error('Error fetching metal rate:', error);
                                        } else if (data) {
                                          const rate = parseFloat(data.rate_per_gram) || 0;
                                          setEditingItemData(prev => ({
                                            ...prev,
                                            rate: rate,
                                            rateInput: rate.toString(),
                                            purity: autoPurity
                                          }));
                                        }
                                      } catch (error) {
                                        console.error('Error in metal type change:', error);
                                      }
                                    }}
                                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                  >
                                    <option value="gold">Gold (Standard)</option>
                                    <option value="gold_916">Gold (22k/91.6%)</option>
                                    <option value="gold_750">Gold (18k/75%)</option>
                                    <option value="silver_92">Silver (92.5%)</option>
                                    <option value="silver_70">Silver (70%)</option>
                                    <option value="selam_silver">Selam Silver</option>
                                  </select>
                                ) : (
                                  item.metal_type?.toUpperCase() || 'GOLD'
                                )}
                              </td>
                              <td className="py-4 px-4 text-foreground">
                                {isEditingRow ? (
                                  <Input
                                    type="text"
                                    value={editingItemData.hsn_code}
                                    onChange={(e) => setEditingItemData(prev => ({ ...prev, hsn_code: e.target.value }))}
                                    className="h-9 text-sm"
                                    placeholder="HSN"
                                  />
                                ) : (
                                  item.hsn_code || '711319'
                                )}
                              </td>
                              <td className="py-4 px-4 font-bold text-primary text-lg">
                                {isEditingRow ? `₹${inlineTotal.toFixed(2)}` : `₹${item.line_total.toFixed(2)}`}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {isEditingRow ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleSaveInlineItemEdit(item.id)}
                                      className="text-primary hover:text-primary/80 font-semibold px-3 py-1 rounded hover:bg-primary/10 transition-colors text-sm"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelInlineItemEdit}
                                      className="text-muted-foreground hover:text-foreground font-medium px-3 py-1 rounded hover:bg-muted transition-colors text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleStartInlineItemEdit(item.id)}
                                      className="text-primary hover:text-primary/80 font-medium px-3 py-1 rounded hover:bg-primary/10 transition-colors text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveItem(item.id)} 
                                      className="text-destructive hover:text-destructive/80 font-medium px-3 py-1 rounded hover:bg-destructive/10 transition-colors text-sm"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )}

            {/* Add Items Section */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-green-500 text-xl">📦</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Add Items</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="relative">
                  <Input
                      placeholder="Scan or enter barcode"
                      value={newItem.barcode}
                      onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newItem.barcode.trim()) {
                          e.preventDefault()
                          await handleSearchBarcode()
                        }
                      }}
                      className="h-11"
                    />
                    {isLoadingItem && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                                      )}
                                    </div>
                          <Input
                    placeholder="Item Name *"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    className="h-11"
                          />
                          <Input
                    type="text"
                    placeholder="Weight (grams) * (e.g., 0.5, 3.960)"
                    value={newItem.weightInput}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                        setNewItem({ ...newItem, weightInput: val })
                      }
                    }}
                    className="h-11"
                  />
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={newItem.metal_type.startsWith('gold') ? `Default: ₹${goldRate.toFixed(2)}` : 'Custom Rate (₹/gram)'}
                      value={newItem.rateInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setNewItem({ ...newItem, rateInput: val });
                        }
                      }}
                      className="h-11"
                    />
                    {!dailyGoldRate && !newItem.rateInput && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">
                        Daily rate not set
                      </span>
                    )}
                  </div>
                  <div>
                    <select
                      value={newItem.metal_type}
                      onChange={async (e) => {
                        const newMetalType = e.target.value;
                        const autoPurity = getPurityFromMetalType(newMetalType);
                        setNewItem({ ...newItem, metal_type: newMetalType, purity: autoPurity });
                        
                        // Fetch the latest rate for the selected metal type
                        try {
                          const supabase = createClient();
                          const { data, error } = await supabase
                            .from('gold_rates')
                            .select('rate_per_gram')
                            .eq('metal_type', newMetalType)
                            .order('effective_date', { ascending: false })
                            .limit(1)
                            .single();
                          
                          if (error && error.code !== 'PGRST116') {
                            console.error('Error fetching metal rate:', error);
                          } else if (data) {
                            const rate = parseFloat(data.rate_per_gram) || 0;
                            setNewItem(prev => ({
                              ...prev,
                              rate: rate,
                              rateInput: rate.toString(),
                              purity: autoPurity
                            }));
                          }
                        } catch (error) {
                          console.error('Error in metal type change:', error);
                        }
                      }}
                      className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="gold">Gold (Standard)</option>
                      <option value="gold_916">Gold (22k/91.6%)</option>
                      <option value="gold_750">Gold (18k/75%)</option>
                      <option value="silver_92">Silver (92.5%)</option>
                      <option value="silver_70">Silver (70%)</option>
                      <option value="selam_silver">Selam Silver</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                      <Input
                        type="text"
                        placeholder="Amount"
                        value={newItem.makingChargesAmount}
                        onChange={(e) => {
                          const val = e.target.value
                          // Allow numbers and decimals only
                          if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                            setNewItem({ 
                              ...newItem, 
                              makingChargesAmount: val,
                              // Clear percentage when amount is entered
                              makingChargesPercentage: '',
                              // Update the main field to be compatible with existing logic
                              makingChargesInput: val
                            })
                          }
                        }}
                        className="h-11"
                      />
                    </div>
                    <div className="flex items-center justify-center h-full py-4">
                      <span className="text-muted-foreground font-medium">OR</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Percentage</label>
                      <Input
                        type="text"
                        placeholder="Percentage"
                        value={newItem.makingChargesPercentage}
                        onChange={(e) => {
                          const val = e.target.value
                          // Allow numbers and decimals only (no % sign here)
                          if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                            setNewItem({ 
                              ...newItem, 
                              makingChargesPercentage: val,
                              // Clear amount when percentage is entered
                              makingChargesAmount: '',
                              // Update the main field to be compatible with existing logic
                              makingChargesInput: val ? `${val}%` : ''
                            })
                          }
                        }}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <Input
                    type="text"
                    placeholder="HSN Code (default: 711319)"
                    value={newItem.hsn_code}
                    onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
                    className="h-11"
                  />
                </div>
                <Button
                  onClick={handleAddItem}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-lg"
                >
                  + Add Item to Bill
                </Button>
              </div>
          </Card>

            {/* Bill Information */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-blue-500 text-xl">📋</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Bill Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Bill Date</label>
            <Input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Sale Type</label>
                    {userRole === 'admin' ? (
                      <select
              value={saleType}
                        onChange={(e) => setSaleType(e.target.value as 'gst' | 'non_gst')}
                        className="w-full h-11 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="gst">GST</option>
                        <option value="non_gst">Non-GST</option>
                      </select>
                    ) : (
                      <div className="w-full h-11 px-3 py-2 border border-border rounded-lg bg-muted text-foreground flex items-center">
                        GST (Staff can only create GST bills)
                      </div>
                    )}
                    {/* Force staff to always use GST - safety check */}
                    {userRole === 'staff' && saleType !== 'gst' && (
                      <div className="text-xs text-destructive mt-1">
                        Staff cannot create Non-GST bills. Automatically set to GST.
                      </div>
                    )}
                  </div>
                  {saleType === 'non_gst' && userRole === 'admin' && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-foreground mb-2 block">Non-GST Auth ID</label>
                      <Input
                        placeholder="Enter authorization ID"
                        value={nongstAuthId}
                        onChange={(e) => setNongstAuthId(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  )}
                  {saleType === 'gst' && (
                      <div className="md:col-span-2">
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                          GST is fixed at 3% (1.5% CGST + 1.5% SGST)
                        </p>
                        </div>
                      </div>
                  )}
                </div>
              </div>
          </Card>

            {/* Payment Details - Below Bill Information */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">💳</span>
                  <h3 className="text-xl font-bold text-foreground">Payment Details</h3>
                  </div>
                <div className="space-y-6">
                  {paymentMethods.map((payment, index) => (
                    <div key={payment.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1 block">Payment Method</label>
                        <select
                          value={payment.type}
                          onChange={(e) => {
                            const updated = [...paymentMethods]
                            updated[index].type = e.target.value as PaymentMethodType
                            setPaymentMethods(updated)
                          }}
                          className="w-full h-11 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="cheque">Cheque</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="other">Other</option>
                        </select>
                </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1 block">Amount</label>
                    <Input
                      type="text"
                          placeholder="Amount"
                          value={payment.amount}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                              const updated = [...paymentMethods]
                              updated[index].amount = val
                              setPaymentMethods(updated)
                      }
                    }}
                      className="h-11"
                    />
                  </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1 block">Reference</label>
                    <Input
                      type="text"
                          placeholder="Transaction ID / Cheque No."
                          value={payment.reference}
                      onChange={(e) => {
                            const updated = [...paymentMethods]
                            updated[index].reference = e.target.value
                            setPaymentMethods(updated)
                      }}
                      className="h-11"
                    />
                  </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentMethods(paymentMethods.filter((_, i) => i !== index))
                        }}
                        className="h-11"
                      >
                        Remove
                      </Button>
                  </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentMethods([
                        ...paymentMethods,
                        { id: Date.now().toString(), type: 'cash', amount: '', reference: '' }
                      ])
                    }}
                    className="w-full"
                  >
                    + Add Payment Method
                  </Button>
                </div>
              </div>
            </Card>

            {/* Old Gold Exchange Section (Pink Slip) */}
            <Card className="border-2 border-pink-200 dark:border-pink-700 shadow-lg bg-pink-50/30 dark:bg-pink-900/10">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-pink-500 text-xl">🪙</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Old Gold Exchange (Pink Slip)</h2>
                </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-foreground mb-2 block">Particulars / Description</label>
              <Input
                      placeholder="Enter description (e.g., Old gold ornaments)"
                      value={oldGoldExchange.particulars}
                      onChange={(e) => setOldGoldExchange({ ...oldGoldExchange, particulars: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">HSN Code</label>
                    <Input
                      placeholder="HSN Code (default: 7113)"
                      value={oldGoldExchange.hsn_code}
                      onChange={(e) => setOldGoldExchange({ ...oldGoldExchange, hsn_code: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Weight (grams)</label>
                    <Input
                      type="text"
                      placeholder="Enter weight (e.g., 0.5, 3.960)"
                      value={oldGoldExchange.weightInput}
                      onChange={(e) => {
                        const val = e.target.value
                        // Allow empty, numbers, decimals, and negative (for now, we'll validate later)
                        if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                          setOldGoldExchange({ ...oldGoldExchange, weightInput: val })
                        }
                      }}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Purity</label>
                    <select
                      value={oldGoldExchange.purity}
                      onChange={(e) => setOldGoldExchange({ ...oldGoldExchange, purity: e.target.value })}
                      className="h-11 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Select Purity</option>
                      <option value="92.5%">92.5%</option>
                      <option value="70%">70%</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Rate per gram (₹)</label>
                    <Input
                      type="text"
                      placeholder={dailyGoldRate > 0 ? `Default: ${dailyGoldRate.toFixed(2)}` : 'Enter rate'}
                      value={oldGoldExchange.rateInput}
                      onChange={(e) => {
                        const val = e.target.value
                        // Allow empty, numbers, decimals
                        if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                          setOldGoldExchange({ ...oldGoldExchange, rateInput: val })
                        }
                      }}
                      onBlur={(e) => {
                        // When user leaves field, if empty and dailyGoldRate exists, use it
                        if (!oldGoldExchange.rateInput && dailyGoldRate > 0) {
                          setOldGoldExchange({ ...oldGoldExchange, rateInput: dailyGoldRate.toString() })
                        }
                      }}
                      onFocus={(e) => {
                        if (!oldGoldExchange.rateInput && dailyGoldRate > 0) {
                          setOldGoldExchange({ ...oldGoldExchange, rateInput: dailyGoldRate.toString() })
                        }
                      }}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Total Value (₹)</label>
                    <Input
                      type="text"
                      placeholder="Auto-calculated"
                      value={oldGoldExchange.total ? oldGoldExchange.total.toFixed(2) : ''}
                      onChange={(e) => setOldGoldExchange({ ...oldGoldExchange, total: parseFloat(e.target.value) || 0 })}
                      className="h-11 bg-muted font-semibold"
                      readOnly
                    />
                  </div>
                </div>
                {oldGoldExchange.total > 0 && (
                  <div className="mt-4 p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg border border-pink-300 dark:border-pink-700">
                    <p className="text-sm text-pink-900 dark:text-pink-100">
                      <span className="font-semibold">Pink Slip Value:</span> ₹{oldGoldExchange.total.toFixed(2)} will be created as a purchase bill and credited to this sales bill.
                      {purchaseBillId && (
                        <span className="ml-2 text-xs">(Purchase Bill ID: {purchaseBillId})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Layaway / Advance Booking Section */}
            <LayawayForm 
              isVisible={true}
              onCalculate={(data) => {
                // Calculate remaining amount
                const remaining = data.totalAmount - data.advanceAmount;
                
                // Calculate tracking flag (true if finalPaymentDate >= 3 days after advancePaymentDate)
                let trackingFlag = false;
                if (data.advancePaymentDate && data.finalPaymentDate) {
                  const advanceDate = new Date(data.advancePaymentDate);
                  const finalDate = new Date(data.finalPaymentDate);
                  const diffTime = Math.abs(finalDate.getTime() - advanceDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  trackingFlag = diffDays >= 3;
                }
                
                setLayawayData({
                  advancePaymentDate: data.advancePaymentDate,
                  itemTakenDate: data.itemTakenDate,
                  finalPaymentDate: data.finalPaymentDate,
                  advanceAmount: data.advanceAmount,
                  remainingAmount: remaining,
                  trackingFlag: trackingFlag
                });
                
                setIsLayaway(true);
              }}
              initialData={{
                advancePaymentDate: layawayData.advancePaymentDate,
                itemTakenDate: layawayData.itemTakenDate,
                finalPaymentDate: layawayData.finalPaymentDate,
                advanceAmount: layawayData.advanceAmount,
                totalAmount: amountPayable
              }}
            />

        </div>

          {/* Sidebar - Professional Design */}
        <div className="space-y-6">
          {/* Bill Summary */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl">💰</span>
                  <h3 className="font-bold text-foreground">Bill Summary</h3>
                </div>
            <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-primary/20">
                    <span className="text-muted-foreground font-medium">Subtotal:</span>
                    <span className="text-foreground font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
                  {saleType === 'gst' && billLevelGST > 0 && (
                    <>
                        <div className="flex justify-between py-2 border-b border-primary/20">
                        <span className="text-muted-foreground">CGST (1.5%):</span>
                        <span className="text-foreground">₹{cgst.toFixed(2)}</span>
              </div>
                        <div className="flex justify-between py-2 border-b border-primary/20">
                        <span className="text-muted-foreground">SGST (1.5%):</span>
                        <span className="text-foreground">₹{sgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-primary/20">
                        <span className="text-muted-foreground font-medium">GST Total (3%):</span>
                        <span className="text-foreground font-semibold">₹{billLevelGST.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {mcValueAdded.total !== 0 && (
                    <div className="flex justify-between py-2 border-b border-primary/20">
                      <span className="text-muted-foreground">MC/Value Added:</span>
                      <span className="text-foreground">₹{mcValueAdded.total}</span>
                    </div>
                  )}
                  {silverMakingChargesTotal > 0 && (
                    <div className="flex justify-between py-2 border-b border-primary/20">
                      <span className="text-muted-foreground">Silver Making Charges:</span>
                      <span className="text-foreground">₹{silverMakingChargesTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <label className="text-muted-foreground block mb-2 font-medium">Discount</label>
                    <Input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                          setDiscountInput(val)
                          const num = val === '' ? 0 : parseFloat(val)
                          if (!isNaN(num)) {
                            setDiscount(num)
                          } else {
                            setDiscount(0)
                          }
                        }
                      }}
                      placeholder="Enter discount"
                      className="h-10 text-sm"
                    />
              </div>
                  {oldGoldExchange.total > 0 && (
                    <div className="flex justify-between py-2 border-b border-primary/20 mt-2">
                      <span className="text-muted-foreground">Old Gold Credit:</span>
                      <span className="text-foreground text-green-600 dark:text-green-400 font-semibold">-₹{oldGoldExchange.total.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary pt-4 mt-4">
                    <label className="font-bold text-lg text-foreground block mb-2">Amount Payable:</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amountPayableInput !== null ? amountPayableInput : amountPayable.toFixed(2)}
                      onChange={(e) => {
                        const val = e.target.value
                        setAmountPayableInput(val)
                      }}
                      onFocus={(e) => {
                        if (amountPayableInput === null) {
                          const currentValue = amountPayable.toFixed(2)
                          setAmountPayableInput(currentValue)
                          requestAnimationFrame(() => {
                            e.target.select()
                          })
                        } else {
                          e.target.select()
                        }
                      }}
                      onBlur={() => {
                        if (amountPayableInput === null) {
                          return
                        }
                        if (amountPayableInput === '' || amountPayableInput.trim() === '') {
                          setAmountPayableInput(null)
                          return
                        }
                        const numValue = parseFloat(amountPayableInput)
                        if (isNaN(numValue) || numValue <= 0) {
                          setAmountPayableInput(null)
                        }
                      }}
                      placeholder={amountPayable.toFixed(2)}
                      className="h-12 text-2xl font-bold text-primary text-right"
                    />
                    {oldGoldExchange.total > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        (After old gold exchange credit)
                      </div>
                    )}
                  </div>
              </div>
              </div>
          </Card>

          {/* Actions */}
            <div className="space-y-3">
              {currentBillId && (
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                  onClick={async () => {
                  const saved = await handleSaveBill()
                  if (!saved) return
                  toast({
                    title: 'Bill Updated',
                    description: 'Changes saved successfully (no print triggered).',
                  })
                  }}
                >
                  💾 Save Bill Changes (No Print)
                </Button>
              )}
              <Button 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-lg shadow-lg"
                onClick={async () => {
                  // Save bill to database first
                  const saved = await handleSaveBill()
                  if (!saved) {
                    return // Don't proceed if save failed
                  }
                  
                  setShowInvoice(true)
                  // Trigger print after a short delay to ensure invoice is rendered
                  setTimeout(() => {
                    window.print()
                    // Hide invoice after printing
                    setTimeout(() => {
                      setShowInvoice(false)
                      // Removed resetBillForm() to prevent auto-refresh after save and print
                    }, 500)
                  }, 300)
                }}
              >
                💾🖨️ Save and Print Bill
              </Button>
              {oldGoldExchange.total > 0 && (
                <Button 
                  className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-lg shadow-lg"
                  onClick={() => {
                    setShowPurchaseBill(true)
                    setTimeout(() => {
                      window.print()
                      setTimeout(() => {
                        setShowPurchaseBill(false)
                      }, 500)
                    }, 300)
                  }}
                >
                  🪙 Print Old Gold Exchange Bill
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Print Component */}
      {showInvoice && (
        <InvoicePrint
          customer={customer as Customer | null}
          billDate={billDate}
          dailyGoldRate={dailyGoldRate}
          allMetalRates={allMetalRates}
          items={items}
          mcValueAdded={mcValueAdded}
          oldGoldExchange={oldGoldExchange}
          subtotal={subtotal}
          billLevelGST={billLevelGST}
          discount={discount}
          grandTotal={grandTotal}
          amountPayable={amountPayable}
          billNo={billNo}
          saleType={saleType}
          cgst={cgst}
          sgst={sgst}
          igst={igst}
          paymentMethods={paymentMethods}
          isLayaway={isLayaway}
          layawayData={isLayaway ? layawayData : undefined}
        />
      )}

      {/* Purchase Bill Print Component (Old Gold Exchange) */}
      {showPurchaseBill && oldGoldExchange.total > 0 && (
        <PurchaseBillPrint
          customer={customer as Customer | null}
          billDate={billDate}
          oldGoldExchange={oldGoldExchange}
          billNo={billNo || ''}
          staffName={username}
        />
      )}
    </div>
  )
}
