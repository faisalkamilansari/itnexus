import { apiRequest } from "./queryClient";
import {
  InsertIncident,
  InsertServiceRequest,
  InsertChangeRequest,
  InsertAsset,
  InsertMonitoringAlert,
  InsertComment
} from "@shared/schema";
import { PrometheusMetrics } from "@/types";

// Dashboard
export const fetchDashboardData = async () => {
  const res = await apiRequest("GET", "/api/dashboard");
  return await res.json();
};

// Incidents
export const fetchIncidents = async () => {
  const res = await apiRequest("GET", "/api/incidents");
  return await res.json();
};

export const fetchIncident = async (id: number) => {
  const res = await apiRequest("GET", `/api/incidents/${id}`);
  return await res.json();
};

export const createIncident = async (incident: InsertIncident) => {
  const res = await apiRequest("POST", "/api/incidents", incident);
  return await res.json();
};

export const updateIncident = async ({ id, data }: { id: number; data: Partial<InsertIncident> }) => {
  const res = await apiRequest("PATCH", `/api/incidents/${id}`, data);
  return await res.json();
};

// Service Requests
export const fetchServiceRequests = async () => {
  const res = await apiRequest("GET", "/api/service-requests");
  return await res.json();
};

export const fetchServiceRequest = async (id: number) => {
  const res = await apiRequest("GET", `/api/service-requests/${id}`);
  return await res.json();
};

export const createServiceRequest = async (request: InsertServiceRequest) => {
  const res = await apiRequest("POST", "/api/service-requests", request);
  return await res.json();
};

export const updateServiceRequest = async ({ id, data }: { id: number; data: Partial<InsertServiceRequest> }) => {
  const res = await apiRequest("PATCH", `/api/service-requests/${id}`, data);
  return await res.json();
};

// Change Requests
export const fetchChangeRequests = async () => {
  const res = await apiRequest("GET", "/api/change-requests");
  return await res.json();
};

export const fetchChangeRequest = async (id: number) => {
  const res = await apiRequest("GET", `/api/change-requests/${id}`);
  return await res.json();
};

export const createChangeRequest = async (request: InsertChangeRequest) => {
  // If date fields are present and they're strings, convert them to Date objects
  const processedRequest = {...request};
  
  if (processedRequest.scheduledStartTime && typeof processedRequest.scheduledStartTime === 'string') {
    processedRequest.scheduledStartTime = new Date(processedRequest.scheduledStartTime);
  }
  
  if (processedRequest.scheduledEndTime && typeof processedRequest.scheduledEndTime === 'string') {
    processedRequest.scheduledEndTime = new Date(processedRequest.scheduledEndTime);
  }
  
  const res = await apiRequest("POST", "/api/change-requests", processedRequest);
  return await res.json();
};

export const updateChangeRequest = async ({ id, data }: { id: number; data: Partial<InsertChangeRequest> }) => {
  // If date fields are present and they're strings, convert them to Date objects
  const processedData = {...data};
  
  if (processedData.scheduledStartTime && typeof processedData.scheduledStartTime === 'string') {
    processedData.scheduledStartTime = new Date(processedData.scheduledStartTime);
  }
  
  if (processedData.scheduledEndTime && typeof processedData.scheduledEndTime === 'string') {
    processedData.scheduledEndTime = new Date(processedData.scheduledEndTime);
  }
  
  const res = await apiRequest("PATCH", `/api/change-requests/${id}`, processedData);
  return await res.json();
};

// Assets
export const fetchAssets = async () => {
  const res = await apiRequest("GET", "/api/assets");
  return await res.json();
};

export const fetchAsset = async (id: number) => {
  const res = await apiRequest("GET", `/api/assets/${id}`);
  return await res.json();
};

export const createAsset = async (asset: InsertAsset) => {
  const res = await apiRequest("POST", "/api/assets", asset);
  return await res.json();
};

export const updateAsset = async ({ id, data }: { id: number; data: Partial<InsertAsset> }) => {
  const res = await apiRequest("PATCH", `/api/assets/${id}`, data);
  return await res.json();
};

// Monitoring Alerts
export const fetchMonitoringAlerts = async () => {
  const res = await apiRequest("GET", "/api/monitoring-alerts");
  return await res.json();
};

export const createMonitoringAlert = async (alert: InsertMonitoringAlert) => {
  const res = await apiRequest("POST", "/api/monitoring-alerts", alert);
  return await res.json();
};

export const acknowledgeAlert = async (id: number) => {
  const res = await apiRequest("PATCH", `/api/monitoring-alerts/${id}/acknowledge`);
  return await res.json();
};

export const resolveAlert = async (id: number) => {
  const res = await apiRequest("PATCH", `/api/monitoring-alerts/${id}/resolve`);
  return await res.json();
};

// Service Catalog
export const fetchServiceCatalog = async () => {
  const res = await apiRequest("GET", "/api/service-catalog");
  return await res.json();
};

// Comments
export const fetchIncidentComments = async (id: number) => {
  const res = await apiRequest("GET", `/api/incidents/${id}/comments`);
  return await res.json();
};

export const fetchServiceRequestComments = async (id: number) => {
  const res = await apiRequest("GET", `/api/service-requests/${id}/comments`);
  return await res.json();
};

export const fetchChangeRequestComments = async (id: number) => {
  const res = await apiRequest("GET", `/api/change-requests/${id}/comments`);
  return await res.json();
};

export const createComment = async (comment: InsertComment) => {
  const res = await apiRequest("POST", "/api/comments", comment);
  return await res.json();
};

// Prometheus Metrics
export const fetchPrometheusMetrics = async (): Promise<PrometheusMetrics> => {
  const res = await apiRequest("GET", "/api/prometheus-metrics");
  
  // Try to parse as JSON first
  try {
    const jsonData = await res.json();
    
    // If we already have the expected structure, return it
    if (jsonData && typeof jsonData === 'object') {
      // If the response has a metrics property, it's already in the right format
      if (jsonData.metrics && Array.isArray(jsonData.metrics)) {
        return {
          metrics: jsonData.metrics,
          timestamp: jsonData.timestamp || new Date().toISOString()
        };
      }
      
      // Otherwise, try to convert it to the right format
      // This handles if the server returns an array of metrics directly
      if (Array.isArray(jsonData)) {
        return {
          metrics: jsonData,
          timestamp: new Date().toISOString()
        };
      }
      
      // Or if it returns some other object with metrics-like data
      // Create sample metrics from the JSON data
      const metrics: PrometheusMetrics = {
        metrics: [],
        timestamp: new Date().toISOString()
      };
      
      // Convert top-level properties to metrics
      for (const [key, value] of Object.entries(jsonData)) {
        if (typeof value === 'number' || typeof value === 'string') {
          metrics.metrics.push({
            name: key,
            help: `Value of ${key}`,
            type: 'gauge',
            values: [{
              labels: {},
              value: value.toString()
            }]
          });
        } else if (Array.isArray(value)) {
          // Array values become multiple data points
          metrics.metrics.push({
            name: key,
            help: `Values of ${key}`,
            type: 'gauge',
            values: value.map((item, index) => ({
              labels: { index: index.toString() },
              value: typeof item === 'object' ? JSON.stringify(item) : item.toString()
            }))
          });
        } else if (typeof value === 'object' && value !== null) {
          // Object values become labeled data points
          metrics.metrics.push({
            name: key,
            help: `Properties of ${key}`,
            type: 'gauge',
            values: Object.entries(value).map(([subKey, subValue]) => ({
              labels: { property: subKey },
              value: typeof subValue === 'object' ? '1' : subValue.toString()
            }))
          });
        }
      }
      
      return metrics;
    }
  } catch (e) {
    // If JSON parsing fails, try to parse as Prometheus text format
    console.log("JSON parsing failed, trying Prometheus text format", e);
  }
  
  // If JSON parsing fails or doesn't have the expected structure,
  // fall back to parsing as Prometheus text format
  const text = await res.text();
  const lines = text.split('\n');
  const metrics: PrometheusMetrics = {
    metrics: [],
    timestamp: new Date().toISOString()
  };
  
  let currentMetric: any = null;
  
  for (const line of lines) {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      if (line.startsWith('# HELP ')) {
        const parts = line.substring(7).split(' ');
        const name = parts[0];
        const help = parts.slice(1).join(' ');
        currentMetric = { name, help, type: '', values: [] };
      } else if (line.startsWith('# TYPE ')) {
        const parts = line.substring(7).split(' ');
        const name = parts[0];
        const type = parts[1];
        if (currentMetric && currentMetric.name === name) {
          currentMetric.type = type;
          metrics.metrics.push(currentMetric);
        }
      }
      continue;
    }
    
    // Parse metric values
    if (currentMetric) {
      const valueMatch = line.match(/([^\s{]+)({([^}]*)})?(\s+(.+))?/);
      if (valueMatch) {
        const [, metricName, , labelStr, , valueStr] = valueMatch;
        
        if (metricName === currentMetric.name) {
          const labels: Record<string, string> = {};
          
          if (labelStr) {
            const labelParts = labelStr.split(',');
            for (const part of labelParts) {
              const [key, value] = part.split('=');
              if (key && value) {
                // Remove quotes from value
                labels[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
              }
            }
          }
          
          currentMetric.values.push({
            labels,
            value: valueStr || '0'
          });
        }
      }
    }
  }
  
  return metrics;
};

// Prometheus Instances
export const fetchPrometheusInstances = async () => {
  const res = await apiRequest("GET", "/api/monitoring/instances");
  const data = await res.json();
  
  // Handle the PostgreSQL response format which includes metadata (rows, command, etc.)
  if (data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows)) {
    return data.rows;
  }
  
  // If it's already an array, return it as is
  if (Array.isArray(data)) {
    return data;
  }
  
  // If we can't determine the format, return an empty array
  console.error("Unexpected response format from /api/monitoring/instances:", data);
  return [];
};

export const fetchPrometheusInstance = async (id: number) => {
  const res = await apiRequest("GET", `/api/monitoring/instances/${id}`);
  const data = await res.json();
  
  // Handle PostgreSQL single row response format
  if (data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows) && data.rows.length > 0) {
    return data.rows[0];
  }
  
  return data;
};
