import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const stripQuotes = (str: string) => {
  let s = str ? str.trim() : '';
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).trim();
  return s;
};

const connectionString = stripQuotes(process.env.VITE_SUPABASE_URL || '');

if (!connectionString || !connectionString.startsWith('postgres')) {
  console.error('No VITE_SUPABASE_URL PostgreSQL connection string found. Cannot run DB migrations.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString
});

async function migrate() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully. Running migrations...');

    // 1. Add views to posts if not exists
    await client.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INT4 DEFAULT 0;
    `);
    console.log('- Verified posts.views column');

    // 2. Create favorites table if not exists with correct relations/types
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, post_id)
      );
    `);
    console.log('- Verified favorites table');

    // 3. Create post_votes table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_votes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        vote_type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, post_id)
      );
    `);
    console.log('- Verified post_votes table');

    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
