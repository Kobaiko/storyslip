# StorySlip CMS Makefile
# This Makefile provides convenient commands for development, testing, and deployment

.PHONY: help install build test lint clean dev prod deploy backup restore logs

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Configuration
COMPOSE_FILE := docker-compose.yml
COMPOSE_PROD_FILE := docker-compose.prod.yml
NAMESPACE := storyslip-production

## Help
help: ## Show this help message
	@echo "$(GREEN)StorySlip CMS - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(YELLOW)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Development
install: ## Install dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm ci
	cd packages/api && npm ci
	cd packages/dashboard && npm ci
	cd packages/widget && npm ci

build: ## Build all packages
	@echo "$(GREEN)Building packages...$(NC)"
	npm run build

build-api: ## Build API package
	@echo "$(GREEN)Building API...$(NC)"
	cd packages/api && npm run build

build-dashboard: ## Build Dashboard package
	@echo "$(GREEN)Building Dashboard...$(NC)"
	cd packages/dashboard && npm run build

build-widget: ## Build Widget package
	@echo "$(GREEN)Building Widget...$(NC)"
	cd packages/widget && npm run build

dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose up -d postgres redis
	npm run dev

dev-full: ## Start full development environment with Docker
	@echo "$(GREEN)Starting full development environment...$(NC)"
	docker-compose up -d

## Testing
test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	npm test

test-unit: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"
	npm run test:unit

test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	npm run test:integration

test-e2e: ## Run end-to-end tests
	@echo "$(GREEN)Running E2E tests...$(NC)"
	npm run test:e2e

test-performance: ## Run performance tests
	@echo "$(GREEN)Running performance tests...$(NC)"
	npm install -g artillery
	artillery run performance/load-test.yml

test-lighthouse: ## Run Lighthouse performance tests
	@echo "$(GREEN)Running Lighthouse tests...$(NC)"
	npm install -g @lhci/cli
	lhci autorun

## Code Quality
lint: ## Run linting
	@echo "$(GREEN)Running linter...$(NC)"
	npm run lint

lint-fix: ## Fix linting issues
	@echo "$(GREEN)Fixing linting issues...$(NC)"
	npm run lint:fix

type-check: ## Run TypeScript type checking
	@echo "$(GREEN)Running type check...$(NC)"
	npm run type-check

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	npm run format

audit: ## Run security audit
	@echo "$(GREEN)Running security audit...$(NC)"
	npm audit --audit-level=high

## Docker Operations
docker-build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	docker-compose build

docker-build-prod: ## Build production Docker images
	@echo "$(GREEN)Building production Docker images...$(NC)"
	docker-compose -f $(COMPOSE_PROD_FILE) build

docker-up: ## Start Docker services
	@echo "$(GREEN)Starting Docker services...$(NC)"
	docker-compose up -d

docker-down: ## Stop Docker services
	@echo "$(GREEN)Stopping Docker services...$(NC)"
	docker-compose down

docker-logs: ## Show Docker logs
	@echo "$(GREEN)Showing Docker logs...$(NC)"
	docker-compose logs -f

docker-clean: ## Clean Docker resources
	@echo "$(GREEN)Cleaning Docker resources...$(NC)"
	docker-compose down -v --remove-orphans
	docker system prune -f

## Database Operations
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	cd packages/api && npm run migrate

db-migrate-down: ## Rollback database migrations
	@echo "$(GREEN)Rolling back database migrations...$(NC)"
	cd packages/api && npm run migrate:down

db-seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(NC)"
	cd packages/api && npm run seed

db-reset: ## Reset database (drop and recreate)
	@echo "$(YELLOW)Resetting database...$(NC)"
	docker-compose exec postgres psql -U storyslip -c "DROP DATABASE IF EXISTS storyslip;"
	docker-compose exec postgres psql -U storyslip -c "CREATE DATABASE storyslip;"
	$(MAKE) db-migrate
	$(MAKE) db-seed

## Deployment
deploy-dev: ## Deploy to development environment
	@echo "$(GREEN)Deploying to development...$(NC)"
	./scripts/deploy.sh development

deploy-prod: ## Deploy to production environment
	@echo "$(GREEN)Deploying to production...$(NC)"
	./scripts/deploy.sh production

## Kubernetes Operations
k8s-apply: ## Apply Kubernetes configurations
	@echo "$(GREEN)Applying Kubernetes configurations...$(NC)"
	kubectl apply -f k8s/production/

k8s-delete: ## Delete Kubernetes resources
	@echo "$(YELLOW)Deleting Kubernetes resources...$(NC)"
	kubectl delete -f k8s/production/

k8s-status: ## Show Kubernetes status
	@echo "$(GREEN)Kubernetes status:$(NC)"
	kubectl get pods -n $(NAMESPACE)
	kubectl get services -n $(NAMESPACE)
	kubectl get ingress -n $(NAMESPACE)

k8s-logs: ## Show Kubernetes logs
	@echo "$(GREEN)Kubernetes logs:$(NC)"
	kubectl logs -f deployment/storyslip-api -n $(NAMESPACE)

k8s-scale: ## Scale Kubernetes deployments
	@echo "$(GREEN)Scaling deployments...$(NC)"
	kubectl scale deployment/storyslip-api --replicas=3 -n $(NAMESPACE)
	kubectl scale deployment/storyslip-dashboard --replicas=2 -n $(NAMESPACE)

## Backup and Restore
backup: ## Create database backup
	@echo "$(GREEN)Creating backup...$(NC)"
	./scripts/backup.sh

backup-list: ## List available backups
	@echo "$(GREEN)Available backups:$(NC)"
	ls -la backups/

restore: ## Restore from backup (usage: make restore BACKUP=filename)
	@echo "$(GREEN)Restoring from backup: $(BACKUP)$(NC)"
	./scripts/restore.sh $(BACKUP)

## Monitoring
logs: ## Show application logs
	@echo "$(GREEN)Application logs:$(NC)"
	docker-compose logs -f api dashboard

logs-api: ## Show API logs
	@echo "$(GREEN)API logs:$(NC)"
	docker-compose logs -f api

logs-dashboard: ## Show Dashboard logs
	@echo "$(GREEN)Dashboard logs:$(NC)"
	docker-compose logs -f dashboard

monitoring-up: ## Start monitoring stack
	@echo "$(GREEN)Starting monitoring stack...$(NC)"
	docker-compose --profile monitoring up -d

monitoring-down: ## Stop monitoring stack
	@echo "$(GREEN)Stopping monitoring stack...$(NC)"
	docker-compose --profile monitoring down

## Maintenance
clean: ## Clean build artifacts and dependencies
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/build
	rm -rf coverage
	rm -rf .nyc_output

clean-docker: ## Clean Docker resources
	@echo "$(GREEN)Cleaning Docker resources...$(NC)"
	docker-compose down -v --remove-orphans
	docker system prune -af
	docker volume prune -f

update-deps: ## Update dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	npm update
	cd packages/api && npm update
	cd packages/dashboard && npm update
	cd packages/widget && npm update

security-scan: ## Run security scans
	@echo "$(GREEN)Running security scans...$(NC)"
	npm audit
	docker run --rm -v $(PWD):/app -w /app aquasec/trivy fs .

## Environment Setup
setup-env: ## Setup environment files
	@echo "$(GREEN)Setting up environment files...$(NC)"
	cp .env.example .env
	@echo "$(YELLOW)Please edit .env file with your configuration$(NC)"

setup-dev: ## Setup development environment
	@echo "$(GREEN)Setting up development environment...$(NC)"
	$(MAKE) setup-env
	$(MAKE) install
	$(MAKE) docker-up
	sleep 10
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "$(GREEN)Development environment ready!$(NC)"
	@echo "$(YELLOW)API: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Dashboard: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Grafana: http://localhost:3003 (admin/admin)$(NC)"

## Health Checks
health: ## Check service health
	@echo "$(GREEN)Checking service health...$(NC)"
	@curl -f http://localhost:3001/health && echo "$(GREEN)API: Healthy$(NC)" || echo "$(RED)API: Unhealthy$(NC)"
	@curl -f http://localhost:3000/health && echo "$(GREEN)Dashboard: Healthy$(NC)" || echo "$(RED)Dashboard: Unhealthy$(NC)"

health-k8s: ## Check Kubernetes service health
	@echo "$(GREEN)Checking Kubernetes service health...$(NC)"
	kubectl get pods -n $(NAMESPACE) | grep -E "(Running|Ready)"

## Documentation
docs: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	cd packages/api && npm run docs

docs-serve: ## Serve documentation
	@echo "$(GREEN)Serving documentation...$(NC)"
	cd packages/api && npm run docs:serve

## Utilities
shell-api: ## Open shell in API container
	@echo "$(GREEN)Opening shell in API container...$(NC)"
	docker-compose exec api sh

shell-dashboard: ## Open shell in Dashboard container
	@echo "$(GREEN)Opening shell in Dashboard container...$(NC)"
	docker-compose exec dashboard sh

shell-postgres: ## Open PostgreSQL shell
	@echo "$(GREEN)Opening PostgreSQL shell...$(NC)"
	docker-compose exec postgres psql -U storyslip -d storyslip

shell-redis: ## Open Redis shell
	@echo "$(GREEN)Opening Redis shell...$(NC)"
	docker-compose exec redis redis-cli

## CI/CD
ci-test: ## Run CI test suite
	@echo "$(GREEN)Running CI test suite...$(NC)"
	$(MAKE) lint
	$(MAKE) type-check
	$(MAKE) test-unit
	$(MAKE) test-integration
	$(MAKE) audit

ci-build: ## Build for CI
	@echo "$(GREEN)Building for CI...$(NC)"
	$(MAKE) install
	$(MAKE) build
	$(MAKE) docker-build

## Release
release-patch: ## Create patch release
	@echo "$(GREEN)Creating patch release...$(NC)"
	npm version patch
	git push origin main --tags

release-minor: ## Create minor release
	@echo "$(GREEN)Creating minor release...$(NC)"
	npm version minor
	git push origin main --tags

release-major: ## Create major release
	@echo "$(GREEN)Creating major release...$(NC)"
	npm version major
	git push origin main --tags