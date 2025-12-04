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
- **React Native Maps**: Native map integration for technician tracking
- **Expo Mail Composer**: Email composition for sending reports

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