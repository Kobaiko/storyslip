#!/bin/bash

# Start only the beautiful marketing website we built together
echo "🚀 Starting your beautiful StorySlip marketing website..."

# Navigate to marketing directory
cd packages/marketing

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌐 Starting marketing website on http://localhost:3000"
echo "This is your beautiful marketing site with all the sections we built together!"
echo ""
echo "Features included:"
echo "  ✨ Beautiful Hero section with animations"
echo "  🎯 Features showcase"
echo "  💬 Testimonials section"
echo "  🎨 Interactive demo"
echo "  💰 Pricing plans"
echo "  📞 Call-to-action section"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Make sure we're using the proper Next.js dev server
npm run dev