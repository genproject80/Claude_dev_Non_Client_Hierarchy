# Azure CORS Blocking Issue - Documentation

## Issue Summary
The backend API is experiencing CORS blocking issues preventing the frontend from making requests. The error appears as:
```
Access to fetch at 'https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/auth/login'
from origin 'https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net' has been blocked by CORS policy
```

## Root Cause
Azure App Service has two layers of CORS handling that can conflict:
1. **Azure-level CORS** - Configured at the Azure App Service infrastructure level
2. **Application-level CORS** - Configured in the Express.js application

When Azure-level CORS is configured (even with an empty array), it intercepts requests BEFORE they reach the Express application.

## Current State

### Azure CORS Configuration
- **Allowed Origins**: `[]` (empty array - blocking all origins)
- **Support Credentials**: `false`

### Express CORS Configuration (in backend/server.js)
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net',
  'https://purple-sand-03b86b900.2.azurestaticapps.net'
].filter(Boolean);
```

### Environment Variables
- `FRONTEND_URL` is correctly set to: `https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net`

## Solution Options

### Option 1: Add Azure-level CORS (Recommended)
**Pros**: Immediate fix, works with both Azure and Express CORS
**Cons**: Duplicate configuration in two places

Commands to implement:
```bash
# Add allowed origins
az webapp cors add --name genvolt-webapp-backend --resource-group GenVolt \
  --allowed-origins "https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net"

az webapp cors add --name genvolt-webapp-backend --resource-group GenVolt \
  --allowed-origins "http://localhost:3000"

# Enable credentials (if needed for authentication)
az webapp config set --name genvolt-webapp-backend --resource-group GenVolt \
  --enable-cors-credentials true

# Restart the app
az webapp restart --name genvolt-webapp-backend --resource-group GenVolt
```

### Option 2: Completely Disable Azure CORS
**Pros**: Let Express handle all CORS logic
**Cons**: May require special configuration or may not be possible in all scenarios

The current attempt to set empty array didn't fully disable Azure CORS - it's still intercepting requests.

### Option 3: Use Only Azure CORS
**Pros**: Single source of truth for CORS configuration
**Cons**: Less flexible, requires Azure CLI for all CORS changes

Would require:
1. Removing Express CORS middleware
2. Managing all CORS through Azure portal/CLI

## Other Issues Found

### 1. Missing Dependencies in Deployment
- **Issue**: Backend deployment was failing with "Cannot find package 'express'"
- **Cause**: `npm ci --production` wasn't including all dependencies
- **Fix Applied**: Changed to `npm ci` in GitHub Actions workflow
- **Status**: Deployment triggered, waiting for completion

### 2. Incorrect Startup Command
- **Issue**: Startup command was trying to `cd backend` which doesn't exist in deployed app
- **Cause**: Deployment uploads backend contents directly, not in a subdirectory
- **Fix Applied**: Changed startup command to `npm install && npm start`
- **Status**: Configuration updated

## Files Modified
1. `.github/workflows/azure-web-app-backend.yml` - Fixed deployment workflow
2. `backend/server.js` - Added CORS logging
3. `backend/.env.production` - Updated with correct frontend URL

## Next Steps
1. Wait for current deployment to complete with dependency fixes
2. Implement chosen CORS solution (Option 1 recommended)
3. Test login functionality from frontend
4. Monitor for any additional issues

## Testing Commands
```bash
# Test backend health
curl https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/health

# Test CORS preflight
curl -H "Origin: https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net/api/v1/auth/login -I
```

## References
- Frontend URL: https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net
- Backend URL: https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net
- GitHub Repo: https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy
- GitHub Actions: https://github.com/genproject80/Claude_dev_Non_Client_Hierarchy/actions