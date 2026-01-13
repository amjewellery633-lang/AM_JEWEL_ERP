-- Add metal_type column to items table
-- This column stores the type of metal for inventory items

ALTER TABLE items
ADD COLUMN IF NOT EXISTS metal_type TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN items.metal_type IS 'Type of metal: gold, gold_916, gold_750, silver_92, silver_70, selam_silver';

-- Optionally, set a default value for existing rows
UPDATE items
SET metal_type = 'gold'
WHERE metal_type IS NULL;
