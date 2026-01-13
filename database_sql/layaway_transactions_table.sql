-- Layaway Transactions Table
-- Tracks partial payments made over time for a bill

CREATE TABLE IF NOT EXISTS layaway_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_layaway_transactions_bill_id ON layaway_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_layaway_transactions_payment_date ON layaway_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_layaway_transactions_amount ON layaway_transactions(amount);

-- Enable Row Level Security
ALTER TABLE layaway_transactions ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for development (adjust for production)
CREATE POLICY "Allow all operations on layaway_transactions" ON layaway_transactions
    FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE layaway_transactions IS 'Tracks partial payments made over time for layaway transactions';
COMMENT ON COLUMN layaway_transactions.bill_id IS 'Reference to the associated bill';
COMMENT ON COLUMN layaway_transactions.payment_date IS 'Date when the payment was made';
COMMENT ON COLUMN layaway_transactions.amount IS 'Amount paid in this transaction';
COMMENT ON COLUMN layaway_transactions.payment_method IS 'Payment method used (cash, card, etc.)';
COMMENT ON COLUMN layaway_transactions.reference_number IS 'Reference number for the payment';
COMMENT ON COLUMN layaway_transactions.notes IS 'Additional notes about the payment';

-- View to calculate total layaway payments per bill
CREATE OR REPLACE VIEW layaway_summary_view AS
SELECT 
    bill_id,
    COUNT(*) AS total_payments,
    SUM(amount) AS total_paid,
    MIN(payment_date) AS first_payment_date,
    MAX(payment_date) AS last_payment_date
FROM layaway_transactions
GROUP BY bill_id;

-- Function to validate that total layaway payments don't exceed bill grand total
CREATE OR REPLACE FUNCTION validate_layaway_amount()
RETURNS TRIGGER AS $$
DECLARE
    total_layaway NUMERIC(10, 2);
    bill_grand_total NUMERIC(10, 2);
BEGIN
    -- Get the grand total of the associated bill
    SELECT grand_total INTO bill_grand_total
    FROM bills
    WHERE id = NEW.bill_id;
    
    -- Calculate total layaway payments for this bill (including the new one)
    SELECT COALESCE(SUM(amount), 0) + NEW.amount INTO total_layaway
    FROM layaway_transactions
    WHERE bill_id = NEW.bill_id;
    
    -- Check if total layaway exceeds bill grand total
    IF total_layaway > bill_grand_total THEN
        RAISE EXCEPTION 'Total layaway payments (%) exceed bill grand total (%)', total_layaway, bill_grand_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate layaway amounts
DROP TRIGGER IF EXISTS validate_layaway_amount_trigger ON layaway_transactions;
CREATE TRIGGER validate_layaway_amount_trigger
    BEFORE INSERT OR UPDATE
    ON layaway_transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_layaway_amount();