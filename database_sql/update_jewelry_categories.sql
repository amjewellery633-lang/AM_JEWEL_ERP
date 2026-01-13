-- Update/Insert Jewelry Categories
-- This script will insert new categories or update existing ones with proper synonyms
-- Run this in your Supabase SQL editor

-- Use UPSERT (INSERT ... ON CONFLICT) to insert or update categories
INSERT INTO categories (name, display_name, synonyms, updated_at)
VALUES
  ('rings', 'Rings', ARRAY[]::TEXT[], NOW()),
  ('tops_kammal', 'Tops / Kammal', ARRAY['tops', 'kammal', 'earrings']::TEXT[], NOW()),
  ('chain', 'Chain', ARRAY[]::TEXT[], NOW()),
  ('bracelets', 'Bracelets', ARRAY[]::TEXT[], NOW()),
  ('bangle', 'Bangle', ARRAY[]::TEXT[], NOW()),
  ('necklace', 'Necklace', ARRAY['neckless']::TEXT[], NOW()),
  ('har', 'Hār', ARRAY[]::TEXT[], NOW()),
  ('dollar_pendant', 'Dollar (Pendant)', ARRAY['dollar', 'pendant', 'pendants']::TEXT[], NOW()),
  ('mang_tikka', 'Māng Tikkā', ARRAY['mat_tal', 'mattal', 'mangtikka']::TEXT[], NOW()),
  ('bay_ring', 'Bay Ring', ARRAY['belly_ring', 'baby_ring']::TEXT[], NOW()),
  ('tali', 'Tali', ARRAY[]::TEXT[], NOW()),
  ('others', 'Others', ARRAY['other', 'misc', 'miscellaneous']::TEXT[], NOW())
ON CONFLICT (name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  synonyms = EXCLUDED.synonyms,
  updated_at = NOW();

-- Verify the categories were inserted/updated
SELECT name, display_name, synonyms, created_at, updated_at 
FROM categories 
ORDER BY display_name;

