#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_DB=${POSTGRES_DB:-storyslip}
POSTGRES_USER=${POSTGRES_USER:-storyslip}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET}
RETENTION_DAYS=${RETENTION_DAYS:-7}
BACKUP_DIR="/backups"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="storyslip_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
BACKUP_PATH_GZ="${BACKUP_DIR}/${BACKUP_FILE_GZ}"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create database backup
create_backup() {
    log "Creating database backup: $BACKUP_FILE"
    
    # Set PostgreSQL password
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create backup
    if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=plain \
        --file="$BACKUP_PATH"; then
        log "Database backup created successfully"
    else
        error "Failed to create database backup"
        return 1
    fi
    
    # Compress backup
    log "Compressing backup file..."
    if gzip "$BACKUP_PATH"; then
        log "Backup compressed successfully: $BACKUP_FILE_GZ"
    else
        error "Failed to compress backup"
        return 1
    fi
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH_GZ" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
}

# Upload backup to S3
upload_to_s3() {
    if [ -z "$S3_BACKUP_BUCKET" ]; then
        warn "S3_BACKUP_BUCKET not configured, skipping S3 upload"
        return 0
    fi
    
    log "Uploading backup to S3: s3://$S3_BACKUP_BUCKET/"
    
    # Upload to S3
    if aws s3 cp "$BACKUP_PATH_GZ" "s3://$S3_BACKUP_BUCKET/daily/" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=$TIMESTAMP,database=$POSTGRES_DB"; then
        log "Backup uploaded to S3 successfully"
    else
        error "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Clean up local backups
    find "$BACKUP_DIR" -name "storyslip_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Clean up S3 backups (if configured)
    if [ -n "$S3_BACKUP_BUCKET" ]; then
        # Calculate cutoff date
        CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        # List and delete old backups
        aws s3 ls "s3://$S3_BACKUP_BUCKET/daily/" | while read -r line; do
            BACKUP_DATE=$(echo "$line" | awk '{print $1}')
            BACKUP_NAME=$(echo "$line" | awk '{print $4}')
            
            if [[ "$BACKUP_DATE" < "$CUTOFF_DATE" ]]; then
                log "Deleting old S3 backup: $BACKUP_NAME"
                aws s3 rm "s3://$S3_BACKUP_BUCKET/daily/$BACKUP_NAME"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [ ! -f "$BACKUP_PATH_GZ" ] || [ ! -s "$BACKUP_PATH_GZ" ]; then
        error "Backup file is missing or empty"
        return 1
    fi
    
    # Test gzip integrity
    if ! gzip -t "$BACKUP_PATH_GZ"; then
        error "Backup file is corrupted"
        return 1
    fi
    
    # Test SQL content (basic check)
    if ! zcat "$BACKUP_PATH_GZ" | head -n 10 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to be a valid PostgreSQL dump"
        return 1
    fi
    
    log "Backup verification passed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        if [ "$status" = "error" ]; then
            color="danger"
        elif [ "$status" = "warning" ]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"StorySlip Backup $status\",\"text\":\"$message\",\"ts\":$(date +%s)}]}" \
            "$SLACK_WEBHOOK" || true
    fi
    
    # Log the notification
    if [ "$status" = "error" ]; then
        error "$message"
    elif [ "$status" = "warning" ]; then
        warn "$message"
    else
        log "$message"
    fi
}

# Update backup metrics
update_metrics() {
    local status=$1
    local backup_size_bytes=$2
    
    # Create metrics file for Prometheus
    cat > /tmp/backup_metrics.prom << EOF
# HELP backup_last_success_timestamp Last successful backup timestamp
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp $(date +%s)

# HELP backup_size_bytes Size of the last backup in bytes
# TYPE backup_size_bytes gauge
backup_size_bytes $backup_size_bytes

# HELP backup_status Status of the last backup (1=success, 0=failure)
# TYPE backup_status gauge
backup_status $status
EOF
    
    # Copy to shared volume if available
    if [ -d "/metrics" ]; then
        cp /tmp/backup_metrics.prom /metrics/backup_metrics.prom
    fi
}

# Main backup function
main() {
    log "Starting backup process..."
    
    # Validate required environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        error "POSTGRES_PASSWORD is required"
        send_notification "error" "Backup failed: POSTGRES_PASSWORD not configured"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Start backup process
    local start_time=$(date +%s)
    
    if create_backup && verify_backup; then
        # Get backup size in bytes
        local backup_size_bytes=$(stat -c%s "$BACKUP_PATH_GZ")
        
        # Upload to S3
        upload_to_s3
        
        # Clean up old backups
        cleanup_old_backups
        
        # Calculate duration
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Update metrics
        update_metrics 1 "$backup_size_bytes"
        
        # Send success notification
        send_notification "success" "Backup completed successfully in ${duration}s. Size: $(du -h "$BACKUP_PATH_GZ" | cut -f1)"
        
        log "Backup process completed successfully"
    else
        # Update metrics
        update_metrics 0 0
        
        # Send failure notification
        send_notification "error" "Backup process failed"
        
        error "Backup process failed"
        exit 1
    fi
}

# Handle signals
trap 'log "Backup interrupted"; exit 1' TERM INT

# Run main function
main "$@"