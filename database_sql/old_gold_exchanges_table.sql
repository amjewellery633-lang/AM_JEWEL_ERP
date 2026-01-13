---------------------------------------------------------
-- OLD GOLD EXCHANGES TABLE
-- Stores old gold received from customers during sales
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS old_gold_exchanges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id bigint NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  weight numeric(10, 3) NOT NULL, -- Weight in grams
  purity varchar(10), -- e.g., '22K', '18K', '24K'
  rate_per_gram numeric(10, 2) NOT NULL, -- Rate used for calculation
  total_value numeric(10, 2) NOT NULL, -- weight * rate_per_gram
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster bill lookups
CREATE INDEX IF NOT EXISTS idx_old_gold_exchanges_bill_id ON old_gold_exchanges(bill_id);

-- Enable RLS
ALTER TABLE old_gold_exchanges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated operations
CREATE POLICY "Allow all operations on old_gold_exchanges" ON old_gold_exchanges
  FOR ALL USING (true);

-- Comment on table
COMMENT ON TABLE old_gold_exchanges IS 'Stores old gold received from customers during sales exchanges';
COMMENT ON COLUMN old_gold_exchanges.bill_id IS 'Reference to the sales bill';
COMMENT ON COLUMN old_gold_exchanges.total_value IS 'Total value of old gold (weight × rate_per_gram)';
















