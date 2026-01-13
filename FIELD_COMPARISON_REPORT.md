# Field Comparison Report: Database Schema vs Dashboard Components

## Summary
This report compares the database schema fields in `main.sql` with the fields used in all dashboard components.

---

## 1. CUSTOMERS Component vs `customers` Table

### ✅ MATCHING FIELDS
- `customer_code` ✅
- `name` ✅
- `phone` ✅
- `email` ✅
- `address` ✅
- `notes` ✅

### ⚠️ ISSUES FOUND
1. **ID Type Mismatch**
   - Component uses: `id: string`
   - Database has: `id bigint GENERATED ALWAYS AS IDENTITY`
   - **Fix**: Component should handle `bigint` or convert to string

2. **Missing Fields in Component**
   - `created_at` - Not displayed in component (but exists in DB)

---

## 2. INVENTORY Component vs `items` Table

### ✅ MATCHING FIELDS
- `barcode` ✅
- `item_name` ✅
- `category` ✅
- `weight` ✅
- `purity` ✅
- `making_charges` ✅
- `stone_type` ✅
- `hsn_code` ✅
- `gst_rate` ✅
- `price_per_gram` ✅
- `net_price` ✅
- `stock_status` ✅
- `location` ✅
- `remarks` ✅

### ⚠️ ISSUES FOUND
1. **ID Type Mismatch**
   - Component uses: `id: string`
   - Database has: `id uuid PRIMARY KEY`
   - **Fix**: Component should handle `uuid` or convert to string

2. **Missing Fields in Component**
   - `created_at` - Not displayed in component (but exists in DB)

---

## 3. SALES BILLING Component vs `bills` & `bill_items` Tables

### ✅ MATCHING FIELDS IN BILL_ITEMS
- `barcode` ✅
- `item_name` ✅
- `weight` ✅
- `rate` ✅
- `making_charges` ✅
- `gst_rate` ✅
- `line_total` ✅

### ✅ MATCHING FIELDS IN BILLS
- `sale_type` ✅ (component uses `saleType`)
- `payment_method` ✅ (component uses `paymentMethod`)
- `payment_reference` ✅ (component uses `paymentReference`)
- `discount` ✅
- `remarks` ✅

### ⚠️ CRITICAL ISSUES FOUND

#### Missing Fields in Component (bills table):
1. **`bill_no`** - Auto-generated in DB but not displayed/captured
2. **`bill_date`** - Not captured in component
3. **`customer_id`** - Component uses customer object but doesn't store ID
4. **`staff_id`** - Not captured (should be current logged-in user)
5. **`nongst_auth_id`** - Not captured (needed for non-GST sales)
6. **`subtotal`** - Calculated but not stored explicitly
7. **`gst_amount`** - Calculated but not stored explicitly
8. **`cgst`** - Not calculated/stored
9. **`sgst`** - Not calculated/stored
10. **`igst`** - Not calculated/stored
11. **`grand_total`** - Calculated but not stored explicitly
12. **`bill_status`** - Component has "Save as Draft" / "Finalize" but doesn't use enum values

#### Missing Fields in Component (bill_items table):
1. **`id`** - Not captured (needed for updates/deletes)
2. **`bill_id`** - Not linked when saving

#### Field Name Mismatches:
- `saleType` → should be `sale_type`
- `paymentMethod` → should be `payment_method`
- `paymentReference` → should be `payment_reference`

---

## 4. PURCHASE BILLING Component vs `purchase_bills` & `purchase_bill_items` Tables

### ✅ MATCHING FIELDS IN PURCHASE_BILL_ITEMS
- `hsn_code` ✅
- `code` ✅
- `weight` ✅
- `purity` ✅
- `rate` ✅
- `amount` ✅

### ✅ MATCHING FIELDS IN PURCHASE_BILLS
- `particulars` ✅
- `payment_mode` ✅ (component uses `paymentMode`)
- `payment_reference` ✅ (component uses `paymentReference`)
- `sale_bill_id` ✅ (component uses `saleBillId`)
- `remark` ✅

### ⚠️ CRITICAL ISSUES FOUND

#### Missing Fields in Component (purchase_bills table):
1. **`bill_no`** - Auto-generated in DB but not displayed/captured
2. **`customer_id`** - Component uses "Vendor" but DB expects `customer_id` (should reference customers table)
3. **`staff_id`** - Not captured (should be current logged-in user)
4. **`cgst`** - Calculated but not stored explicitly
5. **`sgst`** - Calculated but not stored explicitly
6. **`total_amount`** - Calculated but not stored explicitly
7. **`date`** - Not captured (defaults to now() in DB but should be explicit)

#### Missing Fields in Component (purchase_bill_items table):
1. **`id`** - Not captured (needed for updates/deletes)
2. **`purchase_bill_id`** - Not linked when saving

#### Field Name Mismatches:
- `paymentMode` → should be `payment_mode`
- `paymentReference` → should be `payment_reference`
- `saleBillId` → should be `sale_bill_id`

#### Conceptual Issue:
- Component uses "Vendor" but database uses `customer_id` - this suggests vendors are also stored in the `customers` table

---

## 5. RETURNS Component vs `returns` Table

### ✅ MATCHING FIELDS
- `bill_id` ✅
- `item_barcode` ✅
- `original_amount` ✅
- `deduction_percent` ✅
- `refund_amount` ✅
- `created_at` ✅

### ⚠️ CRITICAL ISSUES FOUND

#### Missing Fields in Component:
1. **`id`** - Not captured (needed for updates/deletes)
2. **`processed_by`** - Not captured (should be current logged-in user)

#### Extra Fields in Component (NOT in Database):
1. **`item_name`** - Component displays this but it's not in `returns` table
   - **Solution**: Join with `items` table using `item_barcode`
2. **`status`** - Component has `pending`, `approved`, `completed` but database doesn't have this field
   - **Solution**: Either add `status` field to database or remove from component

---

## 6. GENERAL ISSUES ACROSS ALL COMPONENTS

### Type Mismatches:
1. **ID Fields**: Components use `string` for IDs, but database uses:
   - `bigint` for customers, bills, purchase_bills
   - `uuid` for items, users, returns, etc.
   - **Fix**: Components should handle these types or convert appropriately

### Missing Critical Fields:
1. **`staff_id`** - Not captured in Sales Billing or Purchase Billing
   - Should be set to current logged-in user
2. **`created_at`** - Not displayed in most components
   - Could be useful for audit trails

### Enum Value Mismatches:
1. **`sale_type`**: Database has `('gst','non_gst')` but component uses `'gst'` and `'non_gst'` (with underscore) - ✅ Matches
2. **`bill_status`**: Database has `('draft','finalized','cancelled')` but component uses "Save as Draft" / "Finalize" - Need to map correctly
3. **`stock_status`**: Database has `('in_stock','reserved','sold','returned')` - Component allows free text input - ⚠️ Should use dropdown with enum values

---

## RECOMMENDATIONS

### High Priority Fixes:
1. ✅ Add `staff_id` capture in Sales Billing and Purchase Billing components
2. ✅ Add `bill_status` enum handling in Sales Billing
3. ✅ Add `bill_no` display in both billing components
4. ✅ Fix `stock_status` to use enum dropdown instead of free text
5. ✅ Add `processed_by` field in Returns component
6. ✅ Remove or implement `status` field in Returns component

### Medium Priority Fixes:
1. ✅ Add `bill_date` capture in Sales Billing
2. ✅ Add `date` capture in Purchase Billing
3. ✅ Add `nongst_auth_id` handling for non-GST sales
4. ✅ Store calculated totals (subtotal, gst_amount, cgst, sgst, grand_total) explicitly

### Low Priority Fixes:
1. ✅ Display `created_at` timestamps in components
2. ✅ Fix ID type handling (string vs bigint vs uuid)
3. ✅ Standardize field naming (camelCase vs snake_case)

---

## CONCLUSION

**Overall Match Rate: ~75%**

Most fields match, but there are critical missing fields that need to be added:
- Staff tracking (`staff_id`)
- Bill status management
- Proper enum handling
- Calculated field storage

The components are functional for UI purposes but need database integration work to fully match the schema.


