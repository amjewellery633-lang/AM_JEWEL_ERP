# Layaway / Advance Booking Feature Implementation

## Overview
This document summarizes the implementation of the Layaway / Advance Booking feature for the AM JEWELLERY billing application. The feature allows customers to make advance bookings for jewelry items with partial payments and future collection dates.

## Features Implemented

### 1. Database Schema Updates
- Added new columns to the `bills` table:
  - `advance_payment_date` (DATE): Date when advance payment was made
  - `item_taken_date` (DATE): Date when item was taken for layaway
  - `final_payment_date` (DATE): Date when final payment was made
  - `advance_amount` (NUMERIC): Advance amount paid for layaway
  - `remaining_amount` (NUMERIC): Remaining amount to be paid
  - `tracking_flag` (BOOLEAN): True if final payment date is >= 3 days after advance payment date

### 2. Backend Updates
- Updated the `Bill` interface in `lib/db/queries.ts` to include layaway fields
- Modified `createBill` and `updateBill` functions to handle layaway data
- Created database migration script to add layaway fields to existing bills

### 3. Frontend Updates
- Created a new `LayawayForm` component for capturing layaway details
- Integrated layaway form into the sales billing page
- Added automatic calculation of remaining amount
- Implemented 3-day rule tracking (highlighting transactions where tracking_flag = true)
- Updated invoice printing to include layaway information

### 4. Business Logic
- Automatic calculation of remaining amount (total - advanceAmount)
- Automatic setting of tracking flag based on the 3-day rule
- Storage of all layaway data in the database
- Display of layaway information in transaction history
- Generation of invoice PDF with layaway section

## Implementation Details

### Layaway Form Component
The `LayawayForm` component includes:
- Date pickers for advance payment date, item taken date, and final payment date
- Input fields for advance amount and total amount
- Automatic calculation of remaining amount
- Visual indicator for tracking status based on the 3-day rule
- Validation to ensure all required fields are filled

### Business Logic Implementation
1. **Remaining Amount Calculation**: Automatically calculated as `totalAmount - advanceAmount`
2. **Tracking Flag Logic**: Set to `true` if `finalPaymentDate >= 3 days after advancePaymentDate`
3. **Data Validation**: 
   - Advance amount must be greater than 0 and less than or equal to total amount
   - All date fields must be filled
   - Final payment date must be after or equal to advance payment date

### Database Integration
- All layaway fields are stored in the `bills` table
- Fields are nullable to maintain backward compatibility with existing non-layaway transactions
- Indexes added for performance on date fields

### Invoice Generation
The invoice PDF now includes a dedicated section for layaway information:
- Advance payment date
- Item taken date
- Final payment date
- Advance amount
- Remaining amount
- Tracking status
- Summary text: "Gold taken on {itemTakenDate}, advance of {advanceAmount} paid. Balance settled on {finalPaymentDate}."

## Usage Instructions

### Creating a Layaway Transaction
1. Fill in customer and item details as usual
2. Fill in the bill information (dates, sale type, etc.)
3. Enter payment details
4. Fill in old gold exchange details if applicable
5. In the layaway section:
   - Enter the advance payment date
   - Enter the item taken date
   - Enter the final payment date
   - Enter the advance amount
6. Click "Calculate Layaway Details" to process the information
7. The system will automatically calculate the remaining amount and set the tracking flag
8. Save and print the bill as usual

### Viewing Layaway Transactions
- All layaway data is stored in the database and appears in transaction history
- Transactions with tracking_flag = true are highlighted in the UI
- Layaway information is included in printed invoices

## Files Modified/Added

### New Files
- `components/billing/layaway-form.tsx`: New layaway form component
- `database_sql/layaway_fields.sql`: Database migration script
- `scripts/migrate-layaway-fields.js`: Script to initialize layaway fields for existing bills
- `LAYAWAY_FEATURE_SUMMARY.md`: This document

### Modified Files
- `lib/db/queries.ts`: Updated Bill interface and database functions
- `components/billing/sales-billing.tsx`: Integrated layaway form and logic
- `components/billing/invoice-print.tsx`: Added layaway information to invoices

## Deployment Notes
1. Run the database migration script to add layaway fields to the `bills` table
2. Execute `scripts/migrate-layaway-fields.js` to initialize default values for existing bills
3. Deploy the updated frontend components
4. Test the layaway feature with sample transactions

## Future Enhancements
- Add filtering options in the sales history to view only layaway transactions
- Implement reminders for upcoming final payment dates
- Add reporting features for layaway transactions
- Include layaway status tracking (e.g., "Pending", "Completed", "Cancelled")