#!/bin/bash

# Manual Backend Deployment Script
# Run this from the deployment folder root

echo "🚀 Deploying Express Backend to Azure App Service..."

# Navigate to backend directory
cd backend

# Install production dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Deploy to Azure App Service using Azure CLI
echo "🌐 Deploying to genvolt-webapp-backend..."
az webapp up --name genvolt-webapp-backend --resource-group Genvolt --runtime "NODE:18-lts"

# Alternatively, if you have the publish profile, use:
# func azure functionapp publish genvolt-webapp-backend

echo "✅ Backend deployment complete!"
echo "🔗 Backend URL: https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net"

# Test the deployment
echo "🧪 Testing backend health..."
curl -f https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/health || echo "⚠️  Health check failed - check app logs"