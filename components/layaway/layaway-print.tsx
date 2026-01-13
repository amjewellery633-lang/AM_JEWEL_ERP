'use client'

import type { Customer, Bill, LayawayTransactionWithBill } from '@/lib/db/queries'

interface LayawayPrintProps {
  customer: Customer | null
  bill: Bill | null
  transactions: LayawayTransactionWithBill[]
  billDate: string
  billNo?: string
  totalAmount: number
  totalPaid?: number
  remainingAmount?: number
}

export function LayawayPrint({
  customer,
  bill,
  transactions,
  billDate,
  billNo,
  totalAmount,
  totalPaid,
  remainingAmount
}: LayawayPrintProps) {
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB')
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00'
    return `₹${amount.toFixed(2)}`
  }

  return (
    <>
      <style jsx global>{`
        .layaway-print-wrapper {
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
          .layaway-print-wrapper,
          .layaway-print-wrapper * {
            visibility: visible;
          }
          .layaway-print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          /* Hide purchase bill when printing layaway */
          .purchase-bill-print-wrapper {
            display: none !important;
          }
        }

        .layaway-paper {
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

        .layaway-paper::before,
        .layaway-paper::after {
          content: "";
          position: absolute;
          left: 18mm;
          right: 18mm;
          height: 1px;
          background: linear-gradient(90deg, transparent, #eee, transparent);
          opacity: 0.25;
        }

        .layaway-paper::before {
          top: 90mm;
          transform: skewX(-0.6deg);
        }

        .layaway-paper::after {
          top: 150mm;
          transform: skewX(0.6deg);
        }

        .layaway-logo {
          font-family: 'Inter', sans-serif;
          color: #d65a5a;
          text-align: center;
          font-size: 48px;
          letter-spacing: 2px;
          margin: 0;
          line-height: 1.2;
        }

        .layaway-logo small {
          display: block;
          font-size: 18px;
          margin-top: 6px;
          color: #d65a5a;
          font-weight: 700;
        }

        .layaway-meta {
          margin-top: 0;
          margin-bottom: 0;
          text-align: center;
        }

        .layaway-meta p {
          margin: 2px 0;
          font-size: 16px;
          color: #222;
          font-weight: 500;
          line-height: 1.3;
        }

        .layaway-meta .address {
          font-variant: small-caps;
          letter-spacing: 0.6px;
        }

        .layaway-meta .contacts {
          color: #d65a5a;
          font-weight: 700;
          font-size: 18px;
        }

        .layaway-info {
          display: flex;
          justify-content: space-between;
          margin: 18px 0;
          gap: 50px;
        }

        .layaway-info .left-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .layaway-info .right-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: right;
        }

        .layaway-info .block {
          min-width: 140px;
        }

        .layaway-info .label {
          font-size: 14px;
          color: #6b6b6b;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }

        .layaway-info .value {
          font-size: 18px;
          color: #222;
          font-weight: 700;
          margin-top: 4px;
          line-height: 1.2;
        }

        .layaway-transactions {
          margin-top: 24px;
          margin-bottom: 20px;
        }

        .layaway-transactions table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          page-break-inside: avoid;
          border: 1px solid #ddd;
        }

        .layaway-transactions th,
        .layaway-transactions td {
          padding: 8px 6px;
          line-height: 1.4;
          border: 1px solid #ddd;
        }

        .layaway-transactions th {
          font-size: 12px;
          background: #f5f5f5;
          color: #222;
          border-bottom: 2px solid #ddd;
          text-align: center;
          font-weight: 700;
        }

        .layaway-transactions tr {
          page-break-inside: avoid;
        }

        .layaway-transactions td {
          text-align: center;
        }

        .layaway-transactions td.item {
          text-align: left;
          padding-left: 12px;
        }

        .layaway-watermark {
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

        .layaway-totals {
          display: flex;
          justify-content: center;
          margin-top: 30px;
          margin-bottom: 20px;
          z-index: 1;
        }

        .layaway-totals .right {
          text-align: center;
          width: 100%;
        }

        .layaway-totals .label {
          font-size: 16px;
          color: #6b6b6b;
          text-align: center;
          line-height: 1.2;
        }

        .layaway-totals .amount {
          font-size: 32px;
          color: #c0392b;
          font-weight: 800;
          text-align: center;
          line-height: 1.2;
        }

        .layaway-footer {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          z-index: 1;
        }

        .layaway-footer .left {
          text-align: center;
        }

        .layaway-footer p {
          margin: 3px 0;
          font-size: 14px;
          color: #6b6b6b;
          line-height: 1.3;
        }

        .layaway-signature {
          text-align: center;
          font-weight: 700;
        }

        .layaway-small-header {
          font-size: 14px;
          font-weight: 700;
          text-decoration: underline;
          margin-bottom: 2px;
        }

        .layaway-terms {
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
          max-width: 500px;
        }

        .layaway-terms-title {
          font-size: 14px;
          font-weight: 700;
          color: #c0392b;
          text-align: center;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .layaway-terms-item {
          margin-bottom: 6px;
          padding-left: 20px;
          position: relative;
        }

        .layaway-terms-item::before {
          content: counter(terms-counter) ".";
          counter-increment: terms-counter;
          position: absolute;
          left: 0;
          font-weight: 700;
        }

        .layaway-terms-container {
          counter-reset: terms-counter;
        }

        .layaway-terms-agreement {
          margin-top: 10px;
          font-weight: 600;
          text-align: center;
        }

        @media print {
          html,
          body {
            background: #fff;
          }
          .layaway-watermark {
            color: rgba(218, 140, 70, 0.1);
          }
        }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cinzel+Decorative:wght@400;700&family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="layaway-print-wrapper">
        <div className="layaway-paper">
          <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '20px' }}>
            <div className="layaway-logo">
              AM JEWELLERY
              <small>(916 KDM)</small>
            </div>
            
            <div className="layaway-meta" style={{ marginTop: '16px' }}>
              <p className="address">No. 4, "B" Street, Lal Masjid Road Cross,</p>
              <p className="address" style={{ fontWeight: 700, letterSpacing: '1px' }}>
                Shivajinagar, Bangalore – 560 051
              </p>
              <p className="contacts">PH: 9845105226,&nbsp;&nbsp;&nbsp; MOB: 9986865090,&nbsp;&nbsp;&nbsp; MOB: 9620921903</p>
            </div>
          </div>

          <div className="layaway-info">
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
              <div className="block">
                <div className="label">TOTAL AMOUNT:-</div>
                <div className="value">{formatCurrency(bill?.grand_total || 0)}</div>
              </div>
              <div className="block">
                <div className="label">TOTAL PAID:-</div>
                <div className="value">{formatCurrency(totalPaid || 0)}</div>
              </div>
              <div className="block">
                <div className="label">REMAINING:-</div>
                <div className="value">{formatCurrency(remainingAmount || 0)}</div>
              </div>
            </div>
          </div>

          <div className="layaway-transactions">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>SL NO</th>
                  <th style={{ width: '20%', textAlign: 'left', paddingLeft: '12px' }}>DATE</th>
                  <th style={{ width: '15%' }}>AMOUNT</th>
                  <th style={{ width: '15%' }}>METHOD</th>
                  <th style={{ width: '20%' }}>REFERENCE</th>
                  <th style={{ width: '25%', textAlign: 'left', paddingLeft: '12px' }}>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={transaction.id || index}>
                    <td>{index + 1}</td>
                    <td className="item">{formatDate(transaction.payment_date)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(transaction.amount)}</td>
                    <td><span className="capitalize">{transaction.payment_method || 'N/A'}</span></td>
                    <td>{transaction.reference_number || 'N/A'}</td>
                    <td className="item">{transaction.notes || 'N/A'}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #222' }}>
                  <td colSpan={2} className="item" style={{ textAlign: 'center', paddingRight: '12px', fontWeight: 700, fontSize: '14px' }}>
                    TOTAL
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '16px', color: '#c0392b' }}>
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="layaway-watermark">AM</div>

          <div className="layaway-footer">
            <div className="left">
              <div className="layaway-terms-container">
                <div className="layaway-terms-title">TERMS & CONDITIONS</div>
                <div className="layaway-terms">
                  <div className="layaway-terms-item">
                    Customers who wish to exchange / return the old jewellery manufactured / sold with out Trade Mark / Stamped Seal can do with the proof of purchase. As per our Guarantee Less Stones, Beeds, Pearls. Making charges, wastage taxes if any.
                  </div>
                  <div className="layaway-terms-item">
                    The testing guarantee differ on different items is applicable +2% shall not be considered in any case.
                  </div>
                  <div className="layaway-terms-item">
                    This guarantee card is valid only, when it had been filled and stamped by Authorised Signatory.
                  </div>
                  <div className="layaway-terms-item">
                    Resale at present marked rate.
                  </div>
                  <div className="layaway-terms-agreement">I agree for all above conditions</div>
                </div>
              </div>
            </div>
            <div className="layaway-signature" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '10px', color: '#6b6b6b', lineHeight: '1.2' }}>FOR</div>
              <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13px', lineHeight: '1.2' }}>AM JEWELLERY</div>
              <div style={{ marginTop: '40px', fontSize: '14px', fontWeight: 600 }}>Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}