'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { InvoicePrint } from '@/components/billing/invoice-print'
import { PurchaseBillPrint } from '@/components/billing/purchase-bill-print'
import { getBillById, getBillItems, getGoldRateByDate } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/client'
import type { Customer, Bill } from '@/lib/db/queries'

export default function PrintBillPage() {
  const params = useParams()
  const billId = params?.id ? parseInt(params.id as string) : null
  const [billData, setBillData] = useState<any>(null)
  const [billItems, setBillItems] = useState<any[]>([])
  const [oldGoldExchange, setOldGoldExchange] = useState<any>(null)
  const [dailyGoldRate, setDailyGoldRate] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showSalesBill, setShowSalesBill] = useState(false)
  const [showPurchaseBill, setShowPurchaseBill] = useState(false)
  const hasTriggeredPrintRef = useRef(false)
  const hasOldGoldRef = useRef(false)

  useEffect(() => {
    if (billId) {
      loadBillData(billId)
    }
  }, [billId])

  // Handle after print event to trigger second print if needed
  useEffect(() => {
    const handleAfterPrint = () => {
      if (hasOldGoldRef.current && showSalesBill && !showPurchaseBill) {
        // Sales bill printed, now show and print purchase bill
        setTimeout(() => {
          setShowSalesBill(false)
          setShowPurchaseBill(true)
          setTimeout(() => {
            window.print()
          }, 300)
        }, 500)
      }
    }

    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [showSalesBill, showPurchaseBill])

  const loadBillData = async (id: number) => {
    try {
      setIsLoading(true)
      const bill = await getBillById(id)
      const items = await getBillItems(id)
      const supabase = createClient()
      
      // Fetch gold rate for the bill date
      const billDate = bill.bill_date || bill.created_at
      try {
        const goldRate = await getGoldRateByDate(billDate.split('T')[0])
        if (goldRate) {
          setDailyGoldRate(parseFloat(goldRate.rate_per_gram.toString()) || 0)
        } else {
          // Fallback to latest rate if no rate for that date
          const { data: latestRate } = await supabase
            .from('gold_rates')
            .select('rate_per_gram')
            .order('effective_date', { ascending: false })
            .limit(1)
            .single()
          if (latestRate) {
            setDailyGoldRate(parseFloat(latestRate.rate_per_gram.toString()) || 0)
          }
        }
      } catch (error) {
        console.error('Error fetching gold rate:', error)
      }
      
      // Load old gold exchange
      const { data: oldGold } = await supabase
        .from('old_gold_exchanges')
        .select('*')
        .eq('bill_id', id)
        .single()

      setBillData(bill)
      setBillItems(items)

      let hasOldGold = false
      if (oldGold && !oldGold.error && oldGold.total_value > 0) {
        hasOldGold = true
        hasOldGoldRef.current = true
        const notes = oldGold.notes || ''
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

        setOldGoldExchange({
          weight: oldGold.weight || 0,
          weightInput: (oldGold.weight || 0).toString(),
          purity: oldGold.purity || '',
          rate: oldGold.rate_per_gram || 0,
          rateInput: (oldGold.rate_per_gram || 0).toString(),
          total: oldGold.total_value || 0,
          hsn_code: hsnCode,
          particulars: particulars,
        })
      }

      // Show sales bill first
      setShowSalesBill(true)
      
      // Trigger print only once after a short delay
      if (!hasTriggeredPrintRef.current) {
        hasTriggeredPrintRef.current = true
        setTimeout(() => {
          window.print()
        }, 800)
      }
    } catch (error) {
      console.error('Error loading bill:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !billData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading bill data...</p>
        </div>
      </div>
    )
  }

  // Calculate values for invoice
  // Separate MC/Value Added from regular items
  const mcItem = billItems.find((item: any) => 
    item.item_name && item.item_name.trim().toUpperCase() === 'MC / VALUE ADDED'
  )
  
  const regularItems = billItems.filter((item: any) => 
    !item.item_name || item.item_name.trim().toUpperCase() !== 'MC / VALUE ADDED'
  )
  
  const mcValueAdded = mcItem ? {
    weight: mcItem.weight || 0,
    rate: mcItem.rate || 0,
    total: mcItem.line_total || 0,
  } : { weight: 0, rate: 0, total: 0 }
  
  const subtotal = billData.subtotal || 0
  const billLevelGST = billData.gst_amount || 0
  const discount = billData.discount || 0
  const grandTotal = billData.grand_total || 0
  const amountPayable = grandTotal - (oldGoldExchange?.total || 0)
  const cgst = billData.cgst || 0
  const sgst = billData.sgst || 0
  const igst = billData.igst || 0

  return (
    <div>
      {/* Sales Bill (Portrait) - Show first */}
      {showSalesBill && (
        <InvoicePrint
          customer={billData.customers as Customer | null}
          billDate={billData.bill_date || billData.created_at}
          dailyGoldRate={dailyGoldRate || 0}
          items={regularItems.map((item: any) => ({
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
          }))}
          mcValueAdded={mcValueAdded}
          oldGoldExchange={oldGoldExchange || {
            weight: 0,
            weightInput: '',
            purity: '',
            rate: 0,
            rateInput: '',
            total: 0,
            hsn_code: '',
            particulars: '',
          }}
          subtotal={subtotal}
          billLevelGST={billLevelGST}
          discount={discount}
          grandTotal={grandTotal}
          amountPayable={amountPayable}
          billNo={billData.bill_no || ''}
          saleType={billData.sale_type || 'gst'}
          cgst={cgst}
          sgst={sgst}
          igst={igst}
          paymentMethods={(() => {
            if (!billData.payment_method) return undefined
            try {
              const parsed = JSON.parse(billData.payment_method)
              return Array.isArray(parsed) ? parsed : undefined
            } catch {
              return undefined
            }
          })()}
        />
      )}

      {/* Purchase Bill (Landscape) - Show after sales bill is printed */}
      {showPurchaseBill && oldGoldExchange && oldGoldExchange.total > 0 && (
        <PurchaseBillPrint
          customer={billData.customers as Customer | null}
          billDate={billData.bill_date || billData.created_at}
          oldGoldExchange={oldGoldExchange}
          billNo={billData.bill_no || ''}
          staffName={billData.users?.username || ''}
        />
      )}
    </div>
  )
}

