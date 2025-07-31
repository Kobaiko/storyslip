#!/bin/bash

echo "🚀 Starting StorySlip CMS..."
echo "================================"

# Check if Docker is running for databases
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting databases with Docker..."
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi

# Start databases
echo "🗄️  Starting PostgreSQL and Redis..."
docker run -d --name storyslip-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=storyslip postgres:15 2>/dev/null || echo "PostgreSQL already running"
docker run -d --name storyslip-redis -p 6379:6379 redis:7 2>/dev/null || echo "Redis already running"

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Create API environment file
echo "📝 Setting up environment..."
cat > packages/api/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/storyslip
DB_HOST=localhost
DB_PORT=5432
DB_NAME=storyslip
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-for-development

# Server Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000,http://localhost:3002

# Supabase Configuration (optional - using local DB)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=dummy-key-for-local-dev
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key-for-local-dev

# Logging
LOG_LEVEL=info
EOF

# Install dependencies in parallel
echo "📦 Installing dependencies..."
(cd packages/api && npm install) &
(cd packages/dashboard && npm install) &
(cd packages/marketing && npm install) &
(cd packages/widget && npm install) &
wait

# Run database migrations
echo "🔧 Setting up database schema..."
cd packages/api && npm run migrate

# Start all services in background
echo "🌟 Starting all services..."
echo ""

# Start API server
(cd packages/api && npm run dev) &
API_PID=$!

# Start Dashboard
(cd packages/dashboard && npm run dev) &
DASHBOARD_PID=$!

# Start Marketing site
(cd packages/marketing && npm run dev) &
MARKETING_PID=$!

# Wait a moment for servers to start
sleep 3

echo "✅ StorySlip CMS is now running!"
echo ""
echo "🌐 Access your applications:"
echo "   📱 Marketing Site:    http://localhost:3002"
echo "   🎛️  Admin Dashboard:   http://localhost:3000"
echo "   🔧 API Server:        http://localhost:3001"
echo "   📚 API Documentation: http://localhost:3001/api/docs"
echo ""
echo "🎯 Quick Start:"
echo "   1. Visit http://localhost:3002 to see the marketing site"
echo "   2. Visit http://localhost:3000 to access the admin dashboard"
echo "   3. Register a new account or login"
echo "   4. Start creating content!"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $API_PID $DASHBOARD_PID $MARKETING_PID 2>/dev/null
    docker stop storyslip-postgres storyslip-redis 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait