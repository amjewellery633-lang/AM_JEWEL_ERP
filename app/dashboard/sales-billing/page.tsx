'use client'

import { Suspense } from 'react'
import { SalesBilling } from '@/components/billing/sales-billing'
import { useSearchParams } from 'next/navigation'

function SalesBillingContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  return <SalesBilling editBillId={editId ? parseInt(editId) : undefined} />
}

export default function SalesBillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SalesBillingContent />
    </Suspense>
  )
}
