# Azure Deployment Package - 2025-09-14

This folder contains the prepared web application code ready for deployment to Azure.

## Configuration Updates Made

### Database Configuration
- **Azure SQL Server**: genvolt.database.windows.net
- **Database**: gendb
- **Username**: genadmin
- **Password**: genvolt@123

### Azure Resources
- **Backend**: genvolt-webapp-backend (Web App)
- **Frontend**: genvolt-webapp-frontend (Static Web App)

### Environment Files Updated

#### Backend
- `.env.production` - Production environment with Azure SQL Server settings
- `.env.example` - Updated with Azure SQL Server template

#### Frontend
- `.env.production` - Points to Azure backend URL

### Configuration Changes
1. Removed localhost references
2. Updated API URLs to point to Azure resources
3. Configured CORS for Azure frontend domain
4. Set proper Azure SQL Server connection strings

## Deployment Steps

### Backend Deployment
1. Deploy to Azure Web App: `genvolt-webapp-backend`
2. Set environment variables from `.env.production`
3. Ensure the Web App uses PORT 80

### Frontend Deployment
1. Deploy to Azure Static Web App: `genvolt-webapp-frontend`
2. Set build environment variables from `.env.production`
3. Configure API proxy if needed

## Database Setup
Make sure the Azure SQL Server allows connections and the database schema is properly set up.

## Notes
- All localhost references have been replaced with Azure resource URLs
- Database connection uses the provided Azure SQL Server credentials
- CORS is configured for the Azure frontend domain