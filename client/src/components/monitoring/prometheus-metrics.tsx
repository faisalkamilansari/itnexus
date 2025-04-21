import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MetricGroup, PrometheusMetric } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface PrometheusMetricsProps {
  metrics: PrometheusMetric[];
  isLoading: boolean;
  error: Error | null;
}

export default function PrometheusMetrics({ metrics, isLoading, error }: PrometheusMetricsProps) {
  const [activeTab, setActiveTab] = useState<string>("system");
  const [metricGroups, setMetricGroups] = useState<MetricGroup[]>([]);

  useEffect(() => {
    if (metrics) {
      // Group metrics by category
      const systemMetrics = metrics.filter(m => 
        m.name.includes('memory') || 
        m.name.includes('cpu') || 
        m.name.includes('process')
      );
      
      const httpMetrics = metrics.filter(m => 
        m.name.includes('http') || 
        m.name.includes('request')
      );
      
      const businessMetrics = metrics.filter(m => 
        m.name.includes('incidents') || 
        m.name.includes('service_requests') || 
        m.name.includes('change_requests') || 
        m.name.includes('active_sessions') ||
        m.name.includes('users') ||
        m.name.includes('tenants')
      );
      
      const databaseMetrics = metrics.filter(m => 
        m.name.includes('db') || 
        m.name.includes('database') || 
        m.name.includes('query')
      );
      
      // Other metrics that didn't fit into the categories above
      const otherMetrics = metrics.filter(m => 
        !systemMetrics.includes(m) && 
        !httpMetrics.includes(m) && 
        !businessMetrics.includes(m) &&
        !databaseMetrics.includes(m)
      );
      
      setMetricGroups([
        { title: "System Metrics", metrics: systemMetrics },
        { title: "HTTP Metrics", metrics: httpMetrics },
        { title: "Business Metrics", metrics: businessMetrics },
        { title: "Database Metrics", metrics: databaseMetrics },
        { title: "Other Metrics", metrics: otherMetrics }
      ]);
    }
  }, [metrics]);

  const renderMetricValue = (metric: PrometheusMetric) => {
    // Simple metrics (gauges, counters) with a single value
    if (metric.values.length === 1 && !Object.keys(metric.values[0].labels).length) {
      const value = parseFloat(metric.values[0].value);
      
      // For percentage-like metrics
      if (metric.name.includes('_percent') || 
          metric.name.includes('_usage') || 
          (value >= 0 && value <= 100 && 
           (metric.name.includes('utilization') || 
            metric.name.includes('cpu') || 
            metric.name.includes('memory')))) {
        return (
          <div className="mt-2">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{Math.round(value)}%</span>
            </div>
            <Progress value={value} className="h-2" />
          </div>
        );
      }
      
      // For regular numbers
      return (
        <div className="mt-2">
          <span className="text-2xl font-bold">{formatMetricValue(value, metric)}</span>
        </div>
      );
    }
    
    // For metrics with multiple values (usually histograms or labeled metrics)
    if (metric.values.length > 1) {
      // If it looks like time-series data based on labels, try to render a chart
      const hasTimeLabels = metric.values.some(v => v.labels.le || v.labels.bucket);
      
      if (hasTimeLabels && metric.type === 'histogram') {
        return renderHistogram(metric);
      }
      
      // For metrics with categorical labels
      if (metric.values.some(v => Object.keys(v.labels).length > 0)) {
        return renderLabelsTable(metric);
      }
    }
    
    // Fallback - render as simple text
    return (
      <div className="mt-2">
        <pre className="text-xs overflow-auto max-h-40 bg-gray-50 p-2 rounded">
          {JSON.stringify(metric.values, null, 2)}
        </pre>
      </div>
    );
  };

  const formatMetricValue = (value: number, metric: PrometheusMetric): string => {
    // Format based on metric name and magnitude
    if (metric.name.includes('_bytes') || metric.name.includes('_memory')) {
      return formatBytes(value);
    }
    
    if (metric.name.includes('_seconds') || metric.name.includes('_duration')) {
      return formatDuration(value);
    }
    
    // Large numbers formatting
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value > 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    
    // Regular numbers
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 0.001) {
      return `${(seconds * 1000000).toFixed(2)}µs`;
    } else if (seconds < 1) {
      return `${(seconds * 1000).toFixed(2)}ms`;
    } else if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
  };

  const renderHistogram = (metric: PrometheusMetric) => {
    // Convert histogram buckets to chart data
    let chartData = [];
    
    if (metric.type === 'histogram') {
      // Sort by bucket value
      const sortedValues = [...metric.values]
        .filter(v => v.labels.le)
        .sort((a, b) => parseFloat(a.labels.le) - parseFloat(b.labels.le));
      
      chartData = sortedValues.map(v => ({
        bucket: formatDuration(parseFloat(v.labels.le)),
        count: parseFloat(v.value),
        rawBucket: parseFloat(v.labels.le)
      }));
    } else {
      // Handle other types of multi-value metrics
      chartData = metric.values.map((v, i) => ({
        name: Object.entries(v.labels).map(([k, v]) => `${k}=${v}`).join(', ') || `Value ${i+1}`,
        value: parseFloat(v.value)
      }));
    }
    
    return (
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          {metric.type === 'histogram' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  const renderLabelsTable = (metric: PrometheusMetric) => {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr>
              {Object.keys(metric.values[0].labels).length > 0 && (
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Labels
                </th>
              )}
              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metric.values.map((v, i) => (
              <tr key={i}>
                {Object.keys(v.labels).length > 0 && (
                  <td className="px-2 py-1 text-xs">
                    {Object.entries(v.labels).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="mr-1 mb-1">
                        {k}={v}
                      </Badge>
                    ))}
                  </td>
                )}
                <td className="px-2 py-1 text-right">
                  {formatMetricValue(parseFloat(v.value), metric)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading metrics: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const currentGroup = metricGroups.find(g => g.title.toLowerCase().includes(activeTab)) || metricGroups[0];

  return (
    <div>
      <Tabs defaultValue="system" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-1">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="http">HTTP</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
        
        {metricGroups.map((group) => (
          <TabsContent key={group.title} value={group.title.toLowerCase().split(' ')[0]} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.metrics.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">No metrics available in this category</p>
                  </CardContent>
                </Card>
              ) : (
                group.metrics.map((metric) => (
                  <Card key={metric.name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">{metric.name}</CardTitle>
                      <CardDescription className="text-xs">{metric.help}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderMetricValue(metric)}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}