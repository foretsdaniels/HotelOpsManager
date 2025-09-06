# Hotel Operations Management System

## Overview

This is a mobile-first hotel operations platform inspired by Visual Matrix MOP that streamlines housekeeping and maintenance workflows, inspections, preventive maintenance, and reporting without guest interaction features. The system supports multiple roles including Site Admin, Head Housekeeper, Room Attendant, Maintenance, and Front Desk/Manager with comprehensive task management, inspection workflows, work order tracking, and reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **PWA Support**: Service worker implementation with manifest.json for mobile-first experience
- **Mobile Design**: Responsive design with dedicated mobile navigation and floating action buttons

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful APIs with role-based access control middleware
- **File Storage**: Google Cloud Storage integration with object ACL policies
- **Development Storage**: File-based JSON storage for development/testing

### Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **File Storage**: Google Cloud Storage for photos and documents with ACL-based access control
- **Development Mode**: JSON file-based storage for rapid development and testing

### Authentication and Authorization
- **JWT Tokens**: 7-day expiration with automatic refresh
- **Role-Based Access**: Five distinct roles with granular permissions
- **Middleware Protection**: Route-level and method-level authorization checks
- **Panic Alert System**: Special permissions for emergency alert recipients

### Key Features Architecture
- **Task Management**: CRUD operations with assignment, status tracking, and soft delete/restore
- **Inspection System**: Room and process inspections with checklists, photos, and digital signatures
- **Maintenance Workflows**: Work orders with priority/SLA tracking and preventive maintenance scheduling
- **Reporting Engine**: RA average times, inspection reports, and square-foot based productivity metrics
- **Lost & Found**: Item tracking with automated expiration and bulk clearing capabilities

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity for serverless environments
- **drizzle-orm** and **drizzle-zod**: Type-safe database operations and schema validation
- **bcryptjs**: Password hashing and verification
- **jsonwebtoken**: JWT token generation and verification
- **@tanstack/react-query**: Server state management and caching
- **express**: Web application framework with middleware support

### UI and Styling
- **@radix-ui/***: Complete component library for accessible UI primitives
- **tailwindcss**: Utility-first CSS framework with custom design tokens
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library for consistent iconography

### Development and Build Tools
- **vite**: Fast build tool with hot module replacement
- **typescript**: Type safety across the entire application
- **esbuild**: Fast bundling for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

### File Upload and Storage
- **@google-cloud/storage**: Cloud storage integration with ACL support
- **@uppy/core** and **@uppy/react**: File upload components with progress tracking
- **@uppy/aws-s3**: S3-compatible storage adapter

### Authentication and Security
- **connect-pg-simple**: PostgreSQL session store for Express
- **cors**: Cross-origin resource sharing configuration

### Date and Time Handling
- **date-fns**: Date manipulation and formatting utilities

The application is designed to run in both development and production environments with automatic environment detection and appropriate service configuration.