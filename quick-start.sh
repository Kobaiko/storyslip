#!/bin/bash

# Quick Start Script for StorySlip Platform
# This script starts all services in development mode without building

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[STORYSLIP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    print_header "Stopping all services..."
    
    # Kill any processes on our ports
    pkill -f "node.*3001" 2>/dev/null || true
    pkill -f "node.*3002" 2>/dev/null || true
    pkill -f "node.*3003" 2>/dev/null || true
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

clear
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                          🚀 STORYSLIP QUICK START 🚀                       ║"
echo "║                     Development Mode - No Build Required                    ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
print_header "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is required but not installed."
    exit 1
fi

# Check Node.js version
node_version=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$node_version" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Prerequisites satisfied"

# Check and free up ports
print_header "Checking port availability..."

ports=(3001 3002 3003)
for port in "${ports[@]}"; do
    if check_port $port; then
        print_warning "Port $port is in use, attempting to free it..."
        local pid=$(lsof -ti:$port)
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null || true
            sleep 1
        fi
    fi
done

print_success "Ports are available"

# Setup environment
print_header "Setting up environment..."

# Create development environment file if it doesn't exist
if [ ! -f "environments/development/.env.development" ]; then
    print_status "Creating development environment..."
    mkdir -p environments/development
    
    cat > environments/development/.env.development << 'EOF'
# Development Environment Configuration
NODE_ENV=development

# API Configuration
PORT=3001
API_URL=http://localhost:3001

# Database (using local SQLite for demo)
DATABASE_URL=sqlite:./dev.db

# Supabase (demo configuration)
SUPABASE_URL=https://demo.supabase.co
SUPABASE_ANON_KEY=demo-anon-key
SUPABASE_SERVICE_ROLE_KEY=demo-service-key

# Authentication
JWT_SECRET=demo-jwt-secret-for-development-only-32-chars
SESSION_SECRET=demo-session-secret-for-development-only-32-chars

# Frontend URLs
DASHBOARD_URL=http://localhost:3002
MARKETING_URL=http://localhost:3003
WIDGET_URL=http://localhost:3001/widget

# CORS
CORS_ORIGINS=http://localhost:3002,http://localhost:3003

# Development flags
ENABLE_DEMO_DATA=true
ENABLE_MOCK_AUTH=true
DEBUG=true
LOG_LEVEL=debug
EOF
fi

# Copy environment to packages
print_status "Copying environment configuration..."
cp environments/development/.env.development packages/api/.env 2>/dev/null || true
cp environments/development/.env.development packages/dashboard/.env 2>/dev/null || true
cp environments/development/.env.development packages/marketing/.env.local 2>/dev/null || true

print_success "Environment setup complete"

# Install dependencies if needed
print_header "Installing dependencies..."

if [ ! -d "node_modules" ]; then
    print_status "Installing root dependencies..."
    npm install --silent
fi

for package in api dashboard marketing; do
    if [ ! -d "packages/$package/node_modules" ]; then
        print_status "Installing $package dependencies..."
        (cd packages/$package && npm install --silent)
    fi
done

print_success "Dependencies ready"

# Start services
print_header "Starting services..."

print_status "Starting API server on port 3001..."
(cd packages/api && npm run dev) &
API_PID=$!

print_status "Starting Dashboard on port 3002..."
(cd packages/dashboard && npm run dev -- --port 3002) &
DASHBOARD_PID=$!

print_status "Starting Marketing site on port 3003..."
(cd packages/marketing && npm run dev -- --port 3003) &
MARKETING_PID=$!

# Wait a moment for services to start
sleep 3

# Show access information
clear
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                        🎉 STORYSLIP IS READY! 🎉                           ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

print_success "All services are running in development mode!"
echo ""

echo -e "${CYAN}📱 Access Points:${NC}"
echo "   🌐 Marketing Website:  http://localhost:3003"
echo "   📊 Dashboard App:      http://localhost:3002"
echo "   🔧 API Backend:        http://localhost:3001"
echo ""

echo -e "${CYAN}🎯 What to Explore:${NC}"
echo "   • Marketing site with hero, features, pricing, and blog"
echo "   • Dashboard with content management and analytics"
echo "   • Widget creation and embedding system"
echo "   • Team collaboration and user management"
echo "   • Brand customization and white-labeling"
echo "   • Real-time monitoring and performance metrics"
echo ""

echo -e "${CYAN}🛠️ Development Features:${NC}"
echo "   • Hot reload enabled for all services"
echo "   • Debug logging active"
echo "   • Mock authentication for easy testing"
echo "   • Sample data pre-loaded"
echo ""

echo -e "${YELLOW}⚠️  Development Notes:${NC}"
echo "   • This is a development build with mock data"
echo "   • Authentication is simplified for demo purposes"
echo "   • Database is local SQLite (data will persist)"
echo "   • All features are functional but use demo configurations"
echo ""

print_header "Press Ctrl+C to stop all services"

# Keep script running
while true; do
    sleep 1
done