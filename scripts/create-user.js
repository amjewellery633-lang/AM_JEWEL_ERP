const bcrypt = require('bcryptjs');

// Configuration
const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin123';
const role = process.argv[4] || 'admin';

// Generate password hash
const hash = bcrypt.hashSync(password, 10);

console.log('\n========================================');
console.log('User Creation SQL');
console.log('========================================\n');
console.log(`Username: ${username}`);
console.log(`Password: ${password}`);
console.log(`Role: ${role}`);
console.log(`\nPassword Hash: ${hash}\n`);
console.log('SQL to insert user:\n');
console.log(`INSERT INTO users (username, password_hash, role, can_edit_bills, can_edit_stock, can_authorize_nongst)
VALUES (
  '${username}',
  '${hash}',
  '${role}',
  ${role === 'admin' ? 'true' : 'false'},
  ${role === 'admin' ? 'true' : 'false'},
  ${role === 'admin' ? 'true' : 'false'}
);\n`);
console.log('========================================\n');
console.log('Copy the SQL above and run it in Supabase SQL Editor\n');















