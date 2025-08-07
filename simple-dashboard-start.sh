#!/bin/bash

echo "🚀 Starting dashboard manually..."

cd packages/dashboard

echo "📦 Installing dependencies..."
npm install

echo "🔧 Starting Vite dev server..."
npx vite --port 3002 --host