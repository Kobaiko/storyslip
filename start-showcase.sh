#!/bin/bash

# StorySlip Showcase Startup Script

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}[SHOWCASE]${NC} $1"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is in use. Attempting to free it..."
        # Try to kill the process using the port
        local pid=$(lsof -ti:$port)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
        fi
        
        # Check again
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Port $port is still in use. Please free it manually:"
            echo "   lsof -ti:$port | xargs kill -9"
            return 1
        fi
    fi
    return 0
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $name to start..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    echo "❌ $name failed to start after $max_attempts attempts"
    echo "Check logs in the logs/ directory for details"
    return 1
}

# Function to show logs
show_logs() {
    echo ""
    print_status "Recent logs:"
    echo ""
    
    if [ -f "logs/api.log" ]; then
        echo "🔧 API Server (last 5 lines):"
        tail -5 logs/api.log | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "logs/dashboard.log" ]; then
        echo "📊 Dashboard (last 5 lines):"
        tail -5 logs/dashboard.log | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "logs/marketing.log" ]; then
        echo "🌐 Marketing (last 5 lines):"
        tail -5 logs/marketing.log | sed 's/^/   /'
        echo ""
    fi
}

# Main function
main() {
    print_header "🚀 Starting StorySlip Showcase"
    
    # Check if build script exists and run it
    if [ -f "scripts/build-showcase.sh" ]; then
        print_status "Building showcase..."
        chmod +x scripts/build-showcase.sh
        ./scripts/build-showcase.sh
    else
        print_warning "Build script not found, attempting to start anyway..."
    fi
    
    # Check ports
    print_status "Checking ports..."
    check_port 3000 || exit 1
    check_port 3001 || exit 1  
    check_port 3002 || exit 1
    
    # Create logs directory
    mkdir -p logs
    
    # Start services in background
    print_status "Starting API server..."
    cd packages/api
    if [ -f ".env" ]; then
        npm run dev > ../../logs/api.log 2>&1 &
    else
        # Use simple server if no environment is set up
        npm run dev:simple > ../../logs/api.log 2>&1 &
    fi
    API_PID=$!
    cd ../..
    
    print_status "Starting Dashboard..."
    cd packages/dashboard
    npm run dev > ../../logs/dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    cd ../..
    
    print_status "Starting Marketing site..."
    cd packages/marketing
    npm run dev > ../../logs/marketing.log 2>&1 &
    MARKETING_PID=$!
    cd ../..
    
    # Give services time to start
    print_status "Waiting for services to initialize..."
    sleep 10
    
    # Check if services are running (with fallback URLs)
    print_status "Checking service health..."
    
    # Check API (try health endpoint, fallback to simple endpoint)
    if ! curl -s "http://localhost:3000/api/monitoring/health" >/dev/null 2>&1; then
        if ! curl -s "http://localhost:3000" >/dev/null 2>&1; then
            print_warning "API server may not be ready yet"
        else
            print_success "API Server is ready!"
        fi
    else
        print_success "API Server is ready!"
    fi
    
    # Check Dashboard
    if curl -s "http://localhost:3001" >/dev/null 2>&1; then
        print_success "Dashboard is ready!"
    else
        print_warning "Dashboard may not be ready yet"
    fi
    
    # Check Marketing
    if curl -s "http://localhost:3002" >/dev/null 2>&1; then
        print_success "Marketing Site is ready!"
    else
        print_warning "Marketing site may not be ready yet"
    fi
    
    # Display access information
    echo ""
    print_header "🎉 StorySlip Showcase is Starting!"
    echo ""
    echo "Access your showcase at:"
    echo "  🌐 Marketing Site:  http://localhost:3002"
    echo "  📊 Dashboard:       http://localhost:3001"
    echo "  🔧 API:             http://localhost:3000"
    echo "  📚 API Docs:        http://localhost:3000/api/docs"
    echo "  📈 Health Check:    http://localhost:3000/api/monitoring/health"
    echo ""
    echo "Demo Features to Explore:"
    echo "  ✨ AI-powered content creation"
    echo "  🎨 Widget builder with themes"
    echo "  👥 Team management system"
    echo "  📊 Real-time analytics"
    echo "  🎯 White-label branding"
    echo "  🔒 Enterprise security"
    echo ""
    echo "Demo Accounts (if authentication is set up):"
    echo "  👤 Admin: admin@storyslip.com / demo123"
    echo "  👤 User:  user@storyslip.com / demo123"
    echo ""
    echo "💡 Tip: If a service isn't responding immediately, wait a moment for it to fully start"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo "Type 'logs' and press Enter to see recent logs"
    echo ""
    
    # Function to cleanup on exit
    cleanup() {
        echo ""
        print_status "Stopping services..."
        kill $API_PID $DASHBOARD_PID $MARKETING_PID 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        kill -9 $API_PID $DASHBOARD_PID $MARKETING_PID 2>/dev/null || true
        
        print_success "All services stopped"
        exit 0
    }
    
    # Set trap for cleanup
    trap cleanup INT TERM
    
    # Interactive loop
    while true; do
        read -t 1 -n 1 input 2>/dev/null || true
        if [ "$input" = "l" ]; then
            show_logs
            echo "Press Ctrl+C to stop, or any key to continue..."
        fi
    done
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "StorySlip Showcase Startup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  --build       Force rebuild before starting"
    echo "  --logs        Show logs after starting"
    echo ""
    echo "The script will:"
    echo "  1. Build the showcase if needed"
    echo "  2. Check and free required ports"
    echo "  3. Start all services (API, Dashboard, Marketing)"
    echo "  4. Display access URLs and demo information"
    echo ""
    exit 0
fi

# Force build if requested
if [ "$1" = "--build" ]; then
    if [ -f "scripts/build-showcase.sh" ]; then
        print_status "Force rebuilding showcase..."
        chmod +x scripts/build-showcase.sh
        ./scripts/build-showcase.sh
    fi
fi

# Run main function
main

# Show logs if requested
if [ "$1" = "--logs" ]; then
    show_logs
fi