# GitHub Repository Setup Guide

## Overview
This guide will help you set up automated deployment for the web application to Azure using GitHub Actions.

## Step 1: Initialize Git Repository

```bash
# Navigate to deployment folder
cd deployments/2025-09-12_web_application_express_backend

# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial deployment setup - Story 7.4 Express Backend Integration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 2: Connect to GitHub Repository

```bash
# Add remote repository
git remote add origin https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy.git

# Create and switch to a new branch for this deployment
git checkout -b deployment/express-backend-integration

# Push to GitHub
git push -u origin deployment/express-backend-integration
```

## Step 3: Configure GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### 3.1 Backend Deployment Secret

1. **Get Azure App Service Publish Profile**:
   ```bash
   # Using Azure CLI
   az webapp deployment list-publishing-profiles --name genvolt-webapp-backend --resource-group <your-resource-group> --xml
   ```

2. **Add to GitHub Secrets**:
   - Go to GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the entire XML content from step 1

### 3.2 Frontend Deployment Secret

1. **Get Static Web App Deployment Token**:
   ```bash
   # Using Azure CLI
   az staticwebapp secrets list --name <your-static-web-app-name> --query "properties.apiKey"
   ```

2. **Add to GitHub Secrets**:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: Paste the API token from step 1

## Step 4: Configure Azure App Service Environment Variables

Set these environment variables in your Azure App Service (genvolt-webapp-backend):

### Required Environment Variables:
```bash
# Database connection (see DATABASE_CONNECTION_GUIDE.md for options)
SQL_CONNECTION_STRING="<your-connection-string>"

# JWT Authentication
JWT_SECRET="<generate-a-secure-random-string>"
JWT_EXPIRES_IN="24h"

# Server Configuration
NODE_ENV="production"
PORT="80"  # or 8080 - check Azure App Service requirements

# CORS Configuration
CORS_ORIGINS="https://polite-smoke-0f45f3a00.1.azurestaticapps.net"

# Optional: Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY="<your-app-insights-key>"

# Logging
LOG_LEVEL="info"
```

### How to Set Environment Variables:
1. **Azure Portal Method**:
   - Go to your App Service → Settings → Environment variables
   - Add each variable above

2. **Azure CLI Method**:
   ```bash
   az webapp config appsettings set --name genvolt-webapp-backend --resource-group <your-resource-group> --settings SQL_CONNECTION_STRING="<value>" JWT_SECRET="<value>" NODE_ENV="production" PORT="80" CORS_ORIGINS="https://polite-smoke-0f45f3a00.1.azurestaticapps.net"
   ```

## Step 5: Test Database Connection

Before deployment, verify your database connection:

1. **Check Function App Settings** (recommended):
   ```bash
   az functionapp config appsettings list --name func-iot-ingest-dev-54680-c8hfhphngaa9h5f3 --resource-group <your-resource-group> --query "[?name=='SQL_CONNECTION_STRING'].value" -o tsv
   ```

2. **Use the same connection string** for your Express backend.

## Step 6: Deploy and Test

1. **Push changes to trigger deployment**:
   ```bash
   git add .
   git commit -m "Configure deployment settings"
   git push
   ```

2. **Monitor deployments**:
   - Go to GitHub repository → Actions tab
   - Watch the deployment workflows
   - Check for any errors

3. **Test the deployed application**:
   - Frontend: https://polite-smoke-0f45f3a00.1.azurestaticapps.net/
   - Backend API: https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/
   - Test Universal Communication tab functionality

## Step 7: Merge to Main Branch

Once everything is tested:

```bash
# Switch to main branch
git checkout main

# Merge deployment branch
git merge deployment/express-backend-integration

# Push to main to trigger production deployment
git push origin main
```

## Troubleshooting

### Common Issues:

1. **Backend 500 errors**: Check App Service logs and verify environment variables
2. **Database connection failures**: Verify SQL_CONNECTION_STRING format
3. **CORS errors**: Ensure CORS_ORIGINS includes the Static Web App URL
4. **Authentication failures**: Verify JWT_SECRET is set and consistent

### Useful Commands:

```bash
# Check App Service logs
az webapp log tail --name genvolt-webapp-backend --resource-group <your-resource-group>

# Restart App Service
az webapp restart --name genvolt-webapp-backend --resource-group <your-resource-group>

# Test backend endpoint
curl https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/admin/universal-communication
```

## Next Steps

After successful deployment:
1. Test all Universal Communication features
2. Verify authentication flow works
3. Check that existing admin features still function
4. Monitor Application Insights for any errors
5. Update custom domain configuration if needed