#!/bin/bash

# StorySlip CMS - Comprehensive Test Runner
# This script runs all tests across the monorepo with proper reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
COVERAGE_THRESHOLD=80
PARALLEL_JOBS=4

echo -e "${BLUE}🧪 StorySlip CMS - Comprehensive Test Suite${NC}"
echo "=================================================="

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Function to run tests for a package
run_package_tests() {
    local package_name=$1
    local package_path=$2
    
    echo -e "\n${YELLOW}Testing $package_name...${NC}"
    
    if [ ! -d "$package_path" ]; then
        echo -e "${RED}❌ Package directory not found: $package_path${NC}"
        return 1
    fi
    
    cd "$package_path"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found in $package_path${NC}"
        return 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for $package_name..."
        npm install
    fi
    
    # Run tests with coverage
    echo "🏃 Running tests for $package_name..."
    if npm run test:coverage; then
        echo -e "${GREEN}✅ $package_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $package_name tests failed${NC}"
        return 1
    fi
}

# Function to run linting
run_linting() {
    print_section "🔍 Code Quality Checks"
    
    local failed=0
    
    # API linting
    echo -e "\n${YELLOW}Linting API...${NC}"
    cd packages/api
    if npm run lint; then
        echo -e "${GREEN}✅ API linting passed${NC}"
    else
        echo -e "${RED}❌ API linting failed${NC}"
        failed=1
    fi
    cd ../..
    
    # Dashboard linting
    echo -e "\n${YELLOW}Linting Dashboard...${NC}"
    cd packages/dashboard
    if npm run lint; then
        echo -e "${GREEN}✅ Dashboard linting passed${NC}"
    else
        echo -e "${RED}❌ Dashboard linting failed${NC}"
        failed=1
    fi
    cd ../..
    
    # Widget linting
    echo -e "\n${YELLOW}Linting Widget...${NC}"
    cd packages/widget
    if npm run lint; then
        echo -e "${GREEN}✅ Widget linting passed${NC}"
    else
        echo -e "${RED}❌ Widget linting failed${NC}"
        failed=1
    fi
    cd ../..
    
    return $failed
}

# Function to run type checking
run_type_checking() {
    print_section "🔧 Type Checking"
    
    local failed=0
    
    # API type checking
    echo -e "\n${YELLOW}Type checking API...${NC}"
    cd packages/api
    if npm run type-check; then
        echo -e "${GREEN}✅ API type checking passed${NC}"
    else
        echo -e "${RED}❌ API type checking failed${NC}"
        failed=1
    fi
    cd ../..
    
    # Dashboard type checking
    echo -e "\n${YELLOW}Type checking Dashboard...${NC}"
    cd packages/dashboard
    if npm run type-check; then
        echo -e "${GREEN}✅ Dashboard type checking passed${NC}"
    else
        echo -e "${RED}❌ Dashboard type checking failed${NC}"
        failed=1
    fi
    cd ../..
    
    # Widget type checking
    echo -e "\n${YELLOW}Type checking Widget...${NC}"
    cd packages/widget
    if npm run type-check; then
        echo -e "${GREEN}✅ Widget type checking passed${NC}"
    else
        echo -e "${RED}❌ Widget type checking failed${NC}"
        failed=1
    fi
    cd ../..
    
    return $failed
}

# Function to generate coverage report
generate_coverage_report() {
    print_section "📊 Coverage Report Generation"
    
    echo "📈 Generating combined coverage report..."
    
    # Create coverage directory
    mkdir -p coverage/combined
    
    # Combine coverage reports
    if command -v nyc &> /dev/null; then
        nyc merge packages/*/coverage/coverage-final.json coverage/combined/coverage.json
        nyc report --reporter=html --reporter=text --reporter=lcov --temp-dir=coverage/combined --report-dir=coverage/combined
        echo -e "${GREEN}✅ Combined coverage report generated${NC}"
    else
        echo -e "${YELLOW}⚠️  nyc not found, skipping combined coverage report${NC}"
    fi
    
    # Display coverage summary
    echo -e "\n${BLUE}Coverage Summary:${NC}"
    echo "=================="
    
    for package in api dashboard widget; do
        if [ -f "packages/$package/coverage/coverage-summary.json" ]; then
            echo -e "${YELLOW}$package:${NC}"
            node -e "
                const fs = require('fs');
                try {
                    const coverage = JSON.parse(fs.readFileSync('packages/$package/coverage/coverage-summary.json', 'utf8'));
                    const total = coverage.total;
                    console.log(\`  Lines: \${total.lines.pct}%\`);
                    console.log(\`  Functions: \${total.functions.pct}%\`);
                    console.log(\`  Branches: \${total.branches.pct}%\`);
                    console.log(\`  Statements: \${total.statements.pct}%\`);
                } catch (e) {
                    console.log('  Coverage data not available');
                }
            "
        fi
    done
}

# Function to run security audit
run_security_audit() {
    print_section "🔒 Security Audit"
    
    local failed=0
    
    for package in api dashboard widget; do
        echo -e "\n${YELLOW}Auditing $package...${NC}"
        cd "packages/$package"
        
        if npm audit --audit-level=moderate; then
            echo -e "${GREEN}✅ $package security audit passed${NC}"
        else
            echo -e "${RED}❌ $package security audit found issues${NC}"
            failed=1
        fi
        
        cd ../..
    done
    
    return $failed
}

# Function to run performance tests
run_performance_tests() {
    print_section "⚡ Performance Tests"
    
    echo -e "\n${YELLOW}Running API performance tests...${NC}"
    cd packages/api
    if npm run test:performance; then
        echo -e "${GREEN}✅ API performance tests passed${NC}"
    else
        echo -e "${RED}❌ API performance tests failed${NC}"
        return 1
    fi
    cd ../..
    
    echo -e "\n${YELLOW}Running Widget performance tests...${NC}"
    cd packages/widget
    if npm run test:performance; then
        echo -e "${GREEN}✅ Widget performance tests passed${NC}"
    else
        echo -e "${RED}❌ Widget performance tests failed${NC}"
        return 1
    fi
    cd ../..
    
    return 0
}

# Main execution
main() {
    local start_time=$(date +%s)
    local failed=0
    
    # Parse command line arguments
    local run_linting=true
    local run_type_check=true
    local run_unit_tests=true
    local run_integration_tests=true
    local run_e2e_tests=true
    local run_performance=false
    local run_security=false
    local generate_coverage=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-lint)
                run_linting=false
                shift
                ;;
            --no-type-check)
                run_type_check=false
                shift
                ;;
            --unit-only)
                run_integration_tests=false
                run_e2e_tests=false
                shift
                ;;
            --with-performance)
                run_performance=true
                shift
                ;;
            --with-security)
                run_security=true
                shift
                ;;
            --no-coverage)
                generate_coverage=false
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --no-lint          Skip linting"
                echo "  --no-type-check    Skip type checking"
                echo "  --unit-only        Run only unit tests"
                echo "  --with-performance Run performance tests"
                echo "  --with-security    Run security audit"
                echo "  --no-coverage      Skip coverage report generation"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Ensure we're in the project root
    if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
        echo -e "${RED}❌ Please run this script from the project root directory${NC}"
        exit 1
    fi
    
    echo "🚀 Starting comprehensive test suite..."
    echo "Configuration:"
    echo "  - Linting: $run_linting"
    echo "  - Type checking: $run_type_check"
    echo "  - Unit tests: $run_unit_tests"
    echo "  - Integration tests: $run_integration_tests"
    echo "  - E2E tests: $run_e2e_tests"
    echo "  - Performance tests: $run_performance"
    echo "  - Security audit: $run_security"
    echo "  - Coverage report: $generate_coverage"
    
    # Install root dependencies
    echo -e "\n📦 Installing root dependencies..."
    npm install
    
    # Run linting
    if [ "$run_linting" = true ]; then
        if ! run_linting; then
            failed=1
        fi
    fi
    
    # Run type checking
    if [ "$run_type_check" = true ]; then
        if ! run_type_checking; then
            failed=1
        fi
    fi
    
    # Run unit tests
    if [ "$run_unit_tests" = true ]; then
        print_section "🧪 Unit Tests"
        
        # API tests
        if ! run_package_tests "API" "packages/api"; then
            failed=1
        fi
        
        # Dashboard tests
        if ! run_package_tests "Dashboard" "packages/dashboard"; then
            failed=1
        fi
        
        # Widget tests
        if ! run_package_tests "Widget" "packages/widget"; then
            failed=1
        fi
    fi
    
    # Run integration tests
    if [ "$run_integration_tests" = true ]; then
        print_section "🔗 Integration Tests"
        
        echo -e "\n${YELLOW}Running API integration tests...${NC}"
        cd packages/api
        if npm run test:integration; then
            echo -e "${GREEN}✅ API integration tests passed${NC}"
        else
            echo -e "${RED}❌ API integration tests failed${NC}"
            failed=1
        fi
        cd ../..
        
        echo -e "\n${YELLOW}Running Dashboard integration tests...${NC}"
        cd packages/dashboard
        if npm run test:integration; then
            echo -e "${GREEN}✅ Dashboard integration tests passed${NC}"
        else
            echo -e "${RED}❌ Dashboard integration tests failed${NC}"
            failed=1
        fi
        cd ../..
        
        echo -e "\n${YELLOW}Running Widget integration tests...${NC}"
        cd packages/widget
        if npm run test:integration; then
            echo -e "${GREEN}✅ Widget integration tests passed${NC}"
        else
            echo -e "${RED}❌ Widget integration tests failed${NC}"
            failed=1
        fi
        cd ../..
    fi
    
    # Run E2E tests
    if [ "$run_e2e_tests" = true ]; then
        print_section "🎭 End-to-End Tests"
        
        echo -e "\n${YELLOW}Running E2E tests...${NC}"
        cd packages/api
        if npm run test:e2e; then
            echo -e "${GREEN}✅ E2E tests passed${NC}"
        else
            echo -e "${RED}❌ E2E tests failed${NC}"
            failed=1
        fi
        cd ../..
    fi
    
    # Run performance tests
    if [ "$run_performance" = true ]; then
        if ! run_performance_tests; then
            failed=1
        fi
    fi
    
    # Run security audit
    if [ "$run_security" = true ]; then
        if ! run_security_audit; then
            failed=1
        fi
    fi
    
    # Generate coverage report
    if [ "$generate_coverage" = true ]; then
        generate_coverage_report
    fi
    
    # Final summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_section "📋 Test Summary"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "⏱️  Total time: ${duration}s"
        
        if [ "$generate_coverage" = true ]; then
            echo -e "📊 Coverage reports available in:"
            echo -e "   - packages/api/coverage/"
            echo -e "   - packages/dashboard/coverage/"
            echo -e "   - packages/widget/coverage/"
            echo -e "   - coverage/combined/ (combined report)"
        fi
        
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        echo -e "⏱️  Total time: ${duration}s"
        echo -e "🔍 Check the output above for details"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"