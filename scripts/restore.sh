#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE=${1}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_DB=${POSTGRES_DB:-storyslip}
POSTGRES_USER=${POSTGRES_USER:-storyslip}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
BACKUP_DIR="./backups"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

usage() {
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Examples:"
    echo "  $0 backup_20240115_120000.sql.gz"
    echo "  $0 s3://bucket/backup.sql.gz"
    echo ""
    echo "Available local backups:"
    ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  No local backups found"
}

# Download backup from S3 if needed
download_from_s3() {
    local s3_path=$1
    local local_file="$BACKUP_DIR/$(basename "$s3_path")"
    
    log "Downloading backup from S3: $s3_path"
    
    if aws s3 cp "$s3_path" "$local_file"; then
        log "Backup downloaded successfully: $local_file"
        echo "$local_file"
    else
        error "Failed to download backup from S3"
        return 1
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1
    
    log "Restoring database from: $backup_file"
    
    # Check if backup file exists
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Verify backup file integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted or not a valid gzip file"
        return 1
    fi
    
    # Set PostgreSQL password
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Stop application services
    log "Stopping application services..."
    docker-compose stop api dashboard || warn "Could not stop services (they may not be running)"
    
    # Drop existing database connections
    log "Terminating existing database connections..."
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
    " || warn "Could not terminate connections"
    
    # Drop and recreate database
    log "Dropping and recreating database..."
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DB;"
    
    # Restore database
    log "Restoring database content..."
    if zcat "$backup_file" | psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
        log "Database restored successfully"
    else
        error "Failed to restore database"
        return 1
    fi
    
    # Restart application services
    log "Restarting application services..."
    docker-compose up -d api dashboard || warn "Could not restart services"
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Verify restoration
    log "Verifying database restoration..."
    local table_count=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public';
    " | xargs)
    
    if [ "$table_count" -gt 0 ]; then
        log "Database restoration verified: $table_count tables found"
    else
        error "Database restoration verification failed: no tables found"
        return 1
    fi
}

# Main function
main() {
    log "Starting database restoration..."
    
    # Check if backup file is provided
    if [ -z "$BACKUP_FILE" ]; then
        error "No backup file specified"
        usage
        exit 1
    fi
    
    # Determine backup file path
    local backup_path
    if [[ "$BACKUP_FILE" == s3://* ]]; then
        # Download from S3
        backup_path=$(download_from_s3 "$BACKUP_FILE")
        if [ $? -ne 0 ]; then
            exit 1
        fi
    elif [[ "$BACKUP_FILE" == /* ]]; then
        # Absolute path
        backup_path="$BACKUP_FILE"
    else
        # Relative path (assume it's in backup directory)
        backup_path="$BACKUP_DIR/$BACKUP_FILE"
    fi
    
    # Confirm restoration
    warn "This will completely replace the current database!"
    warn "Database: $POSTGRES_DB on $POSTGRES_HOST"
    warn "Backup file: $backup_path"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restoration cancelled"
        exit 0
    fi
    
    # Perform restoration
    if restore_database "$backup_path"; then
        log "Database restoration completed successfully!"
        
        # Show restoration summary
        echo ""
        log "Restoration Summary:"
        log "  Database: $POSTGRES_DB"
        log "  Backup file: $backup_path"
        log "  Restored at: $(date)"
        
        # Clean up downloaded file if it was from S3
        if [[ "$BACKUP_FILE" == s3://* ]]; then
            rm -f "$backup_path"
            log "Temporary backup file cleaned up"
        fi
    else
        error "Database restoration failed!"
        exit 1
    fi
}

# Handle signals
trap 'log "Restoration interrupted"; exit 1' TERM INT

# Run main function
main "$@"