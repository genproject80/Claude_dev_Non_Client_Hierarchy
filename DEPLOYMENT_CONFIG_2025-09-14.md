# Web Application Deployment Configuration - September 14, 2025

## Azure Resource Configuration

### Frontend (Azure Static Web App)
- **Resource Name**: `genvolt-webapp-frontend`
- **URL**: `https://purple-sand-03b86b900.2.azurestaticapps.net/`
- **GitHub Repository**: `https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy`

### Backend (Azure Web App)
- **Resource Name**: `genvolt-webapp-backend`
- **URL**: `https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/`
- **Region**: Central India

### Database (Azure SQL)
- **Server**: `genvolt.database.windows.net`
- **Database**: `gendb`
- **Username**: `genadmin`
- **Password**: `genvolt@123`

## Environment Variables Required

### Backend (Azure Web App Settings)
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

### Frontend (Static Web App Settings)
```
VITE_API_URL=https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1
VITE_CONFIG_API_URL=https://func-iot-config-prod.azurewebsites.net/api
```

## Database Connection String (Alternative)
```
SQL_CONNECTION_STRING=Server=tcp:genvolt.database.windows.net,1433;Database=gendb;User ID=genadmin;Password=genvolt@123;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;
```

## CORS Configuration
Backend is configured to allow requests from:
- Production Frontend: `https://purple-sand-03b86b900.2.azurestaticapps.net`
- Can be overridden with `FRONTEND_URL` environment variable

## Security Notes
⚠️ **IMPORTANT**:
1. Generate a secure JWT_SECRET for production
2. Consider using Azure Key Vault for sensitive credentials
3. Database credentials are currently in plain text - use managed identity if possible

## Next Steps
1. Deploy backend to Azure Web App
2. Configure environment variables in Azure portal
3. Deploy frontend to Azure Static Web App
4. Test connectivity between frontend and backend
5. Verify database connections