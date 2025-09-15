# Web Application Deployment Instructions - September 14, 2025

## 🚀 Deployment Overview

This deployment uses GitHub Actions workflows to automatically deploy:
- **Frontend**: React app to Azure Static Web App
- **Backend**: Express.js API to Azure Web App

## ✅ Pre-Deployment Checklist (COMPLETED)

- ✅ Deployment folder created: `deployments/2025-09-14_web_application_deployment/`
- ✅ Code copied and localhost references cleaned
- ✅ JWT secret generated: `8ffe287f...` (128 characters)
- ✅ Azure CLI login verified
- ✅ Static Web App repository connection updated
- ✅ Backend environment variables configured
- ✅ GitHub workflows created

## 🔧 Azure Resources Configuration

### Frontend - Static Web App
- **Name**: `genvolt-webapp-frontend`
- **URL**: `https://purple-sand-03b86b900.2.azurestaticapps.net/`
- **Repository**: `https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy`
- **Branch**: `main`

### Backend - Web App
- **Name**: `genvolt-webapp-backend`
- **URL**: `https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/`
- **Environment Variables**: ✅ Configured

### Database - Azure SQL
- **Server**: `genvolt.database.windows.net`
- **Database**: `gendb`
- **Required Tables**: ✅ All Universal Communication tables deployed

## 📋 Next Steps to Complete Deployment

### Step 1: Push Code to GitHub Repository

```bash
# Navigate to deployment folder
cd "D:\Genvolt\Azure_IoT_New\deployments\2025-09-14_web_application_deployment"

# Initialize git if not already done
git init
git remote add origin https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy.git

# Add all files
git add .
git commit -m "Production deployment setup - September 14, 2025"

# Push to main branch (this will replace existing code as requested)
git push -f origin main
```

### Step 2: Configure GitHub Secrets

Go to GitHub repository settings and add these secrets:

#### Required Secrets:
1. **`AZURE_STATIC_WEB_APPS_API_TOKEN`**
   ```
   f13a13677ad946d3459c1b43c45165648b65e26824d4ff016fb182831a681fc902-d3a61890-6f65-4fbf-912a-beecce6f071c000093103b86b900
   ```

2. **`AZURE_WEBAPP_PUBLISH_PROFILE_BACKEND`**
   ```xml
   <publishData><publishProfile profileName="genvolt-webapp-backend - Web Deploy" publishMethod="MSDeploy" publishUrl="genvolt-webapp-backend-epezdjc9hfcyf4hr.scm.centralindia-01.azurewebsites.net:443" msdeploySite="genvolt-webapp-backend" userName="$genvolt-webapp-backend" userPWD="yJKRy3KHr1zEqqZTtsGoy7ALucDsGLK8TGLt89JpQQpSKk24pq5PkaAjRa08" destinationAppUrl="https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites"><databases /></publishProfile></publishData>
   ```

### Step 3: Verify Deployment

After pushing to GitHub, the workflows will automatically trigger:

1. **Static Web App Deployment** (Frontend)
   - Builds React app with production settings
   - Deploys to: `https://purple-sand-03b86b900.2.azurestaticapps.net/`

2. **Web App Deployment** (Backend)
   - Builds Express.js app
   - Deploys to: `https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/`

### Step 4: Test Deployment

1. **Frontend Test**: Visit `https://purple-sand-03b86b900.2.azurestaticapps.net/`
2. **Backend Test**: Visit `https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/health`
3. **Database Test**: Login to admin dashboard and check Universal Communication tab

## 🔑 Environment Variables Summary

### Backend (Azure Web App)
```
NODE_ENV=production
DB_SERVER=genvolt.database.windows.net
DB_DATABASE=gendb
DB_USERNAME=genadmin
DB_PASSWORD=genvolt@123
FRONTEND_URL=https://purple-sand-03b86b900.2.azurestaticapps.net
JWT_SECRET=8ffe287fd101ea3a39c9366b714cec5fdfc26cbcee324e60be779ede534f29eb1fa8279362a52865b0857dfea0b2ba38f50222d6c62d8ff5856feba5bab78c27
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (Build Time)
```
VITE_API_URL=https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1
```

## 📁 Deployment Structure

```
deployments/2025-09-14_web_application_deployment/
├── .github/workflows/
│   ├── azure-static-web-apps.yml      # Frontend deployment
│   └── azure-web-app-backend.yml      # Backend deployment
├── backend/                           # Express.js API
├── frontend/                          # React application
├── DEPLOYMENT_CONFIG_2025-09-14.md   # Configuration details
├── DEPLOYMENT_INSTRUCTIONS.md        # This file
└── Other project files...
```

## ⚠️ Security Notes

- JWT secret has been generated and configured
- Database credentials are in plain text (consider Azure Key Vault)
- CORS is configured for the specific frontend domain
- Rate limiting is enabled (100 requests per 15 minutes)

## 🆘 Troubleshooting

### If Deployment Fails:
1. Check GitHub Actions logs in repository
2. Verify secrets are correctly configured
3. Check Azure App Service logs
4. Verify database connection

### Common Issues:
- **CORS errors**: Check FRONTEND_URL environment variable
- **Database connection**: Verify credentials and firewall rules
- **Build failures**: Check package.json dependencies

## 📞 Support

- Azure Portal: Monitor resources and logs
- GitHub Actions: Check workflow runs
- Application Logs: Available in Azure App Service logs

---

**Deployment Ready**: All configuration completed. Push to GitHub to start automatic deployment.