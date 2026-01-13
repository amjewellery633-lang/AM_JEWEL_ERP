# Supabase Integration Complete! 🎉

## What's Been Set Up

### 1. **Supabase Packages Installed**
- `@supabase/supabase-js` - Supabase JavaScript client
- `@supabase/ssr` - Server-side rendering support
- `bcryptjs` - Password hashing for authentication

### 2. **Configuration Files Created**
- `lib/supabase/client.ts` - Browser client for client-side queries
- `lib/supabase/server.ts` - Server client for server-side queries
- `lib/supabase/middleware.ts` - Session management middleware
- `lib/db/queries.ts` - Database query functions

### 3. **Authentication**
- Login API route: `app/api/auth/login/route.ts`
- Updated login form to authenticate against Supabase
- Password verification using bcrypt

### 4. **Middleware**
- Updated `middleware.ts` to use Supabase session management
- Automatic session refresh and protection

## Next Steps

### 1. **Set Up Environment Variables**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get these:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public key**

### 2. **Verify Database Tables**

Make sure all tables from `database_sql/main.sql` are created in your Supabase database.

### 3. **Set Up Row Level Security (RLS)**

You'll need to configure RLS policies. Here's a basic example:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data (adjust as needed)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true); -- Adjust this based on your security needs

-- Similar policies for other tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view customers" ON customers
  FOR SELECT USING (true);

-- Add more policies as needed for your security requirements
```

### 4. **Create Test User**

You can create a test user using bcrypt to hash the password:

```sql
-- Example: Create a test admin user
-- Password: "admin123" (hashed with bcrypt)
INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  'admin',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- Replace with actual bcrypt hash
  'admin',
  true,
  true,
  true
);
```

**To generate a bcrypt hash**, you can use Node.js:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('yourpassword', 10);
console.log(hash);
```

### 5. **Update Components to Use Database**

The query functions are ready in `lib/db/queries.ts`. You can now update components to fetch real data:

```typescript
import { getCustomers, createCustomer } from '@/lib/db/queries'

// In your component
const customers = await getCustomers()
```

### 6. **Test the Connection**

1. Start the dev server: `npm run dev`
2. Try logging in with a user from your database
3. Check the browser console for any errors

## Available Database Functions

All functions are in `lib/db/queries.ts`:

### Users
- `getUserByUsername(username)`
- `getUserById(id)`

### Customers
- `getCustomers()`
- `getCustomerById(id)`
- `createCustomer(customer)`
- `updateCustomer(id, updates)`
- `deleteCustomer(id)`

### Items/Inventory
- `getItems()`
- `getItemByBarcode(barcode)`
- `createItem(item)`
- `updateItem(id, updates)`
- `deleteItem(id)`

### Bills
- `getBills()`
- `getBillById(id)`
- `createBill(bill)`
- `updateBill(id, updates)`
- `createBillItems(billId, items)`

### Purchase Bills
- `getPurchaseBills()`
- `createPurchaseBill(bill)`

### Returns
- `getReturns()`
- `createReturn(returnData)`

### Categories
- `getCategories()`
- `searchCategories(term)`
- `getCategoryByName(name)`

## Troubleshooting

### "Module not found" errors
- Make sure you've run `npm install` with `--legacy-peer-deps`

### Authentication not working
- Check that your `.env.local` file has the correct Supabase credentials
- Verify the user exists in the database
- Check that password_hash is properly hashed with bcrypt

### Database connection errors
- Verify your Supabase URL and anon key are correct
- Check that RLS policies allow the operations you're trying to perform
- Check the Supabase dashboard for any errors

## Notes

- The middleware handles session management automatically
- All sensitive operations should go through API routes
- Client-side queries use `createClient()` from `lib/supabase/client.ts`
- Server-side queries use `createClient()` from `lib/supabase/server.ts`















