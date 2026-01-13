-- Add metal_type column to bill_items table
ALTER TABLE bill_items 
ADD COLUMN IF NOT EXISTS metal_type VARCHAR(20) DEFAULT 'gold';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bill_items_metal_type ON bill_items(metal_type);

-- Add comment for documentation
COMMENT ON COLUMN bill_items.metal_type IS 'Type of metal (gold or silver)';