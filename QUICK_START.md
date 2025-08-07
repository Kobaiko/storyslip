# 🚀 StorySlip Quick Start Guide

Get the complete StorySlip platform running locally in under 2 minutes!

## Prerequisites

- Node.js 16+ installed
- npm package manager
- Modern web browser

## Quick Start

1. **Run the quick start script:**
   ```bash
   ./quick-start.sh
   ```

2. **Access the platform:**
   - 🌐 **Marketing Website**: http://localhost:3003
   - 📊 **Dashboard**: http://localhost:3002
   - 🔧 **API**: http://localhost:3001

## What You'll See

### 🌐 Marketing Website (Port 3003)
- Modern landing page with hero section
- Features showcase with interactive elements
- Pricing plans and testimonials
- Blog section with sample content
- Fully responsive design with Tailwind CSS

### 📊 Dashboard (Port 3002)
- **Overview**: Real-time stats and activity feed
- **Content**: Content management with sample articles
- **Widgets**: Widget gallery with demo widgets
- **Analytics**: Real-time analytics dashboard
- **Team**: Team management interface
- **Brand**: Brand customization tools
- **Showcase**: Complete feature demonstration

### 🔧 API Backend (Port 3001)
- RESTful API with mock data
- Health check endpoint: `/api/health`
- Demo widget endpoint: `/widget/demo`
- Authentication endpoints
- Content and analytics endpoints

## Features Demonstrated

✅ **All 26 Tasks Completed** - Every feature from the original specification

### Core Platform Features:
- Content Management System
- Embeddable Widget System
- Team Collaboration Tools
- Brand Customization
- Real-time Analytics
- Performance Monitoring

### Advanced Features:
- AI Writing Assistant
- Help System & Documentation
- User Onboarding Flow
- Security & Authentication
- Performance Optimization
- Production-Ready Architecture

## Development Mode

This quick start runs all services in development mode with:
- Hot reload enabled
- Mock authentication for easy testing
- Sample data pre-loaded
- Debug logging active
- CORS configured for local development

## Stopping Services

Press `Ctrl+C` in the terminal running the quick start script to stop all services.

## Troubleshooting

### Port Conflicts
If you get port conflicts, the script will automatically attempt to free up ports 3001, 3002, and 3003.

### Missing Dependencies
The script will automatically install missing dependencies for each package.

### Node.js Version
Ensure you have Node.js 16 or higher installed:
```bash
node --version
```

## Next Steps

1. **Explore the Dashboard**: Start at http://localhost:3002 and click through all the sections
2. **Check the Marketing Site**: Visit http://localhost:3003 to see the public-facing website
3. **Test the API**: Visit http://localhost:3001/api/health to verify the backend is running
4. **Try the Widget**: See the demo widget at http://localhost:3001/widget/demo

## Architecture Overview

```
StorySlip Platform
├── Marketing Website (Next.js) → Port 3003
├── Dashboard App (React/Vite) → Port 3002
├── API Backend (Node.js) → Port 3001
└── Widget System (Embeddable JS) → Served by API
```

## Demo Data

All services run with mock data including:
- Sample content articles
- Demo widgets and analytics
- Mock user accounts and teams
- Realistic performance metrics
- Simulated real-time updates

---

**🎉 Enjoy exploring the complete StorySlip platform!**

For questions or issues, check the console output or the individual service logs.