# Proactive Collaborative Forms

A real-time collaborative form filling system that allows multiple users to work together on structured forms simultaneously, similar to Google Docs but for forms.

## 🎯 Project Overview

This system enables **collaborative form filling** where multiple users can join a shared form and work together to fill one collective response in real-time. Think of it as a live shared survey where everyone contributes to a single response.

### Key Features

- **Real-time Collaboration**: Multiple users can edit forms simultaneously with live updates
- **Multiple Groups per Form**: Each form can have multiple sharing codes for different groups
- **Field Locking**: Prevents conflicts when multiple users edit the same field
- **User Presence**: See who's currently working on the form
- **Role-based Access**: Admin and User roles with different permissions
- **Dynamic Form Builder**: Create forms with various field types (text, email, dropdown, etc.)
- **Response Analytics**: View and analyze form responses with contributor tracking

## 🏗️ Architecture & Design Decisions

### Technology Stack

| Component      | Technology                | Justification                                        |
| -------------- | ------------------------- | ---------------------------------------------------- |
| **Backend**    | Node.js + Express + TS    | Fast development, strong typing, WebSocket support   |
| **Real-time**  | Socket.IO                 | Reliable WebSocket implementation with fallbacks     |
| **Database**   | Supabase (PostgreSQL)     | Real-time subs, built-in auth, scalable SQL database |
| **Caching**    | Upstash Redis             | Fast field locking, session management               |
| **Frontend**   | React + TypeScript + Vite | Modern, fast dev with strong typing                  |
| **Styling**    | Tailwind CSS              | Rapid UI dev with consistent design                  |
| **Deployment** | Docker + Docker Compose   | Containerized deployment for consistency             |

### Key Design Decisions

1. **Multiple Sharing Codes per Form**: Each form supports multiple sharing codes, allowing isolated group work.
2. **Field Locking Strategy**: Optimistic locking with auto-expiration ensures smooth concurrent editing.
3. **Real-time Architecture**: Socket.IO + Redis for room isolation and distributed state management.
4. **Database Schema**: Normalized schema with tables for forms, fields, sharing codes, responses, and contributions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Supabase account
- Upstash Redis account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/proactive-collaborative-forms.git
cd proactive-collaborative-forms
```

```env
# 2. Set up environment variables

# backend/.env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# frontend/.env
VITE_BACKEND_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# 3. Run with Docker Compose
docker-compose up --build

# 4. Or run manually
cd backend && npm install && npm run dev
# new terminal
cd frontend && npm install && npm run dev
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📁 Project Structure

```text
PROACTIVE-COLLABORATIVE-FORMS/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.ts
│   │   ├── controllers/
│   │   │   └── formController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── forms.ts
│   │   ├── services/
│   │   │   └── socketService.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── app.ts
│   ├── .env
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActiveUsers.tsx
│   │   │   ├── FormField.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── SocketContext.tsx
│   │   ├── pages/
│   │   │   ├── CollaborativeForm.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FormBuilder.tsx
│   │   │   ├── FormResponses.tsx
│   │   │   ├── JoinForm.tsx
│   │   │   └── Login.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint             | Description   | Auth |
| ------ | -------------------- | ------------- | ---- |
| POST   | `/api/auth/register` | Register user | No   |
| POST   | `/api/auth/login`    | Login         | No   |

### Form Management

| Method | Endpoint                           | Description      | Auth | Role  |
| ------ | ---------------------------------- | ---------------- | ---- | ----- |
| POST   | `/api/forms`                       | Create form      | Yes  | Admin |
| GET    | `/api/forms`                       | Get user forms   | Yes  | Admin |
| DELETE | `/api/forms/:formId`               | Delete form      | Yes  | Admin |
| POST   | `/api/forms/:formId/sharing-codes` | New sharing code | Yes  | Admin |
| GET    | `/api/forms/:formId/responses`     | Get responses    | Yes  | Admin |

### Form Collaboration

| Method | Endpoint                                      | Description           | Auth | Role |
| ------ | --------------------------------------------- | --------------------- | ---- | ---- |
| GET    | `/api/forms/share/:shareCode`                 | Get form by shareCode | Yes  | Any  |
| POST   | `/api/forms/share/:shareCode/submit`          | Submit response       | Yes  | Any  |
| PUT    | `/api/forms/share/:shareCode/fields/:fieldId` | Update field          | Yes  | Any  |

### System

| Method | Endpoint  | Description  | Auth |
| ------ | --------- | ------------ | ---- |
| GET    | `/health` | Health check | No   |

## 🔄 Real-time Features

### WebSocket Events

| Event                | Direction       | Description                   |
| -------------------- | --------------- | ----------------------------- |
| `join-form`          | Client → Server | Join collaboration room       |
| `field-update`       | Client → Server | Update field value            |
| `lock-field`         | Client → Server | Lock field                    |
| `unlock-field`       | Client → Server | Unlock field                  |
| `form-submit`        | Client → Server | Submit form                   |
| `form-reset`         | Client → Server | Reset form                    |
| `field-updated`      | Server → Client | Notify field update           |
| `field-locked`       | Server → Client | Notify field locked           |
| `field-unlocked`     | Server → Client | Notify field unlocked         |
| `user-joined`        | Server → Client | User joined                   |
| `user-left`          | Server → Client | User left                     |
| `active-users`       | Server → Client | Send active user list         |
| `form-submitted-all` | Server → Client | Notify all on form submission |
| `form-reset-all`     | Server → Client | Notify all on form reset      |

## 🎨 Key Features

### 1. Multiple Groups per Form

- Unlimited sharing codes per form
- Isolated responses and analytics

### 2. Real-time Collaboration

- Live updates
- Presence indicators
- Conflict prevention with field locks

### 3. Comprehensive Form Builder

- Text, Email, Number, Dropdown, etc.
- Required fields, reordering
- Grouped fields for clarity

### 4. Advanced Analytics

- View by group, field, or contributor
- CSV export
- Filters and sorting

### 5. Collaborative Submission

- Shared confirmation screen
- Auto-reset for next session
- Everyone sees form state changes

## 🛡️ Security & Data Consistency

### Auth & Access Control

- JWT tokens
- Role-based (Admin/User)
- Protected routes and components

### Conflict Handling

- Locking with timeout
- Notification on conflicts

### Data Integrity

- Transactions for critical paths
- Validation, sanitization
- Rate limiting and graceful errors

## 🚀 Deployment

### Docker

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Steps

1. Configure Supabase schema
2. Set up Upstash Redis
3. Deploy backend with .env
4. Deploy frontend with .env
5. Setup CORS and domain config

## 🧪 Testing

### Manual Test Cases

- Multi-user sessions (open 2+ tabs)
- Field locking under conflict
- Live updates visibility
- Group-level response isolation
- Role-based form access

### API Test

```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"ADMIN"}'
```

## 🎯 Edge Cases Handled

- Lost connection → auto-resync
- Same field edits → locking
- Disconnects → lock cleanup
- Invalid codes → friendly errors
- Form state conflicts → LWW strategy
- Offline mode → reconnect + sync
<!--

## 📸 Demo

### Screenshots

> Add images inside the `/docs/assets` folder and link them here.

![Collaborative Form Filling](./docs/assets/form-collab.png)
![Dashboard](./docs/assets/dashboard.png) -->

<!--
### Video Walkthrough

> Upload demo video to YouTube or local `/docs/demo.mp4` and link.

[Watch Demo on YouTube](https://youtube.com/your-demo-link)
or
📽️ `docs/demo.mp4` -->
