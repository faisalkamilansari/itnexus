import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { initializeDatabase } from "./init";
import { db } from "./db"; // Import db for Prometheus metrics
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import notificationRoutes from './routes/notification-routes';
import { 
  insertIncidentSchema, 
  insertServiceRequestSchema, 
  insertChangeRequestSchema,
  insertAssetSchema,
  insertServiceCatalogSchema,
  insertMonitoringAlertSchema,
  insertCommentSchema,
  insertPrometheusInstanceSchema,
  prometheusInstances,
  type InsertPrometheusInstance
} from "@shared/schema";
import { z } from "zod";
import * as prometheus from "./metrics";
import { registerNotificationRoutes } from "./services/notification-handler";

// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  console.log("Authentication check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    session: req.session
  });

  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to ensure user has specific role
const ensureRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // @ts-ignore - Accessing user role
    const userRole = req.user?.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
};

// Middleware to ensure tenant access and set req.tenantId
const ensureTenantAccess = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // @ts-ignore - Accessing tenantId from user
  const tenantId = req.user?.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({ message: "Tenant ID not found in user data" });
  }
  
  // Set tenantId for use in route handlers
  // @ts-ignore - Adding tenantId to req
  req.tenantId = tenantId;
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the database with default tenant and admin user
  await initializeDatabase();
  
  // Apply Prometheus request duration middleware
  app.use(prometheus.requestDurationMiddleware);
  
  // Custom Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    // Only allow access from authorized hosts or local network in production
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const clientIP = req.ip || req.socket.remoteAddress || '';
    
    // In development, allow all IPs
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && !allowedIPs.includes(clientIP)) {
      return res.status(403).send('Access forbidden');
    }
    
    // Update tenant-related metrics
    await prometheus.updateTenantMetrics(db);
    
    res.setHeader('Content-Type', prometheus.register.contentType);
    res.send(await prometheus.register.metrics());
  });
  
  // Setup authentication routes
  setupAuth(app);
  
  // Register notification routes
  app.use(notificationRoutes);

  // ----- Debug API -----
  app.get("/api/session-info", (req, res) => {
    try {
      console.log("Authentication check:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        session: req.session,
      });

      // Don't send the full session object in production for security
      const isDev = process.env.NODE_ENV === 'development';
      
      res.json({
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          role: req.user.role,
          tenantId: req.user.tenantId,
          email: req.user.email,
        } : null,
        sessionID: req.sessionID,
        // Only include detailed session info in development
        sessionDetails: isDev ? {
          cookie: req.session.cookie,
          passport: req.session.passport,
        } : null
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to get session info", error: (err as Error).message });
    }
  });

  // ----- Tenant API -----
  app.get("/api/tenant", ensureAuthenticated, async (req, res) => {
    try {
      // Use tenantId from the authenticated user
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      console.log("Fetching tenant data for user:", {
        userId: req.user?.id,
        username: req.user?.username,
        userTenantId: tenantId
      });
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      console.log("Returning tenant data:", tenant);
      res.json(tenant);
    } catch (err) {
      console.error("Error fetching tenant:", err);
      res.status(500).json({ message: "Failed to fetch tenant data", error: (err as Error).message });
    }
  });

  // ----- Incidents API -----
  app.get("/api/incidents", ensureAuthenticated, async (req, res) => {
    try {
      // Use tenantId from the authenticated user
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const incidents = await storage.getIncidents(tenantId);
      res.json(incidents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch incidents", error: (err as Error).message });
    }
  });

  app.get("/api/incidents/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const incident = await storage.getIncident(parseInt(req.params.id), tenantId);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      res.json(incident);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch incident", error: (err as Error).message });
    }
  });

  app.post("/api/incidents", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating incident with auth:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        user: req.user?.id,
      });
      
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId || 1;
      
      console.log("Raw incident data received:", req.body);
      
      // Prepare data with auto-assignment if needed
      const incidentData = { ...req.body };
      
      // Auto-assign to an agent if assignedTo is not provided
      if (!incidentData.assignedTo) {
        try {
          const { autoAssignTicket } = await import('./services/assignment-service');
          const assignedAgentId = await autoAssignTicket(tenantId);
          
          if (assignedAgentId) {
            console.log(`Auto-assigned incident to agent ID: ${assignedAgentId}`);
            incidentData.assignedTo = assignedAgentId;
          }
        } catch (assignErr) {
          console.error("Error during auto-assignment:", assignErr);
          // Continue without auto-assignment if it fails
        }
      }
      
      const validatedData = insertIncidentSchema.parse({
        ...incidentData,
        tenantId,
        // @ts-ignore - Using user ID from session
        reportedBy: req.user.id
      });
      
      console.log("Validated incident data:", validatedData);
      
      const incident = await storage.createIncident(validatedData);
      console.log("Incident created successfully:", incident);
      
      // Send notification emails
      try {
        // Import email-related functions properly
        const [
          { getAssignedUser },
          { getSupportUsers },
          { sendNotificationEmail },
          { generateTicketNotification }
        ] = await Promise.all([
          import('./services/assignment-service'),
          import('./services/email-service'), 
          import('./services/email-service'),
          import('./services/email-service')
        ]);
        
        // Get creating user details
        const createdByUser = req.user;
        
        // Get assigned user details (if any)
        let assignedToUser = null;
        if (incident.assignedTo) {
          assignedToUser = await getAssignedUser(incident.assignedTo);
        }
        
        // Generate notification HTML
        const notificationHtml = await generateTicketNotification({
          ticketType: 'incident',
          ticketId: incident.id,
          title: incident.title,
          description: incident.description,
          status: incident.status,
          priority: incident.severity, // Incidents use severity instead of priority
          createdByUser,
          assignedToUser,
          tenantId
        });
        
        // Send email to assigned user if there is one
        if (assignedToUser && assignedToUser.email) {
          await sendNotificationEmail({
            to: assignedToUser.email,
            subject: `[BuopsoIT] New Incident Assigned: ${incident.title}`,
            html: notificationHtml,
            tenantId,
            notificationType: 'incident'
          });
          console.log(`Notification email sent to assigned user: ${assignedToUser.email}`);
        } else {
          // If no assigned user, send to all support staff
          const supportUsers = await getSupportUsers(tenantId);
          const supportEmails = supportUsers
            .map(user => user.email)
            .filter(Boolean);
            
          if (supportEmails.length > 0) {
            await sendNotificationEmail({
              to: supportEmails.join(','),
              subject: `[BuopsoIT] New Incident Reported: ${incident.title}`,
              html: notificationHtml,
              tenantId,
              notificationType: 'incident'
            });
            console.log(`Notification email sent to support team: ${supportEmails.join(', ')}`);
          }
        }
        
        // Record the incident creation in metrics
        try {
          const { recordIncidentCreation } = await import('./metrics');
          recordIncidentCreation(incident.severity, tenantId);
        } catch (metricsErr) {
          console.error("Error recording incident metrics:", metricsErr);
        }
        
        // Send Slack notification if configured
        try {
          const { isSlackConfigured, sendTicketNotificationToSlack } = await import('./services/slack-service');
          
          if (isSlackConfigured()) {
            const { getTenantName } = await import('./services/email-service');
            const tenantName = await getTenantName(tenantId);
            
            await sendTicketNotificationToSlack({
              ticketType: 'incident',
              ticketId: incident.id,
              title: incident.title,
              description: incident.description,
              status: incident.status,
              priority: incident.severity,
              createdByUsername: createdByUser?.username,
              assignedToUsername: assignedToUser?.username,
              tenantName
            });
            console.log("Slack notification sent for incident creation");
          }
        } catch (slackErr) {
          console.error("Error sending Slack notification:", slackErr);
          // Continue without Slack notification if it fails
        }
      } catch (emailErr) {
        console.error("Error sending notification emails:", emailErr);
        // Continue without sending emails if it fails
      }
      
      res.status(201).json(incident);
    } catch (err) {
      console.error("Incident creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid incident data", 
          errors: err.errors,
          details: JSON.stringify(err.format()) 
        });
      }
      res.status(500).json({ message: "Failed to create incident", error: (err as Error).message });
    }
  });

  app.patch("/api/incidents/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const incidentId = parseInt(req.params.id);
      
      const incident = await storage.getIncident(incidentId, tenantId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      console.log("Updating incident with data:", req.body);
      
      const updatedIncident = await storage.updateIncident(incidentId, req.body);
      
      console.log("Incident updated successfully:", updatedIncident);
      res.json(updatedIncident);
    } catch (err) {
      console.error("Incident update error:", err);
      res.status(500).json({ message: "Failed to update incident", error: (err as Error).message });
    }
  });

  // ----- Service Requests API -----
  app.get("/api/service-requests", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requests = await storage.getServiceRequests(tenantId);
      res.json(requests);
    } catch (err) {
      console.error("Error fetching service requests:", err);
      res.status(500).json({ message: "Failed to fetch service requests", error: (err as Error).message });
    }
  });

  app.get("/api/service-requests/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const request = await storage.getServiceRequest(parseInt(req.params.id), tenantId);
      
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      res.json(request);
    } catch (err) {
      console.error("Error fetching service request:", err);
      res.status(500).json({ message: "Failed to fetch service request", error: (err as Error).message });
    }
  });

  app.post("/api/service-requests", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating service request with auth:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        user: req.user?.id,
      });
      
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId || 1;
      
      // Preprocess form data to ensure it's properly formatted for JSON
      let requestData = { ...req.body };
      
      console.log("Raw service request data received:", requestData);
      
      // Handle formData appropriately - ensure it's a proper object
      if (requestData.formData !== undefined) {
        if (typeof requestData.formData === 'string') {
          try {
            requestData.formData = JSON.parse(requestData.formData);
          } catch (e) {
            console.log("Failed to parse formData string:", e);
            requestData.formData = {}; // Fallback to empty object if parsing fails
          }
        } else if (typeof requestData.formData !== 'object' || requestData.formData === null) {
          requestData.formData = {}; // Convert to empty object if not object/string
        }
      } else {
        requestData.formData = {}; // Ensure formData is at least an empty object
      }
      
      console.log("Service request data after preprocessing:", requestData);
      
      // Convert dueDate from string to Date object if it exists
      if (requestData.dueDate && typeof requestData.dueDate === 'string') {
        try {
          requestData.dueDate = new Date(requestData.dueDate);
          console.log("Converted dueDate to Date object:", requestData.dueDate);
        } catch (e) {
          console.error("Failed to convert dueDate string to Date:", e);
          delete requestData.dueDate; // Remove invalid date
        }
      }

      // Auto-assign to an agent if assignedTo is not provided
      if (!requestData.assignedTo) {
        try {
          const { autoAssignTicket } = await import('./services/assignment-service');
          const assignedAgentId = await autoAssignTicket(tenantId);
          
          if (assignedAgentId) {
            console.log(`Auto-assigned service request to agent ID: ${assignedAgentId}`);
            requestData.assignedTo = assignedAgentId;
          }
        } catch (assignErr) {
          console.error("Error during auto-assignment:", assignErr);
          // Continue without auto-assignment if it fails
        }
      }
      
      const validatedData = insertServiceRequestSchema.parse({
        ...requestData,
        tenantId,
        // @ts-ignore - Using user ID from session
        requestedBy: req.user.id
      });
      
      console.log("Validated service request data:", validatedData);
      
      const request = await storage.createServiceRequest(validatedData);
      console.log("Service request created successfully:", request);
      
      // Send notification emails
      try {
        // Import email-related functions properly
        const [
          { getAssignedUser },
          { getSupportUsers },
          { sendNotificationEmail },
          { generateTicketNotification },
          { getTenantName }
        ] = await Promise.all([
          import('./services/assignment-service'),
          import('./services/email-service'),
          import('./services/email-service'),
          import('./services/email-service'),
          import('./services/email-service')
        ]);
        
        // Get creating user details
        const createdByUser = req.user;
        
        // Get assigned user details (if any)
        let assignedToUser = null;
        if (request.assignedTo) {
          assignedToUser = await getAssignedUser(request.assignedTo);
        }
        
        // Generate notification HTML
        const notificationHtml = await generateTicketNotification({
          ticketType: 'service_request',
          ticketId: request.id,
          title: request.title,
          description: request.description,
          status: request.status,
          priority: request.priority,
          createdByUser,
          assignedToUser,
          tenantId
        });
        
        // Send email to assigned user if there is one
        if (assignedToUser && assignedToUser.email) {
          await sendNotificationEmail({
            to: assignedToUser.email,
            subject: `[BuopsoIT] New Service Request Assigned: ${request.title}`,
            html: notificationHtml,
            tenantId,
            notificationType: 'service_request'
          });
          console.log(`Notification email sent to assigned user: ${assignedToUser.email}`);
        } else {
          // If no assigned user, send to all support staff
          const supportUsers = await getSupportUsers(tenantId);
          const supportEmails = supportUsers
            .map(user => user.email)
            .filter(Boolean);
            
          if (supportEmails.length > 0) {
            await sendNotificationEmail({
              to: supportEmails.join(','),
              subject: `[BuopsoIT] New Service Request: ${request.title}`,
              html: notificationHtml,
              tenantId,
              notificationType: 'service_request'
            });
            console.log(`Notification email sent to support team: ${supportEmails.join(', ')}`);
          }
        }
        
        // Send Slack notification if configured
        try {
          const { isSlackConfigured, sendTicketNotificationToSlack } = await import('./services/slack-service');
          
          if (isSlackConfigured()) {
            const tenantName = await getTenantName(tenantId);
            
            await sendTicketNotificationToSlack({
              ticketType: 'service_request',
              ticketId: request.id,
              title: request.title,
              description: request.description,
              status: request.status,
              priority: request.priority,
              createdByUsername: createdByUser?.username,
              assignedToUsername: assignedToUser?.username,
              tenantName
            });
            console.log("Slack notification sent for service request creation");
          }
        } catch (slackErr) {
          console.error("Error sending Slack notification:", slackErr);
          // Continue without Slack notification if it fails
        }
      } catch (emailErr) {
        console.error("Error sending notification emails:", emailErr);
        // Continue without sending emails if it fails
      }
      
      res.status(201).json(request);
    } catch (err) {
      console.error("Service request creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid service request data", 
          errors: err.errors,
          details: JSON.stringify(err.format())
        });
      }
      res.status(500).json({ message: "Failed to create service request", error: (err as Error).message });
    }
  });

  app.patch("/api/service-requests/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requestId = parseInt(req.params.id);
      
      const request = await storage.getServiceRequest(requestId, tenantId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Preprocess any form data in the update request
      let updateData = { ...req.body };
      
      // Handle formData appropriately if it's being updated
      if (updateData.formData !== undefined) {
        if (typeof updateData.formData === 'string') {
          try {
            updateData.formData = JSON.parse(updateData.formData);
          } catch (e) {
            console.log("Failed to parse formData string in update:", e);
            // Keep the original formData if parsing fails
            delete updateData.formData;
          }
        } else if (typeof updateData.formData !== 'object') {
          // Remove invalid formData from update
          delete updateData.formData;
        }
      }
      
      // Convert dueDate from string to Date object if it exists
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        try {
          updateData.dueDate = new Date(updateData.dueDate);
          console.log("Converted dueDate to Date object in update:", updateData.dueDate);
        } catch (e) {
          console.error("Failed to convert dueDate string to Date in update:", e);
          delete updateData.dueDate; // Remove invalid date
        }
      }
      
      console.log("Service request update data:", updateData);
      
      const updatedRequest = await storage.updateServiceRequest(requestId, updateData);
      console.log("Service request updated successfully:", updatedRequest);
      res.json(updatedRequest);
    } catch (err) {
      console.error("Service request update error:", err);
      res.status(500).json({ message: "Failed to update service request", error: (err as Error).message });
    }
  });

  // ----- Change Requests API -----
  app.get("/api/change-requests", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requests = await storage.getChangeRequests(tenantId);
      res.json(requests);
    } catch (err) {
      console.error("Error fetching change requests:", err);
      res.status(500).json({ message: "Failed to fetch change requests", error: (err as Error).message });
    }
  });

  app.get("/api/change-requests/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const request = await storage.getChangeRequest(parseInt(req.params.id), tenantId);
      
      if (!request) {
        return res.status(404).json({ message: "Change request not found" });
      }
      
      res.json(request);
    } catch (err) {
      console.error("Error fetching change request:", err);
      res.status(500).json({ message: "Failed to fetch change request", error: (err as Error).message });
    }
  });

  app.post("/api/change-requests", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating change request with auth:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        user: req.user?.id,
      });
      
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId || 1;
      
      console.log("Raw change request data received:", req.body);
      
      // Pre-process date fields
      const processedData = {
        ...req.body,
        tenantId,
        // @ts-ignore - Using user ID from session
        requestedBy: req.user.id
      };
      
      // Auto-assign to an agent if assignedTo is not provided
      if (!processedData.assignedTo) {
        try {
          const { autoAssignTicket } = await import('./services/assignment-service');
          const assignedAgentId = await autoAssignTicket(tenantId);
          
          if (assignedAgentId) {
            console.log(`Auto-assigned change request to agent ID: ${assignedAgentId}`);
            processedData.assignedTo = assignedAgentId;
          }
        } catch (assignErr) {
          console.error("Error during auto-assignment:", assignErr);
          // Continue without auto-assignment if it fails
        }
      }
      
      // Convert string dates to actual Date objects
      if (processedData.scheduledStartTime && typeof processedData.scheduledStartTime === 'string') {
        processedData.scheduledStartTime = new Date(processedData.scheduledStartTime);
      }
      
      if (processedData.scheduledEndTime && typeof processedData.scheduledEndTime === 'string') {
        processedData.scheduledEndTime = new Date(processedData.scheduledEndTime);
      }
      
      console.log("Processed data before validation:", processedData);
      
      const validatedData = insertChangeRequestSchema.parse(processedData);
      
      console.log("Validated change request data:", validatedData);
      
      const request = await storage.createChangeRequest(validatedData);
      console.log("Change request created successfully:", request);
      
      // Send notification emails
      try {
        // Import email-related functions properly
        const [
          { getAssignedUser },
          { getSupportUsers },
          { sendNotificationEmail },
          { generateTicketNotification },
          { getTenantName }
        ] = await Promise.all([
          import('./services/assignment-service'),
          import('./services/email-service'),
          import('./services/email-service'),
          import('./services/email-service'),
          import('./services/email-service')
        ]);
        
        // Get creating user details
        const createdByUser = req.user;
        
        // Get assigned user details (if any)
        let assignedToUser = null;
        if (request.assignedTo) {
          assignedToUser = await getAssignedUser(request.assignedTo);
        }
        
        // Generate notification HTML
        const notificationHtml = await generateTicketNotification({
          ticketType: 'change_request',
          ticketId: request.id,
          title: request.title,
          description: request.description,
          status: request.status,
          priority: request.changeType || 'normal', // Use changeType as priority if available
          createdByUser,
          assignedToUser,
          tenantId
        });
        
        // Send email to assigned user if there is one
        if (assignedToUser && assignedToUser.email) {
          await sendNotificationEmail({
            to: assignedToUser.email,
            subject: `[BuopsoIT] New Change Request Assigned: ${request.title}`,
            html: notificationHtml,
            tenantId,
            notificationType: 'change_request'
          });
          console.log(`Notification email sent to assigned user: ${assignedToUser.email}`);
        } else {
          // If no assigned user, send to all support staff
          const supportUsers = await getSupportUsers(tenantId);
          const supportEmails = supportUsers
            .map(user => user.email)
            .filter(Boolean);
            
          if (supportEmails.length > 0) {
            await sendNotificationEmail({
              to: supportEmails.join(','),
              subject: `[BuopsoIT] New Change Request: ${request.title}`,
              html: notificationHtml,
              tenantId,
              notificationType: 'change_request'
            });
            console.log(`Notification email sent to support team: ${supportEmails.join(', ')}`);
          }
        }
        
        // Send Slack notification if configured
        try {
          const { isSlackConfigured, sendTicketNotificationToSlack } = await import('./services/slack-service');
          
          if (isSlackConfigured()) {
            const tenantName = await getTenantName(tenantId);
            
            await sendTicketNotificationToSlack({
              ticketType: 'change_request',
              ticketId: request.id,
              title: request.title,
              description: request.description,
              status: request.status,
              priority: request.changeType || 'normal', // Use changeType as priority if available
              createdByUsername: createdByUser?.username,
              assignedToUsername: assignedToUser?.username,
              tenantName
            });
            console.log("Slack notification sent for change request creation");
          }
        } catch (slackErr) {
          console.error("Error sending Slack notification:", slackErr);
          // Continue without Slack notification if it fails
        }
      } catch (emailErr) {
        console.error("Error sending notification emails:", emailErr);
        // Continue without sending emails if it fails
      }
      
      res.status(201).json(request);
    } catch (err) {
      console.error("Change request creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid change request data", 
          errors: err.errors,
          details: JSON.stringify(err.format())
        });
      }
      res.status(500).json({ message: "Failed to create change request", error: (err as Error).message });
    }
  });

  app.patch("/api/change-requests/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requestId = parseInt(req.params.id);
      
      const request = await storage.getChangeRequest(requestId, tenantId);
      if (!request) {
        return res.status(404).json({ message: "Change request not found" });
      }
      
      console.log("Change request update data:", req.body);
      
      // Pre-process date fields in the update data
      const updateData = { ...req.body };
      
      // Convert string dates to actual Date objects
      if (updateData.scheduledStartTime && typeof updateData.scheduledStartTime === 'string') {
        updateData.scheduledStartTime = new Date(updateData.scheduledStartTime);
      }
      
      if (updateData.scheduledEndTime && typeof updateData.scheduledEndTime === 'string') {
        updateData.scheduledEndTime = new Date(updateData.scheduledEndTime);
      }
      
      // Same for actual times
      if (updateData.actualStartTime && typeof updateData.actualStartTime === 'string') {
        updateData.actualStartTime = new Date(updateData.actualStartTime);
      }
      
      if (updateData.actualEndTime && typeof updateData.actualEndTime === 'string') {
        updateData.actualEndTime = new Date(updateData.actualEndTime);
      }
      
      console.log("Processed update data:", updateData);
      
      const updatedRequest = await storage.updateChangeRequest(requestId, updateData);
      console.log("Change request updated successfully:", updatedRequest);
      res.json(updatedRequest);
    } catch (err) {
      console.error("Change request update error:", err);
      res.status(500).json({ message: "Failed to update change request", error: (err as Error).message });
    }
  });

  // ----- Assets API -----
  app.get("/api/assets", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const assets = await storage.getAssets(tenantId);
      res.json(assets);
    } catch (err) {
      console.error("Error fetching assets:", err);
      res.status(500).json({ message: "Failed to fetch assets", error: (err as Error).message });
    }
  });

  app.get("/api/assets/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const asset = await storage.getAsset(parseInt(req.params.id), tenantId);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json(asset);
    } catch (err) {
      console.error("Error fetching asset:", err);
      res.status(500).json({ message: "Failed to fetch asset", error: (err as Error).message });
    }
  });

  app.post("/api/assets", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating asset with auth:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        user: req.user?.id,
        body: req.body
      });

      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user session data" });
      }
      
      // Log the raw data received
      console.log("Raw asset data received:", req.body);
      
      // Pre-process data to handle date correctly
      let assetData = {
        ...req.body,
        tenantId // Always use the tenantId from the authenticated user's session
      };
      
      // Handle date conversion properly
      if (assetData.purchaseDate) {
        try {
          // Try to convert if it's a date string
          if (typeof assetData.purchaseDate === 'string') {
            if (assetData.purchaseDate.trim() === '') {
              assetData.purchaseDate = null;
            } else {
              // Create a new Date object from the ISO string
              const date = new Date(assetData.purchaseDate);
              
              // Verify date is valid
              if (isNaN(date.getTime())) {
                console.error("Invalid date format received:", assetData.purchaseDate);
                assetData.purchaseDate = null;
              } else {
                // Valid date, keep it
                assetData.purchaseDate = date;
                console.log("Valid purchase date converted:", date);
              }
            }
          }
        } catch (e) {
          console.error("Error converting purchase date:", e);
          assetData.purchaseDate = null;
        }
      }
      
      console.log("Asset data after date processing:", {
        ...assetData,
        purchaseDate: assetData.purchaseDate ? assetData.purchaseDate.toISOString() : null
      });

      console.log("Processed asset data before validation:", assetData);
      
      try {
        // Exclude fields that are not in the schema
        const { id, createdAt, updatedAt, ...restData } = assetData;
        
        const validatedData = insertAssetSchema.parse(restData);
        
        // Log the validated data
        console.log("Validated asset data:", validatedData);
        
        const asset = await storage.createAsset(validatedData);
        console.log("Asset created successfully:", asset);
        res.status(201).json(asset);
      } catch (validationError) {
        console.error("Schema validation error:", validationError);
        return res.status(400).json({ 
          message: "Invalid asset data", 
          errors: validationError instanceof z.ZodError ? validationError.errors : [{ message: "Validation failed" }]
        });
      }
    } catch (err) {
      console.error("Asset creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid asset data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create asset", error: (err as Error).message });
    }
  });

  app.patch("/api/assets/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const assetId = parseInt(req.params.id);
      
      const asset = await storage.getAsset(assetId, tenantId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      console.log("Asset update data:", req.body);
      
      // Pre-process data like dates if needed
      let updateData = { ...req.body };
      
      // Convert purchaseDate if it's being updated
      if (updateData.purchaseDate && typeof updateData.purchaseDate === 'string') {
        try {
          updateData.purchaseDate = new Date(updateData.purchaseDate);
        } catch (e) {
          console.error("Error converting purchase date in update:", e);
          delete updateData.purchaseDate;
        }
      }
      
      const updatedAsset = await storage.updateAsset(assetId, updateData);
      console.log("Asset updated successfully:", updatedAsset);
      res.json(updatedAsset);
    } catch (err) {
      console.error("Asset update error:", err);
      res.status(500).json({ message: "Failed to update asset", error: (err as Error).message });
    }
  });

  // ----- Monitoring Alerts API -----
  app.get("/api/monitoring-alerts", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const alerts = await storage.getMonitoringAlerts(tenantId);
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch alerts", error: (err as Error).message });
    }
  });

  app.post("/api/monitoring-alerts", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const validatedData = insertMonitoringAlertSchema.parse({
        ...req.body,
        tenantId
      });
      
      const alert = await storage.createMonitoringAlert(validatedData);
      
      // Auto-create incident if severity is critical
      if (alert.severity === "critical") {
        await storage.createIncident({
          tenantId,
          title: `Alert: ${alert.title}`,
          description: alert.description,
          severity: "high",
          status: "new",
          // @ts-ignore - Using authenticated user
          reportedBy: req.user?.id,
          affectedAsset: alert.relatedAssetId
        });
      }
      
      // Send email notification for the alert
      try {
        const { sendNotificationEmail, getSupportUsers, getAdminUsers } = await import('./services/email-service');
        
        // Determine recipient emails - for monitoring alerts, notify both admins and support
        const adminUsers = await getAdminUsers(tenantId);
        const supportUsers = await getSupportUsers(tenantId);
        
        // Combine recipient lists, removing duplicates
        const allUsers = [...adminUsers, ...supportUsers];
        const uniqueEmails = [...new Set(allUsers.map(user => user.email).filter(Boolean))];
        
        if (uniqueEmails.length > 0) {
          // Create HTML content for the alert notification
          const alertHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${alert.severity === 'critical' ? '#d9534f' : 
                           alert.severity === 'warning' ? '#f0ad4e' : '#5bc0de'}">
                ${alert.severity.toUpperCase()} Alert: ${alert.title}
              </h2>
              <p><strong>Source:</strong> ${alert.source}</p>
              <p><strong>Description:</strong> ${alert.description}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              ${alert.metrics ? `<p><strong>Metrics:</strong> ${JSON.stringify(alert.metrics)}</p>` : ''}
              <hr>
              <p>Please login to the BuopsoIT portal to acknowledge or resolve this alert.</p>
            </div>
          `;
          
          await sendNotificationEmail({
            to: uniqueEmails.join(','),
            subject: `[BuopsoIT] ${alert.severity.toUpperCase()} Monitoring Alert: ${alert.title}`,
            html: alertHtml,
            tenantId,
            notificationType: 'monitoring'
          });
          
          console.log(`Monitoring alert notification sent to ${uniqueEmails.length} recipients`);
        }
      } catch (notifyErr) {
        console.error("Error sending alert notification:", notifyErr);
        // Continue even if notification fails
      }
      
      res.status(201).json(alert);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid alert data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create alert", error: (err as Error).message });
    }
  });

  app.patch("/api/monitoring-alerts/:id/acknowledge", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      const alertId = parseInt(req.params.id);
      
      const alert = await storage.getMonitoringAlert(alertId, tenantId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      const updatedAlert = await storage.updateMonitoringAlert(alertId, {
        status: "acknowledged",
        // @ts-ignore - Using authenticated user
        acknowledgedBy: req.user?.id,
        acknowledgedAt: new Date()
      });
      
      // Send system notification about the acknowledged alert
      try {
        const { sendNotificationEmail, getAdminUsers } = await import('./services/email-service');
        
        // For acknowledgements, only notify admin users
        const adminUsers = await getAdminUsers(tenantId);
        const adminEmails = adminUsers.map(user => user.email).filter(Boolean);
        
        if (adminEmails.length > 0) {
          // Get acknowledger username
          const acknowledgerUsername = req.user?.username || 'Unknown User';
          
          // Create HTML content for acknowledgement notification
          const ackHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #5bc0de;">
                Alert Acknowledged: ${alert.title}
              </h2>
              <p><strong>Original Alert:</strong> ${alert.severity.toUpperCase()} from ${alert.source}</p>
              <p><strong>Description:</strong> ${alert.description}</p>
              <p><strong>Acknowledged By:</strong> ${acknowledgerUsername}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p>The alert has been acknowledged and is being addressed by the team.</p>
            </div>
          `;
          
          await sendNotificationEmail({
            to: adminEmails.join(','),
            subject: `[BuopsoIT] Alert Acknowledged: ${alert.title}`,
            html: ackHtml,
            tenantId,
            notificationType: 'monitoring'
          });
          
          console.log(`Alert acknowledgement notification sent to ${adminEmails.length} admin users`);
        }
      } catch (notifyErr) {
        console.error("Error sending alert acknowledgement notification:", notifyErr);
        // Continue even if notification fails
      }
      
      res.json(updatedAlert);
    } catch (err) {
      res.status(500).json({ message: "Failed to acknowledge alert", error: (err as Error).message });
    }
  });

  app.patch("/api/monitoring-alerts/:id/resolve", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      const alertId = parseInt(req.params.id);
      
      const alert = await storage.getMonitoringAlert(alertId, tenantId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      const updatedAlert = await storage.updateMonitoringAlert(alertId, {
        status: "resolved",
        resolvedAt: new Date()
      });
      
      // Send system notification about the resolved alert
      try {
        const { sendNotificationEmail, getAdminUsers, getSupportUsers } = await import('./services/email-service');
        
        // For resolutions, notify both admin and support users
        const adminUsers = await getAdminUsers(tenantId);
        const supportUsers = await getSupportUsers(tenantId);
        
        // Combine recipient lists, removing duplicates
        const allUsers = [...adminUsers, ...supportUsers];
        const uniqueEmails = [...new Set(allUsers.map(user => user.email).filter(Boolean))];
        
        if (uniqueEmails.length > 0) {
          // Get resolver username
          const resolverUsername = req.user?.username || 'Unknown User';
          
          // Create HTML content for resolution notification
          const resolveHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #5cb85c;">
                Alert Resolved: ${alert.title}
              </h2>
              <p><strong>Original Alert:</strong> ${alert.severity.toUpperCase()} from ${alert.source}</p>
              <p><strong>Description:</strong> ${alert.description}</p>
              <p><strong>Resolved By:</strong> ${resolverUsername}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p>The alert has been resolved. No further action is needed.</p>
            </div>
          `;
          
          await sendNotificationEmail({
            to: uniqueEmails.join(','),
            subject: `[BuopsoIT] Alert Resolved: ${alert.title}`,
            html: resolveHtml,
            tenantId,
            notificationType: 'monitoring'
          });
          
          console.log(`Alert resolution notification sent to ${uniqueEmails.length} users`);
        }
      } catch (notifyErr) {
        console.error("Error sending alert resolution notification:", notifyErr);
        // Continue even if notification fails
      }
      
      res.json(updatedAlert);
    } catch (err) {
      res.status(500).json({ message: "Failed to resolve alert", error: (err as Error).message });
    }
  });

  // ----- Service Catalog API -----
  app.get("/api/service-catalog", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const catalog = await storage.getServiceCatalog(tenantId);
      res.json(catalog);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service catalog", error: (err as Error).message });
    }
  });

  app.post("/api/service-catalog", ensureRole(["admin"]), async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      const validatedData = insertServiceCatalogSchema.parse({
        ...req.body,
        tenantId
      });
      
      const item = await storage.createServiceCatalogItem(validatedData);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid service catalog data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create service catalog item", error: (err as Error).message });
    }
  });

  // ----- Comments API -----
  app.post("/api/comments", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        tenantId,
        // @ts-ignore - Using authenticated user
        createdBy: req.user?.id
      });
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create comment", error: (err as Error).message });
    }
  });

  app.get("/api/incidents/:id/comments", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const incidentId = parseInt(req.params.id);
      
      const comments = await storage.getCommentsForIncident(incidentId, tenantId);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch comments", error: (err as Error).message });
    }
  });

  app.get("/api/service-requests/:id/comments", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requestId = parseInt(req.params.id);
      
      const comments = await storage.getCommentsForServiceRequest(requestId, tenantId);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch comments", error: (err as Error).message });
    }
  });

  app.get("/api/change-requests/:id/comments", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const requestId = parseInt(req.params.id);
      
      const comments = await storage.getCommentsForChangeRequest(requestId, tenantId);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch comments", error: (err as Error).message });
    }
  });

  // ----- Prometheus Metrics API -----
  app.get("/api/prometheus-metrics", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      // Update tenant-related metrics with tenant ID if available
      if (tenantId) {
        await prometheus.updateTenantMetrics(db, tenantId);
      } else {
        await prometheus.updateTenantMetrics(db);
      }
      
      // Get the raw Prometheus metrics
      const metrics = await prometheus.register.metrics();
      
      res.setHeader('Content-Type', prometheus.register.contentType);
      res.send(metrics);
    } catch (err) {
      prometheus.errorsTotal.inc({ error_type: 'metrics_api_error' });
      res.status(500).json({ message: "Failed to fetch Prometheus metrics", error: (err as Error).message });
    }
  });
  
  // ----- Prometheus Instance Management -----
  app.post("/api/monitoring/setup", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant ID available" });
      }
      
      // Transform the request data to match our schema
      const formData = req.body;
      
      // Detect if this is a Node Exporter configuration
      const isNodeExporter = formData.endpoints && 
                           formData.endpoints.enableNodeExporter === true && 
                           Array.isArray(formData.endpoints.nodeExporterUrls) && 
                           formData.endpoints.nodeExporterUrls.length > 0;
      
      console.log("Setup request type:", isNodeExporter ? "Node Exporter" : "Prometheus");
      
      // Create the instance data object
      const instanceData = {
        tenantId,
        // Prefix Node Exporter instances to distinguish them in the list
        instanceName: isNodeExporter 
          ? `[Node Exporter] ${formData.basicInfo.instanceName}`
          : formData.basicInfo.instanceName,
        environment: formData.basicInfo.environment,
        organizationName: formData.basicInfo.organizationName,
        // For Node Exporter, add a marker in the URL to identify it
        prometheusUrl: isNodeExporter 
          ? `nodeexporter://${formData.endpoints.nodeExporterUrls[0]}`
          : formData.endpoints.prometheusUrl,
        scrapingInterval: formData.endpoints.scrapingInterval,
        apiEndpoint: formData.endpoints.apiEndpoint,
        // For Node Exporter, only system metrics are relevant
        systemMetrics: true,
        applicationMetrics: isNodeExporter ? false : formData.metrics?.applicationMetrics ?? true,
        databaseMetrics: isNodeExporter ? false : formData.metrics?.databaseMetrics ?? true,
        businessMetrics: isNodeExporter ? false : formData.metrics?.businessMetrics ?? true,
        customMetrics: isNodeExporter ? false : formData.metrics?.customMetrics ?? false,
        alertingMethod: formData.notifications?.alertingMethod || "none",
        contactEmail: formData.notifications?.contactEmail || null,
        slackWebhook: formData.notifications?.slackWebhook || null,
        webhookUrl: formData.notifications?.webhookUrl || null,
        severity: JSON.stringify(formData.notifications?.severity || []),
        isActive: true,
      };
      
      // Store Node Exporter specific information in a JSON column
      let additionalConfig = {};
      
      if (isNodeExporter) {
        additionalConfig = {
          nodeExporterUrls: formData.endpoints.nodeExporterUrls.filter(Boolean),
          nodeExporterPort: formData.endpoints.nodeExporterPort || 9100,
          isNodeExporter: true
        };
      }
      
      // Validate with schema
      const validatedData = insertPrometheusInstanceSchema.parse(instanceData);
      
      // Insert into the database using SQL query with named parameters
      const result = await db.execute(sql`
        INSERT INTO prometheus_instances (
          tenant_id, instance_name, environment, organization_name, prometheus_url, 
          scraping_interval, api_endpoint, system_metrics, application_metrics, 
          database_metrics, business_metrics, custom_metrics, alerting_method, 
          contact_email, slack_webhook, webhook_url, severity, is_active
        ) 
        VALUES (
          ${validatedData.tenantId},
          ${validatedData.instanceName},
          ${validatedData.environment},
          ${validatedData.organizationName},
          ${validatedData.prometheusUrl},
          ${validatedData.scrapingInterval},
          ${validatedData.apiEndpoint},
          ${validatedData.systemMetrics},
          ${validatedData.applicationMetrics},
          ${validatedData.databaseMetrics},
          ${validatedData.businessMetrics},
          ${validatedData.customMetrics},
          ${validatedData.alertingMethod},
          ${validatedData.contactEmail},
          ${validatedData.slackWebhook},
          ${validatedData.webhookUrl},
          ${validatedData.severity},
          ${validatedData.isActive}
        ) 
        RETURNING *
      `);
      
      // Extract rows from the result to ensure consistent formatting across environments
      const instances = Array.isArray(result) ? result : 
                       (result && typeof result === 'object' && 'rows' in result) ? result.rows : [];
      
      const instance = instances.length > 0 ? instances[0] : null;
      
      if (instance) {
        // Save the additional Node Exporter configuration - this only affects responses not database
        instance.additionalConfig = additionalConfig;
        instance.isNodeExporter = isNodeExporter;
      }
      
      console.log(`Created ${isNodeExporter ? 'Node Exporter' : 'Prometheus'} instance:`, {
        resultType: typeof result,
        hasRows: result && typeof result === 'object' && 'rows' in result
      });
      
      prometheus.errorsTotal.inc({ 
        error_type: isNodeExporter ? 'node_exporter_setup_success' : 'prometheus_setup_success' 
      });
      
      res.status(201).json(instance);
    } catch (err) {
      console.error("Error setting up monitoring instance:", err);
      prometheus.errorsTotal.inc({ error_type: 'monitoring_setup_error' });
      res.status(500).json({ message: "Failed to set up monitoring instance", error: (err as Error).message });
    }
  });
  
  app.get("/api/monitoring/instances", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const result = await db.execute(sql`
        SELECT * FROM prometheus_instances 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);
      
      // Extract rows from the result to ensure consistent formatting across environments
      const instances = Array.isArray(result) ? result : 
                       (result && typeof result === 'object' && 'rows' in result) ? result.rows : [];
      
      // Process instances to identify Node Exporter vs Prometheus
      const processedInstances = instances.map(instance => {
        // Check if instance is a Node Exporter by URL pattern or name
        const isNodeExporter = 
          (instance.prometheus_url && instance.prometheus_url.startsWith('nodeexporter://')) ||
          (instance.instance_name && instance.instance_name.startsWith('[Node Exporter]'));
        
        // Extract Node Exporter URLs if present
        let nodeExporterUrls = [];
        if (isNodeExporter && instance.prometheus_url) {
          const url = instance.prometheus_url.replace('nodeexporter://', '');
          nodeExporterUrls = [url];
        }

        // Add properties to help client-side differentiate instance types
        return {
          ...instance,
          isNodeExporter,
          additionalConfig: isNodeExporter ? {
            nodeExporterUrls,
            nodeExporterPort: 9100, // Default to standard Node Exporter port
            isNodeExporter: true
          } : undefined
        };
      });
      
      console.log("Monitoring instances query result:", {
        resultType: typeof result,
        hasRows: result && typeof result === 'object' && 'rows' in result,
        instancesCount: instances.length,
        nodeExporterCount: processedInstances.filter(i => i.isNodeExporter).length,
        prometheusCount: processedInstances.filter(i => !i.isNodeExporter).length
      });
      
      res.json(processedInstances);
    } catch (err) {
      console.error("Error getting monitoring instances:", err);
      res.status(500).json({ message: "Failed to get monitoring instances", error: (err as Error).message });
    }
  });
  
  app.get("/api/monitoring/instances/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      const result = await db.execute(sql`
        SELECT * FROM prometheus_instances 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);
      
      // Extract rows from the result to ensure consistent formatting across environments
      const instances = Array.isArray(result) ? result : 
                       (result && typeof result === 'object' && 'rows' in result) ? result.rows : [];
      
      let instance = instances.length > 0 ? instances[0] : null;
      
      if (!instance) {
        return res.status(404).json({ message: "Monitoring instance not found" });
      }
      
      // Check if instance is a Node Exporter by URL pattern or name
      const isNodeExporter = 
        (instance.prometheus_url && instance.prometheus_url.startsWith('nodeexporter://')) ||
        (instance.instance_name && instance.instance_name.startsWith('[Node Exporter]'));
      
      // Extract Node Exporter URLs if present
      let nodeExporterUrls = [];
      if (isNodeExporter && instance.prometheus_url) {
        const url = instance.prometheus_url.replace('nodeexporter://', '');
        nodeExporterUrls = [url];
      }

      // Add properties to help client-side differentiate instance types
      instance = {
        ...instance,
        isNodeExporter,
        additionalConfig: isNodeExporter ? {
          nodeExporterUrls,
          nodeExporterPort: 9100, // Default to standard Node Exporter port
          isNodeExporter: true
        } : undefined
      };
      
      res.json(instance);
    } catch (err) {
      console.error("Error getting monitoring instance:", err);
      res.status(500).json({ message: "Failed to get monitoring instance", error: (err as Error).message });
    }
  });

  // ----- Session Info API for asset form validation -----
  app.get("/api/session-info", (req, res) => {
    console.log("Session info requested", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionId: req.sessionID
    });

    if (req.isAuthenticated()) {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        console.error("No tenant ID found in authenticated user data");
      }
      
      // Set tenantId in a consistent location
      // @ts-ignore - Adding tenantId to req
      req.tenantId = tenantId;
      
      // Include complete non-sensitive user information
      const user = req.user ? {
        // @ts-ignore - User properties access
        id: req.user.id,
        // @ts-ignore - User properties access
        tenantId: req.user.tenantId,
        // @ts-ignore - User properties access
        username: req.user.username,
        // @ts-ignore - User properties access
        email: req.user.email,
        // @ts-ignore - User properties access
        firstName: req.user.firstName,
        // @ts-ignore - User properties access
        lastName: req.user.lastName,
        // @ts-ignore - User properties access
        role: req.user.role,
        // @ts-ignore - User properties access
        createdAt: req.user.createdAt
      } : null;
      
      res.json({
        isAuthenticated: true,
        hasUser: !!req.user,
        user
      });
    } else {
      res.json({
        isAuthenticated: false,
        hasUser: false,
        user: null
      });
    }
  });

  // ----- Dashboard API -----
  app.get("/api/dashboard", ensureAuthenticated, async (req, res) => {
    try {
      // Get tenantId from user instead of middleware
      // @ts-ignore - Accessing tenantId from user
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found in user data" });
      }
      
      console.log("Fetching dashboard data for tenant:", tenantId);
      
      // Get latest incidents, service requests, and alerts
      const [incidents, serviceRequests, changeRequests, alerts] = await Promise.all([
        storage.getIncidents(tenantId),
        storage.getServiceRequests(tenantId),
        storage.getChangeRequests(tenantId),
        storage.getMonitoringAlerts(tenantId)
      ]);
      
      console.log("Dashboard data counts:", {
        incidents: incidents.length,
        serviceRequests: serviceRequests.length,
        changeRequests: changeRequests.length,
        alerts: alerts.length
      });
      
      // Get counts by status
      const openIncidents = incidents.filter(i => i.status !== "resolved" && i.status !== "closed").length;
      const openServiceRequests = serviceRequests.filter(r => !["completed", "cancelled", "rejected"].includes(r.status)).length;
      const slaBreaches = incidents.filter(i => i.slaBreached).length;
      
      // System health mock data
      // In a real application, this would come from a monitoring system
      const systemHealth = {
        cpu: Math.round(Math.random() * 50) + 20, // 20-70%
        memory: Math.round(Math.random() * 40) + 30, // 30-70%
        disk: Math.round(Math.random() * 30) + 50, // 50-80%
        network: Math.round(Math.random() * 30) + 10, // 10-40%
        services: [
          { name: "Web Servers", status: "operational" },
          { name: "Database Cluster", status: "operational" },
          { name: "Email Services", status: Math.random() > 0.7 ? "degraded" : "operational" },
          { name: "API Gateway", status: "operational" }
        ]
      };
      
      // Calculate SLA compliance percentage
      const totalIncidents = incidents.length || 1; // Avoid division by zero
      const slaCompliance = Math.round(((totalIncidents - slaBreaches) / totalIncidents) * 100);
      
      // Get recent items limited to 10 for timeline view
      const recentIncidents = incidents
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
        
      const recentServiceRequests = serviceRequests
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
        
      const recentChangeRequests = changeRequests
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
        
      const recentAlerts = alerts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      const responseData = {
        metrics: {
          openIncidents,
          openServiceRequests,
          slaCompliance,
          systemHealth: Math.round((100 - systemHealth.cpu / 3 - systemHealth.memory / 3 - systemHealth.disk / 3))
        },
        recentIncidents,
        recentServiceRequests,
        recentChangeRequests,
        recentAlerts,
        systemHealth
      };
      
      res.json(responseData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      res.status(500).json({ message: "Failed to fetch dashboard data", error: (err as Error).message });
    }
  });

  // Register notification routes for email and Slack integrations
  registerNotificationRoutes(app);
  
  const httpServer = createServer(app);
  return httpServer;
}
