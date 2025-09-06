# 🏨 Hotel Operations Management System

> A comprehensive, mobile-first hotel operations platform inspired by Visual Matrix MOP that streamlines housekeeping workflows, inspections, and KPI reporting.

## ✨ Features

### 🔐 Role-Based Access Control
- **Site Admin**: Complete system management and configuration
- **Head Housekeeper**: Staff oversight and inspection management
- **Room Attendant**: Task completion and room status updates
- **Front Desk/Manager**: Guest services and operational oversight

### 🏠 Room Management
- **Real-time Room Status**: Clean, dirty, inspected, out of order, maintenance
- **Room Assignments**: Dynamic assignment of rooms to attendants
- **Room Comments**: Collaborative notes system with urgency levels
- **Bulk Operations**: Multi-room status updates and assignments

### 📋 Task Management
- **Priority System**: High, medium, low priority with SLA tracking
- **Task Assignment**: Role-based task distribution
- **Real-time Updates**: WebSocket-powered live updates across all clients

### 🔍 Inspection System
- **Room Inspections**: Comprehensive room quality checks
- **Process Inspections**: Operational procedure verification
- **Digital Signatures**: Secure inspector sign-off
- **Photo Documentation**: Visual evidence capture and storage

### 📊 Advanced Reporting & Analytics
- **Interactive Charts**: Room status distribution, task completion trends
- **Productivity Metrics**: Staff performance and efficiency tracking
- **Inspection Analytics**: Quality control and compliance reporting
- **CSV Export**: Comprehensive data export capabilities
- **Date Range Filtering**: Flexible reporting periods

### 🚨 Emergency Features
- **Panic Alert System**: Instant emergency notifications
- **Alert Recipients**: Configurable emergency contact system
- **Alert Logging**: Complete emergency event audit trail

### 📱 Mobile-First Design
- **Progressive Web App (PWA)**: Full offline capability
- **Responsive Design**: Optimized for mobile devices and tablets
- **Touch-Friendly UI**: Intuitive gesture-based interactions
- **Service Worker**: Offline functionality and caching

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe UI development
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for utility-first styling
- **Radix UI** + **shadcn/ui** for accessible, beautiful components
- **TanStack Query** for intelligent server state management
- **Wouter** for lightweight client-side routing
- **Recharts** for interactive data visualizations
- **PWA Support** with service worker and offline capabilities

### Backend
- **Node.js** with **Express.js** framework
- **TypeScript** for end-to-end type safety
- **JWT Authentication** with bcrypt password hashing
- **WebSocket** integration for real-time updates
- **Nodemailer** for email notifications
- **Google Cloud Storage** integration for file storage

### Database & Storage
- **PostgreSQL** with **Drizzle ORM** for type-safe database operations
- **Neon Database** for serverless PostgreSQL hosting
- **Google Cloud Storage** for photos and document storage
- **Development Storage**: JSON file-based storage for rapid prototyping

### Development Tools
- **ESBuild** for fast TypeScript compilation
- **Drizzle Kit** for database schema migrations
- **Hot Module Replacement (HMR)** for rapid development
- **Type-safe API** contracts between frontend and backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use Neon for serverless)
- Google Cloud Storage bucket (optional, for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/hotel-ops-management.git
   cd hotel-ops-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/hotel_ops"
   
   # JWT Secret
   JWT_SECRET="your-super-secret-jwt-key"
   
   # Email Configuration (Optional)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="Hotel Operations <noreply@yourhotel.com>"
   
   # Google Cloud Storage (Optional)
   GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
   GCS_BUCKET_NAME="your-hotel-bucket"
   ```

4. **Database Setup**
   ```bash
   # Generate and run migrations
   npm run db:generate
   npm run db:migrate
   
   # Seed initial data (optional)
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## 📖 Usage Guide

### 🔑 Initial Setup

1. **First Login**: Use the default admin credentials to access the system
2. **Create Users**: Set up staff accounts with appropriate roles
3. **Configure Rooms**: Add hotel rooms with floor and type information
4. **Setup Email**: Configure SMTP settings for notifications (optional)

### 👨‍💼 Site Admin Operations

- **User Management**: Create, edit, and manage staff accounts
- **System Configuration**: Email settings, emergency contacts
- **Reports & Analytics**: Access comprehensive operational reports
- **Panic Alert Management**: Configure emergency alert recipients

### 🧹 Head Housekeeper Workflow

- **Staff Assignment**: Assign rooms to room attendants
- **Inspection Oversight**: Review and approve room inspections
- **Quality Control**: Monitor cleaning standards and efficiency
- **Report Generation**: Track team performance and productivity

### 🏠 Room Attendant Daily Tasks

- **Task Management**: View assigned tasks and update completion status
- **Room Status Updates**: Mark rooms as clean, dirty, or requiring maintenance
- **Photo Documentation**: Capture before/after photos of room conditions
- **Notes & Comments**: Add detailed notes about room conditions

### 🛎️ Front Desk Operations

- **Room Overview**: Monitor real-time room status across the property
- **Guest Services**: Coordinate with housekeeping for guest requests
- **Assignment Tracking**: View current room assignments and progress
- **Reporting**: Access operational reports and metrics


## 📡 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/me` - Current user information

### Room Management
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create new room
- `PATCH /api/rooms/:id` - Update room status/details
- `DELETE /api/rooms/:id` - Remove room

### Task Operations
- `GET /api/tasks` - Fetch user tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task status
- `DELETE /api/tasks/:id` - Remove task

### Inspection System
- `GET /api/inspections` - List inspections
- `POST /api/inspections` - Create inspection
- `PATCH /api/inspections/:id` - Update inspection results

### Reporting Endpoints
- `GET /api/reports/overview` - Operational summary
- `GET /api/reports/room-status` - Room status distribution
- `GET /api/reports/productivity` - Staff productivity metrics
- `GET /api/reports/task-trends` - Task completion trends

### WebSocket Events
- `room_status_update` - Real-time room status changes
- `task_update` - Task assignment and completion notifications
- `comment_added` - New room comments and notes
- `inspection_complete` - Inspection completion alerts

## 🗂️ Project Structure

```
hotel-ops-management/
├── 📁 client/                    # Frontend React application
│   ├── 📁 src/
│   │   ├── 📁 components/        # Reusable UI components
│   │   │   ├── 📁 ui/           # shadcn/ui components
│   │   │   └── 📄 *.tsx         # Feature components
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   ├── 📁 pages/            # Route components
│   │   ├── 📁 services/         # API service functions
│   │   └── 📄 App.tsx           # Main application component
│   ├── 📄 index.html            # HTML entry point
│   └── 📄 manifest.json         # PWA manifest
├── 📁 server/                    # Backend Express application
│   ├── 📄 index.ts              # Server entry point
│   ├── 📄 routes.ts             # API route definitions
│   ├── 📄 storage.ts            # Database abstraction layer
│   ├── 📄 websocketService.ts   # WebSocket event handling
│   ├── 📄 emailService.ts       # Email notification system
│   └── 📄 dailyResetService.ts  # Scheduled task automation
├── 📁 shared/                    # Shared types and schemas
│   └── 📄 schema.ts             # Database schema definitions
├── 📁 drizzle/                   # Database migrations
├── 📄 package.json              # Project dependencies
├── 📄 vite.config.ts            # Vite configuration
├── 📄 tailwind.config.ts        # Tailwind CSS configuration
├── 📄 drizzle.config.ts         # Database configuration
└── 📄 README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `SMTP_HOST` | Email server hostname | No | - |
| `SMTP_PORT` | Email server port | No | 587 |
| `SMTP_USER` | Email authentication username | No | - |
| `SMTP_PASS` | Email authentication password | No | - |
| `SMTP_FROM` | From address for system emails | No | - |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket | No | - |
| `NODE_ENV` | Environment mode | No | development |

### Database Schema

The application uses Drizzle ORM with PostgreSQL. Key entities include:

- **Users**: Staff accounts with role-based permissions
- **Rooms**: Hotel room inventory with status tracking
- **Tasks**: Work assignments with priority and completion tracking
- **Inspections**: Quality control records with results
- **Room Comments**: Collaborative notes system
- **Panic Alerts**: Emergency notification system

## 🚀 Deployment

### Production Setup

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="your-production-db-url"
   # ... other environment variables
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start the production server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Replit Deployment

This application is optimized for Replit deployment with automatic environment detection and service configuration.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript typing
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Functional components with hooks
- **CSS**: Tailwind CSS utility classes
- **Database**: Type-safe Drizzle ORM queries
- **API**: RESTful endpoints with proper error handling

### Commit Convention

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Express.js Guide](https://expressjs.com)

---

Built with ❤️ for the hospitality industry
