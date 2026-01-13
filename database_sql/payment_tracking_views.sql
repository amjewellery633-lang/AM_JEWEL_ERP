-- Comprehensive Payment Tracking Views

-- View to show bills with their layaway payment status
CREATE OR REPLACE VIEW bill_layaway_status_view AS
SELECT 
    b.id AS bill_id,
    b.bill_no,
    b.bill_date,
    b.grand_total,
    COALESCE(ls.total_paid, 0) AS total_layaway_paid,
    COALESCE(b.grand_total - ls.total_paid, b.grand_total) AS remaining_balance,
    ls.total_payments,
    ls.first_payment_date,
    ls.last_payment_date,
    CASE 
        WHEN ls.total_paid >= b.grand_total THEN 'Fully Paid'
        WHEN ls.total_paid > 0 THEN 'Partially Paid'
        ELSE 'No Payments'
    END AS payment_status,
    c.name AS customer_name,
    c.phone AS customer_phone
FROM bills b
LEFT JOIN layaway_summary_view ls ON b.id = ls.bill_id
LEFT JOIN customers c ON b.customer_id = c.id
WHERE EXISTS (SELECT 1 FROM layaway_transactions lt WHERE lt.bill_id = b.id)
ORDER BY b.bill_date DESC;

-- View to show advance booking status
CREATE OR REPLACE VIEW advance_booking_status_view AS
SELECT 
    ab.id,
    ab.bill_id,
    b.bill_no,
    b.bill_date,
    ab.booking_date,
    ab.delivery_date,
    ab.advance_amount,
    ab.total_amount,
    ab.remaining_amount,
    ab.advance_percentage,
    ab.booking_status,
    ab.item_description,
    c.name AS customer_name,
    c.phone AS customer_phone,
    CASE 
        WHEN ab.delivery_date < CURRENT_DATE AND ab.booking_status = 'active' THEN 'Overdue'
        WHEN ab.delivery_date >= CURRENT_DATE AND ab.booking_status = 'active' THEN 'Upcoming'
        ELSE INITCAP(ab.booking_status)
    END AS delivery_status
FROM advance_bookings ab
JOIN bills b ON ab.bill_id = b.id
LEFT JOIN customers c ON b.customer_id = c.id
ORDER BY ab.delivery_date NULLS LAST;

-- Combined view showing both layaway and advance booking information
CREATE OR REPLACE VIEW all_payment_tracking_view AS
SELECT 
    'layaway' AS transaction_type,
    b.id AS bill_id,
    b.bill_no,
    b.bill_date,
    b.grand_total AS total_amount,
    ls.total_paid AS paid_amount,
    (b.grand_total - ls.total_paid) AS remaining_amount,
    ls.first_payment_date AS start_date,
    ls.last_payment_date AS latest_date,
    c.name AS customer_name,
    c.phone AS customer_phone
FROM bills b
JOIN layaway_summary_view ls ON b.id = ls.bill_id
LEFT JOIN customers c ON b.customer_id = c.id

UNION ALL

SELECT 
    'advance_booking' AS transaction_type,
    b.id AS bill_id,
    b.bill_no,
    b.bill_date,
    ab.total_amount,
    ab.advance_amount AS paid_amount,
    ab.remaining_amount,
    ab.booking_date AS start_date,
    ab.delivery_date AS latest_date,
    c.name AS customer_name,
    c.phone AS customer_phone
FROM advance_bookings ab
JOIN bills b ON ab.bill_id = b.id
LEFT JOIN customers c ON b.customer_id = c.id

ORDER BY bill_date DESC;