const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.aftrouxqaqswiyfflopk',
    password: '7-qqzh5/_UPk_MW',
    ssl: {
        rejectUnauthorized: false
    }
});

async function runAdvancedMigration() {
    try {
        await client.connect();
        console.log('✅ Connected to Supabase database');

        const sql = fs.readFileSync('advanced_features_migration.sql', 'utf8');

        console.log('🔄 Running advanced features migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('📊 New tables created:');
        console.log('   - exercise_history (progressive overload tracking)');
        console.log('   - exercise_notes (form cues, injuries)');
        console.log('   - user_preferences (custom settings)');
        console.log('🔒 Row Level Security enabled');
        console.log('📈 Performance indexes created');
        console.log('✨ Database is ready for advanced features!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runAdvancedMigration();
