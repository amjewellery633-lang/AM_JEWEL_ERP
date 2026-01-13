// Script to update/add jewelry categories in the database
// This script will insert new categories or update existing ones with synonyms

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define the jewelry categories to be inserted/updated
const jewelryCategories = [
  {
    name: 'rings',
    display_name: 'Rings',
    synonyms: []
  },
  {
    name: 'tops_kammal',
    display_name: 'Tops / Kammal',
    synonyms: ['tops', 'kammal', 'earrings'] // Making both terms searchable
  },
  {
    name: 'chain',
    display_name: 'Chain',
    synonyms: []
  },
  {
    name: 'bracelets',
    display_name: 'Bracelets',
    synonyms: []
  },
  {
    name: 'bangle',
    display_name: 'Bangle',
    synonyms: []
  },
  {
    name: 'necklace',
    display_name: 'Necklace',
    synonyms: ['neckless'] // Including the misspelling mentioned
  },
  {
    name: 'har',
    display_name: 'Hār',
    synonyms: []
  },
  {
    name: 'dollar_pendant',
    display_name: 'Dollar (Pendant)',
    synonyms: ['dollar', 'pendant', 'pendants']
  },
  {
    name: 'mang_tikka',
    display_name: 'Māng Tikkā',
    synonyms: ['mat_tal', 'mattal', 'mangtikka'] // Including alternative spellings
  },
  {
    name: 'bay_ring',
    display_name: 'Bay Ring',
    synonyms: ['belly_ring', 'baby_ring'] // Including possible alternatives
  },
  {
    name: 'tali',
    display_name: 'Tali',
    synonyms: []
  },
  {
    name: 'others',
    display_name: 'Others',
    synonyms: ['other', 'misc', 'miscellaneous']
  }
];

async function updateCategories() {
  try {
    console.log('Starting category update...\n');
    
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const category of jewelryCategories) {
      // Check if category exists by name
      const { data: existing, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('name', category.name)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for new categories
        console.error(`Error checking category ${category.name}:`, fetchError);
        continue;
      }
      
      if (existing) {
        // Update existing category
        const { data: updated, error: updateError } = await supabase
          .from('categories')
          .update({
            display_name: category.display_name,
            synonyms: category.synonyms,
            updated_at: new Date().toISOString()
          })
          .eq('name', category.name)
          .select()
          .single();
        
        if (updateError) {
          console.error(`Error updating category ${category.name}:`, updateError);
          skippedCount++;
        } else {
          console.log(`✓ Updated: ${category.display_name} (${category.name})`);
          if (category.synonyms.length > 0) {
            console.log(`  Synonyms: ${category.synonyms.join(', ')}`);
          }
          updatedCount++;
        }
      } else {
        // Insert new category
        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert({
            name: category.name,
            display_name: category.display_name,
            synonyms: category.synonyms
          })
          .select()
          .single();
        
        if (insertError) {
          console.error(`Error inserting category ${category.name}:`, insertError);
          skippedCount++;
        } else {
          console.log(`+ Inserted: ${category.display_name} (${category.name})`);
          if (category.synonyms.length > 0) {
            console.log(`  Synonyms: ${category.synonyms.join(', ')}`);
          }
          insertedCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Category update completed!');
    console.log(`  Inserted: ${insertedCount}`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Total processed: ${jewelryCategories.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error updating categories:', error);
    process.exit(1);
  }
}

// Run the update script
updateCategories();

