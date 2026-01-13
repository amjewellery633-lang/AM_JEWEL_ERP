---------------------------------------------------------
-- CREATE ADMIN AND STAFF USERS (PLAIN PASSWORDS)
-- Run this in Supabase SQL Editor
---------------------------------------------------------

-- Admin User
-- Username: admin
-- Password: admin123
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'admin',
  'admin123',
  'admin',
  true,
  true,
  true
);

-- Staff User
-- Username: staff
-- Password: staff123
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'staff',
  'staff123',
  'staff',
  true,
  false,
  false
);

