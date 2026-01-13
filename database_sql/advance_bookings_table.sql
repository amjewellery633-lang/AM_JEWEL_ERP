-- Advance Booking Table
-- Tracks advance payments for items to be delivered in the future

CREATE TABLE IF NOT EXISTS advance_bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    advance_amount NUMERIC(10, 2) NOT NULL CHECK (advance_amount > 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
    remaining_amount NUMERIC(10, 2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
    item_description TEXT,
    customer_notes TEXT,
    booking_status VARCHAR(20) DEFAULT 'active' CHECK (booking_status IN ('active', 'delivered', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advance_bookings_bill_id ON advance_bookings(bill_id);
CREATE INDEX IF NOT EXISTS idx_advance_bookings_booking_date ON advance_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_advance_bookings_delivery_date ON advance_bookings(delivery_date);
CREATE INDEX IF NOT EXISTS idx_advance_bookings_status ON advance_bookings(booking_status);

-- Enable Row Level Security
ALTER TABLE advance_bookings ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for development (adjust for production)
CREATE POLICY "Allow all operations on advance_bookings" ON advance_bookings
    FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE advance_bookings IS 'Tracks advance payments for items to be delivered in the future';
COMMENT ON COLUMN advance_bookings.bill_id IS 'Reference to the associated bill';
COMMENT ON COLUMN advance_bookings.booking_date IS 'Date when the advance booking was made';
COMMENT ON COLUMN advance_bookings.delivery_date IS 'Expected delivery date of the item';
COMMENT ON COLUMN advance_bookings.advance_amount IS 'Advance amount paid';
COMMENT ON COLUMN advance_bookings.total_amount IS 'Total cost of the item';
COMMENT ON COLUMN advance_bookings.remaining_amount IS 'Remaining amount to be paid (calculated automatically)';
COMMENT ON COLUMN advance_bookings.item_description IS 'Description of the item being booked';
COMMENT ON COLUMN advance_bookings.customer_notes IS 'Notes from the customer about the booking';
COMMENT ON COLUMN advance_bookings.booking_status IS 'Current status of the booking';

-- Function to ensure advance amount doesn't exceed total amount
CREATE OR REPLACE FUNCTION validate_advance_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advance_amount > NEW.total_amount THEN
        RAISE EXCEPTION 'Advance amount (%) cannot exceed total amount (%)', NEW.advance_amount, NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate advance amounts
DROP TRIGGER IF EXISTS validate_advance_amount_trigger ON advance_bookings;
CREATE TRIGGER validate_advance_amount_trigger
    BEFORE INSERT OR UPDATE
    ON advance_bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_advance_amount();

-- View to show advance bookings with bill information
CREATE OR REPLACE VIEW advance_booking_details_view AS
SELECT 
    ab.*,
    b.bill_no,
    b.bill_date,
    c.name AS customer_name,
    c.phone AS customer_phone,
    ROUND((ab.advance_amount / ab.total_amount) * 100, 2) AS advance_percentage
FROM advance_bookings ab
JOIN bills b ON ab.bill_id = b.id
LEFT JOIN customers c ON b.customer_id = c.id;