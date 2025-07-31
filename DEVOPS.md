# StorySlip CMS DevOps Guide

This document provides comprehensive information about the DevOps setup, tools, and processes for StorySlip CMS.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Development Workflow](#development-workflow)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [Deployment Strategies](#deployment-strategies)
7. [Security](#security)
8. [Backup and Recovery](#backup-and-recovery)
9. [Performance Testing](#performance-testing)
10. [Troubleshooting](#troubleshooting)

## Overview

StorySlip CMS uses modern DevOps practices and tools to ensure reliable, scalable, and maintainable deployments:

- **Containerization**: Docker for consistent environments
- **Orchestration**: Kubernetes for production deployments
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Monitoring**: Prometheus, Grafana, and Loki for observability
- **Infrastructure as Code**: Kubernetes manifests and Docker Compose
- **Automated Testing**: Unit, integration, E2E, and performance tests
- **Security**: Automated vulnerability scanning and security best practices

## Architecture

### Development Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Developer     │    │   Git Repository │    │   CI/CD Pipeline │
│   Machine       │────│   (GitHub)      │────│   (GitHub Actions)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │                                              │
         ▼                                              ▼
┌─────────────────┐                            ┌─────────────────┐
│   Docker        │                            │   Container     │
│   Compose       │                            │   Registry      │
│   (Local)       │                            │   (GHCR)        │
└─────────────────┘                            └─────────────────┘
```

### Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Kubernetes    │    │   Monitoring    │
│   (Ingress)     │────│   Cluster       │────│   Stack         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN           │    │   Database      │    │   Log           │
│   (CloudFront)  │    │   (PostgreSQL)  │    │   Aggregation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Development Workflow

### 1. Local Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/storyslip-cms.git
cd storyslip-cms

# Setup development environment
make setup-dev

# Start development services
make dev
```

### 2. Development Commands

```bash
# Install dependencies
make install

# Run tests
make test

# Run linting
make lint

# Build application
make build

# Start full development environment
make dev-full

# Check health
make health
```

### 3. Git Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Pull Request**:
   - Create PR to `develop` branch
   - Automated tests run
   - Code review required
   - Merge after approval

3. **Release Process**:
   ```bash
   # Create release branch
   git checkout -b release/v1.2.0
   
   # Update version
   make release-minor
   
   # Merge to main
   git checkout main
   git merge release/v1.2.0
   ```

## CI/CD Pipeline

### Pipeline Stages

1. **Quality Checks**
   - Linting and formatting
   - Type checking
   - Unit tests
   - Integration tests
   - Security audit

2. **Build and Test**
   - Docker image building
   - End-to-end testing
   - Performance testing
   - Security scanning

3. **Deployment**
   - Staging deployment (develop branch)
   - Production deployment (main branch)
   - Health checks
   - Notifications

### Pipeline Configuration

The pipeline is configured in `.github/workflows/ci.yml` and includes:

- **Matrix Testing**: Multiple Node.js versions
- **Parallel Execution**: Tests run in parallel
- **Caching**: Dependencies and build artifacts
- **Security Scanning**: Trivy, Snyk, SonarCloud
- **Performance Testing**: Lighthouse, Artillery
- **Deployment**: Blue-green strategy

### Environment Variables

Required secrets in GitHub:
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# Database
DATABASE_URL
REDIS_URL
JWT_SECRET

# External Services
CODECOV_TOKEN
SONAR_TOKEN
SNYK_TOKEN
SLACK_WEBHOOK

# Deployment
PRODUCTION_API_URL
PRODUCTION_DASHBOARD_URL
STAGING_URL
```

## Monitoring and Observability

### Metrics Collection

**Prometheus** collects metrics from:
- Application metrics (custom business metrics)
- HTTP request metrics (duration, rate, errors)
- Database metrics (connections, query performance)
- System metrics (CPU, memory, disk)

### Visualization

**Grafana** provides dashboards for:
- System overview and health
- API performance and errors
- Database performance
- Infrastructure metrics
- Business KPIs

### Log Aggregation

**Loki** and **Promtail** collect logs from:
- Application logs (structured JSON)
- Access logs (Nginx)
- System logs
- Container logs

### Alerting

**Prometheus Alertmanager** sends alerts for:
- Service downtime
- High error rates
- Performance degradation
- Resource exhaustion
- Security events

### Health Checks

Comprehensive health checking:
```bash
# Full health check
./scripts/health-check.sh

# Specific service checks
./scripts/health-check.sh --api-only
./scripts/health-check.sh --infrastructure-only
```

## Deployment Strategies

### Development Deployment

```bash
# Deploy to development
make deploy-dev

# Or using script
./scripts/deploy.sh development
```

### Staging Deployment

Automatic deployment on push to `develop` branch:
- Runs full test suite
- Deploys to staging environment
- Runs smoke tests
- Performance testing

### Production Deployment

Automatic deployment on push to `main` branch:
- Blue-green deployment strategy
- Database migrations
- Health checks
- Rollback capability

### Manual Deployment

```bash
# Deploy to production
make deploy-prod

# Or using script
./scripts/deploy.sh production
```

### Kubernetes Deployment

```bash
# Apply configurations
make k8s-apply

# Check status
make k8s-status

# Scale services
make k8s-scale

# View logs
make k8s-logs
```

## Security

### Container Security

- **Non-root users** in all containers
- **Minimal base images** (Alpine Linux)
- **Multi-stage builds** to reduce attack surface
- **Security scanning** with Trivy
- **Regular updates** of base images

### Application Security

- **JWT authentication** with secure secrets
- **Input validation** and sanitization
- **SQL injection prevention**
- **XSS protection** headers
- **Rate limiting** on API endpoints
- **HTTPS enforcement**

### Infrastructure Security

- **Network policies** in Kubernetes
- **Secret management** with Kubernetes secrets
- **RBAC** for cluster access
- **Private container registry**
- **Vulnerability scanning** in CI/CD

### Security Scanning

```bash
# Run security audit
make audit

# Run comprehensive security scan
make security-scan

# Check for vulnerabilities
npm audit --audit-level=high
```

## Backup and Recovery

### Automated Backups

Daily automated backups include:
- **Database dumps** (PostgreSQL)
- **File storage** (uploaded files)
- **Configuration** (environment variables)

Backup retention:
- **Daily**: 7 days
- **Weekly**: 4 weeks
- **Monthly**: 12 months

### Backup Commands

```bash
# Create backup
make backup

# List backups
make backup-list

# Restore from backup
make restore BACKUP=filename.sql.gz
```

### Disaster Recovery

1. **Infrastructure Recovery**:
   ```bash
   # Provision new infrastructure
   kubectl apply -f k8s/production/
   ```

2. **Data Recovery**:
   ```bash
   # Restore database
   ./scripts/restore.sh s3://bucket/backup.sql.gz
   ```

3. **Application Recovery**:
   ```bash
   # Deploy application
   make deploy-prod
   ```

## Performance Testing

### Load Testing

Artillery-based load testing:
```bash
# Run load tests
make test-performance

# Custom load test
artillery run performance/load-test.yml
```

### Performance Monitoring

Lighthouse CI for frontend performance:
```bash
# Run Lighthouse tests
make test-lighthouse

# Generate performance report
lhci autorun
```

### Performance Metrics

Key performance indicators:
- **Response time**: < 2 seconds (95th percentile)
- **Throughput**: > 100 requests/second
- **Error rate**: < 1%
- **Availability**: > 99.9%

## Troubleshooting

### Common Issues

#### Service Health Issues
```bash
# Check service health
make health

# Check specific service
./scripts/health-check.sh --api-only

# View logs
make logs
make logs-api
```

#### Database Issues
```bash
# Check database connectivity
make shell-postgres

# Run database migrations
make db-migrate

# Reset database
make db-reset
```

#### Container Issues
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs service-name

# Restart services
docker-compose restart
```

#### Kubernetes Issues
```bash
# Check pod status
kubectl get pods -n storyslip-production

# View pod logs
kubectl logs -f deployment/storyslip-api -n storyslip-production

# Describe pod for events
kubectl describe pod pod-name -n storyslip-production
```

### Performance Issues

#### High CPU Usage
```bash
# Check resource usage
docker stats

# Scale services
make k8s-scale

# Check for memory leaks
kubectl top pods -n storyslip-production
```

#### Database Performance
```bash
# Check slow queries
make shell-postgres
# Then run: SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check connection pool
docker-compose logs api | grep "pool"
```

### Monitoring and Alerts

#### Check Monitoring Stack
```bash
# Start monitoring
make monitoring-up

# Access Grafana
open http://localhost:3003

# Access Prometheus
open http://localhost:9090
```

#### Alert Investigation
1. Check Grafana dashboards
2. Review Prometheus alerts
3. Examine application logs
4. Check system metrics
5. Investigate recent deployments

### Recovery Procedures

#### Service Recovery
```bash
# Restart failed service
docker-compose restart service-name

# Or in Kubernetes
kubectl rollout restart deployment/service-name -n storyslip-production
```

#### Database Recovery
```bash
# Restore from latest backup
make restore BACKUP=latest

# Or specific backup
make restore BACKUP=backup_20240115_120000.sql.gz
```

#### Full System Recovery
```bash
# Stop all services
make docker-down

# Clean up resources
make clean-docker

# Restore from backup
make restore BACKUP=latest

# Restart services
make deploy-dev
```

## Best Practices

### Development
- Use feature branches for development
- Write comprehensive tests
- Follow code style guidelines
- Use semantic commit messages
- Regular dependency updates

### Deployment
- Always test in staging first
- Use blue-green deployments
- Monitor deployments closely
- Have rollback procedures ready
- Document deployment changes

### Monitoring
- Set up comprehensive alerting
- Monitor business metrics
- Regular health checks
- Log important events
- Review metrics regularly

### Security
- Regular security audits
- Keep dependencies updated
- Use least privilege access
- Encrypt sensitive data
- Monitor for vulnerabilities

### Maintenance
- Regular backup testing
- Performance optimization
- Capacity planning
- Documentation updates
- Team training

## Support and Resources

### Documentation
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](packages/api/API_DOCUMENTATION.md)
- [Widget Integration](packages/api/src/docs/widget-integration.md)

### Monitoring
- Grafana: http://localhost:3003
- Prometheus: http://localhost:9090
- Application logs in Loki

### Support Channels
- GitHub Issues: Technical problems
- Slack: #storyslip-devops
- Email: devops@storyslip.com

### Emergency Contacts
- On-call engineer: +1-555-0123
- DevOps team lead: devops-lead@storyslip.com
- System administrator: sysadmin@storyslip.com