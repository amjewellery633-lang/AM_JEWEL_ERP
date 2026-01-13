-- Add layaway fields to bills table
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS advance_payment_date DATE,
ADD COLUMN IF NOT EXISTS item_taken_date DATE,
ADD COLUMN IF NOT EXISTS final_payment_date DATE,
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tracking_flag BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_advance_payment_date ON bills(advance_payment_date);
CREATE INDEX IF NOT EXISTS idx_bills_item_taken_date ON bills(item_taken_date);
CREATE INDEX IF NOT EXISTS idx_bills_final_payment_date ON bills(final_payment_date);
CREATE INDEX IF NOT EXISTS idx_bills_tracking_flag ON bills(tracking_flag);

-- Add comments for documentation
COMMENT ON COLUMN bills.advance_payment_date IS 'Date when advance payment was made for layaway';
COMMENT ON COLUMN bills.item_taken_date IS 'Date when item was taken for layaway';
COMMENT ON COLUMN bills.final_payment_date IS 'Date when final payment was made for layaway';
COMMENT ON COLUMN bills.advance_amount IS 'Advance amount paid for layaway';
COMMENT ON COLUMN bills.remaining_amount IS 'Remaining amount to be paid for layaway';
COMMENT ON COLUMN bills.tracking_flag IS 'True if final payment date is >= 3 days after advance payment date';-- Add layaway fields to bills table
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS advance_payment_date DATE,
ADD COLUMN IF NOT EXISTS item_taken_date DATE,
ADD COLUMN IF NOT EXISTS final_payment_date DATE,
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tracking_flag BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_advance_payment_date ON bills(advance_payment_date);
CREATE INDEX IF NOT EXISTS idx_bills_item_taken_date ON bills(item_taken_date);
CREATE INDEX IF NOT EXISTS idx_bills_final_payment_date ON bills(final_payment_date);
CREATE INDEX IF NOT EXISTS idx_bills_tracking_flag ON bills(tracking_flag);

-- Add comments for documentation
COMMENT ON COLUMN bills.advance_payment_date IS 'Date when advance payment was made for layaway';
COMMENT ON COLUMN bills.item_taken_date IS 'Date when item was taken for layaway';
COMMENT ON COLUMN bills.final_payment_date IS 'Date when final payment was made for layaway';
COMMENT ON COLUMN bills.advance_amount IS 'Advance amount paid for layaway';
COMMENT ON COLUMN bills.remaining_amount IS 'Remaining amount to be paid for layaway';
COMMENT ON COLUMN bills.tracking_flag IS 'True if final payment date is >= 3 days after advance payment date';