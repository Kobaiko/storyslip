#!/bin/bash

# StorySlip Database Migration Script for Different Environments
# This script handles database migrations across development, staging, and production

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

# Function to setup Supabase connection
setup_supabase_connection() {
    local env=$1
    
    print_status "Setting up Supabase connection for $env..."
    
    if ! command_exists supabase; then
        print_error "Supabase CLI not found. Please install it first."
        print_error "Visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    
    case $env in
        development)
            if [ -n "$SUPABASE_PROJECT_REF_DEV" ]; then
                supabase link --project-ref "$SUPABASE_PROJECT_REF_DEV"
            else
                print_warning "SUPABASE_PROJECT_REF_DEV not set. Using default project."
            fi
            ;;
        staging)
            if [ -n "$SUPABASE_PROJECT_REF_STAGING" ]; then
                supabase link --project-ref "$SUPABASE_PROJECT_REF_STAGING"
            else
                print_error "SUPABASE_PROJECT_REF_STAGING not set."
                exit 1
            fi
            ;;
        production)
            if [ -n "$SUPABASE_PROJECT_REF_PRODUCTION" ]; then
                supabase link --project-ref "$SUPABASE_PROJECT_REF_PRODUCTION"
            else
                print_error "SUPABASE_PROJECT_REF_PRODUCTION not set."
                exit 1
            fi
            ;;
    esac
    
    print_success "Supabase connection established for $env"
}

# Function to backup database
backup_database() {
    local env=$1
    local backup_name="backup-$env-$(date +%Y%m%d-%H%M%S)"
    
    print_status "Creating database backup for $env..."
    
    # Create backups directory
    mkdir -p backups/$env
    
    # Create backup
    if supabase db dump --file "backups/$env/$backup_name.sql"; then
        print_success "Database backup created: backups/$env/$backup_name.sql"
        echo "$backup_name" > "backups/$env/latest-backup.txt"
    else
        print_error "Failed to create database backup"
        exit 1
    fi
}

# Function to run migrations
run_migrations() {
    local env=$1
    local dry_run=${2:-false}
    
    print_status "Running database migrations for $env..."
    
    # Change to API directory where migrations are located
    cd packages/api
    
    # Load environment variables
    if [ -f ".env" ]; then
        source .env
    else
        print_error "Environment file not found: packages/api/.env"
        exit 1
    fi
    
    if [ "$dry_run" = "true" ]; then
        print_status "Running dry-run migration check..."
        if supabase db push --dry-run; then
            print_success "Dry-run migration check passed"
        else
            print_error "Dry-run migration check failed"
            exit 1
        fi
    else
        # Run actual migrations
        if supabase db push; then
            print_success "Database migrations completed successfully"
        else
            print_error "Database migrations failed"
            exit 1
        fi
    fi
    
    cd ../..
}

# Function to verify migration
verify_migration() {
    local env=$1
    
    print_status "Verifying database migration for $env..."
    
    # Check database connectivity
    if supabase db ping; then
        print_success "Database connectivity verified"
    else
        print_error "Database connectivity check failed"
        exit 1
    fi
    
    # Run migration status check
    cd packages/api
    
    if npm run migrate:status; then
        print_success "Migration status check passed"
    else
        print_warning "Migration status check returned warnings"
    fi
    
    cd ../..
}

# Function to rollback migration
rollback_migration() {
    local env=$1
    local backup_name=$2
    
    print_warning "Rolling back database migration for $env..."
    
    if [ -z "$backup_name" ]; then
        # Use latest backup
        if [ -f "backups/$env/latest-backup.txt" ]; then
            backup_name=$(cat "backups/$env/latest-backup.txt")
        else
            print_error "No backup found for rollback"
            exit 1
        fi
    fi
    
    local backup_file="backups/$env/$backup_name.sql"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will restore the database to backup: $backup_name"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if supabase db reset --file "$backup_file"; then
            print_success "Database rollback completed"
        else
            print_error "Database rollback failed"
            exit 1
        fi
    else
        print_status "Rollback cancelled"
        exit 0
    fi
}

# Function to run migration tests
run_migration_tests() {
    local env=$1
    
    print_status "Running migration tests for $env..."
    
    cd packages/api
    
    # Run database tests
    if npm run test:db; then
        print_success "Database tests passed"
    else
        print_error "Database tests failed"
        exit 1
    fi
    
    # Run integration tests
    if npm run test:integration; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        exit 1
    fi
    
    cd ../..
}

# Function to generate migration report
generate_migration_report() {
    local env=$1
    
    print_status "Generating migration report for $env..."
    
    local report_file="migration-report-$env-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Database Migration Report - $env

**Date:** $(date)
**Environment:** $env
**Executed by:** $(whoami)

## Migration Summary

$(cd packages/api && npm run migrate:status 2>/dev/null || echo "Migration status not available")

## Database Schema

$(supabase db diff --schema public 2>/dev/null || echo "Schema diff not available")

## Health Check

$(supabase db ping 2>/dev/null && echo "✅ Database is healthy" || echo "❌ Database health check failed")

## Migration Files Applied

$(ls -la packages/api/migrations/ 2>/dev/null || echo "Migration files not found")

---
Generated by StorySlip Migration Script
EOF

    print_success "Migration report generated: $report_file"
}

# Function to setup monitoring for migrations
setup_migration_monitoring() {
    local env=$1
    
    print_status "Setting up migration monitoring for $env..."
    
    # Create monitoring entry
    local monitoring_data="{
        \"environment\": \"$env\",
        \"migration_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"status\": \"completed\",
        \"executed_by\": \"$(whoami)\",
        \"commit_sha\": \"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\"
    }"
    
    # Log to monitoring system if available
    if command_exists curl && [ -n "$MONITORING_WEBHOOK_URL" ]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$monitoring_data" || print_warning "Failed to send monitoring data"
    fi
    
    print_success "Migration monitoring setup completed"
}

# Main function
main() {
    local env=${1:-development}
    local action=${2:-migrate}
    local backup_name=${3:-}
    
    print_status "StorySlip Database Migration"
    print_status "Environment: $env"
    print_status "Action: $action"
    echo
    
    validate_environment "$env"
    
    # Load environment-specific variables
    if [ -f "environments/$env/.env.$env" ]; then
        source "environments/$env/.env.$env"
    fi
    
    case $action in
        migrate)
            setup_supabase_connection "$env"
            
            # Create backup for staging/production
            if [[ "$env" == "staging" || "$env" == "production" ]]; then
                backup_database "$env"
            fi
            
            # Run dry-run first for production
            if [ "$env" == "production" ]; then
                run_migrations "$env" true
            fi
            
            run_migrations "$env"
            verify_migration "$env"
            run_migration_tests "$env"
            generate_migration_report "$env"
            setup_migration_monitoring "$env"
            
            print_success "Migration completed successfully for $env!"
            ;;
            
        rollback)
            setup_supabase_connection "$env"
            rollback_migration "$env" "$backup_name"
            verify_migration "$env"
            generate_migration_report "$env"
            
            print_success "Rollback completed successfully for $env!"
            ;;
            
        backup)
            setup_supabase_connection "$env"
            backup_database "$env"
            ;;
            
        verify)
            setup_supabase_connection "$env"
            verify_migration "$env"
            ;;
            
        test)
            run_migration_tests "$env"
            ;;
            
        status)
            setup_supabase_connection "$env"
            cd packages/api
            npm run migrate:status
            cd ../..
            ;;
            
        *)
            print_error "Invalid action: $action"
            print_error "Valid actions: migrate, rollback, backup, verify, test, status"
            exit 1
            ;;
    esac
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment> [action] [backup_name]"
    echo
    echo "Environments:"
    echo "  development  - Local development environment"
    echo "  staging      - Staging environment"
    echo "  production   - Production environment"
    echo
    echo "Actions:"
    echo "  migrate      - Run database migrations (default)"
    echo "  rollback     - Rollback to previous backup"
    echo "  backup       - Create database backup"
    echo "  verify       - Verify database health"
    echo "  test         - Run migration tests"
    echo "  status       - Show migration status"
    echo
    echo "Examples:"
    echo "  $0 development migrate"
    echo "  $0 staging backup"
    echo "  $0 production rollback backup-production-20240131-120000"
    echo "  $0 staging verify"
    exit 1
fi

# Run main function with arguments
main "$@"