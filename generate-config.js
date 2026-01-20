const fs = require('fs');

const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

const content = `window.ENV_CONFIG = ${JSON.stringify(config, null, 2)};`;

fs.writeFileSync('config.js', content);
console.log('config.js generated successfully');
