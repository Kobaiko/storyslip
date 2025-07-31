FROM alpine:3.18

# Install required packages
RUN apk add --no-cache \
    postgresql-client \
    aws-cli \
    curl \
    bash \
    gzip \
    cron \
    tzdata

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create backup user
RUN addgroup -g 1001 backup && \
    adduser -D -u 1001 -G backup backup

# Create directories
RUN mkdir -p /backups /scripts && \
    chown -R backup:backup /backups /scripts

# Copy backup scripts
COPY backup/scripts/ /scripts/
RUN chmod +x /scripts/*.sh && \
    chown -R backup:backup /scripts

# Switch to backup user
USER backup

# Set working directory
WORKDIR /backups

# Default command
CMD ["/scripts/backup-scheduler.sh"]