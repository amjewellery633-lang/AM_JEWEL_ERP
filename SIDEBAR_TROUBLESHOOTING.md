# Sidebar Troubleshooting Guide

If you're not seeing the "Payment Tracking" link in your sidebar, here are some steps to troubleshoot:

## 1. Check Your User Role

The "Payment Tracking" link is only visible to admin users. To check your role:

1. Open your browser's developer tools (usually F12)
2. Go to the "Application" or "Storage" tab
3. Look for "Session Storage" or "Local Storage"
4. Find the "user" entry
5. Check if the role is set to "admin"

If you're logged in as a staff user, you won't see the "Payment Tracking" link.

## 2. Restart the Development Server

Sometimes changes aren't picked up immediately. Try restarting your development server:

1. Stop the current server (Ctrl+C in the terminal)
2. Run `npm run dev` again to start the server

## 3. Clear Browser Cache

Browser caching can sometimes prevent new changes from appearing:

1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Or clear your browser cache entirely

## 4. Check for JavaScript Errors

JavaScript errors can prevent components from rendering:

1. Open your browser's developer tools (F12)
2. Go to the "Console" tab
3. Look for any error messages
4. If you see errors, they might indicate what's preventing the sidebar from rendering correctly

## 5. Verify the Component Structure

The sidebar should now include these links for admin users:
- Sales Bill
- All Sales
- Layaway
- Advance Booking
- Payment Tracking ← This is the new addition
- Inventory
- Customers
- Gold Exchange
- Users

## 6. Manual Verification

You can manually navigate to the payment tracking page by visiting:
`http://localhost:3000/dashboard/payment-tracking`

Even if the link isn't visible in the sidebar, you should still be able to access the page directly if you're logged in as an admin.

## 7. Check File Structure

Verify that the payment-tracking directory exists:
```
/app/dashboard/payment-tracking/page.tsx
```

If you continue to have issues after trying these steps, please let me know and we can investigate further.