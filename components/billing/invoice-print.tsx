'use client'

import type { Customer } from '@/lib/db/queries'

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

interface InvoicePrintProps {
  customer: Customer | null
  billDate: string
  dailyGoldRate: number
  allMetalRates?: Record<string, number>
  items: BillItem[]
  mcValueAdded: {
    weight: number
    rate: number
    total: number
  }
  oldGoldExchange: {
    weight: number
    purity: string
    rate: number
    total: number
  }
  subtotal: number
  billLevelGST: number
  discount: number
  grandTotal: number
  amountPayable: number
  billNo?: string
  saleType: 'gst' | 'non_gst'
  cgst: number
  sgst: number
  igst: number
  paymentMethods?: Array<{
    id: string
    type: 'cash' | 'card' | 'upi' | 'cheque' | 'bank_transfer' | 'other'
    amount: string
    reference: string
  }>
  // Layaway props
  isLayaway?: boolean
  layawayData?: {
    advancePaymentDate: string
    itemTakenDate: string
    finalPaymentDate: string
    advanceAmount: number
    remainingAmount: number
    trackingFlag: boolean
  }
}

export function InvoicePrint({
  customer,
  billDate,
  dailyGoldRate,
  allMetalRates,
  items,
  mcValueAdded,
  oldGoldExchange,
  subtotal,
  billLevelGST,
  discount,
  grandTotal,
  amountPayable,
  billNo,
  saleType,
  cgst,
  sgst,
  igst,
  paymentMethods,
  isLayaway,
  layawayData
}: InvoicePrintProps) {
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB')
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  // Get metal names for display
  const getMetalName = (metalType: string): string => {
    const metalNames: Record<string, string> = {
      'gold': 'Gold',
      'gold_916': 'Gold (22k)',
      'gold_750': 'Gold (18k)',
      'silver_92': 'Silver (92.5%)',
      'silver_70': 'Silver (70%)',
      'selam_silver': 'Selam Silver'
    }
    return metalNames[metalType] || metalType.toUpperCase()
  }

  // Get unique metals in the bill and their rates
  const getMetalRates = () => {
    if (!allMetalRates) return []
    
    const uniqueMetals = new Set<string>()
    items.forEach(item => {
      if (item.metal_type) {
        uniqueMetals.add(item.metal_type)
      }
    })

    return Array.from(uniqueMetals)
      .map(metalType => ({
        metalType,
        metalName: getMetalName(metalType),
        rate: allMetalRates[metalType] || 0
      }))
      .filter(metal => metal.rate > 0)
  }

  const metalRates = getMetalRates()

  return (
    <>
      <style jsx global>{`
        .invoice-print-wrapper {
          font-family: 'Playfair Display', serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          display: block;
        }

        @media print {
          /* Portrait for invoice pages */
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          
          body * {
            visibility: hidden;
          }
          .invoice-print-wrapper,
          .invoice-print-wrapper * {
            visibility: visible;
          }
          .invoice-print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          /* Hide purchase bill when printing invoice */
          .purchase-bill-print-wrapper {
            display: none !important;
          }
        }

        .invoice-paper {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          background: #fff;
          padding: 8mm;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          margin: 0 auto;
          page-break-inside: avoid;
        }

        .invoice-paper::before,
        .invoice-paper::after {
          content: "";
          position: absolute;
          left: 18mm;
          right: 18mm;
          height: 1px;
          background: linear-gradient(90deg, transparent, #eee, transparent);
          opacity: 0.25;
        }

        .invoice-paper::before {
          top: 90mm;
          transform: skewX(-0.6deg);
        }

        .invoice-paper::after {
          top: 150mm;
          transform: skewX(0.6deg);
        }

        .invoice-logo {
          font-family: 'Inter', sans-serif;
          color: #d65a5a;
          text-align: center;
          font-size: 48px;
          letter-spacing: 2px;
          margin: 0;
          line-height: 1.2;
        }

        .invoice-logo small {
          display: block;
          font-size: 18px;
          margin-top: 6px;
          color: #d65a5a;
          font-weight: 700;
        }

        .invoice-meta {
          margin-top: 0;
          margin-bottom: 0;
          text-align: center;
        }

        .invoice-meta p {
          margin: 2px 0;
          font-size: 16px;
          color: #222;
          font-weight: 500;
          line-height: 1.3;
        }

        .invoice-meta .address {
          font-variant: small-caps;
          letter-spacing: 0.6px;
        }

        .invoice-meta .contacts {
          color: #d65a5a;
          font-weight: 700;
          font-size: 18px;
        }

        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin: 18px 0;
          gap: 50px;
        }

        .invoice-info .left-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .invoice-info .right-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: right;
        }

        .invoice-info .block {
          min-width: 140px;
        }

        .invoice-info .label {
          font-size: 14px;
          color: #6b6b6b;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }

        .invoice-info .value {
          font-size: 18px;
          color: #222;
          font-weight: 700;
          margin-top: 4px;
          line-height: 1.2;
        }

        .invoice-payment-section {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          gap: 40px;
          z-index: 1;
        }

        .invoice-payment-section .left {
          flex: 1;
        }

        .invoice-payment-section .right {
          flex: 1;
          text-align: right;
        }

        .invoice-payment-mode {
          margin-bottom: 16px;
        }

        .invoice-payment-mode .label {
          font-size: 14px;
          color: #6b6b6b;
          letter-spacing: 0.5px;
          line-height: 1.2;
          margin-bottom: 6px;
          font-weight: 700;
        }

        .invoice-payment-mode .payment-item {
          font-size: 16px;
          color: #222;
          line-height: 1.8;
        }

        .invoice-items {
          margin-top: 24px;
          margin-bottom: 20px;
        }

        .invoice-items table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          page-break-inside: avoid;
          border: 1px solid #ddd;
        }

        .invoice-items th,
        .invoice-items td {
          padding: 8px 6px;
          line-height: 1.4;
          border: 1px solid #ddd;
        }

        .invoice-items th {
          font-size: 12px;
          background: #f5f5f5;
          color: #222;
          border-bottom: 2px solid #ddd;
          text-align: center;
          font-weight: 700;
        }

        .invoice-items tr {
          page-break-inside: avoid;
        }

        .invoice-items td {
          text-align: center;
        }

        .invoice-items td.item {
          text-align: left;
          padding-left: 12px;
        }

        .invoice-watermark {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(-20deg);
          font-size: 120px;
          font-weight: 700;
          color: rgba(218, 140, 70, 0.12);
          font-family: 'Cinzel Decorative', serif;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }

        .invoice-totals {
          display: flex;
          justify-content: center;
          margin-top: 30px;
          margin-bottom: 20px;
          z-index: 1;
        }

        .invoice-totals .right {
          text-align: center;
          width: 100%;
        }

        .invoice-totals .label {
          font-size: 16px;
          color: #6b6b6b;
          text-align: center;
          line-height: 1.2;
        }

        .invoice-totals .amount {
          font-size: 32px;
          color: #c0392b;
          font-weight: 800;
          text-align: center;
          line-height: 1.2;
        }

        .invoice-footer {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          z-index: 1;
        }

        .invoice-footer .left {
          text-align: center;
        }

        .invoice-footer p {
          margin: 3px 0;
          font-size: 14px;
          color: #6b6b6b;
          line-height: 1.3;
        }

        .invoice-signature {
          text-align: center;
          font-weight: 700;
        }

        .invoice-small-header {
          font-size: 14px;
          font-weight: 700;
          text-decoration: underline;
          margin-bottom: 2px;
        }

        .invoice-terms {
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
          max-width: 500px;
        }

        .invoice-terms-title {
          font-size: 14px;
          font-weight: 700;
          color: #c0392b;
          text-align: center;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .invoice-terms-item {
          margin-bottom: 6px;
          padding-left: 20px;
          position: relative;
        }

        .invoice-terms-item::before {
          content: counter(terms-counter) ".";
          counter-increment: terms-counter;
          position: absolute;
          left: 0;
          font-weight: 700;
        }

        .invoice-terms-container {
          counter-reset: terms-counter;
        }

        .invoice-terms-agreement {
          margin-top: 10px;
          font-weight: 600;
          text-align: center;
        }

        @media print {
          html,
          body {
            background: #fff;
          }
          .invoice-watermark {
            color: rgba(218, 140, 70, 0.1);
          }
        }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cinzel+Decorative:wght@400;700&family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="invoice-print-wrapper">
        <div className="invoice-paper">
          <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '20px' }}>
            <div className="invoice-logo">
              AM JEWELLERY
              <small>(916 KDM)</small>
            </div>
            
            <div className="invoice-meta" style={{ marginTop: '16px' }}>
              <p className="address">No. 4, "B" Street, Lal Masjid Road Cross,</p>
              <p className="address" style={{ fontWeight: 700, letterSpacing: '1px' }}>
                Shivajinagar, Bangalore – 560 051
              </p>
              <p className="contacts">PH: 9845105226,&nbsp;&nbsp;&nbsp; MOB: 9986865090,&nbsp;&nbsp;&nbsp; MOB: 9620921903</p>
            </div>
          </div>

          <div className="invoice-info">
            <div className="left-section">
            {billNo && (
              <div className="block">
                <div className="label">BILL NO:-</div>
                <div className="value">{billNo}</div>
              </div>
            )}
          {customer && (
                <>
              <div className="block">
                <div className="label">CUSTOMER:-</div>
                <div className="value">{customer.name || 'N/A'}</div>
              </div>
              {customer.phone && (
                <div className="block">
                  <div className="label">PHONE:-</div>
                  <div className="value">{customer.phone}</div>
                </div>
              )}
                </>
              )}
            </div>
            <div className="right-section">
              <div className="block">
                <div className="label">DATE:-</div>
                <div className="value">{formatDate(billDate)}</div>
              </div>
              {metalRates.length > 0 ? (
                metalRates.map((metal, index) => (
                  <div key={metal.metalType} className="block">
                    <div className="label">
                      <span style={{ fontWeight: 700, color: '#222' }}>{metal.metalName}</span> RATE:-
                    </div>
                    <div className="value">₹{metal.rate.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                dailyGoldRate > 0 && (
              <div className="block">
                <div className="label">RATE:-</div>
                    <div className="value">₹{dailyGoldRate.toFixed(2)}</div>
              </div>
                )
              )}
            </div>
          </div>

          <div className="invoice-items">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>SL NO</th>
                  <th style={{ width: '20%', textAlign: 'left', paddingLeft: '12px' }}>ITEM</th>
                  <th style={{ width: '8%' }}>PURITY</th>
                  <th style={{ width: '8%' }}>METAL</th>
                  <th style={{ width: '8%' }}>HSN</th>
                  <th style={{ width: '10%' }}>WEIGHT</th>
                  <th style={{ width: '10%' }}>RATE</th>
                  <th style={{ width: '10%' }}>MAKING</th>
                  <th style={{ width: '21%' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{item.sl_no || index + 1}</td>
                    <td className="item">{item.item_name || 'Item'}</td>
                    <td>{item.purity || '-'}</td>
                    <td>{item.metal_type?.toUpperCase() || 'GOLD'}</td>
                    <td>{item.hsn_code || '711319'}</td>
                    <td>{item.weight.toFixed(2)}g</td>
                    <td>₹{item.rate.toFixed(2)}</td>
                    <td>₹{(item.making_charges || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>₹{item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
                {mcValueAdded.total > 0 && (
                  <tr>
                    <td colSpan={7}></td>
                    <td className="item" style={{ fontWeight: 700, textDecoration: 'underline' }}>MC / VALUE ADDED</td>
                    <td style={{ fontWeight: 700 }}>₹{mcValueAdded.total.toFixed(2)}</td>
                  </tr>
                )}
                {saleType === 'gst' && billLevelGST > 0 && (
                  <>
                    {cgst > 0 && (
                      <tr>
                        <td colSpan={7}></td>
                        <td className="item">CGST (1.5%)</td>
                        <td style={{ fontWeight: 600 }}>₹{cgst.toFixed(2)}</td>
                      </tr>
                    )}
                    {sgst > 0 && (
                      <tr>
                        <td colSpan={7}></td>
                        <td className="item">SGST (1.5%)</td>
                        <td style={{ fontWeight: 600 }}>₹{sgst.toFixed(2)}</td>
                      </tr>
                    )}
                    {igst > 0 && (
                      <tr>
                        <td colSpan={7}></td>
                        <td className="item">IGST</td>
                        <td style={{ fontWeight: 600 }}>₹{igst.toFixed(2)}</td>
                      </tr>
                    )}
                  </>
                )}
                {discount > 0 && (
                  <tr>
                    <td colSpan={7}></td>
                    <td className="item">DISCOUNT</td>
                    <td style={{ color: '#c0392b', fontWeight: 600 }}>-₹{discount.toFixed(2)}</td>
                  </tr>
                )}
                {oldGoldExchange.total > 0 && (
                  <tr>
                    <td colSpan={7}></td>
                    <td className="item">OLD GOLD CREDIT</td>
                    <td style={{ color: '#c0392b', fontWeight: 600 }}>-₹{oldGoldExchange.total.toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #222' }}>
                  <td colSpan={7}></td>
                  <td className="item" style={{ fontWeight: 700, fontSize: '14px' }}>TOTAL</td>
                  <td style={{ fontWeight: 800, fontSize: '16px', color: '#c0392b' }}>
                    ₹{amountPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="invoice-watermark">AM</div>

          <div className="invoice-payment-section">
            <div className="left">
              <div className="invoice-payment-mode">
                <div className="label">PAYMENT MODE</div>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <>
                {paymentMethods.map((payment, index) => {
                  const amount = parseFloat(payment.amount) || 0
                  const typeLabel = payment.type === 'cash' ? 'Cash' :
                    payment.type === 'card' ? 'Card' :
                    payment.type === 'upi' ? 'UPI' :
                    payment.type === 'cheque' ? 'Cheque' :
                    payment.type === 'bank_transfer' ? 'Bank Transfer' : 'Other'
                  return (
                        <div key={payment.id || index} className="payment-item">
                        {typeLabel}: ₹{amount.toFixed(2)}
                        {payment.reference && ` (Ref: ${payment.reference})`}
                    </div>
                  )
                })}
                    <div className="payment-item" style={{ fontWeight: 700, marginTop: '4px' }}>
                  Total: ₹{paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                </div>
                  </>
                ) : (
                  <>
                    <div className="payment-item">Cash -</div>
                    <div className="payment-item">Card -</div>
                    <div className="payment-item">UPI -</div>
                  </>
                )}
              </div>
              
              {/* Layaway Information */}
              {isLayaway && layawayData && (
                <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #bbdefb' }}>
                  <p className="invoice-small-header" style={{ textAlign: 'center', marginBottom: '8px' }}>LAYAWAY / ADVANCE BOOKING</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                    <div><strong>Advance Payment Date:</strong></div>
                    <div>{formatDate(layawayData.advancePaymentDate)}</div>
                    
                    <div><strong>Item Taken Date:</strong></div>
                    <div>{formatDate(layawayData.itemTakenDate)}</div>
                    
                    <div><strong>Final Payment Date:</strong></div>
                    <div>{formatDate(layawayData.finalPaymentDate)}</div>
                    
                    <div><strong>Advance Amount:</strong></div>
                    <div>₹{layawayData.advanceAmount.toFixed(2)}</div>
                    
                    <div><strong>Remaining Amount:</strong></div>
                    <div>₹{layawayData.remainingAmount.toFixed(2)}</div>
                    
                    <div><strong>Tracking Status:</strong></div>
                    <div>{layawayData.trackingFlag ? 'Required (≥ 3 days)' : 'Not Required (< 3 days)'}</div>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                    Gold taken on {formatDate(layawayData.itemTakenDate)}, advance of ₹{layawayData.advanceAmount.toFixed(2)} paid. 
                    Balance settled on {formatDate(layawayData.finalPaymentDate)}.
                  </p>
            </div>
          )}

              <div className="invoice-terms-container" style={{ marginTop: '12px' }}>
                <div className="invoice-terms-title">TERMS & CONDITIONS</div>
                <div className="invoice-terms">
                  <div className="invoice-terms-item">
                    Customers who wish to exchange / return the old jewellery manufactured / sold with out Trade Mark / Stamped Seal can do with the proof of purchase. As per our Guarantee Less Stones, Beeds, Pearls. Making charges, wastage taxes if any.
                  </div>
                  <div className="invoice-terms-item">
                    The testing guarantee differ on different items is applicable +2% shall not be considered in any case.
                  </div>
                  <div className="invoice-terms-item">
                    This guarantee card is valid only, when it had been filled and stamped by Authorised Signatory.
                  </div>
                  <div className="invoice-terms-item">
                    Resale at present marked rate.
                  </div>
                  <div className="invoice-terms-agreement">I agree for all above conditions</div>
                </div>
              </div>
            </div>
            <div className="right">
              <div className="invoice-signature" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '10px', color: '#6b6b6b', lineHeight: '1.2' }}>FOR</div>
              <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13px', lineHeight: '1.2' }}>AM JEWELLERY</div>
                <div style={{ marginTop: '40px', fontSize: '14px', fontWeight: 600 }}>Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
