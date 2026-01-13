-- ============================================
-- FIX: Convert 'finalized' to 'final' in bills table
-- ============================================
-- Run this in Supabase SQL Editor to fix existing data
-- ============================================

-- Step 1: Check how many bills have 'finalized' status
SELECT 
    COUNT(*) as count,
    'finalized' as current_status
FROM bills
WHERE bill_status = 'finalized';

-- Step 2: Convert 'finalized' to 'final'
-- This will update all bills with 'finalized' status to 'final'
UPDATE bills
SET bill_status = 'final'
WHERE bill_status = 'finalized';

-- Step 3: Verify the conversion
SELECT 
    bill_status,
    COUNT(*) as count
FROM bills
GROUP BY bill_status
ORDER BY bill_status;

-- ============================================
-- NOTE: If bill_status is an enum type, you might need to:
-- 1. First convert the column to text
-- 2. Update the values
-- 3. Convert back to enum
-- 
-- If you get an error about enum, run this instead:
-- ============================================

-- Alternative approach if column is enum type:
-- Step A: Convert enum to text temporarily
-- ALTER TABLE bills ALTER COLUMN bill_status TYPE text;

-- Step B: Update the values
-- UPDATE bills SET bill_status = 'final' WHERE bill_status = 'finalized';

-- Step C: Convert back to enum (if enum exists)
-- ALTER TABLE bills ALTER COLUMN bill_status TYPE bill_status_enum 
-- USING bill_status::text::bill_status_enum;

-- ============================================






