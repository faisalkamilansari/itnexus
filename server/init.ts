import { db } from "./db";
import { tenants, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    console.log("Checking for default tenant...");
    
    // Check if default tenant exists
    const defaultTenant = await db.select()
      .from(tenants)
      .where(eq(tenants.subdomain, "default"))
      .execute();
    
    if (defaultTenant.length === 0) {
      console.log("Creating default tenant...");
      
      // Create default tenant
      const [tenant] = await db.insert(tenants)
        .values([{
          name: "Default Organization",
          subdomain: "default",
          settings: {
            logoUrl: null,
            primaryColor: "#4f46e5",
            customCss: null
          }
        }])
        .returning();
      
      console.log(`Default tenant created with ID: ${tenant.id}`);
      
      // Create admin user for default tenant
      const [adminUser] = await db.insert(users)
        .values([{
          tenantId: tenant.id,
          username: "admin",
          password: await hashPassword("admin123"),
          email: "admin@example.com",
          firstName: "System",
          lastName: "Administrator",
          role: "admin"
        }])
        .returning();
      
      console.log(`Default admin user created with ID: ${adminUser.id}`);
      console.log("Default credentials: username: admin, password: admin123");
    } else {
      console.log("Default tenant already exists.");
      
      // Check if admin user exists
      const adminUser = await db.select()
        .from(users)
        .where(eq(users.tenantId, defaultTenant[0].id))
        .where(eq(users.username, "admin"))
        .execute();
      
      if (adminUser.length === 0) {
        console.log("Creating default admin user...");
        
        // Create admin user for default tenant
        const [adminUser] = await db.insert(users)
          .values([{
            tenantId: defaultTenant[0].id,
            username: "admin",
            password: await hashPassword("admin123"),
            email: "admin@example.com",
            firstName: "System",
            lastName: "Administrator",
            role: "admin"
          }])
          .returning();
        
        console.log(`Default admin user created with ID: ${adminUser.id}`);
        console.log("Default credentials: username: admin, password: admin123");
      } else {
        console.log("Default admin user already exists.");
      }
    }
    
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}