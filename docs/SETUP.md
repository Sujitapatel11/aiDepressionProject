# SoulCare — Local Development Setup Guide

This guide provides step-by-step instructions for running the **SoulCare** backend (Django / Channels / Daphne) and frontend (React / Vite) locally.

---

## System Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Python:** `3.12.x` (Recommended: Python 3.12.0)
- **Node.js:** `^18.x` or `^20.x`
- **npm:** `^9.x` or `^10.x`
- **Git:** Latest release

---

## 1. Backend Setup (Django & Channels)

### Step 1: Navigate to Backend Directory & Create Virtual Environment
```bash
cd backend
python -m venv venv
```

Activate the virtual environment:
- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

### Step 2: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure Backend Environment Variables (`.env`)
Create a file named `.env` in the `backend/` directory:

```env
# ==========================================
# Core Django Security Settings
# ==========================================
DEBUG=True
SECRET_KEY=django-insecure-local-dev-key-change-in-production-12345
ALLOWED_HOSTS=127.0.0.1,localhost,localhost:5173,127.0.0.1:5173

# ==========================================
# Domain URLs for CORS & CSRF
# ==========================================
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://127.0.0.1:8000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ==========================================
# Database & Cache Configuration
# Omit DATABASE_URL to automatically use local SQLite (db.sqlite3)
# ==========================================
# DATABASE_URL=postgresql://user:password@localhost:5432/soulcare_db
REDIS_URL=redis://127.0.0.1:6379

# ==========================================
# Google OAuth Configuration
# ==========================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# ==========================================
# Email Configuration (Password Reset SMTP)
# ==========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-email-app-password
DEFAULT_FROM_EMAIL=your-email@example.com

# ==========================================
# AI / Sentiment Analysis API Key (Optional)
# Falls back to VADER if not provided
# ==========================================
HF_API_KEY=your-huggingface-api-key-optional
```

### Step 4: Run Database Migrations
```bash
python manage.py migrate
```

### Step 5: Create Administrative Superuser
Execute the custom seed command to create the default superuser, or use standard Django utility:

```bash
# Method A: Using project admin creator
python manage.py create_admin

# Method B: Standard Django interactive creator
python manage.py createsuperuser
```

### Step 6: Launch Backend Server

#### Option A: Standard Django WSGI Development Server (HTTP Only)
```bash
python manage.py runserver 127.0.0.1:8000
```

#### Option B: Daphne ASGI Server (Required for Local Real-Time WebSocket Testing)
```bash
daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

---

## 2. Frontend Setup (React + Vite)

### Step 1: Navigate to Frontend Directory
```bash
cd ../frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Frontend Environment Variables (`.env`)
Create a file named `.env` in the `frontend/` directory:

```env
# API & WebSocket Host Targets
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 4: Start Frontend Development Server
```bash
npm run dev
```

The application will be accessible in your browser at `http://localhost:5173`.

---

## 3. Verifying Installation

1. Open `http://localhost:5173` in your browser.
2. Sign up for a new account or sign in with your administrative credentials.
3. Access the health check endpoint at `http://127.0.0.1:8000/api/health/` (should return `{"status": "ok"}`).
