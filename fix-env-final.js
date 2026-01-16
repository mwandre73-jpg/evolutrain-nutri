const fs = require('fs');
const content = [
    'DATABASE_URL="mysql://root@localhost:3306/evolutrain"',
    'NEXTAUTH_URL="http://localhost:3000"',
    'NEXTAUTH_SECRET="f2a3b4c5d6"',
    'STRAVA_CLIENT_ID="193328"',
    'STRAVA_CLIENT_SECRET="4eb86b53907c736a7bb76ebb0a54da8991e3f997"',
    'STRAVA_REDIRECT_URI="http://localhost:3000/api/integrations/strava/callback"'
].join('\n');

try {
    fs.writeFileSync('.env', content, 'utf8');
    console.log('--- START .ENV ---');
    console.log(fs.readFileSync('.env', 'utf8'));
    console.log('--- END .ENV ---');
} catch (err) {
    console.error(err);
}
