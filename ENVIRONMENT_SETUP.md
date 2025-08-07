# StorySlip Environment Setup Guide

## Overview

This guide covers the setup and management of StorySlip across different environments: development, staging, and production. Each environment has specific configurations, deployment processes, and monitoring requirements.

## 🏗️ Environment Architecture

### Development Environment
- **Purpose**: Local development and testing
- **Infrastructure**: Docker containers or local processes
- **Database**: Local PostgreSQL or Supabase development project
- **Domains**: localhost with different ports
- **SSL**: Not required
- **Monitoring**: Basic logging and health checks

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Infrastructure**: Cloud servers with Docker containers
- **Database**: Dedicated Supabase staging project
- **Domains**: staging.storyslip.com, app-staging.storyslip.com, api-staging.storyslip.com
- **SSL**: Required with valid certificates
- **Monitoring**: Full monitoring stack with alerts

### Production Environment
- **Purpose**: Live application serving real users
- **Infrastructure**: High-availability cloud deployment
- **Database**: Production Supabase project with backups
- **Domains**: storyslip.com, app.storyslip.com, api.storyslip.com
- **SSL**: Required with valid certificates
- **Monitoring**: Comprehensive monitoring, alerting, and logging

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Docker** and **Docker Compose** (for containerized setup)
4. **Supabase CLI** (for database management)
5. **Git** (for version control)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/storyslip.git
cd storyslip

# Install dependencies
npm install

# Setup development environment
./scripts/env-setup.sh development setup

# Start development servers
./scripts/env-setup.sh development start
```

## 🔧 Environment Configuration

### Environment Files

Each environment has its own configuration file:

- `environments/development/.env.development`
- `environments/staging/.env.staging`
- `environments/production/.env.production`

### Key Configuration Variables

#### Database Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

#### Application URLs
```bash
API_URL=https://api.storyslip.com
DASHBOARD_URL=https://app.storyslip.com
MARKETING_URL=https://storyslip.com
WIDGET_CDN_URL=https://cdn.storyslip.com/widgets
```

#### Security Settings
```bash
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=300
```

## 🛠️ Setup Scripts

### Environment Setup Script

The `scripts/env-setup.sh` script automates environment configuration:

```bash
# Setup development environment
./scripts/env-setup.sh development setup

# Setup staging environment
./scripts/env-setup.sh staging setup

# Setup production environment
./scripts/env-setup.sh production setup
```

#### Available Actions

- `setup`: Complete environment setup
- `start`: Start services
- `migrate`: Run database migrations
- `validate`: Validate configuration

### Database Migration Script

The `scripts/migrate-env.sh` script handles database migrations:

```bash
# Run migrations for development
./scripts/migrate-env.sh development migrate

# Create backup before production migration
./scripts/migrate-env.sh production backup

# Run production migration
./scripts/migrate-env.sh production migrate
```

### Health Check Script

The `scripts/health-check-env.sh` script performs environment health checks:

```bash
# Full health check for staging
./scripts/health-check-env.sh staging full

# Quick health check for production
./scripts/health-check-env.sh production quick
```

## 🐳 Docker Setup

### Development with Docker

```bash
# Start development environment
cd docker/development
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### Staging with Docker

```bash
# Deploy to staging
cd docker/staging
docker-compose up -d

# Scale services
docker-compose up -d --scale api=2

# Update services
docker-compose pull
docker-compose up -d
```

## 🚀 Deployment Process

### Development Deployment

Development deployment is automatic when you start the development servers:

```bash
./scripts/env-setup.sh development start
```

### Staging Deployment

Staging deployment is triggered by pushes to the `develop` branch:

1. **Automated CI/CD**: GitHub Actions automatically deploys to staging
2. **Manual Deployment**: Use the deployment script

```bash
# Manual staging deployment
./scripts/deploy-staging.sh
```

### Production Deployment

Production deployment is triggered by pushes to the `main` branch or tags:

1. **Automated CI/CD**: GitHub Actions handles production deployment
2. **Manual Deployment**: Use the deployment script with approval

```bash
# Manual production deployment (requires approval)
./scripts/deploy-production.sh
```

## 🔍 Monitoring and Health Checks

### Health Check Endpoints

Each environment provides health check endpoints:

- **API Health**: `/api/monitoring/health`
- **Detailed Health**: `/api/monitoring/health/detailed`
- **System Status**: `/api/monitoring/status`

### Monitoring Stack

#### Development
- Basic console logging
- Health check endpoints
- Optional local Grafana

#### Staging/Production
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **Loki**: Log aggregation
- **Alertmanager**: Alert management

### Alert Configuration

Alerts are configured for:
- High error rates
- Slow response times
- System resource usage
- Service availability
- SSL certificate expiration

## 🗄️ Database Management

### Supabase Projects

Each environment uses a separate Supabase project:

- **Development**: Local or shared development project
- **Staging**: Dedicated staging project
- **Production**: Production project with backups

### Migration Process

1. **Development**: Test migrations locally
2. **Staging**: Deploy and validate migrations
3. **Production**: Deploy with backup and rollback plan

### Backup Strategy

#### Development
- No automated backups
- Manual backups before major changes

#### Staging
- Daily automated backups
- 30-day retention
- Pre-deployment backups

#### Production
- Hourly automated backups
- 90-day retention
- Pre-deployment backups
- Cross-region backup replication

## 🔐 Security Configuration

### SSL Certificates

#### Development
- No SSL required (HTTP only)

#### Staging/Production
- Valid SSL certificates required
- Automatic renewal with Let's Encrypt
- HSTS headers enabled

### Environment Variables

Sensitive environment variables are managed through:

- **Development**: Local `.env` files (not committed)
- **Staging**: GitHub Secrets or secure environment management
- **Production**: Secure secrets management service

### Access Control

- **Development**: Open access for developers
- **Staging**: Restricted access with authentication
- **Production**: Strict access control with audit logging

## 🚨 Troubleshooting

### Common Issues

#### Environment Setup Fails
```bash
# Check prerequisites
node --version
npm --version
docker --version
supabase --version

# Verify environment file
cat environments/development/.env.development

# Check permissions
chmod +x scripts/*.sh
```

#### Database Connection Issues
```bash
# Test database connectivity
supabase db ping

# Check environment variables
echo $SUPABASE_URL
echo $DATABASE_URL

# Verify project linking
supabase projects list
```

#### Service Health Check Failures
```bash
# Check service status
./scripts/health-check-env.sh development quick

# View service logs
docker-compose logs api
docker-compose logs dashboard

# Restart services
docker-compose restart
```

### Log Locations

#### Development
- API logs: `packages/api/logs/`
- Console output: Terminal/Docker logs

#### Staging/Production
- System logs: `/var/log/storyslip/`
- Application logs: Container logs
- Nginx logs: `/var/log/nginx/`

### Performance Issues

#### High Memory Usage
```bash
# Check system resources
./scripts/health-check-env.sh production full

# Monitor container resources
docker stats

# Scale services if needed
docker-compose up -d --scale api=3
```

#### Slow Response Times
```bash
# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s "https://api.storyslip.com/api/monitoring/health"

# Review performance metrics
# Access Grafana dashboard at https://monitoring.storyslip.com
```

## 📊 Monitoring Dashboards

### Grafana Dashboards

Access monitoring dashboards:

- **Development**: http://localhost:3004 (admin/admin)
- **Staging**: https://monitoring-staging.storyslip.com
- **Production**: https://monitoring.storyslip.com

### Key Metrics

- **Response Times**: API endpoint performance
- **Error Rates**: Application error frequency
- **System Resources**: CPU, memory, disk usage
- **Database Performance**: Query times, connection pool
- **User Activity**: Active users, feature usage

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### Development
- Runs tests on pull requests
- No automatic deployment

#### Staging
- Triggered by pushes to `develop` branch
- Runs full test suite
- Deploys to staging environment
- Runs smoke tests

#### Production
- Triggered by pushes to `main` branch or tags
- Requires manual approval
- Comprehensive pre-deployment checks
- Blue-green deployment strategy
- Automatic rollback on failure

### Deployment Stages

1. **Test**: Unit, integration, and security tests
2. **Build**: Compile and package applications
3. **Deploy**: Deploy to target environment
4. **Verify**: Health checks and smoke tests
5. **Monitor**: Post-deployment monitoring

## 📚 Additional Resources

### Documentation
- [API Documentation](packages/api/API_DOCUMENTATION.md)
- [Database Schema](packages/api/migrations/)
- [Monitoring System](packages/api/MONITORING_SYSTEM.md)
- [Security Guide](SECURITY.md)

### Scripts Reference
- `scripts/env-setup.sh`: Environment setup and management
- `scripts/migrate-env.sh`: Database migration management
- `scripts/health-check-env.sh`: Environment health checks
- `scripts/backup.sh`: Database backup utilities
- `scripts/deploy-*.sh`: Deployment scripts

### Support
- **Development Issues**: Check logs and run health checks
- **Staging Issues**: Review monitoring dashboards
- **Production Issues**: Follow incident response procedures

## 🎯 Best Practices

### Development
- Use feature branches for development
- Run tests before committing
- Keep environment files up to date
- Regular dependency updates

### Staging
- Deploy frequently for testing
- Validate all features before production
- Monitor performance and errors
- Test backup and recovery procedures

### Production
- Follow change management procedures
- Monitor deployments closely
- Maintain comprehensive backups
- Regular security updates

### General
- Document configuration changes
- Use infrastructure as code
- Implement proper logging
- Regular security audits
- Performance monitoring
- Disaster recovery planning

---

This environment setup guide provides comprehensive instructions for managing StorySlip across all environments. For specific issues or questions, refer to the troubleshooting section or contact the development team.