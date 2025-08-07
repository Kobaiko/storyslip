const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// Serve static files
app.use(express.static('public'));

// Simple HTML page
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StorySlip - Content Management Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .feature-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <h1 class="text-2xl font-bold text-gray-900">📝 StorySlip</h1>
                    </div>
                </div>
                <nav class="hidden md:flex space-x-8">
                    <a href="#features" class="text-gray-500 hover:text-gray-900">Features</a>
                    <a href="#pricing" class="text-gray-500 hover:text-gray-900">Pricing</a>
                    <a href="#blog" class="text-gray-500 hover:text-gray-900">Blog</a>
                    <a href="http://localhost:3002" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Dashboard</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="gradient-bg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center">
                <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
                    Content Management
                    <span class="block">Made Simple</span>
                </h1>
                <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                    Create, manage, and deliver content across all your platforms with StorySlip's 
                    powerful content management system and embeddable widgets.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="http://localhost:3002" class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                        Try Dashboard
                    </a>
                    <a href="#features" class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                        Learn More
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Everything You Need
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    StorySlip provides all the tools you need to create, manage, and deliver content effectively.
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">📝</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Content Management</h3>
                    <p class="text-gray-600">
                        Create and manage content with our intuitive editor. Support for rich text, images, and multimedia.
                    </p>
                </div>
                
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">🎨</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Embeddable Widgets</h3>
                    <p class="text-gray-600">
                        Create custom widgets that can be embedded on any website. Fully customizable and responsive.
                    </p>
                </div>
                
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">📊</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Analytics & Insights</h3>
                    <p class="text-gray-600">
                        Track performance with detailed analytics. Real-time data and comprehensive reporting.
                    </p>
                </div>
                
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">👥</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Team Collaboration</h3>
                    <p class="text-gray-600">
                        Work together with your team. Role-based permissions and collaborative editing.
                    </p>
                </div>
                
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">🎯</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Brand Customization</h3>
                    <p class="text-gray-600">
                        Customize the platform to match your brand. White-label options available.
                    </p>
                </div>
                
                <div class="feature-card bg-gray-50 p-8 rounded-xl">
                    <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                        <span class="text-2xl">🚀</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Performance Optimized</h3>
                    <p class="text-gray-600">
                        Fast loading times and optimized delivery. CDN integration and caching.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Demo Section -->
    <section class="py-24 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    See It In Action
                </h2>
                <p class="text-xl text-gray-600">
                    Experience the power of StorySlip with our live demo
                </p>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg p-8">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">Interactive Dashboard</h3>
                        <p class="text-gray-600 mb-6">
                            Explore our comprehensive dashboard with content management, analytics, 
                            team collaboration, and widget creation tools.
                        </p>
                        <a href="http://localhost:3002" class="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                            Open Dashboard
                            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                        </a>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-6">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span class="text-2xl">🎮</span>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-900 mb-2">Live Demo Widget</h4>
                            <p class="text-gray-600 text-sm mb-4">This is an example of an embedded StorySlip widget</p>
                            <div class="bg-white p-4 rounded border-2 border-blue-200">
                                <script src="http://localhost:3001/widget/demo"></script>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Simple, Transparent Pricing
                </h2>
                <p class="text-xl text-gray-600">
                    Choose the plan that's right for your needs
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-gray-50 rounded-xl p-8">
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Starter</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold text-gray-900">$29</span>
                        <span class="text-gray-600">/month</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Up to 5 websites
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            10 widgets
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Basic analytics
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Email support
                        </li>
                    </ul>
                    <button class="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                        Get Started
                    </button>
                </div>
                
                <div class="bg-blue-600 text-white rounded-xl p-8 relative">
                    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span class="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                            Most Popular
                        </span>
                    </div>
                    <h3 class="text-xl font-semibold mb-4">Professional</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold">$79</span>
                        <span class="text-blue-200">/month</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-center">
                            <span class="text-green-400 mr-3">✓</span>
                            Unlimited websites
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-400 mr-3">✓</span>
                            Unlimited widgets
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-400 mr-3">✓</span>
                            Advanced analytics
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-400 mr-3">✓</span>
                            Priority support
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-400 mr-3">✓</span>
                            Team collaboration
                        </li>
                    </ul>
                    <button class="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
                        Get Started
                    </button>
                </div>
                
                <div class="bg-gray-50 rounded-xl p-8">
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Enterprise</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold text-gray-900">$199</span>
                        <span class="text-gray-600">/month</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Everything in Professional
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            White-label options
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Custom integrations
                        </li>
                        <li class="flex items-center">
                            <span class="text-green-500 mr-3">✓</span>
                            Dedicated support
                        </li>
                    </ul>
                    <button class="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                        Contact Sales
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Blog Section -->
    <section id="blog" class="py-24 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Latest from Our Blog
                </h2>
                <p class="text-xl text-gray-600">
                    Tips, tutorials, and insights about content management
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <article class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                    <div class="h-48 bg-gradient-to-r from-blue-400 to-purple-500"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">
                            Getting Started with StorySlip
                        </h3>
                        <p class="text-gray-600 mb-4">
                            Learn how to set up your first content management system with StorySlip in just a few minutes.
                        </p>
                        <a href="#" class="text-blue-600 hover:text-blue-800 font-medium">
                            Read More →
                        </a>
                    </div>
                </article>
                
                <article class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                    <div class="h-48 bg-gradient-to-r from-green-400 to-blue-500"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">
                            Advanced Widget Customization
                        </h3>
                        <p class="text-gray-600 mb-4">
                            Discover advanced techniques for customizing your widgets to match your brand perfectly.
                        </p>
                        <a href="#" class="text-blue-600 hover:text-blue-800 font-medium">
                            Read More →
                        </a>
                    </div>
                </article>
                
                <article class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                    <div class="h-48 bg-gradient-to-r from-purple-400 to-pink-500"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">
                            Performance Optimization Tips
                        </h3>
                        <p class="text-gray-600 mb-4">
                            Best practices for optimizing your content delivery and improving site performance.
                        </p>
                        <a href="#" class="text-blue-600 hover:text-blue-800 font-medium">
                            Read More →
                        </a>
                    </div>
                </article>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-blue-600">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
            </h2>
            <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Join thousands of content creators who trust StorySlip to manage and deliver their content.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="http://localhost:3002" class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Try Dashboard Now
                </a>
                <a href="#" class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                    Contact Sales
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 class="text-lg font-semibold mb-4">📝 StorySlip</h3>
                    <p class="text-gray-400">
                        The modern content management platform for creators and businesses.
                    </p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Product</h4>
                    <ul class="space-y-2">
                        <li><a href="#features" class="text-gray-400 hover:text-white">Features</a></li>
                        <li><a href="#pricing" class="text-gray-400 hover:text-white">Pricing</a></li>
                        <li><a href="http://localhost:3002" class="text-gray-400 hover:text-white">Dashboard</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Resources</h4>
                    <ul class="space-y-2">
                        <li><a href="#blog" class="text-gray-400 hover:text-white">Blog</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white">Documentation</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white">Support</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Company</h4>
                    <ul class="space-y-2">
                        <li><a href="#" class="text-gray-400 hover:text-white">About</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white">Contact</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white">Privacy</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center">
                <p class="text-gray-400">
                    © 2024 StorySlip. All rights reserved. | 
                    <span class="text-green-400">🟢 All services running on localhost</span>
                </p>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    </script>
</body>
</html>
`;

// Serve the main page
app.get('/', (req, res) => {
    res.send(htmlContent);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'StorySlip Marketing Site is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 StorySlip Marketing Site running on http://localhost:${PORT}`);
});

module.exports = app;