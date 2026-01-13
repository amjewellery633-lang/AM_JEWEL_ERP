'use client'

import type { Customer } from '@/lib/db/queries'

interface PurchaseBillPrintProps {
  customer: Customer | null
  billDate: string
  oldGoldExchange: {
    weight: number
    weightInput: string
    purity: string
    rate: number
    rateInput: string
    total: number
    hsn_code: string
    particulars: string
  }
  billNo?: string
  staffName?: string
}

export function PurchaseBillPrint({
  customer,
  billDate,
  oldGoldExchange,
  billNo,
  staffName,
}: PurchaseBillPrintProps) {
  // Format date from YYYY-MM-DD to DD/MM/YY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB').replace(/-/g, '/')
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  // Format weight to show 3 decimal places
  const formatWeight = (weight: number) => {
    return weight.toFixed(3)
  }

  // Format rate (no decimals if whole number, otherwise 2 decimals, with commas)
  const formatRate = (rate: number) => {
    if (rate % 1 === 0) {
      return rate.toLocaleString('en-IN')
    }
    return rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Format amount (with commas, 2 decimals)
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <>
      <style jsx global>{`
        .purchase-bill-print-wrapper {
          font-family: Arial, sans-serif;
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          .purchase-bill-print-wrapper,
          .purchase-bill-print-wrapper * {
            visibility: visible;
          }
          .purchase-bill-print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #e5e5e5;
            display: block !important;
          }
          
          /* Hide invoice when printing purchase bill */
          .invoice-print-wrapper {
            display: none !important;
          }
        }

        .purchase-a4 {
          width: 297mm;
          height: 210mm;
          background: #ff4f7d;
          padding: 8mm;
          box-sizing: border-box;
          position: relative;
          margin: 0 auto;
        }

        .purchase-bill-box {
          background: #ff7aa2;
          border: 2px solid #000;
          width: 100%;
          height: 100%;
          padding: 6mm;
          box-sizing: border-box;
        }

        .purchase-top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 20px;
          font-weight: bold;
          position: relative;
        }

        .purchase-utri-heading {
          text-align: center;
          font-size: 28px;
          font-weight: bold;
          color: #000;
          letter-spacing: 2px;
          margin-top: 2mm;
          margin-bottom: 2mm;
        }

        .purchase-utri-heading {
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          color: #000;
          letter-spacing: 2px;
          margin-top: 2mm;
          margin-bottom: 2mm;
        }

        .purchase-title {
          margin-top: 4mm;
          text-align: center;
          font-size: 36px;
          font-weight: bold;
          color: #d40000;
          letter-spacing: 1px;
        }

        .purchase-sub-info {
          display: flex;
          justify-content: space-between;
          margin-top: 3mm;
          font-size: 18px;
        }

        .purchase-table {
          width: 100%;
          margin-top: 6mm;
          border-collapse: collapse;
          font-size: 18px;
          font-weight: bold;
        }

        .purchase-table th,
        .purchase-table td {
          border: 1px solid #000;
          padding: 8px 10px;
          text-align: center;
        }

        .purchase-big-col {
          height: 45mm;
          vertical-align: middle;
          text-align: center;
        }

        .purchase-pink-write {
          font-size: 24px;
          font-weight: bold;
        }

        .purchase-footer-row {
          margin-top: 8mm;
          display: flex;
          justify-content: center;
          gap: 40px;
          font-size: 20px;
          font-weight: bold;
        }

        .purchase-signature {
          margin-top: 10mm;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
        }

        @media print {
          html,
          body {
            background: #e5e5e5;
          }
        }
      `}</style>

      <div className="purchase-bill-print-wrapper">
        <div className="purchase-a4">
          <div className="purchase-bill-box">
            {/* TOP AREA */}
            <div className="purchase-top-header">
              <div>
                Mr./Mrs: <span className="purchase-pink-write">{customer?.name || 'N/A'}</span>
              </div>
              <div className="purchase-utri-heading" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px' }}>
                UTRI
              </div>
              <div>
                {billNo && (
                  <>
                    No: <span className="purchase-pink-write">{billNo}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginTop: '4mm' }}>
              <img src="/Logo.png" alt="AM JEWELLERY Logo" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
              <div className="purchase-title" style={{ marginTop: 0 }}>AM JEWELLERY</div>
            </div>

            <div className="purchase-sub-info">
              <div>Phone: 9845105226</div>
              <div>Mob: 9986865090</div>
              <div>Mob: 9620921903</div>
            </div>

            <div className="purchase-sub-info">
              <div>Address: No. 4, "B" Street, Lal Masjid Road Cross, Shivajinagar, Bangalore – 560 051</div>
              <div>
                Date: <span className="purchase-pink-write">{formatDate(billDate)}</span>
              </div>
            </div>

            {/* TABLE LAYOUT */}
            <table className="purchase-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Particulars</th>
                  <th style={{ width: '12%' }}>HSN</th>
                  <th style={{ width: '12%' }}>Weight</th>
                  <th style={{ width: '12%' }}>Purity</th>
                  <th style={{ width: '12%' }}>Rate</th>
                  <th style={{ width: '12%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="purchase-big-col purchase-pink-write">
                    {oldGoldExchange.particulars || 'Old Gold Exchange'}
                  </td>
                  <td className="purchase-pink-write">{oldGoldExchange.hsn_code || '7113'}</td>
                  <td className="purchase-pink-write">
                    {formatWeight(oldGoldExchange.weight || parseFloat(oldGoldExchange.weightInput) || 0)}
                  </td>
                  <td className="purchase-pink-write">{oldGoldExchange.purity || '-'}</td>
                  <td className="purchase-pink-write">
                    {formatRate(oldGoldExchange.rate || parseFloat(oldGoldExchange.rateInput) || 0)}
                  </td>
                  <td className="purchase-pink-write">{formatAmount(oldGoldExchange.total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="purchase-footer-row">
              <div>CGST 1.5% —</div>
              <div>SGST 1.5% —</div>
              <div>
                Total: <span className="purchase-pink-write">{formatAmount(oldGoldExchange.total)}</span>
              </div>
            </div>

            <div className="purchase-signature">For AM JEWELLERY</div>
          </div>
        </div>
      </div>
    </>
  )
}

