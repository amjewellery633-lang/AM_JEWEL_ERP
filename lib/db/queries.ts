import { createClient } from '@/lib/supabase/client'

// Type definitions matching your database schema
export interface User {
  id: string
  staff_code?: string
  username: string
  password_hash?: string // Not included in queries by default for security
  role: 'admin' | 'staff' | 'read_only'
  can_edit_bills: boolean
  can_edit_stock: boolean
  can_authorize_nongst: boolean
  twofa_enabled: boolean
  phone?: string
  email?: string
  created_at: string
}

export interface Customer {
  id: number
  customer_code: string
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  created_at: string
}

export interface Item {
  id: string
  barcode: string
  item_name: string
  category?: string
  weight?: number
  purity?: string
  making_charges?: number
  stone_type?: string
  hsn_code?: string
  gst_rate?: number
  price_per_gram?: number
  net_price?: number
  stock_status: 'in_stock' | 'reserved' | 'sold' | 'returned'
  location?: string
  remarks?: string
  metal_type?: string
  created_at: string
}

export interface Bill {
  id: number
  bill_no: string
  bill_date: string
  customer_id?: number
  staff_id?: string
  nongst_auth_id?: string
  sale_type: 'gst' | 'non_gst'
  subtotal?: number
  gst_amount?: number
  cgst?: number
  sgst?: number
  igst?: number
  discount?: number
  grand_total?: number
  payment_method?: string
  payment_reference?: string
  bill_status: 'draft' | 'final' | 'cancelled'
  remarks?: string
  created_at: string
  updated_at: string
}

export interface BillItem {
  id: string
  bill_id: number
  barcode?: string
  item_name?: string
  weight?: number
  rate?: number
  making_charges?: number
  gst_rate?: number
  line_total?: number
  metal_type?: string
  hsn_code?: string
}

export interface GoldRate {
  id: number
  rate_per_gram: number
  effective_date: string
}

// User queries
export async function getUserByUsername(username: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()
  
  if (error) throw error
  return data as User
}

export async function getUserById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as User
}

export async function getUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as User[]
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()
  
  if (error) throw error
  return data as User
}

export async function updateUser(id: string, updates: Partial<User>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as User
}

export async function deleteUser(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Audit Log interface and queries
export interface AuditLog {
  id: number
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export async function getAuditLogs(filters?: {
  userId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  const supabase = createClient()
  let query = supabase
    .from('audit_log')
    .select('*, users(username)')
    .order('created_at', { ascending: false })
  
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }
  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data as (AuditLog & { users?: { username: string } })[]
}

export async function createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('audit_log')
    .insert(log)
    .select()
    .single()
  
  if (error) throw error
  return data as AuditLog
}

// Customer queries
export async function getCustomers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Customer[]
}

export async function getCustomerById(id: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Customer
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'customer_code' | 'created_at'>) {
  console.log('Creating customer with data:', customer)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error creating customer:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during customer creation, continuing...')
  }
  console.log('Customer created successfully:', data)
  return data as Customer
}

export async function updateCustomer(id: number, updates: Partial<Customer>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Customer
}

export async function deleteCustomer(id: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getCustomersByPhone(phone: string) {
  console.log('Searching for customers with phone:', phone)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('phone', `%${phone}%`)
    .limit(10)
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error searching customers by phone:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during customer search, continuing...')
  }
  console.log('Customer search results:', data)
  return data as Customer[]
}

// Item/Inventory queries
export async function getItems() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Item[]
}

export async function getItemByBarcode(barcode: string) {
  console.log('Searching for item with barcode:', barcode)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .single()
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error searching item by barcode:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during item search, continuing...')
  }
  console.log('Item found:', data)
  return data as Item
}

export async function createItem(item: Omit<Item, 'id' | 'created_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data as Item
}

export async function updateItem(id: string, updates: Partial<Item>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Item
}

export async function deleteItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Bill queries
export async function getBills() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bills')
    .select('*, customers(*), users(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getBillById(id: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bills')
    .select('*, customers(*), users(*), bill_items(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createBill(bill: Omit<Bill, 'id' | 'bill_no' | 'created_at' | 'updated_at'>) {
  console.log('Creating bill with data:', bill)
  const supabase = createClient()
  // Ensure bill_status is always a valid enum value
  const validBillStatuses: ('draft' | 'final' | 'cancelled')[] = ['draft', 'final', 'cancelled']
  const billData = {
    ...bill,
    bill_status: bill.bill_status && validBillStatuses.includes(bill.bill_status) 
      ? bill.bill_status 
      : 'final' as 'draft' | 'final' | 'cancelled'
  }
  const { data, error } = await supabase
    .from('bills')
    .insert(billData)
    .select()
    .single()
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error creating bill:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object, continuing...')
  }
  console.log('Bill created successfully:', data)
  return data as Bill
}

export async function updateBill(id: number, updates: Partial<Bill>) {
  console.log('Updating bill ID:', id, 'with updates:', updates)
  const supabase = createClient()
  // Filter out undefined values to prevent enum errors
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  )
  const supabaseUpdates = { ...filteredUpdates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('bills')
    .update(supabaseUpdates)
    .eq('id', id)
    .select()
    .single()
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error updating bill:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during update, continuing...')
  }
  console.log('Bill updated successfully:', data)
  return data as Bill
}

export async function deleteBill(id: number) {
  const supabase = createClient()
  // First delete bill items
  await supabase.from('bill_items').delete().eq('bill_id', id)
  // Then delete the bill
  const { error } = await supabase.from('bills').delete().eq('id', id)
  if (error) throw error
}

export async function getBillItems(billId: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', billId)
    .order('id', { ascending: true })
  
  if (error) throw error
  return data as BillItem[]
}

export async function createBillItems(billId: number, items: Omit<BillItem, 'id' | 'bill_id'>[]) {
  console.log('Creating bill items for bill ID:', billId, 'with items:', items)
  
  if (!items || items.length === 0) {
    console.log('No bill items to create')
    return []
  }
  
  const supabase = createClient()
  
  // Only include fields that are definitely in the base schema to avoid schema cache issues
  const billItems = items.map(item => {
    const basicItem: any = {
      bill_id: billId,
      item_name: item.item_name,
      weight: item.weight,
      rate: item.rate,
      making_charges: item.making_charges,
      gst_rate: item.gst_rate,
      line_total: item.line_total,
    };
    
    // Only add optional fields if they have values to avoid schema cache issues
    if (item.barcode !== undefined && item.barcode !== null) {
      basicItem.barcode = item.barcode;
    }
    
    if (item.metal_type !== undefined && item.metal_type !== null) {
      basicItem.metal_type = item.metal_type;
    }
    
    if (item.hsn_code !== undefined && item.hsn_code !== null && item.hsn_code.trim() !== '') {
      basicItem.hsn_code = item.hsn_code;
    }
    
    return basicItem;
  });
  
  console.log('Final bill items to insert:', billItems)
  
  const { data, error } = await supabase
    .from('bill_items')
    .insert(billItems)
    .select()
  
  if (error && Object.keys(error).length > 0) {
    console.error('Error creating bill items:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during bill items creation, continuing...')
  }
  
  console.log('Bill items created successfully:', data)
  return data as BillItem[]
}

// Purchase Bill queries
export async function getPurchaseBills() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchase_bills')
    .select('*, customers(*), users(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createPurchaseBill(bill: any) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchase_bills')
    .insert(bill)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Returns queries
export async function getReturns() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('returns')
    .select('*, bills(*), items(*), users(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createReturn(returnData: any) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('returns')
    .insert(returnData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Gold Rate queries
export async function getLatestGoldRate() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gold_rates')
    .select('*')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data as GoldRate | null
}

export async function getGoldRateByDate(date: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gold_rates')
    .select('*')
    .eq('effective_date', date)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data as GoldRate | null
}

export async function getGoldRates(limit: number = 30) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gold_rates')
    .select('*')
    .order('effective_date', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as GoldRate[]
}

export async function createGoldRate(rate: Omit<GoldRate, 'id'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gold_rates')
    .insert({
      rate_per_gram: rate.rate_per_gram,
      effective_date: rate.effective_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()
  
  if (error) throw error
  return data as GoldRate
}

export async function updateGoldRate(id: number, updates: Partial<GoldRate>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gold_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as GoldRate
}

// Interface for multiple metal rates
export interface MetalRates {
  gold_rate: number;
  gold_916_rate: number;
  gold_750_rate: number;
  silver_92_rate: number;
  silver_70_rate: number;
  selam_silver_rate: number;
}

export async function getGoldRate(): Promise<MetalRates> {
  const supabase = createClient()
  
  // Get the latest rates for each metal type
  const { data: goldData, error: goldError } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'gold')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  const { data: gold916Data, error: gold916Error } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'gold_916')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  const { data: gold750Data, error: gold750Error } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'gold_750')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  const { data: silver92Data, error: silver92Error } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'silver_92')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  const { data: silver70Data, error: silver70Error } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'silver_70')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  const { data: selamSilverData, error: selamSilverError } = await supabase
    .from('gold_rates')
    .select('rate_per_gram')
    .eq('metal_type', 'selam_silver')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    
  return {
    gold_rate: goldData?.rate_per_gram || 0,
    gold_916_rate: gold916Data?.rate_per_gram || 0,
    gold_750_rate: gold750Data?.rate_per_gram || 0,
    silver_92_rate: silver92Data?.rate_per_gram || 0,
    silver_70_rate: silver70Data?.rate_per_gram || 0,
    selam_silver_rate: selamSilverData?.rate_per_gram || 0,
  }
}

// Advance Booking queries
export interface AdvanceBooking {
  id: number
  bill_id: number
  booking_date: string
  delivery_date: string
  advance_amount: number
  total_amount: number
  remaining_amount?: number
  item_description: string
  customer_notes: string
  booking_status: 'active' | 'delivered' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
}

export async function getAdvanceBookings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('advance_bookings')
    .select('*')
    .order('booking_date', { ascending: false })

  if (error) throw error
  return data as AdvanceBooking[]
}

export async function getAdvanceBookingById(id: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('advance_bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AdvanceBooking
}

export async function createAdvanceBooking(booking: Omit<AdvanceBooking, 'id' | 'created_at' | 'updated_at' | 'remaining_amount'>) {
  console.log('Creating advance booking with data:', booking)
  const supabase = createClient()
  
  // Don't include remaining_amount in insert as it might be a computed column
  const { data, error } = await supabase
    .from('advance_bookings')
    .insert(booking)
    .select()
    .single()

  if (error && Object.keys(error).length > 0) {
    console.error('Error creating advance booking:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during advance booking creation, continuing...')
  }
  console.log('Advance booking created successfully:', data)
  return data as AdvanceBooking
}

export async function updateAdvanceBooking(id: number, updates: Partial<AdvanceBooking>) {
  console.log('Updating advance booking ID:', id, 'with updates:', updates)
  const supabase = createClient()
  
  // Remove remaining_amount from updates if present as it might be a computed column
  const updatesWithoutRemaining = { ...updates }
  if ('remaining_amount' in updatesWithoutRemaining) {
    delete updatesWithoutRemaining.remaining_amount
  }
  
  console.log('Updating advance booking with calculated remaining amount:', updatesWithoutRemaining)
  
  const { data, error } = await supabase
    .from('advance_bookings')
    .update(updatesWithoutRemaining)
    .eq('id', id)
    .select()
    .single()

  if (error && Object.keys(error).length > 0) {
    console.error('Error updating advance booking:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  } else if (error) {
    // Handle case where error is an empty object
    console.warn('Supabase returned an empty error object during advance booking update, continuing...')
  }
  console.log('Advance booking updated successfully:', data)
  return data as AdvanceBooking
}

export async function deleteAdvanceBooking(id: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('advance_bookings')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Layaway Transaction queries
export interface LayawayTransaction {
  id: number
  bill_id: number
  payment_date: string
  amount: number
  payment_method: string
  reference_number: string
  notes: string
  created_at: string
  updated_at: string
}

export async function getLayawayTransactions(billId?: number) {
  const supabase = createClient()
  let query = supabase
    .from('layaway_transactions')
    .select('*')
    .order('payment_date', { ascending: false })

  if (billId) {
    query = query.eq('bill_id', billId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as LayawayTransaction[]
}

export async function getLayawayTransactionById(id: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('layaway_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as LayawayTransaction
}

export async function createLayawayTransaction(transaction: Omit<LayawayTransaction, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('layaway_transactions')
    .insert(transaction)
    .select()
    .single()

  if (error) throw error
  return data as LayawayTransaction
}

export async function updateLayawayTransaction(id: number, updates: Partial<LayawayTransaction>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('layaway_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as LayawayTransaction
}

export async function deleteLayawayTransaction(id: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('layaway_transactions')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}