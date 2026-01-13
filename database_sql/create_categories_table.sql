-- Create categories table for jewelry items
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  synonyms TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_display_name ON categories(display_name);

-- Add comments for documentation
COMMENT ON TABLE categories IS 'Jewelry categories for inventory items';
COMMENT ON COLUMN categories.name IS 'Unique identifier for the category (used internally)';
COMMENT ON COLUMN categories.display_name IS 'Human-readable name for UI display';
COMMENT ON COLUMN categories.synonyms IS 'Array of synonym terms for search functionality';

-- Add category_id and category_name columns to items table if they don't exist
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);

-- Add indexes for better performance on items table
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_category_name ON items(category_name);