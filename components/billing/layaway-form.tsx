'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface LayawayFormProps {
  isVisible: boolean
  onCalculate: (data: {
    advancePaymentDate: string
    itemTakenDate: string
    finalPaymentDate: string
    advanceAmount: number
    totalAmount: number
  }) => void
  initialData?: {
    advancePaymentDate?: string
    itemTakenDate?: string
    finalPaymentDate?: string
    advanceAmount?: number
    totalAmount?: number
  }
}

export function LayawayForm({ isVisible, onCalculate, initialData }: LayawayFormProps) {
  const [advancePaymentDate, setAdvancePaymentDate] = useState(initialData?.advancePaymentDate || '')
  const [itemTakenDate, setItemTakenDate] = useState(initialData?.itemTakenDate || '')
  const [finalPaymentDate, setFinalPaymentDate] = useState(initialData?.finalPaymentDate || '')
  const [advanceAmount, setAdvanceAmount] = useState(initialData?.advanceAmount?.toString() || '')
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount?.toString() || '')
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [trackingFlag, setTrackingFlag] = useState(false)

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.advancePaymentDate) setAdvancePaymentDate(initialData.advancePaymentDate)
      if (initialData.itemTakenDate) setItemTakenDate(initialData.itemTakenDate)
      if (initialData.finalPaymentDate) setFinalPaymentDate(initialData.finalPaymentDate)
      if (initialData.advanceAmount !== undefined) setAdvanceAmount(initialData.advanceAmount.toString())
      if (initialData.totalAmount !== undefined) setTotalAmount(initialData.totalAmount.toString())
    }
  }, [initialData])

  // Calculate remaining amount and tracking flag
  useEffect(() => {
    const advance = parseFloat(advanceAmount) || 0
    const total = parseFloat(totalAmount) || 0
    const remaining = total - advance
    setRemainingAmount(remaining)

    // Calculate tracking flag (true if finalPaymentDate >= 3 days after advancePaymentDate)
    let flag = false
    if (advancePaymentDate && finalPaymentDate) {
      const advanceDate = new Date(advancePaymentDate)
      const finalDate = new Date(finalPaymentDate)
      const diffTime = Math.abs(finalDate.getTime() - advanceDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      flag = diffDays >= 3
    }
    setTrackingFlag(flag)
  }, [advanceAmount, totalAmount, advancePaymentDate, finalPaymentDate])

  const handleSubmit = () => {
    const advance = parseFloat(advanceAmount) || 0
    const total = parseFloat(totalAmount) || 0
    
    if (advance <= 0) {
      alert('Please enter a valid advance amount')
      return
    }
    
    if (advance > total) {
      alert('Advance amount cannot be greater than total amount')
      return
    }
    
    if (!advancePaymentDate || !itemTakenDate || !finalPaymentDate) {
      alert('Please fill in all date fields')
      return
    }
    
    onCalculate({
      advancePaymentDate,
      itemTakenDate,
      finalPaymentDate,
      advanceAmount: advance,
      totalAmount: total
    })
  }

  if (!isVisible) return null

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-700 shadow-lg bg-blue-50/30 dark:bg-blue-900/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <span className="text-blue-500 text-xl">📅</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">Layaway / Advance Booking</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="advancePaymentDate" className="text-sm font-semibold text-foreground mb-2 block">
            Advance Payment Date *
          </Label>
          <Input
            id="advancePaymentDate"
            type="date"
            value={advancePaymentDate}
            onChange={(e) => setAdvancePaymentDate(e.target.value)}
            className="h-11"
          />
        </div>
        
        <div>
          <Label htmlFor="itemTakenDate" className="text-sm font-semibold text-foreground mb-2 block">
            Item Taken Date *
          </Label>
          <Input
            id="itemTakenDate"
            type="date"
            value={itemTakenDate}
            onChange={(e) => setItemTakenDate(e.target.value)}
            className="h-11"
          />
        </div>
        
        <div>
          <Label htmlFor="finalPaymentDate" className="text-sm font-semibold text-foreground mb-2 block">
            Final Payment Date *
          </Label>
          <Input
            id="finalPaymentDate"
            type="date"
            value={finalPaymentDate}
            onChange={(e) => setFinalPaymentDate(e.target.value)}
            className="h-11"
          />
        </div>
        
        <div>
          <Label htmlFor="totalAmount" className="text-sm font-semibold text-foreground mb-2 block">
            Total Amount (₹)
          </Label>
          <Input
            id="totalAmount"
            type="text"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="h-11 bg-muted"
            readOnly
          />
        </div>
        
        <div>
          <Label htmlFor="advanceAmount" className="text-sm font-semibold text-foreground mb-2 block">
            Advance Amount (₹) *
          </Label>
          <Input
            id="advanceAmount"
            type="text"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            className="h-11"
            placeholder="Enter advance amount"
          />
        </div>
        
        <div>
          <Label className="text-sm font-semibold text-foreground mb-2 block">
            Remaining Amount (₹)
          </Label>
          <Input
            type="text"
            value={remainingAmount.toFixed(2)}
            readOnly
            className="h-11 bg-muted font-semibold"
          />
        </div>
        
        <div className="md:col-span-2">
          <div className={`p-3 rounded-lg border ${trackingFlag ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600'}`}>
            <p className="text-sm">
              <span className="font-semibold">Tracking Status:</span> 
              {trackingFlag ? (
                <span className="text-green-700 dark:text-green-300 ml-2">✓ Tracking Required (≥ 3 days)</span>
              ) : (
                <span className="text-gray-700 dark:text-gray-300 ml-2">○ No Tracking Required (&lt; 3 days)</span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <Button 
          onClick={handleSubmit}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
        >
          Calculate Layaway Details
        </Button>
      </div>
    </Card>
  )
}