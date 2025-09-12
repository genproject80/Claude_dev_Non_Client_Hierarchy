#!/bin/bash

# Manual Frontend Deployment Script  
# Run this from the deployment folder root

echo "🚀 Deploying React Frontend to Azure Static Web Apps..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the React app with production configuration
echo "🏗️  Building React app..."
VITE_API_BASE_URL=https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net npm run build

# Deploy to Azure Static Web Apps
echo "🌐 Deploying to Azure Static Web Apps..."
# You'll need to install the Static Web Apps CLI first:
# npm install -g @azure/static-web-apps-cli

# Option 1: Using SWA CLI (requires API token)
# swa deploy ./dist --api-token <YOUR_API_TOKEN>

# Option 2: Manual upload to Azure Portal
echo "📁 Build completed! Upload the 'dist' folder contents to:"
echo "   Azure Portal > Static Web Apps > polite-smoke-0f45f3a00 > Overview > Browse"

echo "✅ Frontend build complete!"
echo "📂 Built files are in: $(pwd)/dist/"
echo "🔗 Frontend URL: https://polite-smoke-0f45f3a00.1.azurestaticapps.net"

# List the built files
echo "📋 Built files:"
ls -la dist/