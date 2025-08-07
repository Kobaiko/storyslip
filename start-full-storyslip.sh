#!/bin/bash

# Start the complete StorySlip platform
echo "🚀 Starting complete StorySlip platform..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is in use, killing existing process..."
        kill $(lsof -ti:$port) 2>/dev/null || true
        sleep 2
    fi
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 3001
check_port 3002

# Start API server first (port 3001)
echo "🔧 Starting API server on port 3001..."
cd packages/api
npm install
# Build the API
npm run build
# Run migrations
node migrate.js
npm start &
API_PID=$!
cd ../..

# Start Dashboard (port 3002)
echo "📊 Starting Dashboard on port 3002..."
cd packages/dashboard
npm install
npm run dev -- --port 3002 &
DASHBOARD_PID=$!
cd ../..

# Start Marketing site (port 3000)
echo "🌐 Starting Marketing site on port 3000..."
cd packages/marketing
npm install
npm run dev &
MARKETING_PID=$!
cd ../..

# Store PIDs for cleanup
echo $API_PID > .api.pid
echo $DASHBOARD_PID > .dashboard.pid
echo $MARKETING_PID > .marketing.pid

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "🎉 StorySlip is ready!"
echo ""
echo "📍 Access Points:"
echo "   🌐 Marketing Website: http://localhost:3000"
echo "   📊 Dashboard:         http://localhost:3002"
echo "   🔧 API Server:        http://localhost:3001"
echo ""
echo "🎯 Try the complete flow:"
echo "   1. Visit http://localhost:3000"
echo "   2. Click 'Get Started' or 'Try Dashboard'"
echo "   3. Sign up for an account"
echo "   4. Explore the full dashboard!"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    
    if [ -f ".api.pid" ]; then
        kill $(cat .api.pid) 2>/dev/null || true
        rm .api.pid
    fi
    
    if [ -f ".dashboard.pid" ]; then
        kill $(cat .dashboard.pid) 2>/dev/null || true
        rm .dashboard.pid
    fi
    
    if [ -f ".marketing.pid" ]; then
        kill $(cat .marketing.pid) 2>/dev/null || true
        rm .marketing.pid
    fi
    
    # Kill any remaining processes
    pkill -f "node.*3001" 2>/dev/null || true
    pkill -f "node.*3002" 2>/dev/null || true
    pkill -f "node.*3000" 2>/dev/null || true
    
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done