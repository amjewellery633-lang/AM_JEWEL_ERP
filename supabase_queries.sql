-- ============================================
-- SUPABASE QUERIES FOR BILL_STATUS ENUM
-- ============================================
-- Run these queries in Supabase SQL Editor
-- ============================================

-- STEP 0: CHECK THE ACTUAL COLUMN TYPE
-- This will tell us if bill_status is an enum, varchar, text, etc.
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bills' 
  AND column_name = 'bill_status';

-- 1. CHECK CURRENT ENUM VALUES
-- This shows what enum values are actually defined for bill_status
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%bill_status%' OR t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- 2. CHECK BILLS TABLE STRUCTURE
-- This shows the column definition for bill_status
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bills' 
  AND column_name = 'bill_status';

-- 3. CHECK ALL DISTINCT BILL_STATUS VALUES IN BILLS TABLE
-- This shows what values are actually in the bills table
SELECT DISTINCT 
    bill_status,
    COUNT(*) as count
FROM bills
GROUP BY bill_status
ORDER BY bill_status;

-- 4. CHECK FOR NULL OR INVALID BILL_STATUS VALUES
-- This finds any bills with NULL or invalid bill_status values
-- NOTE: Valid values are 'draft', 'final', 'cancelled' (NOT 'finalized')
SELECT 
    id,
    bill_no,
    bill_date,
    bill_status,
    created_at
FROM bills
WHERE bill_status IS NULL 
   OR bill_status NOT IN ('draft', 'final', 'cancelled');

-- 4B. CHECK FOR 'finalized' VALUES THAT NEED TO BE CONVERTED
SELECT 
    id,
    bill_no,
    bill_date,
    bill_status,
    created_at
FROM bills
WHERE bill_status = 'finalized';

-- 5. GET THE ACTUAL ENUM TYPE NAME
-- This finds the exact enum type name used by bill_status column
SELECT 
    c.column_name,
    c.udt_name,
    c.data_type
FROM information_schema.columns c
WHERE c.table_name = 'bills' 
  AND c.column_name = 'bill_status';

-- 6. LIST ALL VALUES IN THE ENUM (using the actual enum type name)
-- Replace 'bill_status_enum' with the actual type name from query #5
-- Common names: bill_status_enum, bills_bill_status_enum, etc.
SELECT 
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = (SELECT udt_name FROM information_schema.columns 
                    WHERE table_name = 'bills' AND column_name = 'bill_status')
ORDER BY e.enumsortorder;

-- 7. FIX NULL BILL_STATUS VALUES (if any exist)
-- NOTE: The correct enum value is 'final' (NOT 'finalized')
UPDATE bills
SET bill_status = 'final'
WHERE bill_status IS NULL;

-- 8. VERIFY ALL BILL_STATUS VALUES
-- Run this to see all current bill_status values
SELECT 
    bill_status,
    COUNT(*) as count
FROM bills
GROUP BY bill_status
ORDER BY bill_status;

-- 10. CREATE THE ENUM TYPE (if it doesn't exist)
-- Run this to create the bill_status enum type
-- NOTE: The correct values are 'draft', 'final', 'cancelled' (NOT 'finalized')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status_enum') THEN
        CREATE TYPE bill_status_enum AS ENUM ('draft', 'final', 'cancelled');
        RAISE NOTICE 'Enum type bill_status_enum created successfully';
    ELSE
        RAISE NOTICE 'Enum type bill_status_enum already exists';
    END IF;
END $$;

-- 11. CHECK CURRENT BILL_STATUS VALUES BEFORE CONVERSION
-- See what values exist in the bills table
SELECT DISTINCT 
    bill_status,
    COUNT(*) as count
FROM bills
GROUP BY bill_status
ORDER BY bill_status;

-- 12. CONVERT COLUMN TO USE ENUM TYPE
-- This will convert the bill_status column to use the enum
-- WARNING: This will fail if there are values that don't match the enum
-- Make sure to clean up any invalid values first!

-- Step A: First, update any NULL or invalid values
-- NOTE: The correct enum value is 'final' (NOT 'finalized')
UPDATE bills
SET bill_status = 'final'
WHERE bill_status IS NULL 
   OR bill_status NOT IN ('draft', 'final', 'cancelled')
   OR bill_status = '';

-- If you have 'finalized' values, convert them to 'final'
UPDATE bills
SET bill_status = 'final'
WHERE bill_status = 'finalized';

-- Step B: Then convert the column type
ALTER TABLE bills
ALTER COLUMN bill_status TYPE bill_status_enum 
USING bill_status::text::bill_status_enum;

-- 13. SET DEFAULT VALUE (optional)
-- NOTE: Default is 'final' (NOT 'finalized')
ALTER TABLE bills
ALTER COLUMN bill_status SET DEFAULT 'final';

-- 14. VERIFY THE CONVERSION
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bills' 
  AND column_name = 'bill_status';

-- ============================================
-- RECOMMENDED EXECUTION ORDER:
-- ============================================
-- STEP 1: Run query #0 (STEP 0) to check the current column type
-- STEP 2: Run query #11 to see what values exist in bills table
-- STEP 3: If column is NOT an enum:
--         a) Run query #10 to create the enum type
--         b) Clean up any invalid values (update them to valid ones)
--         c) Run query #12 Step A to fix NULL/invalid values
--         d) Run query #12 Step B to convert column to enum
--         e) Run query #13 to set default (optional)
--         f) Run query #14 to verify
-- STEP 4: If column IS already an enum but values don't match:
--         a) Check what enum values exist
--         b) Update bills to use correct enum values
-- ============================================
-- IMPORTANT NOTES:
-- - If bill_status is currently VARCHAR/TEXT, we'll convert it to enum
-- - Make sure to backup your data before running conversion queries
-- - The conversion will fail if there are values that don't match the enum
-- ============================================

