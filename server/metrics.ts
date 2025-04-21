import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create a Registry to register metrics
export const register = new Registry();
collectDefaultMetrics({ register });

// Create application-specific metrics

// API request counters
export const httpRequestsTotal = new Counter({
  name: 'buopsoit_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  registers: [register],
});

// Latency histogram
export const httpRequestDurationSeconds = new Histogram({
  name: 'buopsoit_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'tenant_id'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Active sessions gauge
export const activeSessions = new Gauge({
  name: 'buopsoit_active_sessions',
  help: 'Number of active user sessions',
  labelNames: ['tenant_id'],
  registers: [register],
});

// Incident metrics
export const incidentsCreatedTotal = new Counter({
  name: 'buopsoit_incidents_created_total',
  help: 'Total number of incidents created',
  labelNames: ['priority', 'status', 'tenant_id'],
  registers: [register],
});

export const incidentsResolutionTimeSeconds = new Histogram({
  name: 'buopsoit_incidents_resolution_time_seconds',
  help: 'Time taken to resolve incidents in seconds',
  labelNames: ['priority', 'tenant_id'],
  buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 5m, 15m, 30m, 1h, 2h, 4h, 8h, 24h
  registers: [register],
});

// Service request metrics
export const serviceRequestsCreatedTotal = new Counter({
  name: 'buopsoit_service_requests_created_total',
  help: 'Total number of service requests created',
  labelNames: ['priority', 'status', 'tenant_id'],
  registers: [register],
});

export const serviceRequestsResolutionTimeSeconds = new Histogram({
  name: 'buopsoit_service_requests_resolution_time_seconds',
  help: 'Time taken to fulfill service requests in seconds',
  labelNames: ['priority', 'tenant_id'],
  buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 5m, 15m, 30m, 1h, 2h, 4h, 8h, 24h
  registers: [register],
});

// Change request metrics
export const changeRequestsCreatedTotal = new Counter({
  name: 'buopsoit_change_requests_created_total',
  help: 'Total number of change requests created',
  labelNames: ['priority', 'status', 'tenant_id'],
  registers: [register],
});

// Database query timing
export const dbQueryDurationSeconds = new Histogram({
  name: 'buopsoit_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'tenant_id'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Error counter
export const errorsTotal = new Counter({
  name: 'buopsoit_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'tenant_id'],
  registers: [register],
});

// System resource metrics (can be extended)
export const memoryUsageBytes = new Gauge({
  name: 'buopsoit_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  registers: [register],
});

// Update memory usage every 15 seconds
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  memoryUsageBytes.set(memoryUsage.heapUsed);
}, 15000);

// Tenant-specific metrics
export const tenantsTotal = new Gauge({
  name: 'buopsoit_tenants_total',
  help: 'Total number of tenants in the system',
  registers: [register],
});

export const usersTotal = new Gauge({
  name: 'buopsoit_users_total',
  help: 'Total number of users in the system',
  labelNames: ['tenant_id', 'role'],
  registers: [register],
});

// Middleware to track HTTP request duration
export const requestDurationMiddleware = (req: any, res: any, next: any) => {
  const start = process.hrtime();
  const tenantId = req.user?.tenantId || 'anonymous';
  
  // Record request
  const method = req.method;
  const route = req.originalUrl || req.url;
  
  // Track response
  const end = res.end;
  res.end = function (chunk: any, encoding: any) {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9; // in seconds
    
    // Record metrics
    httpRequestsTotal.inc({
      method, 
      route, 
      status_code: res.statusCode,
      tenant_id: tenantId
    });
    
    httpRequestDurationSeconds.observe(
      { method, route, tenant_id: tenantId },
      duration
    );
    
    res.end = end;
    return res.end(chunk, encoding);
  };
  
  next();
};

// Function to update tenant metrics (to be called periodically)
export async function updateTenantMetrics(db: any, specificTenantId?: number) {
  try {
    // First check if the tables exist
    const tableExists = async (tableName: string) => {
      try {
        await db.select().from(tableName).limit(1);
        return true;
      } catch (error) {
        return false;
      }
    };

    const tenantsExist = await tableExists('tenants');
    const usersExist = await tableExists('users');

    // Count total tenants if table exists
    if (tenantsExist) {
      const tenants = await db.select({ count: db.fn.count() }).from('tenants');
      if (tenants && tenants[0] && tenants[0].count !== undefined) {
        const tenantCount = parseInt(tenants[0].count, 10);
        tenantsTotal.set(tenantCount);
      } else {
        tenantsTotal.set(0);
      }
    } else {
      tenantsTotal.set(0);
    }
    
    // Count users by tenant and role if table exists
    if (usersExist) {
      let query = db
        .select({
          tenantId: 'tenantId',
          role: 'role',
          count: db.fn.count()
        })
        .from('users');
      
      // If a specific tenant ID is provided, filter by it
      if (specificTenantId) {
        query = query.where('tenantId', specificTenantId);
      }
      
      const userRoleCounts = await query.groupBy('tenantId', 'role');
      
      // Reset the gauge before setting new values
      usersTotal.reset();
      
      if (userRoleCounts && userRoleCounts.length > 0) {
        userRoleCounts.forEach((item: any) => {
          if (item && item.tenantId && item.role && item.count !== undefined) {
            usersTotal.set(
              { tenant_id: item.tenantId, role: item.role },
              parseInt(item.count, 10)
            );
          }
        });
      }
    } else {
      usersTotal.reset();
    }
  } catch (error) {
    console.error('Error updating tenant metrics:', error);
  }
}

// Session tracking functions
export function incrementActiveSessions(tenantId: string | number) {
  activeSessions.inc({ tenant_id: tenantId });
}

export function decrementActiveSessions(tenantId: string | number) {
  activeSessions.dec({ tenant_id: tenantId });
}

// Incident tracking functions
export function recordIncidentCreation(
  priority: string, 
  status: string, 
  tenantId: string | number
) {
  incidentsCreatedTotal.inc({ priority, status, tenant_id: tenantId });
}

export function recordIncidentResolution(
  priority: string, 
  resolutionTimeSeconds: number, 
  tenantId: string | number
) {
  incidentsResolutionTimeSeconds.observe(
    { priority, tenant_id: tenantId }, 
    resolutionTimeSeconds
  );
}

// Error tracking function
export function recordError(errorType: string, tenantId: string | number) {
  errorsTotal.inc({ error_type: errorType, tenant_id: tenantId });
}

// Database query tracking function 
export function startDbQueryTimer(
  operation: string,
  table: string,
  tenantId: string | number
) {
  return dbQueryDurationSeconds.startTimer({ 
    operation, 
    table, 
    tenant_id: tenantId 
  });
}