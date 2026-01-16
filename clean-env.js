const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

// Using the data I found in previous steps
const content = `DATABASE_URL="mysql://root@localhost:3306/evolutrain"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="f2a3b4c5d6"
STRAVA_CLIENT_ID="193328"
STRAVA_CLIENT_SECRET="4eb86b53907c736a7bb76ebb0a54da8991e3f997"
STRAVA_REDIRECT_URI="http://localhost:3000/api/integrations/strava/callback"
`;

try {
    // Delete existing file if any to be absolutely sure
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
    }
    fs.writeFileSync(envPath, content, { encoding: 'utf8' });
    console.log('.env file completely rewritten and cleaned.');
} catch (e) {
    console.error('Error writing .env:', e);
}
