-- Update gold_rates table to support multiple metal types
-- Add a type column to differentiate between gold and different silver types

-- First, add the type column
ALTER TABLE gold_rates ADD COLUMN IF NOT EXISTS metal_type VARCHAR(20);

-- Update existing records to have 'gold' as the default type
UPDATE gold_rates SET metal_type = 'gold' WHERE metal_type IS NULL;

-- Create enum type for metal types if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metal_type_enum') THEN
        CREATE TYPE metal_type_enum AS ENUM ('gold', 'gold_916', 'gold_750', 'silver_92', 'silver_70', 'selam_silver');
    END IF;
END
$$;

-- Change the column to use the enum type
ALTER TABLE gold_rates ALTER COLUMN metal_type TYPE metal_type_enum USING metal_type::metal_type_enum;

-- Set the default value for the enum column
ALTER TABLE gold_rates ALTER COLUMN metal_type SET DEFAULT 'gold';

-- Add constraint to ensure rate_per_gram is positive if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positive_rate' AND conrelid = 'gold_rates'::regclass) THEN
    ALTER TABLE gold_rates ADD CONSTRAINT chk_positive_rate CHECK (rate_per_gram > 0);
  END IF;
END
$$;

-- Remove the old unique constraint on effective_date only
-- The constraint name might vary, so we'll try the most common auto-generated name
ALTER TABLE gold_rates DROP CONSTRAINT IF EXISTS gold_rates_effective_date_key;
-- If the above doesn't work, the constraint might have a different auto-generated name

-- Add a unique constraint for date and metal_type combination if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_date_metal_type' AND conrelid = 'gold_rates'::regclass) THEN
    ALTER TABLE gold_rates ADD CONSTRAINT unique_date_metal_type UNIQUE (effective_date, metal_type);
  END IF;
END
$$;

-- Create index for faster lookups by metal_type and date
CREATE INDEX IF NOT EXISTS idx_gold_rates_type_date ON gold_rates(metal_type, effective_date DESC);