// Initialize the application with a default tenant and admin user
import { db, pool } from './db-docker.js';
import { tenants, users } from '../shared/schema.js';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq, sql } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString('hex')}.${salt}`;
}

async function initializeContainer() {
  console.log('Starting container initialization...');
  
  try {
    // First verify tables exist by executing a simple query
    try {
      console.log("Verifying database connection and schema...");
      
      // Test the tenants table - use raw SQL query for better compatibility
      const tenantTableCheck = await db.execute(sql`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tenants' AND table_schema = 'public'
        ) AS table_exists
      `);
      
      console.log("Raw tenant table check result:", JSON.stringify(tenantTableCheck));
      
      // Direct query to pg pool for more detailed error diagnosis
      const client = await pool.connect();
      
      try {
        const rawResult = await client.query(`
          SELECT EXISTS(
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'tenants' AND table_schema = 'public'
          ) AS table_exists
        `);
        
        console.log("Direct PG query result:", JSON.stringify(rawResult.rows));
        
        // Verify table existence using pool client
        if (!rawResult.rows || rawResult.rows.length === 0 || !rawResult.rows[0].table_exists) {
          throw new Error("Tenants table does not exist. Please ensure database initialization was successful.");
        }
        
        // Additional check - try to count rows in tenants table
        const countResult = await client.query(`SELECT COUNT(*) FROM tenants`);
        console.log(`Found ${countResult.rows[0].count} rows in tenants table`);
      } catch (error) {
        console.error("Error checking tables with direct query:", error.message);
        throw error;
      } finally {
        client.release();
      }
      
      // Users table is checked indirectly through the tenants existence check above
      // In case the tenants table exists but users doesn't, let's verify it separately
      try {
        const client = await pool.connect();
        try {
          const usersTableResult = await client.query(`
            SELECT EXISTS(
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'users' AND table_schema = 'public'
            ) AS table_exists
          `);
          
          console.log("Direct PG query for users table:", JSON.stringify(usersTableResult.rows));
          
          if (!usersTableResult.rows || usersTableResult.rows.length === 0 || !usersTableResult.rows[0].table_exists) {
            throw new Error("Users table does not exist. Please ensure database initialization was successful.");
          }
          
          // Additional check - try to count rows in users table
          const countResult = await client.query(`SELECT COUNT(*) FROM users`);
          console.log(`Found ${countResult.rows[0].count} rows in users table`);
        } catch (error) {
          console.error("Error checking users table with direct query:", error.message);
          throw error;
        } finally {
          client.release();
        }
      } catch (userTableError) {
        console.error("Failed to verify users table:", userTableError);
        throw userTableError;
      }
      
      console.log("Database tables verified successfully.");
    } catch (schemaError) {
      console.error("Error verifying database schema:", schemaError);
      throw schemaError;
    }
  
    console.log("Checking for default tenant...");
    
    try {
      // Check if default tenant exists using raw SQL for consistent column naming
      const defaultTenantResult = await db.execute(sql`
        SELECT * FROM tenants WHERE subdomain = 'default'
      `);
      
      // Debug defaultTenantResult 
      console.log("Default tenant query result:", JSON.stringify(defaultTenantResult));
      
      // More careful handling of tenant result
      const defaultTenant = Array.isArray(defaultTenantResult) ? 
                            defaultTenantResult : 
                            (defaultTenantResult.rows || []);
                            
      console.log("Processed default tenant:", defaultTenant);
      
      if (!defaultTenant.length) {
        console.log("Creating default tenant...");
        
        // Create default tenant with raw SQL for consistency
        const tenantResult = await db.execute(sql`
          INSERT INTO tenants (
            name, 
            subdomain, 
            settings
          ) VALUES (
            'Default Organization', 
            'default', 
            '{"logoUrl": null, "primaryColor": "#4f46e5", "customCss": null}'
          ) RETURNING *
        `);
        
        // Safely extract tenant data
        let tenant;
        
        if (Array.isArray(tenantResult) && tenantResult.length > 0) {
          tenant = tenantResult[0];
        } else if (tenantResult && tenantResult.rows && tenantResult.rows.length > 0) {
          tenant = tenantResult.rows[0];
        } else {
          console.log("Warning: Unexpected tenant result format:", JSON.stringify(tenantResult));
          
          // Query directly to get the tenant ID
          const directQuery = await pool.query(`
            SELECT id FROM tenants WHERE subdomain = 'default' LIMIT 1
          `);
          
          if (directQuery.rows && directQuery.rows.length > 0) {
            tenant = directQuery.rows[0];
          } else {
            throw new Error("Failed to create or retrieve default tenant");
          }
        }
        
        console.log(`Default tenant created/found with ID: ${tenant.id}`);
        
        // Create admin user for default tenant
        // Use direct SQL query with lowercase column names for Docker PostgreSQL compatibility
        const adminResult = await db.execute(sql`
          INSERT INTO users (
            tenant_id, 
            username, 
            password, 
            email, 
            first_name, 
            last_name, 
            role
          ) VALUES (
            ${tenant.id}, 
            'admin', 
            ${await hashPassword("admin123")}, 
            'admin@example.com', 
            'System', 
            'Administrator', 
            'admin'
          ) RETURNING *
        `);
        
        // Safely extract admin user data
        let adminUser;
        
        if (Array.isArray(adminResult) && adminResult.length > 0) {
          adminUser = adminResult[0];
        } else if (adminResult && adminResult.rows && adminResult.rows.length > 0) {
          adminUser = adminResult.rows[0];
        } else {
          console.log("Warning: Unexpected admin user result format:", JSON.stringify(adminResult));
          adminUser = { id: "unknown" };
        }
        
        console.log(`Default admin user created with ID: ${adminUser.id}`);
        console.log("Default credentials: username: admin, password: admin123");
      } else {
        console.log("Default tenant already exists.");
        
        // Get the tenant ID safely
        let tenantId;
        
        if (defaultTenant[0] && defaultTenant[0].id) {
          tenantId = defaultTenant[0].id;
          console.log(`Using tenant ID from defaultTenant[0].id: ${tenantId}`);
        } else if (defaultTenant[0] && defaultTenant[0].tenant_id) {
          tenantId = defaultTenant[0].tenant_id;
          console.log(`Using tenant ID from defaultTenant[0].tenant_id: ${tenantId}`);
        } else {
          // If we can't get the ID from the results, query it directly
          const directTenantQuery = await pool.query(`
            SELECT id FROM tenants WHERE subdomain = 'default' LIMIT 1
          `);
          
          if (directTenantQuery.rows && directTenantQuery.rows.length > 0) {
            tenantId = directTenantQuery.rows[0].id;
            console.log(`Using tenant ID from direct query: ${tenantId}`);
          } else {
            console.error("No default tenant ID found. Creating a new tenant instead.");
            
            // Create a new tenant if we can't find the ID
            const newTenantResult = await pool.query(`
              INSERT INTO tenants (
                name, subdomain, settings
              ) VALUES (
                'Default Organization', 
                'default', 
                '{"logoUrl": null, "primaryColor": "#4f46e5", "customCss": null}'
              ) RETURNING id
            `);
            
            tenantId = newTenantResult.rows[0].id;
            console.log(`Created new default tenant with ID: ${tenantId}`);
          }
        }
        
        // Check if admin user exists using raw SQL for consistent column naming
        const adminUserResult = await db.execute(sql`
          SELECT * FROM users 
          WHERE tenant_id = ${tenantId} 
          AND username = 'admin'
        `);
        
        const adminUser = adminUserResult;
        
        if (adminUser.length === 0) {
          console.log("Creating default admin user...");
          
          // Create admin user for default tenant
          // Use direct SQL query with lowercase column names for Docker PostgreSQL compatibility
          const adminResult = await db.execute(sql`
            INSERT INTO users (
              tenant_id, 
              username, 
              password, 
              email, 
              first_name, 
              last_name, 
              role
            ) VALUES (
              ${tenantId}, 
              'admin', 
              ${await hashPassword("admin123")}, 
              'admin@example.com', 
              'System', 
              'Administrator', 
              'admin'
            ) RETURNING *
          `);
          
          // Safely extract admin user data
          let adminUser;
          
          if (Array.isArray(adminResult) && adminResult.length > 0) {
            adminUser = adminResult[0];
          } else if (adminResult && adminResult.rows && adminResult.rows.length > 0) {
            adminUser = adminResult.rows[0];
          } else {
            console.log("Warning: Unexpected admin user result format:", JSON.stringify(adminResult));
            adminUser = { id: "unknown" };
          }
          
          console.log(`Default admin user created with ID: ${adminUser.id}`);
          console.log("Default credentials: username: admin, password: admin123");
        } else {
          console.log("Default admin user already exists.");
        }
      }
    } catch (dataError) {
      console.error("Error handling tenant and user data:", dataError);
      throw dataError;
    }
    
    console.log("Container initialization complete.");
  } catch (error) {
    console.error('Error during container initialization:', error);
    process.exit(1);
  }
}

initializeContainer().catch(err => {
  console.error('Failed to initialize container:', err);
  process.exit(1);
});