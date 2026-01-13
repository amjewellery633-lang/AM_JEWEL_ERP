---------------------------------------------------------
-- GOLD RATES TABLE
-- Simple table: just date and price
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold_rates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_per_gram numeric(10, 2) NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(effective_date) -- Only one rate per day
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_gold_rates_effective_date ON gold_rates(effective_date DESC);

-- Enable RLS
ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated operations
CREATE POLICY "Allow all operations on gold_rates" ON gold_rates
  FOR ALL USING (true);
