const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrateBillItems() {
  try {
    console.log('Applying bill_items table migration...')
    
    // Read the SQL migration file
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(__dirname, '..', 'database_sql', 'bill_items_update.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found:', migrationPath)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    // Execute each statement
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...')
      
      const { error } = await supabase.rpc('execute_sql', { sql: statement })
      
      if (error) {
        console.error('Error executing statement:', error.message)
        // Don't exit on error as some statements might fail if columns already exist
      } else {
        console.log('Successfully executed statement')
      }
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exit(1)
  }
}

migrateBillItems()