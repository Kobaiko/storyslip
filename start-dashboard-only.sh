#!/bin/bash

echo "🚀 Starting StorySlip Dashboard on port 3002..."

# Navigate to dashboard directory
cd packages/dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the dashboard
echo "📊 Starting dashboard..."
npm run dev

echo "✅ Dashboard should be available at http://localhost:3002"