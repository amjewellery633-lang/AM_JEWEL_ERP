// Migration script to initialize layaway fields for existing bills
// This script adds default values for the new layaway fields

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL and Anon Key must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateLayawayFields() {
  try {
    console.log('Starting layaway fields migration...');
    
    // Update all existing bills to set default values for new layaway fields
    const { data, error } = await supabase
      .from('bills')
      .update({
        advance_payment_date: null,
        item_taken_date: null,
        final_payment_date: null,
        advance_amount: null,
        remaining_amount: null,
        tracking_flag: false
      })
      .neq('id', 0); // This will update all rows
    
    if (error) {
      console.error('Error updating bills:', error);
      process.exit(1);
    }
    
    console.log(`Successfully updated ${data ? data.length : 0} bills with default layaway fields`);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateLayawayFields();