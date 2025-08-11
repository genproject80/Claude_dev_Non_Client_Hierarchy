#!/bin/bash

# GenVolt IoT Dashboard - Regression Test Execution Script
# This script sets up the environment and runs the automated regression tests

set -e  # Exit on any error

echo "🔧 GenVolt IoT Dashboard - Regression Test Setup & Execution"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ to continue."
    exit 1
fi

print_success "Node.js found: $(node --version)"

# Check if frontend and backend are running
print_status "Checking if applications are running..."

# Check frontend (port 8082)
if curl -s -f "http://localhost:8082" > /dev/null; then
    print_success "Frontend is running on http://localhost:8082"
else
    print_error "Frontend is not running on http://localhost:8082"
    print_status "Please start the frontend with: cd frontend && npm run dev"
    exit 1
fi

# Check backend (port 3003)
if curl -s -f "http://localhost:3003/api/v1/health" > /dev/null; then
    print_success "Backend is running on http://localhost:3003"
else
    print_error "Backend is not running on http://localhost:3003"
    print_status "Please start the backend with: cd backend && npm run dev"
    exit 1
fi

# Clean up any existing browser processes
print_status "Cleaning up existing browser processes..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f playwright 2>/dev/null || true

# Clear browser cache
rm -rf /tmp/playwright-* 2>/dev/null || true

print_success "Environment cleanup completed"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing test dependencies..."
    npm install playwright
    npx playwright install chromium
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Run the regression tests
print_status "Starting regression test execution..."
echo ""

if node run-regression-tests.js; then
    print_success "Regression tests completed successfully!"
    
    # Find the latest report
    LATEST_REPORT=$(ls -t regression-report-*.md 2>/dev/null | head -n1)
    if [ -n "$LATEST_REPORT" ]; then
        print_success "Test report generated: $LATEST_REPORT"
        echo ""
        print_status "Report summary:"
        echo ""
        # Show the executive summary from the report
        sed -n '/## Executive Summary/,/## Detailed Results/p' "$LATEST_REPORT" | head -n -1
    fi
else
    print_error "Regression tests failed!"
    exit 1
fi

echo ""
print_success "Test execution completed. Check the generated report for detailed results."