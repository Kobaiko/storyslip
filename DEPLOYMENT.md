# StorySlip CMS Deployment Guide

This document provides comprehensive instructions for deploying StorySlip CMS to production environments.

## Overview

StorySlip CMS uses a modern containerized deployment approach with:
- **Docker containers** for consistent environments
- **Kubernetes** for orchestration and scaling
- **GitHub Actions** for CI/CD automation
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **AWS S3/CloudFront** for CDN and file storage

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │      API        │    │     Widget      │
│   (React SPA)   │    │   (Node.js)     │    │   (Vanilla JS)  │
│                 │    │                 │    │                 │
│ Port: 8080      │    │ Port: 3001      │    │ Port: 8080      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │    (Ingress)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   PostgreSQL    │    │     Redis       │
                    │   (Database)    │    │    (Cache)      │
                    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Tools
- **Docker** (v20.10+)
- **Kubernetes** (v1.25+)
- **kubectl** (v1.25+)
- **Helm** (v3.10+) - optional but recommended
- **AWS CLI** (v2.0+) - for S3/CloudFront
- **GitHub CLI** (v2.0+) - for repository management

### Required Services
- **Kubernetes cluster** (EKS, GKE, AKS, or self-managed)
- **PostgreSQL database** (v13+)
- **Redis instance** (v6+)
- **Domain names** and SSL certificates
- **AWS S3 bucket** for file storage
- **CloudFront distribution** for CDN

## Environment Setup

### 1. Kubernetes Cluster Setup

#### Using AWS EKS
```bash
# Create EKS cluster
eksctl create cluster \
  --name storyslip-production \
  --version 1.28 \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name storyslip-production
```

#### Using Google GKE
```bash
# Create GKE cluster
gcloud container clusters create storyslip-production \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --machine-type n1-standard-2

# Configure kubectl
gcloud container clusters get-credentials storyslip-production --zone us-central1-a
```

### 2. Install Required Kubernetes Components

#### NGINX Ingress Controller
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

#### Cert-Manager (for SSL certificates)
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

#### Prometheus & Grafana (for monitoring)
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### 3. Database Setup

#### PostgreSQL on AWS RDS
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier storyslip-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username storyslip \
  --master-user-password "your-secure-password" \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

#### Redis on AWS ElastiCache
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id storyslip-production \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name your-subnet-group \
  --security-group-ids sg-xxxxxxxxx
```

## Configuration

### 1. GitHub Secrets

Configure the following secrets in your GitHub repository:

#### Database & Cache
```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database
REDIS_URL=redis://host:6379

# JWT Secrets
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-jwt-refresh-secret-key-here
```

#### AWS Configuration
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# S3 & CloudFront
S3_BUCKET_WIDGET=storyslip-widget-cdn
S3_BUCKET_BACKUPS=storyslip-backups
CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id
```

#### Kubernetes Configuration
```bash
# Base64 encoded kubeconfig files
KUBE_CONFIG_STAGING=base64-encoded-kubeconfig
KUBE_CONFIG_PRODUCTION=base64-encoded-kubeconfig
```

#### External Services
```bash
# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key

# Monitoring (Sentry)
SENTRY_DSN=your-sentry-dsn

# Notifications (Slack)
SLACK_WEBHOOK=your-slack-webhook-url
```

### 2. Kubernetes Secrets

Create the secrets in your cluster:

```bash
# Create namespace
kubectl create namespace storyslip-production

# Create secrets
kubectl create secret generic storyslip-secrets \
  --namespace storyslip-production \
  --from-literal=DATABASE_URL="postgresql://username:password@host:5432/database" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=REDIS_URL="redis://host:6379" \
  --from-literal=SENDGRID_API_KEY="your-sendgrid-key" \
  --from-literal=SENTRY_DSN="your-sentry-dsn"
```

### 3. SSL Certificates

Create Let's Encrypt cluster issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@storyslip.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

## Deployment Process

### 1. Automated Deployment (Recommended)

The deployment is fully automated through GitHub Actions:

1. **Push to main branch** triggers production deployment
2. **Push to develop branch** triggers staging deployment
3. **Manual workflow dispatch** allows custom deployments

#### Deployment Steps:
1. Code is built into Docker images
2. Images are pushed to GitHub Container Registry
3. Database migrations are applied
4. Kubernetes deployments are updated
5. Health checks verify deployment success
6. Notifications are sent to Slack

### 2. Manual Deployment

If you need to deploy manually:

```bash
# 1. Build and push images
docker build -t ghcr.io/your-org/storyslip/api:latest -f packages/api/Dockerfile .
docker build -t ghcr.io/your-org/storyslip/dashboard:latest -f packages/dashboard/Dockerfile .
docker build -t ghcr.io/your-org/storyslip/widget:latest -f packages/widget/Dockerfile .

docker push ghcr.io/your-org/storyslip/api:latest
docker push ghcr.io/your-org/storyslip/dashboard:latest
docker push ghcr.io/your-org/storyslip/widget:latest

# 2. Apply Kubernetes configurations
kubectl apply -f k8s/production/namespace.yaml
kubectl apply -f k8s/production/configmap.yaml
kubectl apply -f k8s/production/secrets.yaml
kubectl apply -f k8s/production/

# 3. Wait for rollout to complete
kubectl rollout status deployment/storyslip-api -n storyslip-production
kubectl rollout status deployment/storyslip-dashboard -n storyslip-production
kubectl rollout status deployment/storyslip-widget -n storyslip-production
```

### 3. Database Migrations

Run database migrations:

```bash
# Using the migration script
cd packages/api
DATABASE_URL="your-database-url" ../scripts/migrate.sh up

# Or using kubectl
kubectl exec -it deployment/storyslip-api -n storyslip-production -- npm run db:migrate
```

## Monitoring & Observability

### 1. Health Checks

All services expose health check endpoints:
- **API**: `https://api.storyslip.com/health`
- **Dashboard**: `https://app.storyslip.com/health`
- **Widget**: `https://widget.storyslip.com/embed.js`

### 2. Metrics & Monitoring

#### Prometheus Metrics
- HTTP request duration and rate
- Database connection pool status
- Memory and CPU usage
- Custom business metrics

#### Grafana Dashboards
- Application performance metrics
- Infrastructure monitoring
- Business KPIs and analytics
- Error tracking and alerting

#### Log Aggregation
```bash
# View application logs
kubectl logs -f deployment/storyslip-api -n storyslip-production
kubectl logs -f deployment/storyslip-dashboard -n storyslip-production
kubectl logs -f deployment/storyslip-widget -n storyslip-production
```

### 3. Alerting

Alerts are configured for:
- Service downtime
- High error rates
- Performance degradation
- Database connection issues
- High resource usage

## Backup & Disaster Recovery

### 1. Automated Backups

Backups are created automatically:
- **Daily**: Database and file backups (7-day retention)
- **Weekly**: Full system backups (4-week retention)
- **Monthly**: Long-term backups (12-month retention)

### 2. Manual Backup

```bash
# Create database backup
./scripts/backup.sh daily

# Create full system backup
./scripts/backup.sh monthly

# List available backups
./scripts/backup.sh list
```

### 3. Disaster Recovery

```bash
# Restore from backup
./scripts/backup.sh restore backup_20240115_120000.sql.gz

# Restore from S3
./scripts/backup.sh restore s3://storyslip-backups/daily/backup.sql.gz
```

## Scaling

### 1. Horizontal Pod Autoscaling

HPA is configured for all services:
- **API**: 3-10 replicas based on CPU/memory
- **Dashboard**: 2-5 replicas based on CPU/memory
- **Widget**: 3-10 replicas based on CPU/memory

### 2. Vertical Scaling

Update resource limits in deployment files:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### 3. Database Scaling

#### Read Replicas
```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier storyslip-production-read \
  --source-db-instance-identifier storyslip-production
```

#### Connection Pooling
Configure PgBouncer for connection pooling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  template:
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        env:
        - name: DATABASES_HOST
          value: "your-rds-endpoint"
        - name: DATABASES_PORT
          value: "5432"
        - name: DATABASES_USER
          value: "storyslip"
        - name: DATABASES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: storyslip-secrets
              key: DATABASE_PASSWORD
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
```

## Security

### 1. Network Security

- **Private subnets** for database and cache
- **Security groups** with minimal required access
- **WAF** for web application firewall
- **DDoS protection** through CloudFlare or AWS Shield

### 2. Container Security

- **Non-root users** in all containers
- **Read-only root filesystems** where possible
- **Security contexts** with dropped capabilities
- **Image scanning** for vulnerabilities

### 3. Secrets Management

- **Kubernetes secrets** for sensitive data
- **AWS Secrets Manager** for external secrets
- **Sealed secrets** for GitOps workflows
- **Regular secret rotation**

### 4. Access Control

- **RBAC** for Kubernetes access
- **IAM roles** for AWS resources
- **Network policies** for pod-to-pod communication
- **Audit logging** for all access

## Troubleshooting

### 1. Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl get pods -n storyslip-production

# Check pod logs
kubectl logs -f pod-name -n storyslip-production

# Describe pod for events
kubectl describe pod pod-name -n storyslip-production
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/storyslip-api -n storyslip-production -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check database logs
kubectl logs -f deployment/postgres -n storyslip-production
```

#### SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificates -n storyslip-production

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager
```

### 2. Performance Issues

#### High CPU Usage
```bash
# Check resource usage
kubectl top pods -n storyslip-production

# Scale up if needed
kubectl scale deployment/storyslip-api --replicas=5 -n storyslip-production
```

#### Database Performance
```bash
# Check slow queries
kubectl exec -it deployment/storyslip-api -n storyslip-production -- \
  psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### 3. Rollback Procedures

#### Application Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/storyslip-api -n storyslip-production
kubectl rollout undo deployment/storyslip-dashboard -n storyslip-production
kubectl rollout undo deployment/storyslip-widget -n storyslip-production
```

#### Database Rollback
```bash
# Restore from backup
./scripts/backup.sh restore backup_20240115_120000.sql.gz
```

## Maintenance

### 1. Regular Tasks

#### Weekly
- Review monitoring dashboards
- Check backup integrity
- Update security patches
- Review resource usage

#### Monthly
- Update dependencies
- Review and rotate secrets
- Capacity planning review
- Security audit

#### Quarterly
- Disaster recovery testing
- Performance optimization
- Cost optimization review
- Documentation updates

### 2. Updates

#### Application Updates
Updates are deployed automatically through GitHub Actions when code is pushed to the main branch.

#### Infrastructure Updates
```bash
# Update Kubernetes cluster
eksctl update cluster --name storyslip-production --version 1.29

# Update node groups
eksctl update nodegroup --cluster storyslip-production --name workers
```

#### Database Updates
```bash
# Update RDS instance
aws rds modify-db-instance \
  --db-instance-identifier storyslip-production \
  --engine-version 15.5 \
  --apply-immediately
```

## Cost Optimization

### 1. Resource Optimization

- **Right-sizing**: Monitor and adjust resource requests/limits
- **Spot instances**: Use spot instances for non-critical workloads
- **Reserved instances**: Purchase reserved instances for predictable workloads
- **Auto-scaling**: Configure HPA and cluster autoscaling

### 2. Storage Optimization

- **S3 lifecycle policies**: Automatically transition old backups to cheaper storage
- **Database storage**: Monitor and optimize database storage usage
- **Image optimization**: Use multi-stage builds and minimal base images

### 3. Monitoring Costs

- **AWS Cost Explorer**: Monitor AWS spending
- **Kubernetes resource quotas**: Prevent resource over-allocation
- **Cost alerts**: Set up billing alerts for unexpected costs

## Support

### 1. Documentation
- **API Documentation**: https://api.storyslip.com/docs
- **User Guide**: https://docs.storyslip.com
- **Developer Guide**: https://developers.storyslip.com

### 2. Monitoring
- **Status Page**: https://status.storyslip.com
- **Grafana Dashboard**: https://monitoring.storyslip.com
- **Log Aggregation**: https://logs.storyslip.com

### 3. Contact
- **Email**: support@storyslip.com
- **Slack**: #storyslip-support
- **GitHub Issues**: https://github.com/storyslip/cms/issues

---

This deployment guide provides a comprehensive overview of deploying StorySlip CMS to production. For specific questions or issues, please refer to the support channels listed above.