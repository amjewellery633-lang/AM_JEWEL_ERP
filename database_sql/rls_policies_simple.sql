---------------------------------------------------------
-- SIMPLE RLS POLICIES - For Development/Testing
-- This allows all operations on all tables
-- Run this in Supabase SQL Editor
---------------------------------------------------------

-- Enable RLS on main tables (only the ones you're using)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow everything (for development)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true);
CREATE POLICY "Allow all on bills" ON bills FOR ALL USING (true);
CREATE POLICY "Allow all on bill_items" ON bill_items FOR ALL USING (true);
CREATE POLICY "Allow all on purchase_bills" ON purchase_bills FOR ALL USING (true);
CREATE POLICY "Allow all on purchase_bill_items" ON purchase_bill_items FOR ALL USING (true);
CREATE POLICY "Allow all on returns" ON returns FOR ALL USING (true);

---------------------------------------------------------
-- That's it! This is the minimum needed to get started.
-- You can add more restrictive policies later for production.
---------------------------------------------------------















