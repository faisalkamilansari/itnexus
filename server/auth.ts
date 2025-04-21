import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { User, InsertUser, users } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      tenantId: number;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "buopso-it-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware to log all API requests for debugging
  app.use((req: Request, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path}`, {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        sessionID: req.sessionID,
        query: req.query
      });
    }
    next();
  });

  // Custom middleware to get tenant ID from subdomain or user
  app.use(async (req: Request, res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }

    // For demo purposes, let's handle a query param for tenant
    // In production, this should be determined from the subdomain
    const tenantSubdomain = req.query.tenant as string || 'default';
    
    try {
      // First try to get tenant ID from authenticated user
      if (req.isAuthenticated() && req.user) {
        // @ts-ignore - Accessing tenantId from user
        const userTenantId = req.user.tenantId;
        if (userTenantId) {
          console.log(`Setting tenant ID from user: ${userTenantId}`);
          // @ts-ignore - Adding tenantId to the request
          req.tenantId = userTenantId;
          return next();
        }
      }
      
      // Fallback to subdomain lookup
      const tenant = await storage.getTenantBySubdomain(tenantSubdomain);
      if (tenant) {
        console.log(`Setting tenant ID from subdomain: ${tenant.id}`);
        // @ts-ignore - Adding tenantId to the request
        req.tenantId = tenant.id;
      } else if (req.path !== '/api/tenants' && !req.path.includes('/api/auth') && 
                 req.path !== '/api/register' && req.path !== '/api/login' && 
                 req.path !== '/api/user' && req.path !== '/api/session-info') {
        return res.status(404).json({ message: "Tenant not found" });
      }
      next();
    } catch (err) {
      console.error("Tenant middleware error:", err);
      next(err);
    }
  });

  passport.use(
    new LocalStrategy({
      passReqToCallback: true,
    }, async (req: any, username: string, password: string, done: any) => {
      try {
        console.log("Login attempt for username:", username);
        
        // Step 1: First check if we need to try a specific tenant
        // @ts-ignore - Using tenantId from request
        let tenantId = req.tenantId;
        if (tenantId) {
          console.log(`Attempting login with specified tenant ID: ${tenantId}`);
          const user = await storage.getUserByUsername(username, tenantId);
          
          if (user && await comparePasswords(password, user.password)) {
            console.log(`User found in tenant ${tenantId}, authentication successful`);
            return done(null, user);
          }
        }
        
        // Step 2: If not found with the specific tenant, search all users with this username
        console.log("Searching for user globally...");
        const allUsers = await db.select().from(users).where(eq(users.username, username));
        console.log(`Found ${allUsers.length} users with username: ${username}`);
        
        // Try to authenticate with each user
        for (const user of allUsers) {
          if (await comparePasswords(password, user.password)) {
            console.log(`Authentication successful for user ID ${user.id} in tenant ${user.tenantId}`);
            return done(null, user);
          }
        }
        
        // No match found
        console.log("Authentication failed: Invalid username or password");
        return done(null, false, { message: "Invalid username or password" });
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user as Express.User);
    } catch (err) {
      done(err);
    }
  });

  // Register a tenant
  app.post("/api/tenants", async (req, res, next) => {
    try {
      const existingTenant = await storage.getTenantBySubdomain(req.body.subdomain);
      if (existingTenant) {
        return res.status(400).json({ message: "Tenant subdomain already exists" });
      }

      const tenant = await storage.createTenant({
        name: req.body.name,
        subdomain: req.body.subdomain,
        settings: req.body.settings || {}
      });

      // Create admin user for the tenant
      const adminUser = await storage.createUser({
        tenantId: tenant.id,
        username: req.body.adminUsername,
        password: await hashPassword(req.body.adminPassword),
        email: req.body.adminEmail,
        firstName: req.body.adminFirstName,
        lastName: req.body.adminLastName,
        role: "admin"
      });

      res.status(201).json({ tenant, adminUser: { ...adminUser, password: undefined } });
    } catch (err) {
      next(err);
    }
  });

  // Register a user
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration data received:", {
        ...req.body,
        password: "[REDACTED]"
      });
      
      let tenantId: number;
      
      // Create a new tenant if organization name is provided
      if (req.body.organizationName) {
        const organizationName = req.body.organizationName;
        // Generate base subdomain from organization name
        let baseSubdomain = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 15); // Make shorter to leave room for suffix
        
        // Add a timestamp suffix to make it unique
        const timestamp = new Date().getTime().toString().substring(8, 13); // Get last 5 digits of timestamp
        const subdomain = `${baseSubdomain}${timestamp}`;
          
        console.log(`Creating new tenant: ${organizationName} (${subdomain})`);
        
        try {
          // Create the tenant with the unique subdomain
          const newTenant = await storage.createTenant({
            name: organizationName,
            subdomain: subdomain,
            settings: {
              logoUrl: null,
              primaryColor: "#3b82f6",
              customCss: null
            }
          });
          
          console.log("New tenant created:", newTenant);
          tenantId = newTenant.id;
        } catch (error) {
          console.error("Failed to create tenant:", error);
          return res.status(400).json({ 
            message: "Failed to create organization", 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        // @ts-ignore - Using tenantId from request
        tenantId = req.tenantId || 1; // Use default tenant as fallback
        if (!tenantId) {
          return res.status(400).json({ message: "Tenant ID or organization name is required" });
        }
        console.log(`Using existing tenant ID: ${tenantId}`);
      }

      // Check if username exists globally (across all tenants)
      const usernameExists = await storage.checkUsernameExists(req.body.username);
      if (usernameExists) {
        return res.status(400).json({ message: "Username already exists. Please choose a different username." });
      }

      const userData: InsertUser = {
        ...req.body,
        tenantId,
        password: await hashPassword(req.body.password),
      };
      
      console.log("Creating user with tenantId:", tenantId);
      const user = await storage.createUser(userData);

      req.login(user as Express.User, (err) => {
        if (err) return next(err);
        res.status(201).json({ ...user, password: undefined });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      console.log("Login attempt successful for user:", user.username);
      
      req.login(user as Express.User, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        console.log("User logged in, session created:", req.sessionID);
        res.status(200).json({ ...user, password: undefined });
      });
    })(req, res, next);
  });
  
  // Debug endpoint for session info
  app.get("/api/session-info", (req, res) => {
    console.log("Session info:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });
    res.json({
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      user: req.user ? { ...req.user, password: undefined } : null
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as User;
    res.json({ ...user, password: undefined });
  });
}
