#!/bin/bash

echo "🧪 Testing dashboard startup..."

cd packages/dashboard

# Check if we have the right dependencies
echo "📦 Checking dependencies..."
if [ ! -f "package.json" ]; then
    echo "❌ No package.json found"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔍 Checking files..."
ls -la src/

echo "🚀 Attempting to start dashboard..."
timeout 10s npm run dev || echo "⏰ Timed out after 10 seconds"