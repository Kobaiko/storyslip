#!/bin/bash

# Database Migration Script for StorySlip CMS
# This script handles database migrations with rollback capability

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/packages/api"
MIGRATIONS_DIR="$API_DIR/migrations"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Create database backup
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log "Creating database backup: $backup_name"
    
    if pg_dump "$DATABASE_URL" > "$backup_path"; then
        success "Backup created successfully: $backup_path"
        echo "$backup_path"
    else
        error "Failed to create database backup"
        exit 1
    fi
}

# Get current migration version
get_current_version() {
    local version=$(psql "$DATABASE_URL" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs)
    echo "${version:-0}"
}

# Get available migrations
get_available_migrations() {
    find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort
}

# Apply a single migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    local version=$(echo "$migration_name" | grep -o '^[0-9]\+')
    
    log "Applying migration: $migration_name"
    
    # Start transaction
    psql "$DATABASE_URL" -c "BEGIN;"
    
    # Apply migration
    if psql "$DATABASE_URL" -f "$migration_file"; then
        # Record migration in schema_migrations table
        psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version, applied_at) VALUES ('$version', NOW()) ON CONFLICT (version) DO NOTHING;"
        psql "$DATABASE_URL" -c "COMMIT;"
        success "Migration applied successfully: $migration_name"
    else
        psql "$DATABASE_URL" -c "ROLLBACK;"
        error "Failed to apply migration: $migration_name"
        exit 1
    fi
}

# Create schema_migrations table if it doesn't exist
create_migrations_table() {
    log "Ensuring schema_migrations table exists"
    psql "$DATABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    "
}

# Run pending migrations
migrate_up() {
    log "Starting database migration"
    
    create_migrations_table
    
    local current_version=$(get_current_version)
    log "Current migration version: $current_version"
    
    local applied_count=0
    
    for migration_file in $(get_available_migrations); do
        local migration_name=$(basename "$migration_file" .sql)
        local version=$(echo "$migration_name" | grep -o '^[0-9]\+')
        
        if [ "$version" -gt "$current_version" ]; then
            apply_migration "$migration_file"
            applied_count=$((applied_count + 1))
        fi
    done
    
    if [ $applied_count -eq 0 ]; then
        success "Database is up to date"
    else
        success "Applied $applied_count migration(s)"
    fi
}

# Rollback to specific version
migrate_down() {
    local target_version="$1"
    
    if [ -z "$target_version" ]; then
        error "Target version is required for rollback"
        exit 1
    fi
    
    log "Rolling back to version: $target_version"
    
    local current_version=$(get_current_version)
    
    if [ "$target_version" -ge "$current_version" ]; then
        warning "Target version is not lower than current version"
        exit 0
    fi
    
    # This is a simplified rollback - in production, you'd want proper down migrations
    warning "Rollback functionality requires down migration files"
    warning "This will restore from backup instead"
    
    # List available backups
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No backups found"
    
    read -p "Enter backup file name to restore (or 'cancel' to abort): " backup_file
    
    if [ "$backup_file" = "cancel" ]; then
        log "Rollback cancelled"
        exit 0
    fi
    
    if [ -f "$BACKUP_DIR/$backup_file" ]; then
        restore_backup "$BACKUP_DIR/$backup_file"
    else
        error "Backup file not found: $backup_file"
        exit 1
    fi
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    warning "This will completely replace the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring database from backup: $(basename "$backup_file")"
    
    # Drop and recreate database (be very careful with this!)
    local db_name=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
    local base_url=$(echo "$DATABASE_URL" | sed 's/\/[^\/]*$//')
    
    psql "$base_url/postgres" -c "DROP DATABASE IF EXISTS $db_name;"
    psql "$base_url/postgres" -c "CREATE DATABASE $db_name;"
    
    # Restore from backup
    if psql "$DATABASE_URL" < "$backup_file"; then
        success "Database restored successfully"
    else
        error "Failed to restore database"
        exit 1
    fi
}

# Show migration status
show_status() {
    log "Migration Status"
    echo "=================="
    
    create_migrations_table
    
    local current_version=$(get_current_version)
    echo "Current version: $current_version"
    echo ""
    
    echo "Applied migrations:"
    psql "$DATABASE_URL" -c "SELECT version, applied_at FROM schema_migrations ORDER BY version;"
    echo ""
    
    echo "Available migrations:"
    for migration_file in $(get_available_migrations); do
        local migration_name=$(basename "$migration_file" .sql)
        local version=$(echo "$migration_name" | grep -o '^[0-9]\+')
        
        if [ "$version" -le "$current_version" ]; then
            echo "✓ $migration_name (applied)"
        else
            echo "○ $migration_name (pending)"
        fi
    done
}

# Validate migrations
validate_migrations() {
    log "Validating migration files"
    
    local errors=0
    
    for migration_file in $(get_available_migrations); do
        local migration_name=$(basename "$migration_file" .sql)
        local version=$(echo "$migration_name" | grep -o '^[0-9]\+')
        
        if [ -z "$version" ]; then
            error "Invalid migration file name: $migration_name (must start with version number)"
            errors=$((errors + 1))
        fi
        
        # Check if file is readable
        if [ ! -r "$migration_file" ]; then
            error "Cannot read migration file: $migration_file"
            errors=$((errors + 1))
        fi
        
        # Basic SQL syntax check (requires psql)
        if ! psql "$DATABASE_URL" -f "$migration_file" --dry-run 2>/dev/null; then
            warning "Potential SQL syntax issues in: $migration_name"
        fi
    done
    
    if [ $errors -eq 0 ]; then
        success "All migration files are valid"
    else
        error "Found $errors validation error(s)"
        exit 1
    fi
}

# Show help
show_help() {
    echo "StorySlip Database Migration Tool"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  up                Run pending migrations"
    echo "  down VERSION      Rollback to specific version"
    echo "  status            Show migration status"
    echo "  backup            Create database backup"
    echo "  restore FILE      Restore from backup file"
    echo "  validate          Validate migration files"
    echo "  help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL      PostgreSQL connection string (required)"
    echo ""
    echo "Examples:"
    echo "  $0 up                    # Apply all pending migrations"
    echo "  $0 down 005              # Rollback to version 005"
    echo "  $0 backup                # Create a backup"
    echo "  $0 restore backup.sql    # Restore from backup"
    echo ""
}

# Main script logic
main() {
    check_env
    create_backup_dir
    
    case "${1:-help}" in
        "up")
            create_backup
            migrate_up
            ;;
        "down")
            create_backup
            migrate_down "$2"
            ;;
        "status")
            show_status
            ;;
        "backup")
            create_backup
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "validate")
            validate_migrations
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"