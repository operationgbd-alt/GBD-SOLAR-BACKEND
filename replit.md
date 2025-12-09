# Overview

SolarTech is a mobile-first solar panel installation management system built with React Native (Expo) and a Node.js backend. The application enables solar installation companies to manage interventions, track technician locations, schedule appointments, and coordinate work across multiple installation companies and their technicians. The system supports three user roles: Master (administrator), Ditta (installation company), and Tecnico (field technician).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 with native stack and bottom tabs
- **State Management**: React Context API for global state (AppContext, AuthContext)
- **UI Components**: Custom themed components with light/dark mode support
- **Animations**: React Native Reanimated for smooth transitions and interactions
- **Offline Support**: AsyncStorage for local data persistence and offline-first functionality

**Key Design Patterns**:
- **Context-based state**: Separate contexts for authentication (AuthContext) and application data (AppContext)
- **Screen-specific navigation stacks**: Dashboard, Interventions, Completed, and Profile stacks managed independently
- **Offline-first with sync**: Local storage as primary data source with periodic server synchronization
- **Responsive theming**: Dynamic theme switching based on system color scheme
- **Platform-specific code**: Separate implementations for native mobile vs web (e.g., TechnicianMap.tsx vs TechnicianMap.web.tsx)

**Component Organization**:
- Reusable themed components (ThemedView, ThemedText, Card, Button)
- Screen-specific container components with scroll views and keyboard handling
- Navigation wrappers with custom back button logic and header configurations

## Backend Architecture

**Framework**: Express.js with TypeScript
- **Database Access**: Raw PostgreSQL queries using node-postgres (pg) library
- **Authentication**: JWT-based authentication with bcryptjs for password hashing
- **API Design**: RESTful endpoints organized by resource type

**Key Design Decisions**:
- **No ORM**: Direct SQL queries for simplicity and control
- **Role-based access control**: Middleware-based authorization checking user roles
- **Stateless authentication**: JWT tokens with 7-day expiration
- **CORS enabled**: Supports cross-origin requests from mobile app

**API Structure**:
- `/api/auth` - Login and registration
- `/api/interventions` - CRUD operations for work orders
- `/api/appointments` - Calendar and scheduling
- `/api/companies` - Installation company management
- `/api/users` - User and technician management

**Security Approach**:
- Password hashing with bcryptjs (10 salt rounds)
- JWT token validation middleware on protected routes
- Role-based middleware for admin-only operations
- SQL injection prevention through parameterized queries

## Data Storage

**Local Storage (Mobile)**:
- AsyncStorage for offline data caching
- Storage keys: `solartech_companies`, `solartech_users`, `solartech_interventions`, `solartech_auth_token`
- Hybrid approach: Local state is primary, with periodic server sync via `refreshFromServer()`

**Database (PostgreSQL)**:
- Tables: companies, users, interventions, appointments
- Foreign key relationships between users-companies, interventions-users/companies
- Timestamp tracking for created_at and updated_at fields
- SSL connection required in production

**Data Sync Strategy**:
- Mobile app maintains local state for fast access
- Server API called for create/update/delete operations
- Manual refresh from server updates local cache
- Token-based authentication maintains session across app restarts

## Authentication & Authorization

**Authentication Flow**:
1. User enters credentials
2. Backend validates against PostgreSQL users table
3. JWT token generated with user ID, role, and company ID
4. Token stored in AsyncStorage and used in API request headers
5. 401 responses trigger automatic logout

**Demo Accounts**:
- Hardcoded demo credentials in AuthContext for development
- Master account: `gbd/password`
- Company accounts and technicians created dynamically

**Role Hierarchy**:
- **MASTER**: Full system access, manages companies and all interventions
- **DITTA**: Company-level access, manages own technicians and assigned interventions
- **TECNICO**: Field technician access, views and updates assigned interventions

**Authorization Strategy**:
- Frontend: Role checks in components to show/hide features
- Backend: `requireRole()` middleware for endpoint protection
- User object attached to requests via `AuthRequest` interface

## External Dependencies

**Mobile App (Expo)**:
- **Expo modules**: Camera, Location, Image Picker, Notifications, Secure Store
- **React Navigation**: Navigation library for mobile-first routing
- **React Native Reanimated**: Animation library for smooth UI transitions
- **React Native Maps**: Native map integration for technician tracking with clustering
- **react-native-map-clustering**: Automatic marker clustering for performance
- **Expo Mail Composer**: Email composition for sending reports

**Map Performance Optimizations**:
- Marker clustering with react-native-map-clustering (groups nearby markers)
- Memoized markers with React.memo to prevent unnecessary re-renders
- tracksViewChanges={false} on markers for better scroll performance
- Platform-specific implementations: native ClusteredMapView for mobile, simplified UI for web

**Backend Services**:
- **PostgreSQL**: Primary database (expected to be Railway-hosted in production)
- **Railway**: Deployment platform with automatic DATABASE_URL injection
- **GitHub**: Version control integration via Octokit REST API

**Third-party APIs**:
- **Expo Push Notifications**: For intervention alerts to master users
- **OpenAI SDK**: Listed in root package.json (purpose unclear from codebase)

**Development Tools**:
- **tsx**: TypeScript execution for development
- **TypeScript**: Type checking across frontend and backend
- **Prettier**: Code formatting (configured in package.json scripts)
- **Babel**: Module resolution with path aliases (`@/` -> root directory)

**Production Environment**:
- Backend hosted on Railway with PostgreSQL add-on
- API URL configured via `API_URL` environment variable
- Mobile apps built with EAS (Expo Application Services)
- SSL/TLS for database connections in production

## Recent Changes

**December 2025 - Navigation & Layout Fix**:
- Fixed back button navigation in all stack navigators (ProfileStackNavigator, InterventionsStackNavigator, DashboardStackNavigator)
- Changed from `navigation.reset()` to `navigation.goBack()` for proper back navigation behavior
- Added minimum touch target size (44x44px) for mobile accessibility compliance
- Increased back button icon size from 24 to 28 for better visibility on mobile
- Fixed layout padding issues in `useScreenInsets.ts` - removed dependency on `useHeaderHeight()` and `useBottomTabBarHeight()` that caused double padding and content being cut off
- Now uses simple safe area insets with fixed padding values for consistent layout

**December 2025 - Shared Label Helpers System**:
- Created `backend/src/services/labelHelpers.ts` with centralized mappings for status/priority/type labels
- Comprehensive Italian/English enum coverage: nuovo, assegnato, in_corso, completato, sospeso, verifica_programmata, richiamo, post_installazione, etc.
- Helper functions with console.warn telemetry for unmapped values: getStatusLabel, getStatusClass, getPriorityLabel, getPriorityClass, getTypeLabel
- Both pdfService.ts and emailService.ts now use shared helpers for consistent label normalization
- CSS class mapping ensures correct badge colors in PDF: pending, assigned, in_progress, completed, cancelled

**December 2025 - Professional PDF with Email Integration**:
- New HTML template-based PDF generation using Puppeteer for professional layout
- PDF includes: GBD Energy logo, styled sections, status badges, priority indicators, GPS links, photo gallery
- SendGrid integration for automatic email delivery of reports
- New endpoints: `POST /interventions/:id/send-report`, `GET /interventions/:id/download-report`
- Role-based access: only MASTER and DITTA can generate/send reports
- Email sent to operation.gbd@gruppo-phoenix.com with PDF attachment
- Frontend: "Invia Email" button added to InterventionDetailScreen
- Services: `pdfService.ts` (Puppeteer), `emailService.ts` (SendGrid)
- Template: `backend/src/templates/intervention-report.html`

**December 2025 - PDF Generation Enhancement**:
- Added professional PDF report generation endpoint (`/api/interventions/:id/pdf`)
- PDF includes GBD Energy SRL logo, client data, intervention details, GPS position, notes, and photo documentation
- Role-based access control ensures technicians/companies can only download their own interventions
- Frontend updated to support PDF download on both web and mobile platforms
- Added `getToken()` and `getBaseUrl()` methods to API service

**December 2025 - Web Intervention Detail Fix**:
- Fixed API response handling in InterventionDetailScreen (response.success instead of response.data.success)

**December 2025 - Intervention Persistence Fix**:
- Fixed intervention persistence: `addIntervention` now async function that saves to server when `hasValidToken` is true
- Backend response format standardized to `{success: true, data: intervention}` for proper frontend handling
- Added loading states on CreateInterventionScreen submit button
- Debug logging added for troubleshooting sync issues

**Known Issue - Railway Backend Configuration**:
- The Railway backend deployment may be using a different DATABASE_URL than expected
- To fix: Verify DATABASE_URL in Railway dashboard matches the PostgreSQL connection string
- Local database setup script: `backend/setup_db.js` creates tables and admin user
- Admin credentials: `admin / admin123` (once DATABASE_URL is properly configured)