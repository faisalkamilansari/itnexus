// Database connection for Docker environment - no WebSockets
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';

const { Pool } = pg;

console.log("Initializing Docker database connection");

if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL found, trying individual connection parameters");
  
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD || !process.env.PGDATABASE) {
    throw new Error(
      "Database connection parameters missing. Ensure DATABASE_URL or individual PG* variables are set."
    );
  }
}

// First try to connect using individual parameters
const config = {
  host: process.env.PGHOST || 'postgres',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // Disable SSL for local Docker environment
  ssl: false
};

console.log(`Connecting to PostgreSQL at ${config.host}:${config.port} with user ${config.user}`);

export const pool = new Pool(config);

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connection successful. Server time:', res.rows[0].now);
  }
});

export const db = drizzle(pool, { schema });