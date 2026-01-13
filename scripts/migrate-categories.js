// Migration script to update existing items with new category structure
// This script should be run once after deploying the new category system

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapping of old category names to new category names
const categoryMapping = {
  'Necklaces': 'necklace',
  'Earrings': 'tops_kammal', // Earrings mapped to Tops / Kammal
  'Bracelets': 'bracelets',
  'Rings': 'rings',
  'Anklets': 'tali',
  'Brooches & Pins': 'others',
  'Pendants & Charms': 'dollar_pendant', // Pendants mapped to Dollar (Pendant)
  'Cufflinks': 'others',
  'Body Jewelry': 'others',
  'Watches': 'others'
};

async function migrateCategories() {
  try {
    console.log('Starting category migration...');
    
    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');
      
    if (categoriesError) {
      throw categoriesError;
    }
    
    // Create a map of category names to IDs
    const categoryMap = {};
    categories.forEach(category => {
      categoryMap[category.display_name.toLowerCase()] = category.id;
      // Also map the name field
      categoryMap[category.name] = category.id;
    });
    
    console.log('Category map:', categoryMap);
    
    // Get all items that have a category
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, category')
      .not('category', 'is', null);
      
    if (itemsError) {
      throw itemsError;
    }
    
    console.log(`Found ${items.length} items with categories to migrate`);
    
    // Update each item with the new category_id
    let updatedCount = 0;
    for (const item of items) {
      if (item.category) {
        const categoryName = item.category.trim();
        const categoryId = categoryMap[categoryName.toLowerCase()];
        
        if (categoryId) {
          const { error: updateError } = await supabase
            .from('items')
            .update({ 
              category_id: categoryId,
              category_name: categoryName
            })
            .eq('id', item.id);
            
          if (updateError) {
            console.error(`Error updating item ${item.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`Updated item ${item.id} with category ${categoryName} (ID: ${categoryId})`);
          }
        } else {
          console.warn(`No matching category found for item ${item.id} with category "${categoryName}"`);
        }
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} items.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateCategories();