export type MetricCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  accentColor: 'primary' | 'warning' | 'success' | 'danger' | 'gray';
};

export type PrometheusMetric = {
  name: string;
  help: string;
  type: string;
  values: {
    labels: Record<string, string>;
    value: string;
  }[];
};

export type PrometheusMetrics = {
  metrics: PrometheusMetric[];
  timestamp: string;
};

export type MetricGroup = {
  title: string;
  metrics: PrometheusMetric[];
};

export type Alert = {
  id: number;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  assetName?: string;
};

export type Ticket = {
  id: number;
  ticketNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  createdAt: string;
  assigneeName?: string;
  assigneeAvatar?: string;
};

export type ServiceHealth = {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
};

export type SystemMetrics = {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  services: ServiceHealth[];
};

export type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
};

export type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath: string;
  tenantName?: string;
  tenantPlan?: string;
  userName?: string;
  userRole?: string;
};
