#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-http://localhost:3001}
DASHBOARD_URL=${DASHBOARD_URL:-http://localhost:3000}
TIMEOUT=${TIMEOUT:-10}

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log "Checking $service_name health: $url"
    
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log "$service_name: ✅ Healthy (HTTP $status_code)"
        return 0
    else
        error "$service_name: ❌ Unhealthy (HTTP $status_code)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker-compose exec -T postgres pg_isready -U storyslip > /dev/null 2>&1; then
        log "Database: ✅ Healthy"
        return 0
    else
        error "Database: ❌ Unhealthy"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "Redis: ✅ Healthy"
        return 0
    else
        error "Redis: ❌ Unhealthy"
        return 1
    fi
}

# Check Docker services
check_docker_services() {
    log "Checking Docker services..."
    
    local services=("api" "dashboard" "postgres" "redis")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log "Docker $service: ✅ Running"
        else
            error "Docker $service: ❌ Not running"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        return 0
    else
        return 1
    fi
}

# Check system resources
check_resources() {
    log "Checking system resources..."
    
    # Check disk space
    local disk_usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 90 ]; then
        log "Disk usage: ✅ ${disk_usage}%"
    else
        warn "Disk usage: ⚠️  ${disk_usage}% (High)"
    fi
    
    # Check memory usage
    local memory_usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -lt 85 ]; then
        log "Memory usage: ✅ ${memory_usage}%"
    else
        warn "Memory usage: ⚠️  ${memory_usage}% (High)"
    fi
    
    # Check load average
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    log "Load average: ℹ️  $load_avg"
}

# Generate health report
generate_report() {
    local overall_status=$1
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > /tmp/health-report.json << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$overall_status",
  "services": {
    "api": {
      "url": "$API_URL/health",
      "status": "$(check_service "API" "$API_URL/health" && echo "healthy" || echo "unhealthy")"
    },
    "dashboard": {
      "url": "$DASHBOARD_URL/health",
      "status": "$(check_service "Dashboard" "$DASHBOARD_URL/health" && echo "healthy" || echo "unhealthy")"
    },
    "database": {
      "status": "$(check_database && echo "healthy" || echo "unhealthy")"
    },
    "redis": {
      "status": "$(check_redis && echo "healthy" || echo "unhealthy")"
    }
  },
  "system": {
    "disk_usage": "$(df / | awk 'NR==2 {print $5}')",
    "memory_usage": "$(free | awk 'NR==2{printf "%.0f%%", $3*100/$2}')",
    "load_average": "$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
  }
}
EOF
    
    log "Health report generated: /tmp/health-report.json"
}

# Main health check function
main() {
    log "Starting comprehensive health check..."
    
    local overall_healthy=true
    
    # Check core services
    if ! check_service "API" "$API_URL/health"; then
        overall_healthy=false
    fi
    
    if ! check_service "Dashboard" "$DASHBOARD_URL/health"; then
        overall_healthy=false
    fi
    
    # Check infrastructure
    if ! check_database; then
        overall_healthy=false
    fi
    
    if ! check_redis; then
        overall_healthy=false
    fi
    
    # Check Docker services
    if ! check_docker_services; then
        overall_healthy=false
    fi
    
    # Check system resources
    check_resources
    
    # Generate report
    if [ "$overall_healthy" = true ]; then
        generate_report "healthy"
        log "🎉 All systems healthy!"
        exit 0
    else
        generate_report "unhealthy"
        error "❌ Some systems are unhealthy!"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --api-only)
        check_service "API" "$API_URL/health"
        exit $?
        ;;
    --dashboard-only)
        check_service "Dashboard" "$DASHBOARD_URL/health"
        exit $?
        ;;
    --infrastructure-only)
        check_database && check_redis
        exit $?
        ;;
    --docker-only)
        check_docker_services
        exit $?
        ;;
    --resources-only)
        check_resources
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --api-only              Check only API service"
        echo "  --dashboard-only        Check only Dashboard service"
        echo "  --infrastructure-only   Check only database and Redis"
        echo "  --docker-only          Check only Docker services"
        echo "  --resources-only       Check only system resources"
        echo "  --help, -h             Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  API_URL                API base URL (default: http://localhost:3001)"
        echo "  DASHBOARD_URL          Dashboard base URL (default: http://localhost:3000)"
        echo "  TIMEOUT                Request timeout in seconds (default: 10)"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac