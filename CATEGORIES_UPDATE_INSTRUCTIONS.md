# Jewelry Categories Update Instructions

## Overview
This document provides instructions for updating the jewelry categories in the AM JEWELLERY system with the new standardized list.

## Categories to be Added/Updated

1. **Rings** - Traditional rings
2. **Tops / Kammal** - Earrings (searchable by: tops, kammal, earrings)
3. **Chain** - Gold chains
4. **Bracelets** - Wrist wearables
5. **Bangle** - Traditional bangles
6. **Necklace** - Neck jewelry (searchable by: neckless - handles misspelling)
7. **Hār** - Long/heavy necklaces
8. **Dollar (Pendant)** - Pendants (searchable by: dollar, pendant, pendants)
9. **Māng Tikkā** - Forehead jewelry (searchable by: mat_tal, mattal, mangtikka)
10. **Bay Ring** - Specific ring type (searchable by: belly_ring, baby_ring)
11. **Tali** - Regional jewelry type
12. **Others** - General category (searchable by: other, misc, miscellaneous)

## Method 1: Using SQL Script (Recommended)

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file: `database_sql/update_jewelry_categories.sql`
4. Copy and paste the SQL into the editor
5. Click "Run" to execute
6. Verify the categories appear in the `categories` table

## Method 2: Using Node.js Script

1. Ensure you have Node.js installed
2. Make sure you have a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. Install dependencies if needed:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```
4. Run the script:
   ```bash
   node scripts/update-jewelry-categories.js
   ```
5. Check the console output for confirmation

## Verification

After running either method, verify the categories:

1. In Supabase dashboard, check the `categories` table
2. In the application, go to Inventory → Add Item
3. Check the Category dropdown - all 12 categories should appear
4. Test search functionality by typing synonyms (e.g., "tops", "kammal" should find "Tops / Kammal")

## Search Functionality

The category search supports:
- **Exact name matching**: "Rings" finds "Rings"
- **Synonym matching**: "tops" or "kammal" finds "Tops / Kammal"
- **Case-insensitive**: "RINGS" finds "Rings"
- **Partial matching**: "neck" finds "Necklace"

## Notes

- The script uses UPSERT (INSERT ... ON CONFLICT) so it's safe to run multiple times
- Existing categories will be updated with new synonyms
- New categories will be inserted
- The `name` field is the unique identifier and should not be changed
- The `display_name` is what users see in the UI
- The `synonyms` array enables search by alternative terms

## Troubleshooting

If categories don't appear:
1. Check that the `categories` table exists in your database
2. Verify the SQL script ran without errors
3. Clear browser cache and refresh the inventory page
4. Check browser console for any JavaScript errors

If search doesn't work:
1. Verify synonyms are properly stored as a TEXT[] array in PostgreSQL
2. Check that the `searchCategories` function in `lib/db/queries.ts` is working
3. Test the search directly in the database with a SQL query

