-- Add hsn_code column to old_gold_exchanges table
-- Also make bill_id nullable to support standalone gold exchange entries

-- Step 1: Make bill_id nullable (to support standalone entries without bills)
ALTER TABLE old_gold_exchanges 
ALTER COLUMN bill_id DROP NOT NULL;

-- Step 2: Add hsn_code column
ALTER TABLE old_gold_exchanges 
ADD COLUMN IF NOT EXISTS hsn_code varchar(20);

-- Step 3: Set default value for existing rows (optional)
UPDATE old_gold_exchanges 
SET hsn_code = '7113' 
WHERE hsn_code IS NULL;

-- Step 4: Extract HSN codes from notes field and update hsn_code column
-- This migrates existing data that has HSN codes stored in notes
UPDATE old_gold_exchanges
SET hsn_code = (
  CASE 
    WHEN notes LIKE '%HSN Code:%' THEN
      TRIM(SUBSTRING(notes FROM 'HSN Code:\s*([^|]+)'))
    ELSE 
      hsn_code
  END
)
WHERE notes IS NOT NULL 
  AND notes LIKE '%HSN Code:%'
  AND hsn_code IS NULL;

-- Step 5: Add comment to the column
COMMENT ON COLUMN old_gold_exchanges.hsn_code IS 'HSN code for the old gold exchange item (default: 7113)';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'old_gold_exchanges' 
  AND column_name IN ('bill_id', 'hsn_code')
ORDER BY column_name;






