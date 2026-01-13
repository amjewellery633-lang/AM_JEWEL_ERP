# Jewelry Categories System

## Overview
This document describes how to use and maintain the jewelry categories system in the AM JEWELLERY application.

## Categories List
The system includes the following predefined jewelry categories:

1. **Rings** - Traditional rings
2. **Tops / Kammal** - Earrings (with synonyms: tops, kammal)
3. **Chain** - Gold chains
4. **Bracelets** - Wrist wearables
5. **Bangle** - Traditional bangles
6. **Necklace** - Neck jewelry (includes synonym: neckless)
7. **Hār** - Long/heavy necklaces
8. **Dollar (Pendant)** - Pendants (with synonyms: dollar, pendant)
9. **Māng Tikkā** - Forehead jewelry (includes synonym: mat_tal)
10. **Bay Ring** - Specific ring type
11. **Tali** - Regional jewelry type
12. **Others** - General category for unlisted items

## Database Structure
The categories are stored in a dedicated `categories` table with the following fields:
- `id` - Auto-generated serial primary key
- `name` - Unique internal identifier
- `display_name` - Human-readable name shown in UI
- `synonyms` - Array of alternative terms for search
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

## Adding New Categories
To add new categories to the system:

1. Use the Supabase dashboard to insert new records into the `categories` table, or
2. Create a script similar to `scripts/populate-jewelry-categories.js` to programmatically add categories

## Updating Existing Categories
To modify existing categories:
1. Update the `display_name` or `synonyms` fields in the `categories` table
2. No changes to the `name` field should be made as it may break references

## Using Categories in Items
When creating or updating items, the system will:
1. Automatically look up the category by `display_name` 
2. Set both `category_id` (foreign key) and `category_name` (cached display name) fields
3. Handle cases where categories aren't found gracefully

## Search Functionality
The category search feature supports:
- Direct matching by `display_name`
- Synonym matching (e.g., searching "tops" will find "Tops / Kammal")
- Case-insensitive searches

## Troubleshooting
If categories aren't appearing in the UI:
1. Verify the `categories` table has data
2. Check that the `getCategories()` function is working properly
3. Ensure the frontend is correctly fetching and displaying categories