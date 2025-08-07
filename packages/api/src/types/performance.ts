export interface LoadTestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  weight: number; // Relative weight for endpoint selection
  requiresAuth?: boolean;
  payload?: Record<string, any>;
  queryParams?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface ResponseTimeThresholds {
  p50: number; // 50th percentile (median)
  p95: number; // 95th percentile
  p99: number; // 99th percentile
}

export interface LoadTestScenario {
  name: string;
  description: string;
  duration: number; // Test duration in milliseconds
  virtualUsers: number; // Number of concurrent virtual users
  rampUpTime: number; // Time to ramp up to full load in milliseconds
  endpoints: LoadTestEndpoint[];
  expectedResponseTime: ResponseTimeThresholds;
  expectedThroughput: number; // Expected requests per second
  errorThreshold: number; // Maximum acceptable error rate (0.01 = 1%)
}

export interface LoadTestGlobalSettings {
  timeout: number;
  keepAlive: boolean;
  maxRedirects: number;
  userAgent: string;
}

export interface LoadTestReporting {
  outputDir: string;
  formats: ('json' | 'html' | 'csv')[];
  realTimeUpdates: boolean;
  includeDetailedLogs: boolean;
}

export interface LoadTestThresholds {
  globalErrorRate: number;
  globalResponseTime: ResponseTimeThresholds;
  minThroughput: number;
}

export interface LoadTestConfig {
  baseUrl: string;
  scenarios: LoadTestScenario[];
  globalSettings: LoadTestGlobalSettings;
  reporting: LoadTestReporting;
  thresholds: LoadTestThresholds;
}

export interface PerformanceMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface AggregatedMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
  response_times: {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
  };
  errors: {
    rate: number;
    types: Record<string, number>;
  };
  system: {
    memory: {
      used: number;
      free: number;
      percentage: number;
    };
    cpu: {
      percentage: number;
    };
  };
}

export interface DatabasePerformanceMetrics {
  query: string;
  duration: number;
  rows_affected: number;
  execution_plan?: string;
  index_usage?: string[];
  cache_hit_ratio?: number;
}

export interface WidgetPerformanceMetrics {
  widget_id: string;
  render_time: number;
  cache_hit: boolean;
  content_size: number;
  compression_ratio?: number;
  cdn_response_time?: number;
}

export interface SecurityTestResult {
  test_name: string;
  category: 'authentication' | 'authorization' | 'input_validation' | 'data_exposure' | 'session' | 'csrf' | 'xss' | 'sql_injection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  description: string;
  details?: string;
  remediation?: string;
}

export interface PerformanceTestResult {
  test_name: string;
  category: 'response_time' | 'throughput' | 'concurrency' | 'memory' | 'database' | 'caching';
  passed: boolean;
  actual_value: number;
  expected_value: number;
  unit: string;
  description: string;
  details?: string;
}

export interface ComprehensiveTestReport {
  timestamp: string;
  environment: string;
  test_duration: number;
  security_results: SecurityTestResult[];
  performance_results: PerformanceTestResult[];
  load_test_results?: any[];
  summary: {
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    critical_issues: number;
    high_issues: number;
    medium_issues: number;
    low_issues: number;
  };
  recommendations: string[];
}

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'security' | 'error' | 'availability';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolved_at?: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time: number;
  details?: Record<string, any>;
  timestamp: number;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  performance_metrics: AggregatedMetrics;
  active_alerts: MonitoringAlert[];
  last_updated: number;
}