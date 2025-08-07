# StorySlip Production Deployment Guide

This guide covers the complete production deployment process for StorySlip, including infrastructure setup, security configuration, monitoring, and maintenance procedures.

## 🚀 Quick Start

For experienced DevOps engineers who want to deploy quickly:

```bash
# 1. Clone and setup
git clone https://github.com/your-org/storyslip.git
cd storyslip

# 2. Configure production environment
cp environments/production/.env.production.example environments/production/.env.production
# Edit the file with your production values

# 3. Run production deployment
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

## 📋 Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ or CentOS 8+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 100GB SSD (500GB recommended)
- **CPU**: Minimum 4 cores (8 cores recommended)
- **Network**: Static IP address with ports 80, 443, 22 accessible

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- npm 8+
- Git 2.30+
- curl, jq, tar, gzip

### External Services

- **Database**: Supabase project (or PostgreSQL 15+)
- **Email**: SMTP service (SendGrid, AWS SES, etc.)
- **Storage**: AWS S3 or compatible (optional)
- **CDN**: CloudFlare or AWS CloudFront (optional)
- **Monitoring**: External monitoring service (optional)

## 🏗️ Infrastructure Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application directories
sudo mkdir -p /var/www/storyslip
sudo mkdir -p /var/log/storyslip
sudo mkdir -p /var/backups/storyslip
sudo chown -R $USER:$USER /var/www/storyslip
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option B: Custom Certificate

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy your certificate files
sudo cp your-certificate.crt /etc/nginx/ssl/storyslip.com.crt
sudo cp your-private-key.key /etc/nginx/ssl/storyslip.com.key
sudo chmod 600 /etc/nginx/ssl/*
```

### 3. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# For monitoring (optional)
sudo ufw allow 3000/tcp  # Grafana
sudo ufw allow 9090/tcp  # Prometheus
```

## 🔧 Environment Configuration

### 1. Production Environment Variables

Create and configure `environments/production/.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3001

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters

# Security
HTTPS=true
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Storage (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=storyslip-uploads

# CDN (Optional)
CDN_URL=https://cdn.yourdomain.com

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-secure-grafana-password
REDIS_PASSWORD=your-secure-redis-password

# Backup
BACKUP_S3_BUCKET=storyslip-backups
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
NOTIFICATION_EMAIL=admin@yourdomain.com

# Analytics (Optional)
GA_TRACKING_ID=G-XXXXXXXXXX

# URLs
API_URL=https://yourdomain.com/api
DASHBOARD_URL=https://yourdomain.com/dashboard
MARKETING_URL=https://yourdomain.com
```

### 2. Supabase Configuration

#### Database Setup

1. Create a new Supabase project
2. Configure Row Level Security (RLS)
3. Set up authentication providers
4. Configure email templates

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (examples)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### Authentication Configuration

1. Go to Authentication > Settings in Supabase dashboard
2. Configure Site URL: `https://yourdomain.com`
3. Add Redirect URLs:
   - `https://yourdomain.com/auth/callback`
   - `https://yourdomain.com/dashboard/auth/callback`
4. Configure email templates
5. Set JWT expiry (recommended: 1 hour)

## 🚀 Deployment Process

### 1. Automated Deployment

The recommended way to deploy is using the automated deployment script:

```bash
# Make script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh

# For dry run (test without changes)
./scripts/deploy-production.sh --dry-run

# Skip tests (not recommended)
./scripts/deploy-production.sh --skip-tests

# Force deployment (bypass health checks)
./scripts/deploy-production.sh --force
```

### 2. Manual Deployment Steps

If you need to deploy manually:

#### Step 1: Prepare Application

```bash
# Clone repository
git clone https://github.com/your-org/storyslip.git
cd storyslip

# Install dependencies
npm install

# Run tests
npm run test:production-readiness
npm run test:security
npm run test:performance
```

#### Step 2: Build Production Artifacts

```bash
# Build all packages
npm run build:production

# Create deployment package
tar -czf storyslip-production.tar.gz \
  packages/api/dist \
  packages/dashboard/dist \
  packages/marketing/.next \
  packages/widget/dist \
  docker/production/ \
  scripts/ \
  environments/production/
```

#### Step 3: Deploy to Server

```bash
# Extract to deployment directory
sudo mkdir -p /var/www/storyslip/$(date +%Y%m%d-%H%M%S)
sudo tar -xzf storyslip-production.tar.gz -C /var/www/storyslip/$(date +%Y%m%d-%H%M%S)/

# Update symlink
sudo ln -sfn /var/www/storyslip/$(date +%Y%m%d-%H%M%S) /var/www/storyslip/current

# Start services
cd /var/www/storyslip/current/docker/production
sudo docker-compose up -d
```

#### Step 4: Verify Deployment

```bash
# Check service status
sudo docker-compose ps

# Check logs
sudo docker-compose logs -f

# Run health checks
curl -f https://yourdomain.com/api/monitoring/health
curl -f https://yourdomain.com/dashboard/health
curl -f https://yourdomain.com/health
```

## 🔍 Monitoring and Observability

### 1. Built-in Monitoring

StorySlip includes comprehensive monitoring out of the box:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection

Access monitoring:
- Grafana: `https://yourdomain.com:3000` (admin/your-password)
- Prometheus: `https://yourdomain.com:9090`

### 2. Health Checks

```bash
# API health
curl https://yourdomain.com/api/monitoring/health

# Dashboard health
curl https://yourdomain.com/dashboard/health

# Marketing site health
curl https://yourdomain.com/health

# Nginx status
curl https://yourdomain.com:8080/nginx_status
```

### 3. Key Metrics to Monitor

- **Response Time**: 95th percentile < 1s
- **Error Rate**: < 1% for 5xx errors
- **Uptime**: > 99.9%
- **Database Connections**: < 80% of pool size
- **Memory Usage**: < 90% of container limits
- **Disk Space**: > 20% free space

### 4. Alerting

Configure alerts in Grafana or use external services:

```yaml
# Example alert rules (already included)
- alert: ServiceDown
  expr: up == 0
  for: 1m
  
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  for: 5m
```

## 🔒 Security Hardening

### 1. Server Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Application Security

- **HTTPS Only**: All traffic encrypted
- **HSTS**: HTTP Strict Transport Security enabled
- **CSP**: Content Security Policy configured
- **Rate Limiting**: API endpoints protected
- **Input Validation**: All inputs sanitized
- **SQL Injection**: Parameterized queries only
- **XSS Protection**: Output encoding enabled

### 3. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER monitoring WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE postgres TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;

-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated;
```

### 4. Container Security

```bash
# Run containers as non-root users
# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image storyslip-api:latest

# Keep base images updated
docker pull node:18-alpine
docker pull nginx:alpine
docker pull postgres:15-alpine
```

## 🔄 Backup and Recovery

### 1. Automated Backups

Backups are automatically configured via Docker Compose:

```bash
# Check backup status
sudo docker-compose logs backup

# Manual backup
sudo docker-compose exec backup /usr/local/bin/backup-cron.sh

# List backups
aws s3 ls s3://storyslip-backups/
```

### 2. Database Backup

```bash
# Manual database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup-20240131-120000.sql
```

### 3. Application Backup

```bash
# Backup application files
tar -czf app-backup-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/storyslip/current

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d-%H%M%S).tar.gz /etc/nginx /etc/ssl
```

### 4. Disaster Recovery

```bash
# Full system restore procedure
# 1. Provision new server
# 2. Install dependencies
# 3. Restore application files
# 4. Restore database
# 5. Update DNS records
# 6. Verify functionality

# Test disaster recovery regularly
./scripts/test-disaster-recovery.sh
```

## 🔧 Maintenance

### 1. Regular Updates

```bash
# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Update Docker images (weekly)
cd /var/www/storyslip/current/docker/production
sudo docker-compose pull
sudo docker-compose up -d

# Update application (as needed)
./scripts/deploy-production.sh
```

### 2. Log Management

```bash
# Rotate logs
sudo logrotate -f /etc/logrotate.d/storyslip

# Clean old logs
find /var/log/storyslip -name "*.log" -mtime +30 -delete

# Monitor log sizes
du -sh /var/log/storyslip/*
```

### 3. Database Maintenance

```bash
# Analyze database statistics (weekly)
psql $DATABASE_URL -c "ANALYZE;"

# Vacuum database (monthly)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('postgres'));"
```

### 4. Performance Optimization

```bash
# Monitor performance metrics
curl https://yourdomain.com/api/monitoring/metrics

# Optimize database queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check container resource usage
docker stats
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
sudo docker-compose logs service-name

# Check configuration
sudo docker-compose config

# Restart service
sudo docker-compose restart service-name
```

#### 2. Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Reset connections
sudo docker-compose restart api
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/storyslip.com.crt -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
curl -I https://yourdomain.com
```

#### 4. High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart services to free memory
sudo docker-compose restart

# Increase container memory limits
# Edit docker-compose.yml and redeploy
```

#### 5. Slow Performance

```bash
# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/api/health

# Monitor system resources
htop
iotop
```

### Emergency Procedures

#### 1. Rollback Deployment

```bash
# Automatic rollback
./scripts/deploy-production.sh --rollback

# Manual rollback
sudo ln -sfn /var/www/storyslip/previous-deployment /var/www/storyslip/current
sudo docker-compose restart
```

#### 2. Emergency Maintenance Mode

```bash
# Enable maintenance mode
sudo docker-compose stop
echo "Under maintenance" > /var/www/html/index.html

# Disable maintenance mode
sudo docker-compose start
```

#### 3. Database Recovery

```bash
# Restore from latest backup
aws s3 cp s3://storyslip-backups/latest.sql ./
psql $DATABASE_URL < latest.sql
```

## 📞 Support

### Getting Help

- **Documentation**: Check this guide and API documentation
- **Logs**: Always check application and system logs first
- **Monitoring**: Use Grafana dashboards for insights
- **Community**: GitHub Issues for bug reports and feature requests

### Emergency Contacts

- **DevOps Team**: devops@yourdomain.com
- **On-call Engineer**: +1-555-0123
- **Slack Channel**: #storyslip-production

### Escalation Procedures

1. **Level 1**: Check logs and restart services
2. **Level 2**: Contact DevOps team
3. **Level 3**: Engage on-call engineer
4. **Level 4**: Emergency rollback and incident response

---

## 📝 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Database migrations tested
- [ ] Backup completed
- [ ] Monitoring configured
- [ ] Team notified

### Deployment

- [ ] Tests passing
- [ ] Build successful
- [ ] Services started
- [ ] Health checks passing
- [ ] SSL working
- [ ] Monitoring active

### Post-deployment

- [ ] Functionality verified
- [ ] Performance acceptable
- [ ] Logs clean
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

---

*This guide is maintained by the StorySlip DevOps team. Last updated: January 2024*