// Initialize the database schema for Docker
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool, db } from './db-docker.js';
import * as fs from 'fs';
import * as path from 'path';

async function initializeDatabase() {
  console.log('Starting database schema initialization...');
  
  try {
    // Check if migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating tables directly...');
      
      // Create tables directly using schema (using lowercase column names for PostgreSQL compatibility)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          subdomain TEXT NOT NULL UNIQUE,
          settings JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id),
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          email TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create the index without the problematic column
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
      `);
      
      console.log('Created username index. Checking column names in the users table...');
      
      // Check column names to determine the correct format for tenantId
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      try {
        // Since we're explicitly using tenant_id in the CREATE TABLE statement,
        // we can directly create the composite index
        await pool.query(`DROP INDEX IF EXISTS users_username_idx`);
        
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS users_username_tenant_idx 
          ON users (username, tenant_id);
        `);
        console.log('Created composite index on username and tenant_id columns.');
      } catch (indexError) {
        console.error(`Error creating composite index: ${indexError.message}`);
        console.log('Continuing without composite index. Unique constraint on username only is active.');
      }
      
      // Create the remaining tables we need
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS assets (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            purchase_date TIMESTAMP WITH TIME ZONE,
            assigned_to INTEGER REFERENCES users(id),
            location TEXT,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS incidents (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            reported_by INTEGER REFERENCES users(id),
            assigned_to INTEGER REFERENCES users(id),
            related_asset INTEGER REFERENCES assets(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS service_requests (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            requested_by INTEGER REFERENCES users(id),
            assigned_to INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS change_requests (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            requested_by INTEGER REFERENCES users(id),
            approved_by INTEGER REFERENCES users(id),
            affected_systems TEXT[],
            implementation_plan TEXT,
            rollback_plan TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            scheduled_date TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            incident_id INTEGER REFERENCES incidents(id),
            service_request_id INTEGER REFERENCES service_requests(id),
            change_request_id INTEGER REFERENCES change_requests(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS monitoring_alerts (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            severity TEXT NOT NULL,
            source TEXT NOT NULL,
            asset_id INTEGER REFERENCES assets(id),
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE
          );
        `);
      
        await pool.query(`
          CREATE TABLE IF NOT EXISTS service_catalog (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            estimated_duration TEXT,
            approval_required BOOLEAN NOT NULL DEFAULT false,
            form_fields JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      } catch (tablesError) {
        console.error(`Error creating tables: ${tablesError.message}`);
        throw tablesError;
      }
      
      // Verify tables were created
      try {
        console.log("Verifying tables were created successfully...");
        
        // Check each table
        const tables = ['tenants', 'users', 'assets', 'incidents', 'service_requests', 
                       'change_requests', 'comments', 'monitoring_alerts', 'service_catalog'];
        
        for (const table of tables) {
          const result = await pool.query(`
            SELECT EXISTS(
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = '${table}' 
              AND table_schema = 'public'
            ) AS table_exists
          `);
          
          if (!result.rows[0].table_exists) {
            throw new Error(`Table '${table}' was not created successfully.`);
          }
          console.log(`✅ Table '${table}' verified`);
        }
        
        // Check column naming convention in users table
        const columnResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
          ORDER BY column_name
        `);
        
        console.log("Column names in users table:");
        columnResult.rows.forEach(row => {
          console.log(`  - ${row.column_name}`);
        });
      } catch (verifyError) {
        console.error(`Error verifying tables: ${verifyError.message}`);
        throw verifyError;
      }
      
      console.log('All database tables created and verified successfully.');
    } else {
      console.log('Migrations directory found. Running migrations...');
      // Run migrations
      await migrate(db, { migrationsFolder: migrationsDir });
      console.log('Migrations completed successfully.');
    }
    
    console.log('Database schema initialization completed.');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});