// Script to populate the jewelry categories table with the requested categories
// This script should be run once to initialize the categories in the database

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the jewelry categories to be inserted
const jewelryCategories = [
  {
    name: 'rings',
    display_name: 'Rings',
    synonyms: []
  },
  {
    name: 'tops_kammal',
    display_name: 'Tops / Kammal',
    synonyms: ['tops', 'kammal']
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
    synonyms: ['dollar', 'pendant']
  },
  {
    name: 'mang_tikka',
    display_name: 'Māng Tikkā',
    synonyms: ['mat_tal'] // Including the alternative spelling mentioned
  },
  {
    name: 'bay_ring',
    display_name: 'Bay Ring',
    synonyms: [] // Could be updated if we confirm alternative spellings
  },
  {
    name: 'tali',
    display_name: 'Tali',
    synonyms: []
  },
  {
    name: 'others',
    display_name: 'Others',
    synonyms: []
  }
];

async function populateCategories() {
  try {
    console.log('Starting category population...');
    
    // Insert all categories
    const { data, error } = await supabase
      .from('categories')
      .insert(jewelryCategories)
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`Successfully inserted ${data.length} categories:`);
    data.forEach(category => {
      console.log(`- ${category.display_name} (${category.name})`);
    });
    
    console.log('\nCategory population completed successfully!');
  } catch (error) {
    console.error('Error populating categories:', error);
  }
}

// Run the population script
populateCategories();