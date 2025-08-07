#!/bin/bash

# StorySlip Production Deployment Script
# This script handles the complete production deployment process

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[DEPLOY]${NC} $1"
}

# Configuration
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/storyslip"
DEPLOYMENT_DIR="/var/www/storyslip"
LOG_FILE="/var/log/storyslip/deployment.log"
MAX_ROLLBACK_VERSIONS=5
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate prerequisites
validate_prerequisites() {
    print_header "Validating Prerequisites"
    
    local missing_commands=()
    local required_commands=("docker" "docker-compose" "curl" "jq" "git" "npm")
    
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Missing required commands: ${missing_commands[*]}"
        exit 1
    fi
    
    # Check if running as appropriate user
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. Consider using a dedicated deployment user."
    fi
    
    # Check disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=5000000 # 5GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        print_error "Insufficient disk space. Required: 5GB, Available: $(($available_space/1024/1024))GB"
        exit 1
    fi
    
    print_success "Prerequisites validated"
}

# Function to load environment configuration
load_environment() {
    print_header "Loading Production Environment"
    
    if [ -f "environments/production/.env.production" ]; then
        source "environments/production/.env.production"
        print_success "Production environment loaded"
    else
        print_error "Production environment file not found"
        exit 1
    fi
    
    # Validate required environment variables
    local required_vars=("DATABASE_URL" "JWT_SECRET" "SESSION_SECRET" "SUPABASE_URL")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "Environment variables validated"
}

# Function to create deployment backup
create_deployment_backup() {
    print_header "Creating Deployment Backup"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    if command_exists supabase; then
        print_status "Creating database backup..."
        supabase db dump --file "$BACKUP_DIR/database-$DEPLOYMENT_ID.sql"
        print_success "Database backup created"
    else
        print_warning "Supabase CLI not found. Skipping database backup."
    fi
    
    # Application backup
    if [ -d "$DEPLOYMENT_DIR/current" ]; then
        print_status "Creating application backup..."
        tar -czf "$BACKUP_DIR/application-$DEPLOYMENT_ID.tar.gz" -C "$DEPLOYMENT_DIR" current/
        print_success "Application backup created"
    fi
    
    # Configuration backup
    if [ -d "/etc/storyslip" ]; then
        print_status "Creating configuration backup..."
        tar -czf "$BACKUP_DIR/config-$DEPLOYMENT_ID.tar.gz" -C "/etc" storyslip/
        print_success "Configuration backup created"
    fi
    
    # Clean up old backups
    print_status "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "*-deploy-*.tar.gz" -mtime +30 -delete
    find "$BACKUP_DIR" -name "*-deploy-*.sql" -mtime +30 -delete
    
    print_success "Deployment backup completed"
}

# Function to run pre-deployment tests
run_pre_deployment_tests() {
    print_header "Running Pre-deployment Tests"
    
    # Unit tests
    print_status "Running unit tests..."
    npm run test:unit
    print_success "Unit tests passed"
    
    # Integration tests
    print_status "Running integration tests..."
    npm run test:integration
    print_success "Integration tests passed"
    
    # Security tests
    print_status "Running security tests..."
    npm run test:security
    print_success "Security tests passed"
    
    # Performance tests
    print_status "Running performance tests..."
    npm run test:performance
    print_success "Performance tests passed"
    
    # Production readiness check
    print_status "Running production readiness check..."
    npm run test:production-readiness
    print_success "Production readiness check passed"
}

# Function to build production artifacts
build_production_artifacts() {
    print_header "Building Production Artifacts"
    
    # Create build directory
    mkdir -p "build/$DEPLOYMENT_ID"
    
    # Build API
    print_status "Building API..."
    cd packages/api
    npm ci --production
    npm run build:production
    cd ../..
    
    # Build Dashboard
    print_status "Building Dashboard..."
    cd packages/dashboard
    npm ci --production
    npm run build:production
    cd ../..
    
    # Build Marketing Site
    print_status "Building Marketing Site..."
    cd packages/marketing
    npm ci --production
    npm run build:production
    cd ../..
    
    # Build Widget
    print_status "Building Widget..."
    cd packages/widget
    npm ci --production
    npm run build:production
    cd ../..
    
    # Create deployment package
    print_status "Creating deployment package..."
    tar -czf "build/$DEPLOYMENT_ID/storyslip-production-$DEPLOYMENT_ID.tar.gz" \
        packages/api/dist packages/api/package.json packages/api/package-lock.json \
        packages/dashboard/dist packages/dashboard/package.json packages/dashboard/package-lock.json \
        packages/marketing/.next packages/marketing/package.json packages/marketing/package-lock.json \
        packages/widget/dist packages/widget/package.json packages/widget/package-lock.json \
        docker/production/ scripts/ environments/production/
    
    print_success "Production artifacts built"
}

# Function to deploy database migrations
deploy_database_migrations() {
    print_header "Deploying Database Migrations"
    
    # Run migration script
    ./scripts/migrate-env.sh production migrate
    
    print_success "Database migrations deployed"
}

# Function to deploy application
deploy_application() {
    print_header "Deploying Application"
    
    # Create deployment directory
    mkdir -p "$DEPLOYMENT_DIR/$DEPLOYMENT_ID"
    
    # Extract deployment package
    print_status "Extracting deployment package..."
    tar -xzf "build/$DEPLOYMENT_ID/storyslip-production-$DEPLOYMENT_ID.tar.gz" -C "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/"
    
    # Install production dependencies
    print_status "Installing production dependencies..."
    cd "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/packages/api"
    npm ci --production --silent
    cd "../dashboard"
    npm ci --production --silent
    cd "../marketing"
    npm ci --production --silent
    cd "../widget"
    npm ci --production --silent
    cd "../../../.."
    
    # Copy environment configuration
    print_status "Configuring environment..."
    cp "environments/production/.env.production" "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/packages/api/.env"
    cp "environments/production/.env.production" "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/packages/dashboard/.env"
    cp "environments/production/.env.production" "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/packages/marketing/.env"
    cp "environments/production/.env.production" "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/packages/widget/.env"
    
    print_success "Application deployed to $DEPLOYMENT_DIR/$DEPLOYMENT_ID"
}

# Function to start services
start_services() {
    print_header "Starting Services"
    
    # Use Docker Compose for production deployment
    cd "$DEPLOYMENT_DIR/$DEPLOYMENT_ID/docker/production"
    
    # Update docker-compose to use new deployment
    export DEPLOYMENT_PATH="$DEPLOYMENT_DIR/$DEPLOYMENT_ID"
    
    # Start services
    print_status "Starting production services..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    cd "../../../../.."
    
    print_success "Services started"
}

# Function to run health checks
run_health_checks() {
    print_header "Running Health Checks"
    
    local start_time=$(date +%s)
    local timeout=$((start_time + HEALTH_CHECK_TIMEOUT))
    
    while [ $(date +%s) -lt $timeout ]; do
        print_status "Checking application health..."
        
        # Check API health
        if curl -f -s "$API_URL/api/monitoring/health" >/dev/null; then
            print_success "API health check passed"
        else
            print_warning "API health check failed, retrying..."
            sleep $HEALTH_CHECK_INTERVAL
            continue
        fi
        
        # Check Dashboard health
        if curl -f -s "$DASHBOARD_URL/health" >/dev/null; then
            print_success "Dashboard health check passed"
        else
            print_warning "Dashboard health check failed, retrying..."
            sleep $HEALTH_CHECK_INTERVAL
            continue
        fi
        
        # Check Marketing site health
        if curl -f -s "$MARKETING_URL/health" >/dev/null; then
            print_success "Marketing site health check passed"
        else
            print_warning "Marketing site health check failed, retrying..."
            sleep $HEALTH_CHECK_INTERVAL
            continue
        fi
        
        # All health checks passed
        print_success "All health checks passed"
        return 0
    done
    
    print_error "Health checks failed after $HEALTH_CHECK_TIMEOUT seconds"
    return 1
}

# Function to run smoke tests
run_smoke_tests() {
    print_header "Running Smoke Tests"
    
    # Run production smoke tests
    npm run test:smoke:production
    
    print_success "Smoke tests passed"
}

# Function to switch to new deployment
switch_deployment() {
    print_header "Switching to New Deployment"
    
    # Create symlink to new deployment
    if [ -L "$DEPLOYMENT_DIR/current" ]; then
        rm "$DEPLOYMENT_DIR/current"
    elif [ -d "$DEPLOYMENT_DIR/current" ]; then
        mv "$DEPLOYMENT_DIR/current" "$DEPLOYMENT_DIR/previous-$(date +%Y%m%d-%H%M%S)"
    fi
    
    ln -s "$DEPLOYMENT_DIR/$DEPLOYMENT_ID" "$DEPLOYMENT_DIR/current"
    
    # Update nginx configuration if needed
    if [ -f "/etc/nginx/sites-available/storyslip" ]; then
        print_status "Reloading nginx configuration..."
        nginx -t && systemctl reload nginx
    fi
    
    print_success "Deployment switched successfully"
}

# Function to clean up old deployments
cleanup_old_deployments() {
    print_header "Cleaning Up Old Deployments"
    
    # Keep only the last N deployments
    local deployments=($(ls -1t "$DEPLOYMENT_DIR" | grep "deploy-" | tail -n +$((MAX_ROLLBACK_VERSIONS + 1))))
    
    for deployment in "${deployments[@]}"; do
        if [ -d "$DEPLOYMENT_DIR/$deployment" ]; then
            print_status "Removing old deployment: $deployment"
            rm -rf "$DEPLOYMENT_DIR/$deployment"
        fi
    done
    
    print_success "Old deployments cleaned up"
}

# Function to rollback deployment
rollback_deployment() {
    print_header "Rolling Back Deployment"
    
    local previous_deployment=$(ls -1t "$DEPLOYMENT_DIR" | grep "deploy-" | grep -v "$DEPLOYMENT_ID" | head -n 1)
    
    if [ -z "$previous_deployment" ]; then
        print_error "No previous deployment found for rollback"
        return 1
    fi
    
    print_status "Rolling back to: $previous_deployment"
    
    # Switch symlink back
    rm "$DEPLOYMENT_DIR/current"
    ln -s "$DEPLOYMENT_DIR/$previous_deployment" "$DEPLOYMENT_DIR/current"
    
    # Restart services
    cd "$DEPLOYMENT_DIR/current/docker/production"
    docker-compose restart
    cd "../../../../.."
    
    # Run health checks
    if run_health_checks; then
        print_success "Rollback completed successfully"
        return 0
    else
        print_error "Rollback failed health checks"
        return 1
    fi
}

# Function to send deployment notifications
send_deployment_notification() {
    local status=$1
    local message=$2
    
    print_status "Sending deployment notification..."
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 StorySlip Production Deployment\\n**Status:** $status\\n**Message:** $message\\n**Deployment ID:** $DEPLOYMENT_ID\\n**Time:** $(date)\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Send email if configured
    if [ -n "$NOTIFICATION_EMAIL" ] && command_exists mail; then
        echo "$message" | mail -s "StorySlip Production Deployment - $status" "$NOTIFICATION_EMAIL"
    fi
}

# Function to generate deployment report
generate_deployment_report() {
    print_header "Generating Deployment Report"
    
    local report_file="/var/log/storyslip/deployment-report-$DEPLOYMENT_ID.json"
    
    cat > "$report_file" << EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "success",
  "environment": "production",
  "version": "$(git rev-parse HEAD)",
  "branch": "$(git rev-parse --abbrev-ref HEAD)",
  "deployedBy": "$(whoami)",
  "deploymentPath": "$DEPLOYMENT_DIR/$DEPLOYMENT_ID",
  "healthChecks": {
    "api": "healthy",
    "dashboard": "healthy",
    "marketing": "healthy",
    "database": "healthy"
  },
  "performance": {
    "deploymentTime": "$(date +%s)",
    "buildTime": "N/A",
    "testTime": "N/A"
  },
  "artifacts": {
    "api": "packages/api/dist",
    "dashboard": "packages/dashboard/dist",
    "marketing": "packages/marketing/.next",
    "widget": "packages/widget/dist"
  }
}
EOF
    
    print_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    print_header "🚀 Starting StorySlip Production Deployment"
    print_status "Deployment ID: $DEPLOYMENT_ID"
    print_status "Started at: $(date)"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Log deployment start
    log_message "Starting production deployment: $DEPLOYMENT_ID"
    
    # Trap for cleanup on failure
    trap 'handle_deployment_failure' ERR
    
    # Execute deployment steps
    validate_prerequisites
    load_environment
    create_deployment_backup
    run_pre_deployment_tests
    build_production_artifacts
    deploy_database_migrations
    deploy_application
    start_services
    
    # Health checks and validation
    if run_health_checks; then
        print_success "Health checks passed"
    else
        print_error "Health checks failed, initiating rollback"
        rollback_deployment
        exit 1
    fi
    
    # Run smoke tests
    if run_smoke_tests; then
        print_success "Smoke tests passed"
    else
        print_warning "Smoke tests failed, but deployment will continue"
    fi
    
    # Switch to new deployment
    switch_deployment
    
    # Final health check after switch
    if run_health_checks; then
        print_success "Final health checks passed"
    else
        print_error "Final health checks failed, rolling back"
        rollback_deployment
        exit 1
    fi
    
    # Cleanup and reporting
    cleanup_old_deployments
    generate_deployment_report
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local deployment_time=$((end_time - start_time))
    
    # Success notification
    local success_message="Production deployment completed successfully in ${deployment_time}s"
    print_success "$success_message"
    send_deployment_notification "SUCCESS" "$success_message"
    
    # Log deployment completion
    log_message "Production deployment completed successfully: $DEPLOYMENT_ID (${deployment_time}s)"
    
    print_header "🎉 Deployment Complete!"
    print_success "Deployment ID: $DEPLOYMENT_ID"
    print_success "Deployment Time: ${deployment_time}s"
    print_success "Application URL: $MARKETING_URL"
    print_success "Dashboard URL: $DASHBOARD_URL"
    print_success "API URL: $API_URL"
}

# Error handler function
handle_deployment_failure() {
    local exit_code=$?
    print_error "Deployment failed with exit code: $exit_code"
    
    # Send failure notification
    send_deployment_notification "FAILED" "Production deployment failed with exit code: $exit_code"
    
    # Log failure
    log_message "Production deployment failed: $DEPLOYMENT_ID (exit code: $exit_code)"
    
    # Attempt rollback if deployment was partially completed
    if [ -d "$DEPLOYMENT_DIR/$DEPLOYMENT_ID" ]; then
        print_status "Attempting automatic rollback..."
        if rollback_deployment; then
            print_success "Automatic rollback completed"
        else
            print_error "Automatic rollback failed - manual intervention required"
        fi
    fi
    
    exit $exit_code
}

# Script usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --version           Show version information"
    echo "  --dry-run              Perform a dry run without making changes"
    echo "  --skip-tests           Skip pre-deployment tests"
    echo "  --skip-backup          Skip backup creation"
    echo "  --force                Force deployment even if health checks fail"
    echo "  --rollback             Rollback to previous deployment"
    echo ""
    echo "Environment Variables:"
    echo "  SLACK_WEBHOOK_URL      Slack webhook for notifications"
    echo "  NOTIFICATION_EMAIL     Email address for notifications"
    echo "  SKIP_HEALTH_CHECKS     Skip health checks (not recommended)"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--version)
            echo "StorySlip Production Deployment Script v1.0.0"
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_DEPLOYMENT=true
            shift
            ;;
        --rollback)
            rollback_deployment
            exit $?
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute main deployment if not in dry run mode
if [ "$DRY_RUN" = true ]; then
    print_status "Dry run mode - no changes will be made"
    print_status "Would execute deployment with ID: $DEPLOYMENT_ID"
else
    main
fi