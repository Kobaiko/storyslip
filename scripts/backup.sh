#!/bin/bash

# Backup and Disaster Recovery Script for StorySlip CMS
# This script handles automated backups and disaster recovery procedures

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

# AWS Configuration (if using S3 for remote backups)
S3_BUCKET="${S3_BUCKET:-storyslip-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Retention settings
DAILY_RETENTION_DAYS="${DAILY_RETENTION_DAYS:-7}"
WEEKLY_RETENTION_WEEKS="${WEEKLY_RETENTION_WEEKS:-4}"
MONTHLY_RETENTION_MONTHS="${MONTHLY_RETENTION_MONTHS:-12}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[ERROR] $1"
    echo -e "${RED}${message}${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Check if required tools are installed
check_dependencies() {
    local missing_tools=()
    
    if ! command -v pg_dump &> /dev/null; then
        missing_tools+=("pg_dump")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_tools+=("psql")
    fi
    
    if [ "$1" = "s3" ] && ! command -v aws &> /dev/null; then
        missing_tools+=("aws")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
}

# Check environment variables
check_env() {
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi
}

# Create backup directories
create_backup_dirs() {
    local dirs=("$BACKUP_DIR" "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly" "$BACKUP_DIR/files")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
}

# Generate backup filename
generate_backup_filename() {
    local backup_type="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    echo "storyslip_${backup_type}_${timestamp}.sql"
}

# Create database backup
create_database_backup() {
    local backup_type="$1"
    local backup_dir="$BACKUP_DIR/$backup_type"
    local backup_filename=$(generate_backup_filename "$backup_type")
    local backup_path="$backup_dir/$backup_filename"
    
    log "Creating $backup_type database backup: $backup_filename"
    
    # Create backup with compression
    if pg_dump "$DATABASE_URL" | gzip > "${backup_path}.gz"; then
        success "Database backup created: ${backup_path}.gz"
        
        # Verify backup integrity
        if gunzip -t "${backup_path}.gz"; then
            success "Backup integrity verified"
            echo "${backup_path}.gz"
        else
            error "Backup integrity check failed"
            rm -f "${backup_path}.gz"
            exit 1
        fi
    else
        error "Failed to create database backup"
        exit 1
    fi
}

# Create file system backup (uploads, logs, etc.)
create_file_backup() {
    local backup_type="$1"
    local backup_dir="$BACKUP_DIR/files"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_filename="storyslip_files_${backup_type}_${timestamp}.tar.gz"
    local backup_path="$backup_dir/$backup_filename"
    
    log "Creating $backup_type file system backup: $backup_filename"
    
    # Directories to backup
    local backup_dirs=(
        "$PROJECT_ROOT/packages/api/uploads"
        "$PROJECT_ROOT/packages/api/logs"
        "$PROJECT_ROOT/packages/dashboard/dist"
        "$PROJECT_ROOT/packages/widget/dist"
    )
    
    # Create tar archive
    local tar_args=()
    for dir in "${backup_dirs[@]}"; do
        if [ -d "$dir" ]; then
            tar_args+=("$dir")
        fi
    done
    
    if [ ${#tar_args[@]} -gt 0 ]; then
        if tar -czf "$backup_path" "${tar_args[@]}" 2>/dev/null; then
            success "File system backup created: $backup_path"
            echo "$backup_path"
        else
            warning "Some files may not have been backed up"
            echo "$backup_path"
        fi
    else
        warning "No directories found to backup"
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    local s3_key="$backup_type/$(basename "$backup_file")"
    
    log "Uploading backup to S3: s3://$S3_BUCKET/$s3_key"
    
    if aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" --region "$AWS_REGION"; then
        success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
        
        # Set lifecycle policy for automatic cleanup
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "$s3_key" \
            --tagging "TagSet=[{Key=backup-type,Value=$backup_type},{Key=created,Value=$(date +%Y-%m-%d)}]" \
            --region "$AWS_REGION" || warning "Failed to set S3 object tags"
    else
        error "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    local backup_type="$1"
    local retention_days="$2"
    local backup_dir="$BACKUP_DIR/$backup_type"
    
    log "Cleaning up old $backup_type backups (retention: $retention_days days)"
    
    if [ -d "$backup_dir" ]; then
        local deleted_count=0
        
        # Find and delete old backup files
        while IFS= read -r -d '' file; do
            rm -f "$file"
            deleted_count=$((deleted_count + 1))
            log "Deleted old backup: $(basename "$file")"
        done < <(find "$backup_dir" -name "*.sql.gz" -type f -mtime +$retention_days -print0)
        
        if [ $deleted_count -gt 0 ]; then
            success "Cleaned up $deleted_count old $backup_type backup(s)"
        else
            log "No old $backup_type backups to clean up"
        fi
    fi
}

# Perform daily backup
daily_backup() {
    log "Starting daily backup"
    
    local db_backup=$(create_database_backup "daily")
    local file_backup=$(create_file_backup "daily")
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$db_backup" "daily"
        upload_to_s3 "$file_backup" "daily"
    fi
    
    # Cleanup old daily backups
    cleanup_old_backups "daily" "$DAILY_RETENTION_DAYS"
    
    success "Daily backup completed"
}

# Perform weekly backup
weekly_backup() {
    log "Starting weekly backup"
    
    local db_backup=$(create_database_backup "weekly")
    local file_backup=$(create_file_backup "weekly")
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$db_backup" "weekly"
        upload_to_s3 "$file_backup" "weekly"
    fi
    
    # Cleanup old weekly backups
    cleanup_old_backups "weekly" $((WEEKLY_RETENTION_WEEKS * 7))
    
    success "Weekly backup completed"
}

# Perform monthly backup
monthly_backup() {
    log "Starting monthly backup"
    
    local db_backup=$(create_database_backup "monthly")
    local file_backup=$(create_file_backup "monthly")
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$db_backup" "monthly"
        upload_to_s3 "$file_backup" "monthly"
    fi
    
    # Cleanup old monthly backups
    cleanup_old_backups "monthly" $((MONTHLY_RETENTION_MONTHS * 30))
    
    success "Monthly backup completed"
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    
    for backup_type in daily weekly monthly; do
        local backup_dir="$BACKUP_DIR/$backup_type"
        if [ -d "$backup_dir" ] && [ "$(ls -A "$backup_dir")" ]; then
            echo "=== $backup_type backups ==="
            ls -lah "$backup_dir"/*.sql.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No backups found"
            echo ""
        fi
    done
    
    # List S3 backups if configured
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        echo "=== S3 backups ==="
        aws s3 ls "s3://$S3_BUCKET/" --recursive --region "$AWS_REGION" | grep "\.sql\.gz$" | tail -20
    fi
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file path is required"
        exit 1
    fi
    
    # Check if it's an S3 path
    if [[ "$backup_file" == s3://* ]]; then
        local temp_file="/tmp/$(basename "$backup_file")"
        log "Downloading backup from S3: $backup_file"
        
        if aws s3 cp "$backup_file" "$temp_file" --region "$AWS_REGION"; then
            backup_file="$temp_file"
        else
            error "Failed to download backup from S3"
            exit 1
        fi
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    warning "This will completely replace the current database!"
    warning "Current database will be backed up before restore"
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    # Create backup of current database before restore
    log "Creating backup of current database before restore"
    local pre_restore_backup=$(create_database_backup "pre-restore")
    
    log "Restoring database from backup: $(basename "$backup_file")"
    
    # Extract database name from URL
    local db_name=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
    local base_url=$(echo "$DATABASE_URL" | sed 's/\/[^\/]*$//')
    
    # Drop and recreate database
    psql "$base_url/postgres" -c "DROP DATABASE IF EXISTS $db_name;"
    psql "$base_url/postgres" -c "CREATE DATABASE $db_name;"
    
    # Restore from backup
    if gunzip -c "$backup_file" | psql "$DATABASE_URL"; then
        success "Database restored successfully from: $(basename "$backup_file")"
        success "Pre-restore backup saved as: $(basename "$pre_restore_backup")"
    else
        error "Failed to restore database"
        warning "You can restore the pre-restore backup if needed: $(basename "$pre_restore_backup")"
        exit 1
    fi
    
    # Clean up temporary file if it was downloaded from S3
    if [[ "$1" == s3://* ]] && [ -f "/tmp/$(basename "$1")" ]; then
        rm -f "/tmp/$(basename "$1")"
    fi
}

# Test backup integrity
test_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file path is required"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Testing backup integrity: $(basename "$backup_file")"
    
    # Test gzip integrity
    if gunzip -t "$backup_file"; then
        success "Backup file compression is valid"
    else
        error "Backup file is corrupted"
        exit 1
    fi
    
    # Test SQL syntax (basic check)
    if gunzip -c "$backup_file" | head -100 | grep -q "PostgreSQL database dump"; then
        success "Backup appears to be a valid PostgreSQL dump"
    else
        warning "Backup may not be a valid PostgreSQL dump"
    fi
    
    success "Backup integrity test completed"
}

# Show backup statistics
show_stats() {
    log "Backup Statistics"
    echo "=================="
    
    for backup_type in daily weekly monthly; do
        local backup_dir="$BACKUP_DIR/$backup_type"
        if [ -d "$backup_dir" ]; then
            local count=$(find "$backup_dir" -name "*.sql.gz" -type f | wc -l)
            local size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
            echo "$backup_type: $count backups, $size total"
        fi
    done
    
    echo ""
    echo "Retention Settings:"
    echo "Daily: $DAILY_RETENTION_DAYS days"
    echo "Weekly: $WEEKLY_RETENTION_WEEKS weeks"
    echo "Monthly: $MONTHLY_RETENTION_MONTHS months"
    
    if [ -n "$S3_BUCKET" ]; then
        echo ""
        echo "S3 Configuration:"
        echo "Bucket: $S3_BUCKET"
        echo "Region: $AWS_REGION"
    fi
}

# Show help
show_help() {
    echo "StorySlip Backup and Disaster Recovery Tool"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  daily             Create daily backup"
    echo "  weekly            Create weekly backup"
    echo "  monthly           Create monthly backup"
    echo "  list              List available backups"
    echo "  restore FILE      Restore from backup file"
    echo "  test FILE         Test backup integrity"
    echo "  stats             Show backup statistics"
    echo "  cleanup           Clean up old backups"
    echo "  help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL                PostgreSQL connection string (required)"
    echo "  S3_BUCKET                   S3 bucket for remote backups (optional)"
    echo "  AWS_REGION                  AWS region (default: us-east-1)"
    echo "  DAILY_RETENTION_DAYS        Daily backup retention (default: 7)"
    echo "  WEEKLY_RETENTION_WEEKS      Weekly backup retention (default: 4)"
    echo "  MONTHLY_RETENTION_MONTHS    Monthly backup retention (default: 12)"
    echo ""
    echo "Examples:"
    echo "  $0 daily                           # Create daily backup"
    echo "  $0 restore backup.sql.gz           # Restore from local backup"
    echo "  $0 restore s3://bucket/backup.gz   # Restore from S3 backup"
    echo "  $0 test backup.sql.gz              # Test backup integrity"
    echo ""
}

# Main script logic
main() {
    check_env
    create_backup_dirs
    
    case "${1:-help}" in
        "daily")
            check_dependencies "s3"
            daily_backup
            ;;
        "weekly")
            check_dependencies "s3"
            weekly_backup
            ;;
        "monthly")
            check_dependencies "s3"
            monthly_backup
            ;;
        "list")
            list_backups
            ;;
        "restore")
            check_dependencies "s3"
            restore_backup "$2"
            ;;
        "test")
            test_backup "$2"
            ;;
        "stats")
            show_stats
            ;;
        "cleanup")
            cleanup_old_backups "daily" "$DAILY_RETENTION_DAYS"
            cleanup_old_backups "weekly" $((WEEKLY_RETENTION_WEEKS * 7))
            cleanup_old_backups "monthly" $((MONTHLY_RETENTION_MONTHS * 30))
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"