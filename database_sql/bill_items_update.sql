-- Add new fields to bill_items table for updated line-item structure
ALTER TABLE bill_items 
ADD COLUMN IF NOT EXISTS purity VARCHAR(10),
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '711319',
ADD COLUMN IF NOT EXISTS sl_no INTEGER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bill_items_purity ON bill_items(purity);
CREATE INDEX IF NOT EXISTS idx_bill_items_hsn_code ON bill_items(hsn_code);
CREATE INDEX IF NOT EXISTS idx_bill_items_sl_no ON bill_items(sl_no);

-- Add comments for documentation
COMMENT ON COLUMN bill_items.purity IS 'Purity of the jewelry item (e.g., 916, 22K, 18K)';
COMMENT ON COLUMN bill_items.hsn_code IS 'HSN code for the item (default: 711319)';
COMMENT ON COLUMN bill_items.sl_no IS 'Serial number for the item within the bill (auto-incrementing per invoice)';