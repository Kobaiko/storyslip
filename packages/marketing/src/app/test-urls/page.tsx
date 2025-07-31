import { urls, config } from '@/config/app';

export default function TestUrls() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-lato text-gray-900 mb-8">URL Configuration Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold font-lato text-gray-900 mb-4">Environment Configuration</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Dashboard URL:</strong> {config.dashboardUrl}</div>
            <div><strong>API URL:</strong> {config.apiUrl}</div>
            <div><strong>Marketing URL:</strong> {config.marketingUrl}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold font-lato text-gray-900 mb-4">Generated URLs</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Login:</strong> <a href={urls.login} className="text-blue-600 hover:underline" target="_blank">{urls.login}</a></div>
            <div><strong>Register:</strong> <a href={urls.register} className="text-blue-600 hover:underline" target="_blank">{urls.register}</a></div>
            <div><strong>Register with Plan:</strong> <a href={urls.registerWithPlan('pro')} className="text-blue-600 hover:underline" target="_blank">{urls.registerWithPlan('pro')}</a></div>
            <div><strong>API Docs:</strong> <a href={urls.apiDocs} className="text-blue-600 hover:underline" target="_blank">{urls.apiDocs}</a></div>
            <div><strong>Contact Sales:</strong> <a href={urls.contactSales} className="text-blue-600 hover:underline">{urls.contactSales}</a></div>
            <div><strong>Request Demo:</strong> <a href={urls.requestDemo} className="text-blue-600 hover:underline">{urls.requestDemo}</a></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold font-lato text-gray-900 mb-4">Test Links</h2>
          <div className="space-y-4">
            <div>
              <a 
                href={urls.register} 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                target="_blank"
              >
                Test Register Link
              </a>
            </div>
            <div>
              <a 
                href={urls.login} 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                target="_blank"
              >
                Test Login Link
              </a>
            </div>
            <div>
              <a 
                href={urls.apiDocs} 
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                target="_blank"
              >
                Test API Docs Link
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}