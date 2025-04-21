import { 
  users, User, InsertUser, 
  tenants, Tenant, InsertTenant,
  assets, Asset, InsertAsset,
  incidents, Incident, InsertIncident,
  serviceRequests, ServiceRequest, InsertServiceRequest,
  changeRequests, ChangeRequest, InsertChangeRequest,
  monitoringAlerts, MonitoringAlert, InsertMonitoringAlert,
  serviceCatalog, ServiceCatalogItem, InsertServiceCatalogItem,
  comments, Comment, InsertComment,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, inArray, desc, isNull, isNotNull } from "drizzle-orm";
import session from "express-session";
// When using dynamic import, we need to initialize it differently
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const connectPgSimple = require('connect-pg-simple');

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  // Session store
  sessionStore: any; // Using any to bypass type errors for now

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId: number): Promise<User | undefined>;
  checkUsernameExists(username: string): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tenant methods
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  // Incident methods
  getIncident(id: number, tenantId: number): Promise<Incident | undefined>;
  getIncidents(tenantId: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: number, incidentData: Partial<Incident>): Promise<Incident | undefined>;
  
  // Service request methods
  getServiceRequest(id: number, tenantId: number): Promise<ServiceRequest | undefined>;
  getServiceRequests(tenantId: number): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: number, requestData: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  
  // Change request methods
  getChangeRequest(id: number, tenantId: number): Promise<ChangeRequest | undefined>;
  getChangeRequests(tenantId: number): Promise<ChangeRequest[]>;
  createChangeRequest(request: InsertChangeRequest): Promise<ChangeRequest>;
  updateChangeRequest(id: number, requestData: Partial<ChangeRequest>): Promise<ChangeRequest | undefined>;
  
  // Asset methods
  getAsset(id: number, tenantId: number): Promise<Asset | undefined>;
  getAssets(tenantId: number): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, assetData: Partial<Asset>): Promise<Asset | undefined>;
  
  // Monitoring alert methods
  getMonitoringAlert(id: number, tenantId: number): Promise<MonitoringAlert | undefined>;
  getMonitoringAlerts(tenantId: number): Promise<MonitoringAlert[]>;
  createMonitoringAlert(alert: InsertMonitoringAlert): Promise<MonitoringAlert>;
  updateMonitoringAlert(id: number, alertData: Partial<MonitoringAlert>): Promise<MonitoringAlert | undefined>;
  
  // Service catalog methods
  getServiceCatalogItem(id: number, tenantId: number): Promise<ServiceCatalogItem | undefined>;
  getServiceCatalog(tenantId: number): Promise<ServiceCatalogItem[]>;
  createServiceCatalogItem(item: InsertServiceCatalogItem): Promise<ServiceCatalogItem>;
  
  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsForIncident(incidentId: number, tenantId: number): Promise<Comment[]>;
  getCommentsForServiceRequest(requestId: number, tenantId: number): Promise<Comment[]>;
  getCommentsForChangeRequest(requestId: number, tenantId: number): Promise<Comment[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any to bypass type errors for now

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string, tenantId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.tenantId, tenantId)
      )
    );
    return user;
  }
  
  async checkUsernameExists(username: string): Promise<boolean> {
    try {
      // This is a special case method that checks globally across all tenants
      const results = await db.select().from(users).where(eq(users.username, username));
      console.log(`Checking if username '${username}' exists globally:`, results.length > 0);
      return results.length > 0;
    } catch (error) {
      console.error("Error checking username existence:", error);
      // In case of an error, we should assume the username might exist
      // to prevent potential duplicate usernames
      return true;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Tenant methods
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return tenant;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values(insertTenant)
      .returning();
    return tenant;
  }

  // Incident methods
  async getIncident(id: number, tenantId: number): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(
      and(
        eq(incidents.id, id),
        eq(incidents.tenantId, tenantId)
      )
    );
    return incident;
  }

  async getIncidents(tenantId: number): Promise<Incident[]> {
    return db.select().from(incidents)
      .where(eq(incidents.tenantId, tenantId))
      .orderBy(desc(incidents.createdAt));
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const [incident] = await db
      .insert(incidents)
      .values(insertIncident)
      .returning();
    return incident;
  }

  async updateIncident(id: number, incidentData: Partial<Incident>): Promise<Incident | undefined> {
    const [incident] = await db
      .update(incidents)
      .set({ ...incidentData, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    return incident;
  }

  // Service request methods
  async getServiceRequest(id: number, tenantId: number): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(
      and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.tenantId, tenantId)
      )
    );
    return request;
  }

  async getServiceRequests(tenantId: number): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests)
      .where(eq(serviceRequests.tenantId, tenantId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(insertRequest: InsertServiceRequest): Promise<ServiceRequest> {
    const [request] = await db
      .insert(serviceRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async updateServiceRequest(id: number, requestData: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .update(serviceRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }

  // Change request methods
  async getChangeRequest(id: number, tenantId: number): Promise<ChangeRequest | undefined> {
    const [request] = await db.select().from(changeRequests).where(
      and(
        eq(changeRequests.id, id),
        eq(changeRequests.tenantId, tenantId)
      )
    );
    return request;
  }

  async getChangeRequests(tenantId: number): Promise<ChangeRequest[]> {
    return db.select().from(changeRequests)
      .where(eq(changeRequests.tenantId, tenantId))
      .orderBy(desc(changeRequests.createdAt));
  }

  async createChangeRequest(insertRequest: InsertChangeRequest): Promise<ChangeRequest> {
    const [request] = await db
      .insert(changeRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async updateChangeRequest(id: number, requestData: Partial<ChangeRequest>): Promise<ChangeRequest | undefined> {
    const [request] = await db
      .update(changeRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(changeRequests.id, id))
      .returning();
    return request;
  }

  // Asset methods
  async getAsset(id: number, tenantId: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(
      and(
        eq(assets.id, id),
        eq(assets.tenantId, tenantId)
      )
    );
    return asset;
  }

  async getAssets(tenantId: number): Promise<Asset[]> {
    return db.select().from(assets)
      .where(eq(assets.tenantId, tenantId))
      .orderBy(assets.name);
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values(insertAsset)
      .returning();
    return asset;
  }

  async updateAsset(id: number, assetData: Partial<Asset>): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set(assetData)
      .where(eq(assets.id, id))
      .returning();
    return asset;
  }

  // Monitoring alert methods
  async getMonitoringAlert(id: number, tenantId: number): Promise<MonitoringAlert | undefined> {
    const [alert] = await db.select().from(monitoringAlerts).where(
      and(
        eq(monitoringAlerts.id, id),
        eq(monitoringAlerts.tenantId, tenantId)
      )
    );
    return alert;
  }

  async getMonitoringAlerts(tenantId: number): Promise<MonitoringAlert[]> {
    return db.select().from(monitoringAlerts)
      .where(eq(monitoringAlerts.tenantId, tenantId))
      .orderBy(desc(monitoringAlerts.createdAt));
  }

  async createMonitoringAlert(insertAlert: InsertMonitoringAlert): Promise<MonitoringAlert> {
    const [alert] = await db
      .insert(monitoringAlerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async updateMonitoringAlert(id: number, alertData: Partial<MonitoringAlert>): Promise<MonitoringAlert | undefined> {
    const [alert] = await db
      .update(monitoringAlerts)
      .set(alertData)
      .where(eq(monitoringAlerts.id, id))
      .returning();
    return alert;
  }

  // Service catalog methods
  async getServiceCatalogItem(id: number, tenantId: number): Promise<ServiceCatalogItem | undefined> {
    const [item] = await db.select().from(serviceCatalog).where(
      and(
        eq(serviceCatalog.id, id),
        eq(serviceCatalog.tenantId, tenantId)
      )
    );
    return item;
  }

  async getServiceCatalog(tenantId: number): Promise<ServiceCatalogItem[]> {
    return db.select().from(serviceCatalog)
      .where(
        and(
          eq(serviceCatalog.tenantId, tenantId),
          eq(serviceCatalog.active, true)
        )
      )
      .orderBy(serviceCatalog.category, serviceCatalog.name);
  }

  async createServiceCatalogItem(insertItem: InsertServiceCatalogItem): Promise<ServiceCatalogItem> {
    const [item] = await db
      .insert(serviceCatalog)
      .values(insertItem)
      .returning();
    return item;
  }

  // Comment methods
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getCommentsForIncident(incidentId: number, tenantId: number): Promise<Comment[]> {
    return db.select().from(comments)
      .where(
        and(
          eq(comments.incidentId, incidentId),
          eq(comments.tenantId, tenantId)
        )
      )
      .orderBy(comments.createdAt);
  }

  async getCommentsForServiceRequest(requestId: number, tenantId: number): Promise<Comment[]> {
    return db.select().from(comments)
      .where(
        and(
          eq(comments.serviceRequestId, requestId),
          eq(comments.tenantId, tenantId)
        )
      )
      .orderBy(comments.createdAt);
  }

  async getCommentsForChangeRequest(requestId: number, tenantId: number): Promise<Comment[]> {
    return db.select().from(comments)
      .where(
        and(
          eq(comments.changeRequestId, requestId),
          eq(comments.tenantId, tenantId)
        )
      )
      .orderBy(comments.createdAt);
  }
}

export const storage = new DatabaseStorage();
