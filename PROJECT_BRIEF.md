# GenVolt Web Application - Comprehensive Project Brief

## Executive Summary

The GenVolt Web Application is a comprehensive Industrial IoT (IIoT) dashboard and device management system designed for monitoring and managing GenVolt industrial equipment. The application provides real-time monitoring, role-based access control, multi-tenant data isolation, and advanced device management capabilities for industrial IoT and motor systems.

**Key Highlights:**
- Full-stack web application with React frontend and Node.js backend
- Multi-tenant architecture with client data isolation (flat structure)
- Real-time IoT device monitoring and fault detection
- Role-based access control with custom permission system
- Python-based IoT data processors for real-time data ingestion
- Deployed on Azure cloud infrastructure with CI/CD pipelines

## Project Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │◄───┤   Node.js API    │◄───┤   SQL Server    │
│   (TypeScript)   │    │   Backend        │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Python IoT     │
                       │   Processors     │
                       └──────────────────┘
```

### Technology Stack

**Frontend (React/TypeScript)**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for modern build tooling
- **Styling:** Tailwind CSS with shadcn/ui component library
- **State Management:** React Context API
- **Routing:** React Router v6
- **Data Visualization:** Recharts for interactive charts
- **Authentication:** JWT-based auth with protected routes

**Backend (Node.js/Express)**
- **Runtime:** Node.js 20+ with Express.js framework
- **Authentication:** JWT tokens with bcrypt password hashing
- **Database:** Microsoft SQL Server with connection pooling
- **Security:** Helmet, CORS, rate limiting, input validation
- **Session Management:** Custom session middleware with database storage
- **API:** RESTful API design with role-based endpoint protection

**Database (SQL Server)**
- **Primary Database:** Microsoft SQL Server
- **Schema:** Multi-tenant with client isolation
- **Core Tables:** Users, Clients, Devices, IoT_Data_New, IoT_Data_Sick
- **Views:** Optimized views for dashboard queries and analytics
- **Security:** Row-level security via client_id foreign keys

**IoT Processing (Python)**
- **Framework:** Custom Python processors with SQLAlchemy
- **Dependencies:** pandas, requests, pyodbc, tabulate
- **Functionality:** Real-time data ingestion and processing
- **Logging:** Comprehensive logging for monitoring and debugging

## Core Features

### 1. Dashboard & Monitoring
- **Unified Dashboard:** Single interface for IoT and Motor device monitoring
- **Real-time Data:** Live device status, health metrics, and performance indicators
- **Interactive Visualizations:** Charts, graphs, and status tiles using Recharts
- **Fault Detection:** Automated fault detection with real-time alerting
- **Historical Analysis:** Access to historical device data and trends

### 2. Multi-Tenant Architecture
- **Client Isolation:** Strict data separation between different clients/organizations
- **User Assignment:** Users assigned to specific clients with access restrictions
- **Device Assignment:** Devices belong to specific clients with visibility controls
- **Flat Structure:** Simple client model without hierarchical relationships
- **Data Security:** All queries filtered by client_id for security

### 3. Role-Based Access Control
- **Built-in Roles:**
  - `admin`: Full system access and user management
  - `user`: Standard dashboard access
  - `viewer`: Read-only dashboard access
  - `dashboard_viewer`: View-only access to both dashboards

- **Custom Roles:**
  - `tk_iot_access`: IoT dashboard access only
  - `aj_motor_access`: Motor dashboard access only

- **Permission System:**
  - Dashboard-level permissions (IoT vs Motor)
  - Action-level permissions (access, edit, delete)
  - Client-level data isolation

### 4. Device Management
- **Device Registration:** Add/edit/remove IoT and motor devices
- **Client Assignment:** Assign devices to specific clients
- **Configuration Management:** Device settings and parameter configuration
- **Status Monitoring:** Real-time device health and connectivity status
- **Alert Management:** Configure and manage device alerts and thresholds

### 5. User Management (Admin Features)
- **User Creation:** Add new users with role assignment
- **Client Assignment:** Assign users to specific clients
- **Role Management:** Create and modify custom roles
- **Session Management:** Monitor and manage active user sessions
- **Permission Control:** Fine-grained permission management

## Database Schema

### Core Tables
```sql
Users: user_id, user_name, email, password_hash, roles, client_id
Clients: client_id, client_name, contact_person, email, phone
Device: Device_ID, Device_Name, client_id, Device_Type, status
IoT_Data_New: device_id, timestamp, sensor_data, status_flags
IoT_Data_Sick: device_id, timestamp, motor_data, performance_metrics
```

### Key Views
- `v_DeviceSummary`: Complete device overview with health status
- `v_FaultAnalysis`: IoT device fault analysis and trends
- `v_MotorAnalysis`: Motor device performance analysis
- `v_ClientDashboardStats`: Client-level statistics and summaries

### Security Model
- Client-based data isolation via `client_id` foreign keys
- Role-based permissions stored in `role_permissions` table
- JWT authentication with secure session management
- Password encryption using bcrypt hashing

## Deployment Architecture

### Azure Cloud Infrastructure
- **Frontend:** Azure Static Web Apps
  - URL: https://polite-smoke-0f45f3a00.1.azurestaticapps.net
  - SPA routing configuration for React Router
  - Automated deployment via GitHub Actions

- **Backend:** Azure App Service (Linux)
  - URL: https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net
  - Node.js runtime with environment variables
  - Automated deployment via GitHub Actions

- **Database:** Azure SQL Database
  - Server: genvolt-sql-server.database.windows.net
  - Database: gendb
  - Configured with firewall rules for Azure services

### CI/CD Pipeline
- **Source Control:** GitHub repository with main branch
- **Frontend Pipeline:** Static Web Apps auto-deployment
- **Backend Pipeline:** App Service deployment via GitHub Actions
- **Environment Management:** Production and development configurations

## Security Features

### Authentication & Authorization
- **JWT Tokens:** Secure token-based authentication
- **Password Security:** bcrypt hashing with salt rounds
- **Session Management:** Database-backed session storage
- **Role Verification:** Server-side role validation on all endpoints

### Data Protection
- **CORS Configuration:** Strict cross-origin resource sharing policies
- **Input Validation:** Server-side validation using express-validator
- **SQL Injection Prevention:** Parameterized queries and ORM usage
- **Rate Limiting:** API endpoint rate limiting for DDoS protection

### Network Security
- **HTTPS Enforcement:** SSL/TLS encryption for all communications
- **Environment Variables:** Secure configuration management
- **Database Firewall:** Network-level database access controls

## Testing & Quality Assurance

### Test Coverage
- **Regression Test Suite:** Comprehensive testing documented in REGRESSION_TEST_SUITE.md
- **Manual Testing:** API testing and frontend permission validation
- **Database Testing:** Data isolation and permission system validation

### Quality Tools
- **Code Linting:** ESLint for frontend code quality
- **Type Checking:** TypeScript for compile-time error detection
- **Security Scanning:** Regular dependency vulnerability scans

## Development Workflow

### Local Development Setup
1. **Prerequisites:** Node.js 18+, Python 3.8+, SQL Server, Git
2. **Database Setup:** Execute setup scripts in sequence
3. **Backend Setup:** npm install, environment configuration
4. **Frontend Setup:** npm install, development server
5. **IoT Processors:** pip install requirements, processor startup

### Development Commands
```bash
# Backend development
cd backend && npm run dev

# Frontend development  
cd frontend && npm run dev

# IoT processor
cd iot-processors/src && python iot_data_processor.py
```

## Business Value & Use Cases

### Primary Use Cases
1. **Industrial Monitoring:** Real-time monitoring of manufacturing equipment
2. **Predictive Maintenance:** Early fault detection and maintenance scheduling
3. **Multi-Site Management:** Manage devices across multiple client locations
4. **Compliance Reporting:** Generate reports for regulatory compliance
5. **Performance Analytics:** Analyze device performance and optimization opportunities

### Business Benefits
- **Operational Efficiency:** Reduced downtime through proactive monitoring
- **Cost Savings:** Predictive maintenance reduces repair costs
- **Scalability:** Multi-tenant architecture supports business growth
- **Security:** Role-based access ensures data privacy and compliance
- **Integration:** API-based architecture enables third-party integrations

## Project Status & Future Roadmap

### Current Status
- ✅ Core application fully functional and deployed
- ✅ Multi-tenant data isolation implemented
- ✅ Role-based access control operational
- ✅ Real-time monitoring and alerting active
- ✅ Azure cloud deployment complete with CI/CD

### Known Limitations
- **Client Hierarchy:** Currently implements flat client structure (no parent-child relationships)
- **Advanced Analytics:** Limited to basic charts and reports
- **Mobile Support:** Desktop-focused interface (responsive but not native mobile)
- **Third-party Integrations:** No built-in integrations with external systems

### Potential Enhancements
1. **Client Hierarchy:** Implement parent-child client relationships
2. **Advanced Analytics:** Machine learning-based predictive analytics
3. **Mobile Apps:** Native iOS/Android applications
4. **API Extensions:** GraphQL API for flexible data queries
5. **Integration Hub:** Pre-built connectors for popular industrial systems
6. **Advanced Reporting:** Custom report builder with export capabilities

## Resource Requirements

### Development Team
- **Full-Stack Developer:** React/Node.js expertise
- **Database Developer:** SQL Server and schema design
- **DevOps Engineer:** Azure infrastructure and CI/CD
- **IoT Specialist:** Industrial device integration
- **UI/UX Designer:** Dashboard and user interface design

### Infrastructure Costs (Azure)
- **Estimated Monthly Cost:** $20-50 USD
- **App Service:** Standard tier for production workloads
- **Static Web Apps:** Free tier with custom domain
- **SQL Database:** Basic tier suitable for development/testing
- **Storage:** Minimal storage requirements for logs and files

## Contact & Support

### Repository Information
- **GitHub Repository:** https://github.com/genproject60/Claude_dev_Non_Client_Hierarchy
- **Primary Branch:** main
- **Documentation:** Comprehensive docs/ directory with setup guides

### Technical Documentation
- **API Documentation:** docs/api/ directory
- **Database Setup:** database/local-setup/README.md
- **Deployment Guide:** DEPLOYMENT_GUIDE.md
- **Testing Guide:** README-TESTING.md and REGRESSION_TEST_SUITE.md

---

**Document Version:** 1.0  
**Last Updated:** August 7, 2025  
**Project Status:** Production Deployed  
**License:** MIT License