#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-"0 2 * * *"}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_DB=${POSTGRES_DB:-storyslip}
POSTGRES_USER=${POSTGRES_USER:-storyslip}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET}
RETENTION_DAYS=${RETENTION_DAYS:-7}

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create cron job
create_cron_job() {
    log "Setting up backup schedule: $BACKUP_SCHEDULE"
    
    # Create crontab entry
    echo "$BACKUP_SCHEDULE /scripts/backup.sh" > /tmp/crontab
    
    # Install crontab
    crontab /tmp/crontab
    
    log "Backup schedule configured successfully"
}

# Health check function
health_check() {
    # Check database connectivity
    if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database"
        return 1
    fi
    
    # Check S3 connectivity
    if [ -n "$S3_BACKUP_BUCKET" ]; then
        if ! aws s3 ls "s3://$S3_BACKUP_BUCKET/" > /dev/null 2>&1; then
            error "Cannot access S3 bucket: $S3_BACKUP_BUCKET"
            return 1
        fi
    fi
    
    log "Health check passed"
    return 0
}

# Run initial backup
initial_backup() {
    log "Running initial backup..."
    if /scripts/backup.sh; then
        log "Initial backup completed successfully"
    else
        error "Initial backup failed"
        exit 1
    fi
}

# Main function
main() {
    log "Starting backup scheduler..."
    
    # Validate required environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        error "POSTGRES_PASSWORD is required"
        exit 1
    fi
    
    # Run health check
    if ! health_check; then
        error "Health check failed"
        exit 1
    fi
    
    # Create cron job
    create_cron_job
    
    # Run initial backup
    initial_backup
    
    # Start cron daemon
    log "Starting cron daemon..."
    exec crond -f -l 2
}

# Handle signals
trap 'log "Received SIGTERM, shutting down..."; exit 0' TERM
trap 'log "Received SIGINT, shutting down..."; exit 0' INT

# Run main function
main "$@"