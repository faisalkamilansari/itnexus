import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ----- Tenants -----
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  settings: jsonb("settings").$type<{
    logoUrl?: string;
    primaryColor?: string;
    customCss?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

// ----- Users -----
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role", { enum: ["admin", "agent", "user"] }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  incidents: many(incidents),
  serviceRequests: many(serviceRequests),
  changeRequests: many(changeRequests),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// ----- Assets -----
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["server", "desktop", "laptop", "network", "software", "other"] }).notNull(),
  status: text("status", { enum: ["active", "inactive", "maintenance", "retired"] }).default("active").notNull(),
  serialNumber: text("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  location: text("location"),
  assignedTo: integer("assigned_to").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assets.tenantId],
    references: [tenants.id],
  }),
  assignedUser: one(users, {
    fields: [assets.assignedTo],
    references: [users.id],
  }),
  incidents: many(incidents),
  serviceRequests: many(serviceRequests),
  changeRequests: many(changeRequests),
}));

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

// ----- Incidents -----
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  status: text("status", { enum: ["new", "assigned", "in_progress", "resolved", "closed"] }).default("new").notNull(),
  reportedBy: integer("reported_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  affectedAsset: integer("affected_asset").references(() => assets.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  dueDate: timestamp("due_date"),
  slaBreached: boolean("sla_breached").default(false).notNull(),
});

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [incidents.tenantId],
    references: [tenants.id],
  }),
  reporter: one(users, {
    fields: [incidents.reportedBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [incidents.assignedTo],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [incidents.affectedAsset],
    references: [assets.id],
  }),
  comments: many(comments),
}));

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  slaBreached: true,
});

// ----- Service Requests -----
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestType: text("request_type").notNull(),
  status: text("status", { enum: ["new", "assigned", "in_progress", "pending_approval", "approved", "rejected", "completed", "cancelled"] }).default("new").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  requestedBy: integer("requested_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  relatedAsset: integer("related_asset").references(() => assets.id),
  formData: jsonb("form_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
});

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [serviceRequests.tenantId],
    references: [tenants.id],
  }),
  requester: one(users, {
    fields: [serviceRequests.requestedBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [serviceRequests.assignedTo],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [serviceRequests.approvedBy],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [serviceRequests.relatedAsset],
    references: [assets.id],
  }),
  comments: many(comments),
}));

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// ----- Change Requests -----
export const changeRequests = pgTable("change_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  changeType: text("change_type", { enum: ["normal", "standard", "emergency"] }).default("normal").notNull(),
  impact: text("impact", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  risk: text("risk", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  status: text("status", { enum: ["draft", "submitted", "under_review", "approved", "rejected", "scheduled", "implementing", "completed", "failed", "cancelled"] }).default("draft").notNull(),
  requestedBy: integer("requested_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  affectedAssets: jsonb("affected_assets").$type<number[]>(),
  implementationPlan: text("implementation_plan"),
  rollbackPlan: text("rollback_plan"),
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const changeRequestsRelations = relations(changeRequests, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [changeRequests.tenantId],
    references: [tenants.id],
  }),
  requester: one(users, {
    fields: [changeRequests.requestedBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [changeRequests.assignedTo],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [changeRequests.approvedBy],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const insertChangeRequestSchema = createInsertSchema(changeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualStartTime: true,
  actualEndTime: true,
});

// ----- Comments -----
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  incidentId: integer("incident_id").references(() => incidents.id),
  serviceRequestId: integer("service_request_id").references(() => serviceRequests.id),
  changeRequestId: integer("change_request_id").references(() => changeRequests.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [comments.tenantId],
    references: [tenants.id],
  }),
  author: one(users, {
    fields: [comments.createdBy],
    references: [users.id],
  }),
  incident: one(incidents, {
    fields: [comments.incidentId],
    references: [incidents.id],
  }),
  serviceRequest: one(serviceRequests, {
    fields: [comments.serviceRequestId],
    references: [serviceRequests.id],
  }),
  changeRequest: one(changeRequests, {
    fields: [comments.changeRequestId],
    references: [changeRequests.id],
  }),
}));

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ----- Monitoring Alerts -----
export const monitoringAlerts = pgTable("monitoring_alerts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  source: text("source").notNull(),
  status: text("status", { enum: ["active", "acknowledged", "resolved"] }).default("active").notNull(),
  relatedAssetId: integer("related_asset_id").references(() => assets.id),
  relatedIncidentId: integer("related_incident_id").references(() => incidents.id),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
});

export const monitoringAlertsRelations = relations(monitoringAlerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [monitoringAlerts.tenantId],
    references: [tenants.id],
  }),
  relatedAsset: one(assets, {
    fields: [monitoringAlerts.relatedAssetId],
    references: [assets.id],
  }),
  relatedIncident: one(incidents, {
    fields: [monitoringAlerts.relatedIncidentId],
    references: [incidents.id],
  }),
  acknowledger: one(users, {
    fields: [monitoringAlerts.acknowledgedBy],
    references: [users.id],
  }),
}));

export const insertMonitoringAlertSchema = createInsertSchema(monitoringAlerts).omit({
  id: true,
  createdAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
});

// ----- Service Catalog -----
export const serviceCatalog = pgTable("service_catalog", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  slaHours: integer("sla_hours"),
  approvalRequired: boolean("approval_required").default(false).notNull(),
  formTemplate: jsonb("form_template"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceCatalogRelations = relations(serviceCatalog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [serviceCatalog.tenantId],
    references: [tenants.id],
  }),
}));

export const insertServiceCatalogSchema = createInsertSchema(serviceCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ----- Export Types -----
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type MonitoringAlert = typeof monitoringAlerts.$inferSelect;
export type InsertMonitoringAlert = z.infer<typeof insertMonitoringAlertSchema>;

export type ServiceCatalogItem = typeof serviceCatalog.$inferSelect;
export type InsertServiceCatalogItem = z.infer<typeof insertServiceCatalogSchema>;

// ----- Prometheus Instances -----
export const prometheusInstances = pgTable("prometheus_instances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  instanceName: text("instance_name").notNull(),
  environment: text("environment", { enum: ["development", "staging", "production"] }).notNull(),
  organizationName: text("organization_name").notNull(),
  prometheusUrl: text("prometheus_url").notNull(),
  scrapingInterval: integer("scraping_interval").notNull(),
  apiEndpoint: boolean("api_endpoint").default(true).notNull(),
  systemMetrics: boolean("system_metrics").default(true).notNull(),
  applicationMetrics: boolean("application_metrics").default(true).notNull(),
  databaseMetrics: boolean("database_metrics").default(true).notNull(),
  businessMetrics: boolean("business_metrics").default(true).notNull(),
  customMetrics: boolean("custom_metrics").default(false).notNull(),
  alertingMethod: text("alerting_method", { enum: ["email", "slack", "webhook", "none"] }).notNull(),
  contactEmail: text("contact_email"),
  slackWebhook: text("slack_webhook"),
  webhookUrl: text("webhook_url"),
  severity: jsonb("severity").$type<string[]>(),
  instanceType: text("instance_type", { enum: ["prometheus", "node_exporter"] }).default("prometheus").notNull(),
  nodeExporterUrls: jsonb("node_exporter_urls").$type<string[]>().default([]),
  nodeExporterPort: integer("node_exporter_port").default(9100),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prometheusInstancesRelations = relations(prometheusInstances, ({ one }) => ({
  tenant: one(tenants, {
    fields: [prometheusInstances.tenantId],
    references: [tenants.id],
  }),
}));

export const insertPrometheusInstanceSchema = createInsertSchema(prometheusInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PrometheusInstance = typeof prometheusInstances.$inferSelect;
export type InsertPrometheusInstance = z.infer<typeof insertPrometheusInstanceSchema>;
