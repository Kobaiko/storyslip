#!/bin/bash

# StorySlip Production Readiness Test Script
# This script validates that the application is ready for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[TEST]${NC} $1"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local is_critical="${3:-true}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_status "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        print_success "$test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            print_error "$test_name"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        else
            print_warning "$test_name"
            WARNING_TESTS=$((WARNING_TESTS + 1))
            return 0
        fi
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment variable
check_env_var() {
    local var_name="$1"
    local is_critical="${2:-true}"
    
    if [ -n "${!var_name}" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check file exists
check_file_exists() {
    local file_path="$1"
    [ -f "$file_path" ]
}

# Function to check directory exists
check_dir_exists() {
    local dir_path="$1"
    [ -d "$dir_path" ]
}

# Function to check URL is accessible
check_url_accessible() {
    local url="$1"
    local timeout="${2:-10}"
    curl -f -s --max-time "$timeout" "$url" >/dev/null 2>&1
}

# Function to check port is open
check_port_open() {
    local host="$1"
    local port="$2"
    local timeout="${3:-5}"
    timeout "$timeout" bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1
}

# Function to check database connection
check_database_connection() {
    if [ -n "$DATABASE_URL" ]; then
        node -e "
            const { Client } = require('pg');
            const client = new Client({ connectionString: process.env.DATABASE_URL });
            client.connect()
                .then(() => client.query('SELECT 1'))
                .then(() => client.end())
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        " >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to check Supabase connection
check_supabase_connection() {
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        curl -f -s -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            "$SUPABASE_URL/rest/v1/" >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to check Node.js version
check_node_version() {
    local required_version="18"
    local current_version=$(node -v | sed 's/v//' | cut -d. -f1)
    [ "$current_version" -ge "$required_version" ]
}

# Function to check npm packages
check_npm_packages() {
    npm list --production --silent >/dev/null 2>&1
}

# Function to check build artifacts
check_build_artifacts() {
    local package_dir="$1"
    local build_dir="$2"
    
    if [ -d "$package_dir" ]; then
        [ -d "$package_dir/$build_dir" ] && [ "$(ls -A "$package_dir/$build_dir" 2>/dev/null)" ]
    else
        return 1
    fi
}

# Function to check SSL certificate
check_ssl_certificate() {
    local domain="$1"
    local cert_file="$2"
    
    if [ -f "$cert_file" ]; then
        # Check if certificate is valid and not expired
        openssl x509 -in "$cert_file" -noout -checkend 86400 >/dev/null 2>&1
    else
        # Try to check online certificate
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
            openssl x509 -noout -checkend 86400 >/dev/null 2>&1
    fi
}

# Function to check disk space
check_disk_space() {
    local required_gb="${1:-10}"
    local available_gb=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    [ "$available_gb" -ge "$required_gb" ]
}

# Function to check memory
check_memory() {
    local required_gb="${1:-4}"
    local available_gb=$(free -g | awk 'NR==2{print $2}')
    [ "$available_gb" -ge "$required_gb" ]
}

# Function to check Docker
check_docker() {
    docker --version >/dev/null 2>&1 && docker ps >/dev/null 2>&1
}

# Function to check Docker Compose
check_docker_compose() {
    docker-compose --version >/dev/null 2>&1
}

# Main test execution
main() {
    print_header "🚀 StorySlip Production Readiness Tests"
    echo "Starting comprehensive production readiness validation..."
    echo ""
    
    # Load environment if available
    if [ -f "environments/production/.env.production" ]; then
        print_status "Loading production environment..."
        source "environments/production/.env.production"
    fi
    
    # System Requirements Tests
    print_header "System Requirements"
    run_test "Node.js version >= 18" "check_node_version"
    run_test "Docker installed and running" "check_docker"
    run_test "Docker Compose available" "check_docker_compose"
    run_test "Git available" "command_exists git"
    run_test "curl available" "command_exists curl"
    run_test "jq available" "command_exists jq" false
    run_test "Sufficient disk space (10GB)" "check_disk_space 10"
    run_test "Sufficient memory (4GB)" "check_memory 4"
    
    echo ""
    
    # Environment Configuration Tests
    print_header "Environment Configuration"
    run_test "NODE_ENV set to production" "[ \"\$NODE_ENV\" = \"production\" ]" false
    run_test "DATABASE_URL configured" "check_env_var DATABASE_URL"
    run_test "SUPABASE_URL configured" "check_env_var SUPABASE_URL"
    run_test "SUPABASE_ANON_KEY configured" "check_env_var SUPABASE_ANON_KEY"
    run_test "JWT_SECRET configured (32+ chars)" "[ \${#JWT_SECRET} -ge 32 ]"
    run_test "SESSION_SECRET configured (32+ chars)" "[ \${#SESSION_SECRET} -ge 32 ]"
    run_test "HTTPS enabled" "[ \"\$HTTPS\" = \"true\" ]" false
    run_test "Secure cookies enabled" "[ \"\$COOKIE_SECURE\" = \"true\" ]" false
    run_test "CORS origins configured" "check_env_var CORS_ORIGINS" false
    
    echo ""
    
    # Security Configuration Tests
    print_header "Security Configuration"
    run_test "Strong JWT secret" "[ \${#JWT_SECRET} -ge 32 ]"
    run_test "Strong session secret" "[ \${#SESSION_SECRET} -ge 32 ]"
    run_test "SMTP configuration" "check_env_var SMTP_HOST" false
    run_test "SSL certificate valid" "check_ssl_certificate \"\$DOMAIN\" \"/etc/nginx/ssl/storyslip.com.crt\"" false
    
    echo ""
    
    # Database Tests
    print_header "Database Configuration"
    run_test "Database connection" "check_database_connection"
    run_test "Supabase connection" "check_supabase_connection"
    
    echo ""
    
    # Application Build Tests
    print_header "Application Build"
    run_test "API build artifacts" "check_build_artifacts packages/api dist"
    run_test "Dashboard build artifacts" "check_build_artifacts packages/dashboard dist"
    run_test "Marketing build artifacts" "check_build_artifacts packages/marketing .next"
    run_test "Widget build artifacts" "check_build_artifacts packages/widget dist"
    
    echo ""
    
    # Dependencies Tests
    print_header "Dependencies"
    run_test "API dependencies installed" "cd packages/api && check_npm_packages"
    run_test "Dashboard dependencies installed" "cd packages/dashboard && check_npm_packages"
    run_test "Marketing dependencies installed" "cd packages/marketing && check_npm_packages"
    run_test "Widget dependencies installed" "cd packages/widget && check_npm_packages"
    
    echo ""
    
    # File Structure Tests
    print_header "File Structure"
    run_test "Docker production config" "check_file_exists docker/production/docker-compose.yml"
    run_test "Nginx configuration" "check_file_exists docker/production/nginx/nginx.conf"
    run_test "Deployment script" "check_file_exists scripts/deploy-production.sh"
    run_test "Environment file" "check_file_exists environments/production/.env.production"
    run_test "Migration files" "check_dir_exists packages/api/migrations"
    
    echo ""
    
    # Optional Services Tests
    print_header "Optional Services"
    run_test "Redis configuration" "check_env_var REDIS_URL" false
    run_test "CDN configuration" "check_env_var CDN_URL" false
    run_test "Backup S3 bucket" "check_env_var BACKUP_S3_BUCKET" false
    run_test "Monitoring password" "check_env_var GRAFANA_ADMIN_PASSWORD" false
    run_test "Notification webhook" "check_env_var SLACK_WEBHOOK_URL" false
    
    echo ""
    
    # Network Tests (if URLs are configured)
    if [ -n "$API_URL" ] || [ -n "$DASHBOARD_URL" ] || [ -n "$MARKETING_URL" ]; then
        print_header "Network Connectivity"
        
        if [ -n "$API_URL" ]; then
            run_test "API URL accessible" "check_url_accessible \"\$API_URL/api/monitoring/health\"" false
        fi
        
        if [ -n "$DASHBOARD_URL" ]; then
            run_test "Dashboard URL accessible" "check_url_accessible \"\$DASHBOARD_URL/health\"" false
        fi
        
        if [ -n "$MARKETING_URL" ]; then
            run_test "Marketing URL accessible" "check_url_accessible \"\$MARKETING_URL/health\"" false
        fi
        
        echo ""
    fi
    
    # Performance Tests
    print_header "Performance Validation"
    
    # Run basic performance tests if available
    if [ -f "packages/api/src/__tests__/simple-performance-test.ts" ]; then
        run_test "API performance test" "cd packages/api && npm run test:performance:simple" false
    fi
    
    if [ -f "packages/api/src/__tests__/simple-security-test.ts" ]; then
        run_test "Security validation test" "cd packages/api && npm run test:security:simple" false
    fi
    
    echo ""
    
    # Summary
    print_header "Test Summary"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Warnings: $WARNING_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "🎉 All critical tests passed! Application is ready for production."
        
        if [ $WARNING_TESTS -gt 0 ]; then
            print_warning "⚠️  $WARNING_TESTS non-critical issues found. Consider addressing them."
        fi
        
        echo ""
        echo "Next steps:"
        echo "1. Review any warnings above"
        echo "2. Run: ./scripts/deploy-production.sh"
        echo "3. Monitor deployment logs"
        echo "4. Verify application functionality"
        
        exit 0
    else
        print_error "❌ $FAILED_TESTS critical tests failed. Application is NOT ready for production."
        
        echo ""
        echo "Required actions:"
        echo "1. Fix all failed tests above"
        echo "2. Re-run this script"
        echo "3. Only deploy after all critical tests pass"
        
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --verbose           Show verbose output"
    echo "  --skip-network          Skip network connectivity tests"
    echo "  --skip-performance      Skip performance tests"
    echo "  --env-file FILE         Use specific environment file"
    echo ""
    echo "Examples:"
    echo "  $0                      Run all tests"
    echo "  $0 --verbose            Run with detailed output"
    echo "  $0 --skip-network       Skip network tests"
    echo ""
}

# Parse command line arguments
VERBOSE=false
SKIP_NETWORK=false
SKIP_PERFORMANCE=false
ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-network)
            SKIP_NETWORK=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE=true
            shift
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Load custom environment file if specified
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    print_status "Loading environment from: $ENV_FILE"
    source "$ENV_FILE"
fi

# Run main function
main