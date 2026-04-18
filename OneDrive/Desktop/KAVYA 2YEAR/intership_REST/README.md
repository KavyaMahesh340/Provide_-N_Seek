# TaskFlow — Multi-Tenant Task Management System

A production-grade, full-stack task management platform with **multi-tenancy**, **RBAC**, **JWT authentication**, **Google OAuth**, **Docker containerization**, a **React web app**, and a **React Native mobile app**.

---

## 🏗️ Project Structure

```
intership_REST/
├── backend/          # Node.js + Express + PostgreSQL API
├── web/              # React + Vite web application
├── mobile/           # React Native + Expo mobile app
├── docker-compose.yaml
└── .env.example
```

---

## 🚀 Quick Start (Docker)

```bash
# 1. Copy env file and fill in your secrets
cp .env.example .env

# 2. Start all services (Postgres + Backend + Web)
docker-compose up --build

# Web app:   http://localhost
# API:       http://localhost:5000/api/health
```

---

## 💻 Local Development

### Backend
```bash
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run dev            # http://localhost:5000
```

### Web App
```bash
cd web
npm install
npm run dev            # http://localhost:5173
```

### Mobile App
```bash
cd mobile
npm install
npx expo start         # Scan QR with Expo Go app
```

> **Note:** For Android emulator, the API URL is `http://10.0.2.2:5000/api`.  
> For physical device, change `API_URL` in `mobile/services/api.js` to your machine's local IP.

---

## 🔐 Authentication & Roles

| Feature | Endpoint |
|---------|----------|
| Register (creates org) | `POST /api/auth/register` |
| Login | `POST /api/auth/login` |
| Refresh token | `POST /api/auth/refresh` |
| Google OAuth | `GET /api/auth/google` |

### Roles
| Role | Permissions |
|------|-------------|
| **admin** | Full CRUD on all org tasks, manage members, view audit log |
| **member** | Create tasks, view all org tasks, edit/delete own tasks only |

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 16 database |
| `backend` | 5000 | Node.js REST API |
| `web` | 80 | React app served by nginx |

---

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Set redirect URI to `http://localhost:5000/api/auth/google/callback`
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

---

## 📱 Mobile App Screens

- **Login / Register** — Auth with email+password
- **Dashboard** — Stats, progress bar, recent tasks
- **Tasks** — List, search, create, edit, delete
- **Create/Edit Task** — Form with status/priority selectors

---

## 🔒 Security Features

- JWT access tokens (15min) + refresh tokens (7 days)
- bcryptjs password hashing (cost factor 12)
- Helmet.js HTTP security headers
- Rate limiting: 200 req/15min (20 req/15min on auth routes)
- Strict org isolation on every query
- RBAC enforced at route level
- Comprehensive audit logging

---

## 📊 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/users
POST   /api/users/invite         [admin]
PATCH  /api/users/:id/role       [admin]
DELETE /api/users/:id            [admin]

GET    /api/organizations/me
PATCH  /api/organizations/me     [admin]

GET    /api/audit                [admin]
```
