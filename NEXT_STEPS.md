# Next Steps After Supabase Setup

## ✅ What's Done
- Supabase packages installed
- Configuration files created
- Authentication API route set up
- Login form updated
- Environment variables configured (`.env.local`)

## 🔧 Immediate Next Steps

### 1. **Test the Connection**

Start your dev server:
```bash
npm run dev
```

Then:
- Open http://localhost:3000
- Check the browser console for any errors
- Try to access the app

### 2. **Set Up Row Level Security (RLS)**

Go to your Supabase SQL Editor and run these policies (adjust as needed):

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read users (adjust based on your needs)
CREATE POLICY "Allow read users" ON users
  FOR SELECT USING (true);

-- Enable RLS on customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true);

-- Enable RLS on items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on items" ON items
  FOR ALL USING (true);

-- Enable RLS on bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on bills" ON bills
  FOR ALL USING (true);

-- Enable RLS on purchase_bills
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on purchase_bills" ON purchase_bills
  FOR ALL USING (true);

-- Enable RLS on returns
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on returns" ON returns
  FOR ALL USING (true);
```

**Note:** These are permissive policies for development. Adjust them based on your security requirements.

### 3. **Create a Test User**

You need to create a user in your database with a bcrypt-hashed password.

**Option A: Using Node.js script**

Create a file `scripts/create-user.js`:

```javascript
const bcrypt = require('bcryptjs');

// Generate password hash
const password = 'admin123'; // Change this
const hash = bcrypt.hashSync(password, 10);

console.log('Password hash:', hash);
console.log('\nSQL to insert user:');
console.log(`
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'admin',
  '${hash}',
  'admin',
  true,
  true,
  true
);
`);
```

Run it:
```bash
node scripts/create-user.js
```

Then copy the SQL output and run it in Supabase SQL Editor.

**Option B: Direct SQL (if you know the hash)**

```sql
-- Example: Create admin user
-- Password: admin123 (you need to generate the hash first)
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'admin',
  '$2a$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
  'admin',
  true,
  true,
  true
);

-- Example: Create staff user
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'staff1',
  '$2a$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
  'staff',
  true,
  false,
  false
);
```

### 4. **Test Login**

1. Start the dev server: `npm run dev`
2. Go to http://localhost:3000
3. Try logging in with your test user credentials
4. Check browser console for any errors

### 5. **Update Components to Use Real Data**

The query functions are ready in `lib/db/queries.ts`. You can now update components to fetch real data instead of using mock data.

Example for Customers component:
```typescript
import { getCustomers, createCustomer } from '@/lib/db/queries'

// In your component
const [customers, setCustomers] = useState<Customer[]>([])

useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }
  fetchCustomers()
}, [])
```

## 🐛 Troubleshooting

### "Invalid API key" error
- Check that your `.env.local` has the correct values
- Make sure the file is in the root directory
- Restart the dev server after changing `.env.local`

### "Row Level Security policy violation"
- Make sure you've set up RLS policies (see step 2)
- Check that the policies allow the operations you're trying to perform

### "User not found" or "Invalid password"
- Verify the user exists in the database
- Check that the password is properly hashed with bcrypt
- Make sure you're using the correct username

### Middleware blocking requests
- The middleware is set to be lenient for now
- If you need stricter protection, update `lib/supabase/middleware.ts`

## 📝 Notes

- The app currently uses sessionStorage for client-side session management
- For production, consider implementing proper session management with Supabase Auth
- All database operations go through the query functions in `lib/db/queries.ts`
- Make sure to handle errors properly in your components

## 🚀 Ready to Go!

Once you've:
1. ✅ Set up RLS policies
2. ✅ Created a test user
3. ✅ Tested login

You can start updating your components to use real database data!















