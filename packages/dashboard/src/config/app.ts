// App configuration for StorySlip Dashboard

export const config = {
  // Marketing site URL - where users can go back to the marketing site
  marketingUrl: import.meta.env.VITE_MARKETING_URL || 'http://localhost:3002',
  
  // API URL - for API calls
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Dashboard URL
  dashboardUrl: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000'
};

// Helper functions for common URLs
export const urls = {
  // Marketing site
  marketing: config.marketingUrl,
  
  // API
  api: config.apiUrl,
  apiDocs: `${config.apiUrl}/api/docs`
};