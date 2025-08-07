#!/bin/bash

# StorySlip Environment Health Check Script
# This script performs comprehensive health checks across different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment
validate_environment() {
    local env=$1
    
    if [[ ! "$env" =~ ^(development|staging|production)$ ]]; then
        print_error "Invalid environment: $env"
        print_error "Valid environments: development, staging, production"
        exit 1
    fi
}

# Function to get environment URLs
get_environment_urls() {
    local env=$1
    
    case $env in
        development)
            API_URL="http://localhost:3001"
            DASHBOARD_URL="http://localhost:3000"
            MARKETING_URL="http://localhost:3002"
            WIDGET_CDN_URL="http://localhost:3001/widgets"
            ;;
        staging)
            API_URL="https://api-staging.storyslip.com"
            DASHBOARD_URL="https://app-staging.storyslip.com"
            MARKETING_URL="https://staging.storyslip.com"
            WIDGET_CDN_URL="https://cdn-staging.storyslip.com/widgets"
            ;;
        production)
            API_URL="https://api.storyslip.com"
            DASHBOARD_URL="https://app.storyslip.com"
            MARKETING_URL="https://storyslip.com"
            WIDGET_CDN_URL="https://cdn.storyslip.com/widgets"
            ;;
    esac
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    local timeout=${4:-10}
    
    print_status "Checking $name: $url"
    
    if command_exists curl; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null)
        
        if [ "$response" = "$expected_status" ]; then
            print_success "$name is healthy (HTTP $response)"
            return 0
        else
            print_error "$name is unhealthy (HTTP $response)"
            return 1
        fi
    else
        print_warning "curl not found. Skipping HTTP check for $name"
        return 1
    fi
}

# Function to check API health
check_api_health() {
    local env=$1
    local api_url=$2
    
    print_status "Performing detailed API health check..."
    
    local health_url="$api_url/api/monitoring/health"
    local detailed_health_url="$api_url/api/monitoring/health/detailed"
    
    # Basic health check
    if check_http_endpoint "$health_url" "API Health Endpoint"; then
        # Detailed health check
        if command_exists curl; then
            local health_data=$(curl -s --max-time 10 "$health_url" 2>/dev/null)
            
            if [ $? -eq 0 ] && [ -n "$health_data" ]; then
                local status=$(echo "$health_data" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null)
                
                if [ "$status" = "healthy" ]; then
                    print_success "API reports healthy status"
                else
                    print_warning "API reports status: $status"
                fi
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

# Function to check database connectivity
check_database_health() {
    local env=$1
    
    print_status "Checking database connectivity..."
    
    if command_exists supabase; then
        if supabase db ping >/dev/null 2>&1; then
            print_success "Database is accessible"
            return 0
        else
            print_error "Database is not accessible"
            return 1
        fi
    else
        print_warning "Supabase CLI not found. Skipping database check"
        return 1
    fi
}

# Function to check SSL certificates
check_ssl_certificates() {
    local env=$1
    local urls=("$@")
    
    if [ "$env" = "development" ]; then
        print_status "Skipping SSL check for development environment"
        return 0
    fi
    
    print_status "Checking SSL certificates..."
    
    if command_exists openssl; then
        for url in "${urls[@]:1}"; do
            if [[ "$url" =~ ^https:// ]]; then
                local domain=$(echo "$url" | sed 's|https://||' | sed 's|/.*||')
                
                local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
                
                if [ $? -eq 0 ]; then
                    local expiry=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
                    local expiry_timestamp=$(date -d "$expiry" +%s 2>/dev/null)
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                    
                    if [ $days_until_expiry -gt 30 ]; then
                        print_success "SSL certificate for $domain is valid (expires in $days_until_expiry days)"
                    elif [ $days_until_expiry -gt 0 ]; then
                        print_warning "SSL certificate for $domain expires soon ($days_until_expiry days)"
                    else
                        print_error "SSL certificate for $domain has expired"
                    fi
                else
                    print_error "Failed to check SSL certificate for $domain"
                fi
            fi
        done
    else
        print_warning "openssl not found. Skipping SSL certificate checks"
    fi
}

# Function to check DNS resolution
check_dns_resolution() {
    local env=$1
    local urls=("$@")
    
    if [ "$env" = "development" ]; then
        print_status "Skipping DNS check for development environment"
        return 0
    fi
    
    print_status "Checking DNS resolution..."
    
    if command_exists nslookup; then
        for url in "${urls[@]:1}"; do
            local domain=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||')
            
            if nslookup "$domain" >/dev/null 2>&1; then
                print_success "DNS resolution successful for $domain"
            else
                print_error "DNS resolution failed for $domain"
            fi
        done
    else
        print_warning "nslookup not found. Skipping DNS checks"
    fi
}

# Function to check system resources
check_system_resources() {
    local env=$1
    
    print_status "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        print_success "Disk usage is healthy ($disk_usage%)"
    elif [ "$disk_usage" -lt 90 ]; then
        print_warning "Disk usage is high ($disk_usage%)"
    else
        print_error "Disk usage is critical ($disk_usage%)"
    fi
    
    # Check memory usage
    if command_exists free; then
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$memory_usage" -lt 80 ]; then
            print_success "Memory usage is healthy ($memory_usage%)"
        elif [ "$memory_usage" -lt 90 ]; then
            print_warning "Memory usage is high ($memory_usage%)"
        else
            print_error "Memory usage is critical ($memory_usage%)"
        fi
    fi
    
    # Check load average
    if command_exists uptime; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        local cpu_cores=$(nproc 2>/dev/null || echo "1")
        local load_percentage=$(echo "$load_avg * 100 / $cpu_cores" | bc -l 2>/dev/null | cut -d'.' -f1)
        
        if [ "$load_percentage" -lt 70 ]; then
            print_success "System load is healthy ($load_percentage%)"
        elif [ "$load_percentage" -lt 90 ]; then
            print_warning "System load is high ($load_percentage%)"
        else
            print_error "System load is critical ($load_percentage%)"
        fi
    fi
}

# Function to check service status (for staging/production)
check_service_status() {
    local env=$1
    
    if [ "$env" = "development" ]; then
        print_status "Skipping service status check for development environment"
        return 0
    fi
    
    print_status "Checking service status..."
    
    local services=("storyslip-api-$env" "storyslip-dashboard-$env" "storyslip-marketing-$env")
    
    for service in "${services[@]}"; do
        if command_exists systemctl; then
            if systemctl is-active --quiet "$service" 2>/dev/null; then
                print_success "Service $service is running"
            else
                print_error "Service $service is not running"
            fi
        else
            print_warning "systemctl not found. Skipping service status checks"
            break
        fi
    done
}

# Function to check log files
check_log_files() {
    local env=$1
    
    print_status "Checking log files..."
    
    local log_paths=()
    
    case $env in
        development)
            log_paths=("logs/development.log" "packages/api/logs/api.log")
            ;;
        staging|production)
            log_paths=("/var/log/storyslip/$env.log" "/var/log/storyslip/api-$env.log")
            ;;
    esac
    
    for log_path in "${log_paths[@]}"; do
        if [ -f "$log_path" ]; then
            local error_count=$(grep -c "ERROR\|CRITICAL" "$log_path" 2>/dev/null || echo "0")
            local recent_errors=$(tail -n 100 "$log_path" | grep -c "ERROR\|CRITICAL" 2>/dev/null || echo "0")
            
            if [ "$recent_errors" -eq 0 ]; then
                print_success "No recent errors in $log_path"
            elif [ "$recent_errors" -lt 5 ]; then
                print_warning "$recent_errors recent errors in $log_path"
            else
                print_error "$recent_errors recent errors in $log_path"
            fi
        else
            print_warning "Log file not found: $log_path"
        fi
    done
}

# Function to check external dependencies
check_external_dependencies() {
    local env=$1
    
    print_status "Checking external dependencies..."
    
    # Check Supabase
    if [ -n "$SUPABASE_URL" ]; then
        if check_http_endpoint "$SUPABASE_URL/rest/v1/" "Supabase API"; then
            print_success "Supabase is accessible"
        else
            print_error "Supabase is not accessible"
        fi
    fi
    
    # Check Redis (if configured)
    if [ -n "$REDIS_URL" ] && command_exists redis-cli; then
        if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
            print_success "Redis is accessible"
        else
            print_error "Redis is not accessible"
        fi
    fi
    
    # Check email service (if configured)
    if [ -n "$SMTP_HOST" ] && command_exists nc; then
        if nc -z "$SMTP_HOST" "${SMTP_PORT:-587}" >/dev/null 2>&1; then
            print_success "SMTP server is accessible"
        else
            print_error "SMTP server is not accessible"
        fi
    fi
}

# Function to generate health report
generate_health_report() {
    local env=$1
    local overall_status=$2
    
    local report_file="health-report-$env-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "environment": "$env",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "overall_status": "$overall_status",
  "checks": {
    "api_health": $(check_api_health "$env" "$API_URL" >/dev/null 2>&1 && echo "true" || echo "false"),
    "database_health": $(check_database_health "$env" >/dev/null 2>&1 && echo "true" || echo "false"),
    "system_resources": "checked",
    "external_dependencies": "checked"
  },
  "urls": {
    "api": "$API_URL",
    "dashboard": "$DASHBOARD_URL",
    "marketing": "$MARKETING_URL",
    "widget_cdn": "$WIDGET_CDN_URL"
  },
  "generated_by": "$(whoami)",
  "script_version": "1.0.0"
}
EOF

    print_success "Health report generated: $report_file"
}

# Function to send health status to monitoring
send_monitoring_data() {
    local env=$1
    local status=$2
    
    if [ -n "$MONITORING_WEBHOOK_URL" ] && command_exists curl; then
        local monitoring_data="{
            \"environment\": \"$env\",
            \"status\": \"$status\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"check_type\": \"health_check\",
            \"executed_by\": \"$(whoami)\"
        }"
        
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$monitoring_data" >/dev/null 2>&1 || print_warning "Failed to send monitoring data"
    fi
}

# Main function
main() {
    local env=${1:-development}
    local check_type=${2:-full}
    
    print_status "StorySlip Environment Health Check"
    print_status "Environment: $env"
    print_status "Check Type: $check_type"
    echo
    
    validate_environment "$env"
    get_environment_urls "$env"
    
    # Load environment variables
    if [ -f "environments/$env/.env.$env" ]; then
        source "environments/$env/.env.$env"
    fi
    
    local failed_checks=0
    local total_checks=0
    
    case $check_type in
        full)
            # Run all health checks
            print_status "Running comprehensive health checks..."
            echo
            
            # API Health Check
            ((total_checks++))
            if ! check_api_health "$env" "$API_URL"; then
                ((failed_checks++))
            fi
            echo
            
            # Dashboard Health Check
            ((total_checks++))
            if ! check_http_endpoint "$DASHBOARD_URL" "Dashboard"; then
                ((failed_checks++))
            fi
            echo
            
            # Marketing Site Health Check
            ((total_checks++))
            if ! check_http_endpoint "$MARKETING_URL" "Marketing Site"; then
                ((failed_checks++))
            fi
            echo
            
            # Database Health Check
            ((total_checks++))
            if ! check_database_health "$env"; then
                ((failed_checks++))
            fi
            echo
            
            # SSL Certificate Check
            check_ssl_certificates "$env" "$API_URL" "$DASHBOARD_URL" "$MARKETING_URL"
            echo
            
            # DNS Resolution Check
            check_dns_resolution "$env" "$API_URL" "$DASHBOARD_URL" "$MARKETING_URL"
            echo
            
            # System Resources Check
            check_system_resources "$env"
            echo
            
            # Service Status Check
            check_service_status "$env"
            echo
            
            # Log Files Check
            check_log_files "$env"
            echo
            
            # External Dependencies Check
            check_external_dependencies "$env"
            echo
            ;;
            
        quick)
            # Run basic health checks only
            print_status "Running quick health checks..."
            echo
            
            ((total_checks++))
            if ! check_api_health "$env" "$API_URL"; then
                ((failed_checks++))
            fi
            
            ((total_checks++))
            if ! check_http_endpoint "$DASHBOARD_URL" "Dashboard"; then
                ((failed_checks++))
            fi
            
            ((total_checks++))
            if ! check_http_endpoint "$MARKETING_URL" "Marketing Site"; then
                ((failed_checks++))
            fi
            ;;
            
        api)
            # Check API only
            ((total_checks++))
            if ! check_api_health "$env" "$API_URL"; then
                ((failed_checks++))
            fi
            ;;
            
        *)
            print_error "Invalid check type: $check_type"
            print_error "Valid types: full, quick, api"
            exit 1
            ;;
    esac
    
    # Generate summary
    echo
    print_status "Health Check Summary"
    print_status "==================="
    
    local success_rate=$(( (total_checks - failed_checks) * 100 / total_checks ))
    
    if [ $failed_checks -eq 0 ]; then
        print_success "All health checks passed! ($total_checks/$total_checks)"
        local overall_status="healthy"
    elif [ $success_rate -ge 80 ]; then
        print_warning "Some health checks failed ($((total_checks - failed_checks))/$total_checks passed)"
        local overall_status="degraded"
    else
        print_error "Multiple health checks failed ($((total_checks - failed_checks))/$total_checks passed)"
        local overall_status="unhealthy"
    fi
    
    # Generate report and send monitoring data
    generate_health_report "$env" "$overall_status"
    send_monitoring_data "$env" "$overall_status"
    
    # Exit with appropriate code
    if [ $failed_checks -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment> [check_type]"
    echo
    echo "Environments:"
    echo "  development  - Local development environment"
    echo "  staging      - Staging environment"
    echo "  production   - Production environment"
    echo
    echo "Check Types:"
    echo "  full         - Comprehensive health check (default)"
    echo "  quick        - Basic health check"
    echo "  api          - API health check only"
    echo
    echo "Examples:"
    echo "  $0 development full"
    echo "  $0 staging quick"
    echo "  $0 production api"
    exit 1
fi

# Run main function with arguments
main "$@"