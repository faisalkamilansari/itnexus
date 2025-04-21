import { User } from '@shared/schema';
import { db } from '../db';
import { eq, count, and } from 'drizzle-orm';
import { getSupportUsers } from './email-service';

interface WorkloadInfo {
  userId: number;
  assignedCount: number;
}

// Get support agent workload for a specific tenant
async function getAgentWorkload(tenantId: number): Promise<WorkloadInfo[]> {
  try {
    // Get all support users
    const supportUsers = await getSupportUsers(tenantId);
    
    if (supportUsers.length === 0) {
      return [];
    }
    
    const userIds = supportUsers.map(user => user.id);
    
    // Count active incidents per user
    const incidentCounts = await db
      .select({
        userId: db.schema.incidents.assignedTo,
        count: count()
      })
      .from(db.schema.incidents)
      .where(
        and(
          eq(db.schema.incidents.tenantId, tenantId),
          db.inArray(db.schema.incidents.assignedTo, userIds),
          db.not(eq(db.schema.incidents.status, 'closed'))
        )
      )
      .groupBy(db.schema.incidents.assignedTo);
    
    // Count active service requests per user
    const serviceRequestCounts = await db
      .select({
        userId: db.schema.serviceRequests.assignedTo,
        count: count()
      })
      .from(db.schema.serviceRequests)
      .where(
        and(
          eq(db.schema.serviceRequests.tenantId, tenantId),
          db.inArray(db.schema.serviceRequests.assignedTo, userIds),
          db.not(eq(db.schema.serviceRequests.status, 'closed'))
        )
      )
      .groupBy(db.schema.serviceRequests.assignedTo);
    
    // Count active change requests per user
    const changeRequestCounts = await db
      .select({
        userId: db.schema.changeRequests.assignedTo,
        count: count()
      })
      .from(db.schema.changeRequests)
      .where(
        and(
          eq(db.schema.changeRequests.tenantId, tenantId),
          db.inArray(db.schema.changeRequests.assignedTo, userIds),
          db.not(eq(db.schema.changeRequests.status, 'closed'))
        )
      )
      .groupBy(db.schema.changeRequests.assignedTo);
    
    // Combine counts and create workload map
    const workloadMap = new Map<number, number>();
    
    // Initialize with all support users (so we include users with 0 assigned tickets)
    supportUsers.forEach(user => {
      workloadMap.set(user.id, 0);
    });
    
    // Add incident counts
    incidentCounts.forEach(item => {
      if (item.userId) {
        workloadMap.set(item.userId, (workloadMap.get(item.userId) || 0) + item.count);
      }
    });
    
    // Add service request counts
    serviceRequestCounts.forEach(item => {
      if (item.userId) {
        workloadMap.set(item.userId, (workloadMap.get(item.userId) || 0) + item.count);
      }
    });
    
    // Add change request counts
    changeRequestCounts.forEach(item => {
      if (item.userId) {
        workloadMap.set(item.userId, (workloadMap.get(item.userId) || 0) + item.count);
      }
    });
    
    // Convert map to array of objects
    const workloadInfo: WorkloadInfo[] = [];
    workloadMap.forEach((assignedCount, userId) => {
      workloadInfo.push({ userId, assignedCount });
    });
    
    return workloadInfo;
  } catch (error) {
    console.error('Failed to get agent workload:', error);
    return [];
  }
}

// Assign a ticket/request to the least busy agent
export async function getNextAvailableAgent(tenantId: number): Promise<number | null> {
  try {
    const workloadInfo = await getAgentWorkload(tenantId);
    
    if (workloadInfo.length === 0) {
      return null;
    }
    
    // Sort by assigned count (ascending)
    workloadInfo.sort((a, b) => a.assignedCount - b.assignedCount);
    
    // Return the ID of the least busy agent
    return workloadInfo[0].userId;
  } catch (error) {
    console.error('Failed to get next available agent:', error);
    return null;
  }
}

// Get the user object for the assigned agent
export async function getAssignedUser(userId: number): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(db.schema.users.id, userId),
    });
    
    return user || null;
  } catch (error) {
    console.error('Failed to get assigned user:', error);
    return null;
  }
}

// Auto-assign an agent to a new ticket
export async function autoAssignTicket(tenantId: number): Promise<number | null> {
  return await getNextAvailableAgent(tenantId);
}