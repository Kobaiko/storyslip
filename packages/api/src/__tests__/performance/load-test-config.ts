import { LoadTestConfig, LoadTestScenario } from '../../types/performance';

export const loadTestScenarios: LoadTestScenario[] = [
  {
    name: 'Authentication Load Test',
    description: 'Test authentication endpoints under load',
    duration: 60000, // 1 minute
    virtualUsers: 50,
    rampUpTime: 10000, // 10 seconds
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        weight: 30,
        payload: {
          email: 'load-test@example.com',
          password: 'LoadTest123!'
        }
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        weight: 50,
        requiresAuth: true
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        weight: 20,
        requiresAuth: true
      }
    ],
    expectedResponseTime: {
      p50: 200,
      p95: 500,
      p99: 1000
    },
    expectedThroughput: 100, // requests per second
    errorThreshold: 0.01 // 1% error rate
  },
  
  {
    name: 'Content Management Load Test',
    description: 'Test content CRUD operations under load',
    duration: 120000, // 2 minutes
    virtualUsers: 30,
    rampUpTime: 15000, // 15 seconds
    endpoints: [
      {
        method: 'GET',
        path: '/api/content',
        weight: 40,
        requiresAuth: true,
        queryParams: {
          page: 1,
          limit: 20
        }
      },
      {
        method: 'POST',
        path: '/api/content',
        weight: 25,
        requiresAuth: true,
        payload: {
          title: 'Load Test Content {{$randomInt}}',
          content: 'This is load test content created at {{$timestamp}}',
          excerpt: 'Load test excerpt',
          website_id: '{{websiteId}}'
        }
      },
      {
        method: 'GET',
        path: '/api/content/{{contentId}}',
        weight: 20,
        requiresAuth: true
      },
      {
        method: 'PUT',
        path: '/api/content/{{contentId}}',
        weight: 10,
        requiresAuth: true,
        payload: {
          title: 'Updated Load Test Content {{$randomInt}}',
          content: 'Updated content at {{$timestamp}}'
        }
      },
      {
        method: 'GET',
        path: '/api/content/search',
        weight: 5,
        requiresAuth: true,
        queryParams: {
          q: 'load test',
          website_id: '{{websiteId}}'
        }
      }
    ],
    expectedResponseTime: {
      p50: 300,
      p95: 800,
      p99: 1500
    },
    expectedThroughput: 60,
    errorThreshold: 0.02
  },

  {
    name: 'Widget Delivery Load Test',
    description: 'Test widget rendering and delivery under high load',
    duration: 180000, // 3 minutes
    virtualUsers: 100,
    rampUpTime: 20000, // 20 seconds
    endpoints: [
      {
        method: 'GET',
        path: '/api/widgets/public/{{widgetId}}/render',
        weight: 70,
        requiresAuth: false
      },
      {
        method: 'GET',
        path: '/api/widgets/public/{{widgetId}}/render',
        weight: 20,
        requiresAuth: false,
        queryParams: {
          format: 'json'
        }
      },
      {
        method: 'GET',
        path: '/api/widgets/public/{{widgetId}}/render',
        weight: 10,
        requiresAuth: false,
        queryParams: {
          theme: 'dark'
        }
      }
    ],
    expectedResponseTime: {
      p50: 100,
      p95: 300,
      p99: 500
    },
    expectedThroughput: 200,
    errorThreshold: 0.005 // 0.5% error rate for public endpoints
  },

  {
    name: 'Mixed Workload Load Test',
    description: 'Simulate realistic mixed user behavior',
    duration: 300000, // 5 minutes
    virtualUsers: 75,
    rampUpTime: 30000, // 30 seconds
    endpoints: [
      // Authentication
      {
        method: 'POST',
        path: '/api/auth/login',
        weight: 5,
        payload: {
          email: 'mixed-load-test@example.com',
          password: 'MixedLoad123!'
        }
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        weight: 10,
        requiresAuth: true
      },
      
      // Content operations
      {
        method: 'GET',
        path: '/api/content',
        weight: 25,
        requiresAuth: true
      },
      {
        method: 'POST',
        path: '/api/content',
        weight: 8,
        requiresAuth: true,
        payload: {
          title: 'Mixed Load Content {{$randomInt}}',
          content: 'Mixed load test content',
          website_id: '{{websiteId}}'
        }
      },
      {
        method: 'GET',
        path: '/api/content/search',
        weight: 7,
        requiresAuth: true,
        queryParams: {
          q: 'test'
        }
      },
      
      // Widget operations
      {
        method: 'GET',
        path: '/api/widgets',
        weight: 15,
        requiresAuth: true
      },
      {
        method: 'GET',
        path: '/api/widgets/public/{{widgetId}}/render',
        weight: 25,
        requiresAuth: false
      },
      
      // Analytics
      {
        method: 'GET',
        path: '/api/analytics/dashboard',
        weight: 5,
        requiresAuth: true,
        queryParams: {
          period: '7d'
        }
      }
    ],
    expectedResponseTime: {
      p50: 250,
      p95: 600,
      p99: 1200
    },
    expectedThroughput: 120,
    errorThreshold: 0.015
  },

  {
    name: 'Database Stress Test',
    description: 'Test database performance under heavy concurrent load',
    duration: 240000, // 4 minutes
    virtualUsers: 40,
    rampUpTime: 20000,
    endpoints: [
      {
        method: 'GET',
        path: '/api/content',
        weight: 30,
        requiresAuth: true,
        queryParams: {
          page: '{{$randomInt(1,10)}}',
          limit: 50
        }
      },
      {
        method: 'GET',
        path: '/api/content/search',
        weight: 25,
        requiresAuth: true,
        queryParams: {
          q: '{{$randomWord}}',
          website_id: '{{websiteId}}'
        }
      },
      {
        method: 'POST',
        path: '/api/content',
        weight: 20,
        requiresAuth: true,
        payload: {
          title: 'DB Stress Test {{$randomInt}}',
          content: '{{$randomParagraph}}',
          website_id: '{{websiteId}}'
        }
      },
      {
        method: 'GET',
        path: '/api/analytics/content-stats',
        weight: 15,
        requiresAuth: true,
        queryParams: {
          website_id: '{{websiteId}}',
          period: '30d'
        }
      },
      {
        method: 'GET',
        path: '/api/websites/{{websiteId}}/stats',
        weight: 10,
        requiresAuth: true
      }
    ],
    expectedResponseTime: {
      p50: 400,
      p95: 1000,
      p99: 2000
    },
    expectedThroughput: 80,
    errorThreshold: 0.03
  }
];

export const loadTestConfig: LoadTestConfig = {
  baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:3001',
  scenarios: loadTestScenarios,
  globalSettings: {
    timeout: 30000, // 30 seconds
    keepAlive: true,
    maxRedirects: 5,
    userAgent: 'StorySlip-LoadTest/1.0'
  },
  reporting: {
    outputDir: './load-test-results',
    formats: ['json', 'html', 'csv'],
    realTimeUpdates: true,
    includeDetailedLogs: true
  },
  thresholds: {
    globalErrorRate: 0.02, // 2% global error rate
    globalResponseTime: {
      p95: 1000,
      p99: 2000
    },
    minThroughput: 50 // minimum requests per second
  }
};

export default loadTestConfig;