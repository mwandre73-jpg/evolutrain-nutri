const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const content = `DATABASE_URL="mysql://root@localhost:3306/evolutrain"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="f2a3b4c5d6"
STRAVA_CLIENT_ID=193328
STRAVA_CLIENT_SECRET=4eb86b53907c736a7bb76ebb0a54da8991e3f997
STRAVA_REDIRECT_URI=http://localhost:3000/api/integrations/strava/callback
`;

fs.writeFileSync(envPath, content);
console.log('.env file repaired successfully');
