import { isDockerEnvironment } from './dbConnector';
import { sql } from 'drizzle-orm';

// We'll initialize these later
let pool: any;
let db: any;

// Export isDockerEnvironment flag
export { isDockerEnvironment };

// Export the database objects
export { pool, db };

// Create a test function to verify connection
export async function testConnection() {
  if (!pool || !db) {
    console.error('Database not initialized');
    return false;
  }
  
  try {
    if (isDockerEnvironment) {
      const result = await pool.query('SELECT NOW() as current_time');
      console.log(`Database connection successful. Server time: ${result.rows[0].current_time}`);
    } else {
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      const time = Array.isArray(result) && result.length > 0 && result[0].current_time
        ? result[0].current_time
        : result && result.rows && result.rows.length > 0
        ? result.rows[0].current_time
        : 'unknown';
      
      console.log(`Database connection successful. Server time: ${time}`);
    }
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Create prometheus_instances table if it doesn't exist
export async function createPrometheusInstancesTable() {
  if (!pool || !db) {
    console.error('Database not initialized');
    return false;
  }

  try {
    console.log('Checking for prometheus_instances table...');
    
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prometheus_instances'
      ) as table_exists
    `);
    
    const exists = tableExists[0]?.table_exists === true;
    
    if (!exists) {
      console.log('Creating prometheus_instances table...');
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS prometheus_instances (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id),
          instance_name TEXT NOT NULL,
          environment TEXT NOT NULL,
          organization_name TEXT NOT NULL,
          prometheus_url TEXT NOT NULL,
          scraping_interval INTEGER NOT NULL,
          api_endpoint BOOLEAN NOT NULL DEFAULT TRUE,
          system_metrics BOOLEAN NOT NULL DEFAULT TRUE,
          application_metrics BOOLEAN NOT NULL DEFAULT TRUE,
          database_metrics BOOLEAN NOT NULL DEFAULT TRUE,
          business_metrics BOOLEAN NOT NULL DEFAULT TRUE,
          custom_metrics BOOLEAN NOT NULL DEFAULT FALSE,
          alerting_method TEXT NOT NULL,
          contact_email TEXT,
          slack_webhook TEXT,
          webhook_url TEXT,
          severity JSONB,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log('Successfully created prometheus_instances table');
    } else {
      console.log('prometheus_instances table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating prometheus_instances table:', error);
    return false;
  }
}

// This function initializes the database connection
export async function initializeDatabase() {
  // Import dynamically to avoid top-level await
  const { initializeDb } = await import('./dbConnector');
  const { pool: newPool, db: newDb } = await initializeDb();
  
  // Assign to module-level variables
  pool = newPool;
  db = newDb;
  
  // Create necessary tables
  await createPrometheusInstancesTable();
  
  return { pool, db };
}