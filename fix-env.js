const fs = require('fs');
const content = `DATABASE_URL="mysql://root@localhost:3306/evolutrain"
NEXTAUTH_SECRET="7f3c4d5e6a7b8c9d0e1f2a3b4c5d6e7f"
NEXTAUTH_URL="http://localhost:3000"
`;
fs.writeFileSync('.env', content.trim() + '\n');
console.log(".env fixed");
