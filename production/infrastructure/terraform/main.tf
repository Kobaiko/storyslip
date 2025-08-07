# StorySlip Production Infrastructure
# Terraform configuration for production deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  backend "s3" {
    bucket = "storyslip-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "storyslip-terraform-locks"
    encrypt        = true
  }
}

# Configure providers
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "production"
      Project     = "storyslip"
      ManagedBy   = "terraform"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Variables
variable "aws_region" {
  description = "AWS region for production deployment"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "storyslip.com"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase access token"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "storyslip-production-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "storyslip-production-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "storyslip-production-public-${count.index + 1}"
    Type = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "storyslip-production-private-${count.index + 1}"
    Type = "private"
  }
}

# NAT Gateways
resource "aws_eip" "nat" {
  count = 2

  domain = "vpc"
  
  tags = {
    Name = "storyslip-production-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count = 2

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "storyslip-production-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "storyslip-production-public-rt"
  }
}

resource "aws_route_table" "private" {
  count = 2

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "storyslip-production-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "storyslip-production-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "storyslip-production-alb-sg"
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "storyslip-production-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "storyslip-production-ecs-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "storyslip-production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true

  tags = {
    Name = "storyslip-production-alb"
  }
}

# SSL Certificate
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "api.${var.domain_name}",
    "app.${var.domain_name}",
    "cdn.${var.domain_name}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "storyslip-production-cert"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "storyslip-production"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      
      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs.name
      }
    }
  }

  tags = {
    Name = "storyslip-production-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/storyslip-production"
  retention_in_days = 30

  tags = {
    Name = "storyslip-production-logs"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/storyslip-production/api"
  retention_in_days = 30

  tags = {
    Name = "storyslip-production-api-logs"
  }
}

resource "aws_cloudwatch_log_group" "dashboard" {
  name              = "/ecs/storyslip-production/dashboard"
  retention_in_days = 30

  tags = {
    Name = "storyslip-production-dashboard-logs"
  }
}

resource "aws_cloudwatch_log_group" "marketing" {
  name              = "/ecs/storyslip-production/marketing"
  retention_in_days = 30

  tags = {
    Name = "storyslip-production-marketing-logs"
  }
}

# ECR Repositories
resource "aws_ecr_repository" "api" {
  name                 = "storyslip/api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "storyslip-api-repo"
  }
}

resource "aws_ecr_repository" "dashboard" {
  name                 = "storyslip/dashboard"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "storyslip-dashboard-repo"
  }
}

resource "aws_ecr_repository" "marketing" {
  name                 = "storyslip/marketing"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "storyslip-marketing-repo"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "assets" {
  bucket = "storyslip-production-assets"

  tags = {
    Name = "storyslip-production-assets"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "assets" {
  bucket = aws_s3_bucket.assets.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = [
    var.domain_name,
    "www.${var.domain_name}",
    "app.${var.domain_name}",
    "api.${var.domain_name}",
    "cdn.${var.domain_name}"
  ]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.bucket}"
    compress         = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.main.name}"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "storyslip-production-cdn"
  }
}

resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "StorySlip Production OAI"
}

# Redis Cluster
resource "aws_elasticache_subnet_group" "main" {
  name       = "storyslip-production-cache-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "storyslip-production-cache-subnet-group"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "storyslip-production-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Name = "storyslip-production-redis-sg"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "storyslip-production"
  description                  = "StorySlip Production Redis Cluster"
  
  node_type                    = "cache.r6g.large"
  port                         = 6379
  parameter_group_name         = "default.redis7"
  
  num_cache_clusters           = 2
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  
  subnet_group_name           = aws_elasticache_subnet_group.main.name
  security_group_ids          = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  
  maintenance_window          = "sun:05:00-sun:09:00"
  snapshot_retention_limit    = 5
  snapshot_window            = "03:00-05:00"

  tags = {
    Name = "storyslip-production-redis"
  }
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    api       = aws_ecr_repository.api.repository_url
    dashboard = aws_ecr_repository.dashboard.repository_url
    marketing = aws_ecr_repository.marketing.repository_url
  }
}