const fs = require('fs');
const content = 'DATABASE_URL="mysql://root@localhost:3306/evolutrain"\r\n' +
    'NEXTAUTH_URL="http://localhost:3000"\r\n' +
    'NEXTAUTH_SECRET="f2a3b4c5d6"\r\n' +
    'STRAVA_CLIENT_ID="193328"\r\n' +
    'STRAVA_CLIENT_SECRET="4eb86b53907c736a7bb76ebb0a54da8991e3f997"\r\n' +
    'STRAVA_REDIRECT_URI="http://localhost:3000/api/integrations/strava/callback"\r\n';

fs.writeFileSync('.env', content, { encoding: 'utf8', flag: 'w' });
console.log('Final attempt: .env file created.');
