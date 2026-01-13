---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase SQL Editor
---------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nongst_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_gold_exchanges ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- USERS TABLE POLICIES
---------------------------------------------------------
-- Allow all authenticated operations (adjust based on your needs)
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true);

---------------------------------------------------------
-- CUSTOMERS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true);

---------------------------------------------------------
-- ITEMS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on items" ON items
  FOR ALL USING (true);

---------------------------------------------------------
-- STOCK BATCHES TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on stock_batches" ON stock_batches
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on stock_batch_items" ON stock_batch_items
  FOR ALL USING (true);

---------------------------------------------------------
-- NON-GST AUTHORIZATIONS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on nongst_authorizations" ON nongst_authorizations
  FOR ALL USING (true);

---------------------------------------------------------
-- BILLS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on bills" ON bills
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on bill_items" ON bill_items
  FOR ALL USING (true);

---------------------------------------------------------
-- PURCHASE BILLS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on purchase_bills" ON purchase_bills
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on purchase_bill_items" ON purchase_bill_items
  FOR ALL USING (true);

---------------------------------------------------------
-- RETURNS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on returns" ON returns
  FOR ALL USING (true);

---------------------------------------------------------
-- AUDIT LOG TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on audit_log" ON audit_log
  FOR ALL USING (true);

---------------------------------------------------------
-- SYSTEM SETTINGS TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on system_settings" ON system_settings
  FOR ALL USING (true);

---------------------------------------------------------
-- GOLD RATES TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on gold_rates" ON gold_rates
  FOR ALL USING (true);

---------------------------------------------------------
-- OLD GOLD EXCHANGES TABLE POLICIES
---------------------------------------------------------
CREATE POLICY "Allow all operations on old_gold_exchanges" ON old_gold_exchanges
  FOR ALL USING (true);

---------------------------------------------------------
-- NOTE: These are permissive policies for development
-- Adjust them based on your security requirements
-- For production, you may want to restrict access based on user roles
---------------------------------------------------------

