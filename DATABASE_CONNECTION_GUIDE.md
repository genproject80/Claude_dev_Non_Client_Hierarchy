# Database Connection Configuration Guide

## How to Check Your Azure SQL Database Connection Options

### Option 1: Check Existing Azure Function App Settings
Since you already have Azure Functions connecting to the database, you can reuse the connection string:

1. **Azure Portal Method**:
   ```bash
   # Go to Azure Portal
   # Navigate to your Function App (func-iot-ingest-dev-54680-c8hfhphngaa9h5f3)
   # Go to Settings > Environment variables (or Configuration)
   # Look for SQL_CONNECTION_STRING
   ```

2. **Azure CLI Method**:
   ```bash
   az functionapp config appsettings list --name func-iot-ingest-dev-54680-c8hfhphngaa9h5f3 --resource-group <your-resource-group> --query "[?name=='SQL_CONNECTION_STRING']"
   ```

### Option 2: Create New Connection String
For the Express backend, you'll need a connection string in this format:

```
Server=tcp:<server-name>.database.windows.net,1433;Database=gendb;User ID=<username>;Password=<password>;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;
```

### Option 3: Use Managed Identity (Recommended for Production)
Enable Managed Identity for the App Service to connect to Azure SQL without storing credentials:

1. **Enable Managed Identity**:
   ```bash
   az webapp identity assign --name genvolt-webapp-backend --resource-group <your-resource-group>
   ```

2. **Grant Database Access**:
   ```sql
   -- Run in Azure SQL Database
   CREATE USER [genvolt-webapp-backend] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [genvolt-webapp-backend];
   ALTER ROLE db_datawriter ADD MEMBER [genvolt-webapp-backend];
   ALTER ROLE db_ddladmin ADD MEMBER [genvolt-webapp-backend];
   ```

3. **Connection String with Managed Identity**:
   ```
   Driver={ODBC Driver 17 for SQL Server};Server=tcp:<server>.database.windows.net,1433;Database=gendb;Authentication=ActiveDirectoryMsi;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;
   ```

### Current Connection String Format (from CLAUDE.md)
Based on your project documentation, you're currently using:
```
Driver={ODBC Driver 17 for SQL Server};Server=tcp:<server>.database.windows.net,1433;Database=<db>;Authentication=ActiveDirectoryMsi;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;
```

## Recommended Steps:
1. **Check existing Function App settings first** (Option 1)
2. **Use Managed Identity if possible** (Option 3) - more secure
3. **Fall back to connection string** (Option 2) if needed

## Which option would you like to use?
- **A**: Use existing connection string from Azure Functions
- **B**: Set up Managed Identity (recommended)  
- **C**: Create new connection string with credentials

Please check your Azure Function App settings first using the Azure Portal method above.