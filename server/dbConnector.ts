import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

// Check if we're in a Docker environment
export const isDockerEnvironment = process.env.DOCKER_CONTAINER === 'true' || 
                                  process.env.IN_DOCKER === 'true' || 
                                  process.env.PGHOST === 'postgres';

console.log(`Database connection mode: ${isDockerEnvironment ? 'Docker (Standard)' : 'Serverless (WebSocket)'}`);

// Initialize for Docker
export async function initializeDockerDb() {
  console.log("Initializing standard PostgreSQL client for Docker environment");
  // Import modules dynamically
  const pg = await import('pg');
  // Use node-postgres instead if pg-pool is not available
  const pgDrizzle = await import('drizzle-orm/node-postgres');
  
  // Handle both ESM and CommonJS module formats
  const Pool = pg.default?.Pool || pg.Pool;
  const { drizzle } = pgDrizzle;
  
  // In Docker environment, prefer individual connection parameters over connection string
  // to avoid issues with variable substitution
  const config = {
    // Use specific PG* environment variables if available, otherwise fall back to DATABASE_URL
    host: process.env.PGHOST || 'postgres',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'buopsoit',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'buopsoit',
    ssl: false,  // Disable SSL for local Docker environment
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
  
  console.log(`Docker DB config: host=${config.host}, port=${config.port}, user=${config.user}, database=${config.database}`);
  
  const pool = new Pool(config);
  
  const db = drizzle(pool, { schema });
  
  // Test connection
  let retries = 3;
  let lastError;
  
  while (retries > 0) {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      console.log(`Docker DB connection successful. Server time: ${result.rows[0].current_time}`);
      
      // Also verify we can access the tables we need
      const tablesResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tenants'
        ) as tenant_table_exists
      `);
      
      console.log(`Database tables verification: tenant table exists = ${tablesResult.rows[0].tenant_table_exists}`);
      
      if (tablesResult.rows[0].tenant_table_exists !== true) {
        console.warn("WARNING: Tenants table does not exist yet. Database may not be fully initialized.");
      }
      
      // Connection successful
      return { pool, db };
    } catch (error) {
      lastError = error;
      console.error(`Docker DB connection attempt failed (${retries} retries left):`, error);
      retries--;
      
      if (retries > 0) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error("All Docker DB connection attempts failed");
  throw lastError;
}

// Initialize for Serverless
export async function initializeServerlessDb() {
  console.log("Initializing WebSocket client for Neon Serverless");
  const neon = await import('@neondatabase/serverless');
  const neonDrizzle = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  
  const { Pool, neonConfig } = neon;
  const { drizzle } = neonDrizzle;
  
  neonConfig.webSocketConstructor = ws.default;
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for Serverless environment");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });
  
  // Test connection with retries
  let retries = 3;
  let lastError;
  
  while (retries > 0) {
    try {
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      const time = Array.isArray(result) && result.length > 0 && result[0].current_time
        ? result[0].current_time
        : 'unknown';
      console.log(`Serverless DB connection successful. Server time: ${time}`);
      
      // Also verify we can access the tables we need
      try {
        const tablesResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'tenants'
          ) as tenant_table_exists
        `);
        
        const tableExists = Array.isArray(tablesResult) && tablesResult.length > 0
          ? tablesResult[0].tenant_table_exists
          : false;
          
        console.log(`Database tables verification: tenant table exists = ${tableExists}`);
        
        if (tableExists !== true) {
          console.warn("WARNING: Tenants table does not exist yet. Database may not be fully initialized.");
        }
      } catch (tableError) {
        console.warn("Could not verify database tables:", tableError);
      }
      
      // Connection successful
      return { pool, db };
    } catch (error) {
      lastError = error;
      console.error(`Serverless DB connection attempt failed (${retries} retries left):`, error);
      retries--;
      
      if (retries > 0) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error("All Serverless DB connection attempts failed");
  throw lastError;
}

// Universal initialize function
export async function initializeDb() {
  return isDockerEnvironment ? initializeDockerDb() : initializeServerlessDb();
}