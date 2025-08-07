// App configuration for StorySlip Marketing Site

export const config = {
  // Dashboard URL - where users go to register/login
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002',
  
  // API URL - for documentation and API access
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // Marketing site URL
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000',
  
  // Contact information
  contact: {
    sales: 'sales@storyslip.com',
    demo: 'demo@storyslip.com',
    support: 'support@storyslip.com'
  }
};

// Helper functions for common URLs
export const urls = {
  // Auth URLs
  login: `${config.dashboardUrl}/login`,
  register: `${config.dashboardUrl}/register`,
  registerWithPlan: (plan: string) => `${config.dashboardUrl}/register?plan=${plan}`,
  
  // Dashboard URLs
  dashboard: config.dashboardUrl,
  
  // API URLs
  apiDocs: `${config.apiUrl}/api/docs`,
  
  // Contact URLs
  contactSales: `mailto:${config.contact.sales}?subject=Enterprise%20Inquiry`,
  requestDemo: `mailto:${config.contact.demo}?subject=Demo%20Request`,
  support: `mailto:${config.contact.support}?subject=Support%20Request`
};