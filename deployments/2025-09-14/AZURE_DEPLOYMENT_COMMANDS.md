# Azure Deployment Commands

## Azure CLI Environment Variable Setup

### Backend Web App Environment Variables

Run these Azure CLI commands to set environment variables for your backend:

```bash
# Set resource variables
BACKEND_RESOURCE="genvolt-webapp-backend"
RESOURCE_GROUP="your-resource-group-name"  # Replace with your actual resource group

# Set environment variables
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $BACKEND_RESOURCE --settings \
  NODE_ENV="production" \
  PORT="80" \
  SQL_CONNECTION_STRING="Server=tcp://genvolt.database.windows.net,1433;Database=gendb;User ID=genadmin;Password=genvolt@123;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;" \
  JWT_SECRET="azure-production-jwt-secret-key-2025" \
  JWT_EXPIRES_IN="24h" \
  FRONTEND_URL="https://purple-sand-03b86b900.2.azurestaticapps.net" \
  LOG_LEVEL="info" \
  RATE_LIMIT_WINDOW="15" \
  RATE_LIMIT_MAX_REQUESTS="100"
```

### Frontend Static Web App Build Configuration

The frontend is configured with:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: Latest (uses Vite build)

Environment variables for Static Web App:
```bash
# Frontend environment variables (if needed in build process)
VITE_API_BASE_URL="https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net"
VITE_CONFIG_API_URL="https://configiot.genvolt.in/api"
```

## Deployment Steps

### 1. Backend Deployment (Web App)
```bash
# Navigate to backend folder
cd /Users/aj/Downloads/Claude_dev_Non_Client_Hierarchy/deployments/2025-09-14/backend

# Deploy using zip (or connect to GitHub)
zip -r backend-deployment.zip . -x "node_modules/*" ".env*"

# Deploy via Azure CLI
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_RESOURCE \
  --src backend-deployment.zip
```

### 2. Frontend Deployment (Static Web App)

**Option A: GitHub Integration (Recommended)**
1. Push the `deployments/2025-09-14/frontend` folder to your GitHub repo
2. Configure Static Web App to build from this path
3. Set build configuration:
   - **App location**: `/frontend` (or adjust path)
   - **Build command**: `npm run build`
   - **Output location**: `dist`

**Option B: Manual Upload**
```bash
# Navigate to frontend folder
cd /Users/aj/Downloads/Claude_dev_Non_Client_Hierarchy/deployments/2025-09-14/frontend

# Build the project
npm install
npm run build

# The built files will be in the 'dist' folder
```

## Verification Commands

### Test Backend Health
```bash
curl https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/health
```

### Test Frontend
```bash
curl https://purple-sand-03b86b900.2.azurestaticapps.net
```

## Important Notes

1. **Database**: Ensure Azure SQL Server firewall allows Azure services access
2. **CORS**: Backend is configured to allow requests from the frontend URL
3. **Environment Variables**: All localhost references have been replaced with Azure URLs
4. **Build Process**: Frontend uses Vite with optimized production build settings

## Troubleshooting

- If backend fails to start, check the Application Insights or Web App logs
- Ensure all environment variables are properly set
- Verify database connection string and firewall settings
- Check that Static Web App build configuration matches the Vite setup