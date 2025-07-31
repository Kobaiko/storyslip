#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo -e "${GREEN}🚀 Starting deployment for $ENVIRONMENT environment${NC}"

# Check if required files exist
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found, using .env.example${NC}"
    cp .env.example .env
fi

# Build and start services
echo -e "${GREEN}📦 Building Docker images...${NC}"
docker-compose -f "$COMPOSE_FILE" build --no-cache

echo -e "${GREEN}🔄 Starting services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo -e "${GREEN}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Check service health
echo -e "${GREEN}🏥 Checking service health...${NC}"

# Check API health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API service is healthy${NC}"
else
    echo -e "${RED}❌ API service is not healthy${NC}"
    docker-compose -f "$COMPOSE_FILE" logs api
    exit 1
fi

# Check Dashboard health (if not production)
if [ "$ENVIRONMENT" != "production" ]; then
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Dashboard service is healthy${NC}"
    else
        echo -e "${RED}❌ Dashboard service is not healthy${NC}"
        docker-compose -f "$COMPOSE_FILE" logs dashboard
        exit 1
    fi
fi

# Run database migrations
echo -e "${GREEN}🗄️  Running database migrations...${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T api npm run migrate

# Show running services
echo -e "${GREEN}📋 Running services:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${GREEN}📱 Services available at:${NC}"
    echo -e "  API: http://localhost:3001"
    echo -e "  Dashboard: http://localhost:3000"
    echo -e "  Grafana: http://localhost:3003 (admin/admin)"
    echo -e "  Prometheus: http://localhost:9090"
fi