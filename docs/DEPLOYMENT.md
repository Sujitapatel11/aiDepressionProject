# SoulCare — Production Deployment Guide

This guide details the step-by-step procedure for deploying the **SoulCare** backend to **Render**, the frontend to **Vercel**, configuring **Managed Redis (Upstash / Render)**, and setting up **Google OAuth 2.0**.

---

## 1. Backend Deployment (Render Web Service)

### Service Configuration
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Select **New +** $\rightarrow$ **Web Service**.
3. Connect your Git repository (`aiDepressionProject`).
4. Set the **Root Directory** to `backend`.
5. Environment Settings:
   - **Environment:** `Python 3`
   - **Region:** Choose nearest region (e.g., Oregon / Singapore)
   - **Branch:** `main`
6. Build & Start Commands:
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
     ```
   - **Start Command:**
     ```bash
     daphne -b 0.0.0.0 -p $PORT config.asgi:application
     ```

### Required Render Environment Variables
Add the following key-value pairs in the **Environment** tab of your Render service:

| Key | Example / Description |
| :--- | :--- |
| `DEBUG` | `False` |
| `SECRET_KEY` | `<generate-a-strong-random-50-char-secret-key>` |
| `ALLOWED_HOSTS` | `your-backend.onrender.com,your-frontend.vercel.app` |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `BACKEND_URL` | `https://your-backend.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://your-backend.onrender.com,https://your-frontend.vercel.app` |
| `DATABASE_URL` | `postgresql://user:password@hostname:5432/dbname` (Render PostgreSQL connection string) |
| `REDIS_URL` | `rediss://default:password@hostname:6379` (Upstash / Managed Redis SSL URL) |
| `GOOGLE_CLIENT_ID` | `<your-google-oauth-client-id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `<your-google-oauth-client-secret>` |
| `EMAIL_HOST_USER` | `<your-email-address>` |
| `EMAIL_HOST_PASSWORD` | `<your-smtp-app-password>` |
| `HF_API_KEY` | `<optional-huggingface-api-token>` |

---

## 2. Frontend Deployment (Vercel)

### Project Configuration
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your Git repository (`aiDepressionProject`).
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Required Vercel Environment Variables
Add these variables under **Environment Variables** in Vercel:

| Variable | Target Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` |
| `VITE_WS_BASE_URL` | `wss://your-backend.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | `<your-google-oauth-client-id>.apps.googleusercontent.com` |

---

## 3. Redis Setup (Upstash / Managed Redis)

Django Channels relies on Redis as a message broker for pub/sub broadcasting across WebSockets.

### Why Managed Redis (Upstash) Matters for WebSocket Reliability
- **Connection Retention:** Managed Redis providers like Upstash enforce stable TCP sockets and high memory capacity compared to temporary free instances.
- **Connection Resilience:** The backend `CHANNEL_LAYERS` is configured with connection retries and explicit timeouts:
  ```python
  CHANNEL_LAYERS = {
      "default": {
          "BACKEND": "channels_redis.core.RedisChannelLayer",
          "CONFIG": {
              "hosts": [{
                  "address": REDIS_URL,
                  "socket_connect_timeout": 5,
                  "socket_timeout": 5,
                  "retry_on_timeout": True,
                  "health_check_interval": 30,
              }],
              "capacity": 1500,
              "expiry": 10,
          },
      },
  }
  ```

---

## 4. Google OAuth Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
3. Select or create an **OAuth 2.0 Client ID** (Web application).
4. Configure **Authorized JavaScript Origins**:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `https://your-frontend.vercel.app`
5. Configure **Authorized Redirect URIs**:
   - `http://localhost:5173`
   - `https://your-frontend.vercel.app`
6. Copy the **Client ID** and **Client Secret** into your Render and Vercel environment configurations.
