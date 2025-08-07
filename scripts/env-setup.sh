#!/bin/bash

# StorySlip Environment Setup Script
# This script sets up environment-specific configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment
validate_environment() {
    local env=$1
    
    if [[ ! "$env" =~ ^(development|staging|production)$ ]]; then
        print_error "Invalid environment: $env"
        print_error "Valid environments: development, staging, production"
        exit 1
    fi
}

# Function to setup environment files
setup_env_files() {
    local env=$1
    
    print_status "Setting up environment files for $env..."
    
    # Create environment directory if it doesn't exist
    mkdir -p "environments/$env"
    
    # Copy environment-specific files to root directories
    if [ -f "environments/$env/.env.$env" ]; then
        # API environment
        cp "environments/$env/.env.$env" "packages/api/.env"
        print_success "API environment file configured for $env"
        
        # Dashboard environment
        cp "environments/$env/.env.$env" "packages/dashboard/.env"
        print_success "Dashboard environment file configured for $env"
        
        # Marketing environment
        cp "environments/$env/.env.$env" "packages/marketing/.env"
        print_success "Marketing environment file configured for $env"
        
        # Widget environment
        cp "environments/$env/.env.$env" "packages/widget/.env"
        print_success "Widget environment file configured for $env"
    else
        print_error "Environment file not found: environments/$env/.env.$env"
        exit 1
    fi
}

# Function to setup Supabase configuration
setup_supabase() {
    local env=$1
    
    print_status "Setting up Supabase configuration for $env..."
    
    if command_exists supabase; then
        # Link to appropriate Supabase project
        case $env in
            development)
                print_status "Linking to development Supabase project..."
                # supabase link --project-ref your-dev-project-ref
                ;;
            staging)
                print_status "Linking to staging Supabase project..."
                # supabase link --project-ref your-staging-project-ref
                ;;
            production)
                print_status "Linking to production Supabase project..."
                # supabase link --project-ref your-production-project-ref
                ;;
        esac
        
        print_success "Supabase configuration completed for $env"
    else
        print_warning "Supabase CLI not found. Please install it manually."
        print_warning "Visit: https://supabase.com/docs/guides/cli"
    fi
}

# Function to run database migrations
run_migrations() {
    local env=$1
    
    print_status "Running database migrations for $env..."
    
    cd packages/api
    
    if [ -f "package.json" ]; then
        if command_exists npm; then
            npm run migrate
            print_success "Database migrations completed for $env"
        else
            print_error "npm not found. Please install Node.js and npm."
            exit 1
        fi
    else
        print_error "package.json not found in packages/api"
        exit 1
    fi
    
    cd ../..
}

# Function to install dependencies
install_dependencies() {
    local env=$1
    
    print_status "Installing dependencies for $env environment..."
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Root dependencies installed"
    fi
    
    # Install API dependencies
    if [ -f "packages/api/package.json" ]; then
        cd packages/api
        npm install
        cd ../..
        print_success "API dependencies installed"
    fi
    
    # Install Dashboard dependencies
    if [ -f "packages/dashboard/package.json" ]; then
        cd packages/dashboard
        npm install
        cd ../..
        print_success "Dashboard dependencies installed"
    fi
    
    # Install Marketing dependencies
    if [ -f "packages/marketing/package.json" ]; then
        cd packages/marketing
        npm install
        cd ../..
        print_success "Marketing dependencies installed"
    fi
    
    # Install Widget dependencies
    if [ -f "packages/widget/package.json" ]; then
        cd packages/widget
        npm install
        cd ../..
        print_success "Widget dependencies installed"
    fi
}

# Function to setup SSL certificates (for staging/production)
setup_ssl() {
    local env=$1
    
    if [[ "$env" == "staging" || "$env" == "production" ]]; then
        print_status "Setting up SSL certificates for $env..."
        
        # Create SSL directory
        sudo mkdir -p /etc/ssl/certs
        sudo mkdir -p /etc/ssl/private
        
        print_warning "SSL certificates need to be manually configured."
        print_warning "Please ensure you have valid SSL certificates for:"
        
        case $env in
            staging)
                print_warning "- *.storyslip.com (staging subdomains)"
                ;;
            production)
                print_warning "- *.storyslip.com (production domains)"
                ;;
        esac
        
        print_warning "Consider using Let's Encrypt or your preferred certificate authority."
    fi
}

# Function to setup monitoring
setup_monitoring() {
    local env=$1
    
    print_status "Setting up monitoring for $env..."
    
    # Create logs directory
    mkdir -p logs
    
    if [[ "$env" == "staging" || "$env" == "production" ]]; then
        # Create system log directory
        sudo mkdir -p /var/log/storyslip
        sudo chown -R $USER:$USER /var/log/storyslip
    fi
    
    print_success "Monitoring setup completed for $env"
}

# Function to validate configuration
validate_config() {
    local env=$1
    
    print_status "Validating configuration for $env..."
    
    # Check if required environment files exist
    local required_files=(
        "packages/api/.env"
        "packages/dashboard/.env"
        "packages/marketing/.env"
        "packages/widget/.env"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "Configuration validation passed for $env"
}

# Function to start services
start_services() {
    local env=$1
    
    print_status "Starting services for $env environment..."
    
    case $env in
        development)
            print_status "Starting development servers..."
            # Use the existing start script
            if [ -f "start-storyslip.sh" ]; then
                chmod +x start-storyslip.sh
                ./start-storyslip.sh
            else
                print_warning "start-storyslip.sh not found. Starting services manually..."
                npm run dev
            fi
            ;;
        staging|production)
            print_status "Starting production servers..."
            npm run start
            ;;
    esac
}

# Function to run health checks
run_health_checks() {
    local env=$1
    
    print_status "Running health checks for $env..."
    
    # Wait for services to start
    sleep 10
    
    # Check API health
    local api_url
    case $env in
        development)
            api_url="http://localhost:3001"
            ;;
        staging)
            api_url="https://api-staging.storyslip.com"
            ;;
        production)
            api_url="https://api.storyslip.com"
            ;;
    esac
    
    if command_exists curl; then
        if curl -f "$api_url/api/monitoring/health" >/dev/null 2>&1; then
            print_success "API health check passed"
        else
            print_warning "API health check failed"
        fi
    else
        print_warning "curl not found. Skipping health checks."
    fi
}

# Main function
main() {
    local env=${1:-development}
    local action=${2:-setup}
    
    print_status "StorySlip Environment Setup"
    print_status "Environment: $env"
    print_status "Action: $action"
    echo
    
    validate_environment "$env"
    
    case $action in
        setup)
            setup_env_files "$env"
            setup_supabase "$env"
            install_dependencies "$env"
            run_migrations "$env"
            setup_ssl "$env"
            setup_monitoring "$env"
            validate_config "$env"
            print_success "Environment setup completed for $env!"
            ;;
        start)
            validate_config "$env"
            start_services "$env"
            run_health_checks "$env"
            ;;
        migrate)
            run_migrations "$env"
            ;;
        validate)
            validate_config "$env"
            ;;
        *)
            print_error "Invalid action: $action"
            print_error "Valid actions: setup, start, migrate, validate"
            exit 1
            ;;
    esac
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment> [action]"
    echo
    echo "Environments:"
    echo "  development  - Local development environment"
    echo "  staging      - Staging environment"
    echo "  production   - Production environment"
    echo
    echo "Actions:"
    echo "  setup        - Complete environment setup (default)"
    echo "  start        - Start services"
    echo "  migrate      - Run database migrations"
    echo "  validate     - Validate configuration"
    echo
    echo "Examples:"
    echo "  $0 development setup"
    echo "  $0 staging start"
    echo "  $0 production migrate"
    exit 1
fi

# Run main function with arguments
main "$@"