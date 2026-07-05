# 🛡️ SecureAuthX

A gold-standard, production-ready authentication and authorization boilerplate built with the modern MERN stack. Designed from the ground up to prioritize maximum security, seamless user experience, and robust developer ergonomics.

SecureAuthX abstracts away the complexities of session management, email verification, and brute-force protection while providing a beautiful, dynamic, and fully responsive frontend.

---

## ✨ Key Features

- **🔐 Robust Authentication**: Standard Email/Password login powered by bcrypt hashing and secure JWTs.
- **✨ Google-Style Multi-Step Login**: Isolates email collection on Step 1 (plus social logins), then transitions to Step 2 to serve the specific challenge (Password, Email OTP, or MFA TOTP) alongside a **"Try another way to sign in"** option selector to improve accessibility.
- **✉️ Email Verification**: Mandatory email verification pipeline with seamless auto-login upon success.
- **🔄 Gold-Standard Passwords Settings**: Enforces strict password modification checks verifying `currentPassword` match, checking strength (min 8 chars), and blocking updates to the same password. Includes interactive eye visibility toggles for inputs.
- **⚡ Streamlined OTP Recovery**: A single-view verification page that gathers the 6-digit OTP code, New Password, and Confirm Password simultaneously, executing token deletion and secure session initialization in a single atomic flow.
- **📱 strict Authenticator QR Code Setup**: Automatically URL-encodes labels and issuers in OTPAuth URIs (`SecureAuthX%3Auser%40example.com`) to prevent parsing failures in strict authenticator apps like Google, Microsoft, and Oracle Authenticator.
- **🍪 Secure Sessions**: True HTTP-Only, Secure, `SameSite=Strict` cookies. Session tokens are never exposed to client-side JavaScript.
- **🛡️ Enterprise-Grade Security**: 
  - Dynamic API rate-limiting via `express-rate-limit` to prevent brute-force attacks.
  - Hardened HTTP headers via `helmet`.
  - CORS policies strictly bound to the frontend origin.
  - Graceful global error handlers to prevent stack-trace leaks.
  - Database-driven session refresh returning real-time user permissions and MFA states.
- **🧬 WebAuthn Double-Encoding Fix**: Subclasses the core Mongoose database adapter with a `WrappedMongooseAdapter` that intercepts and normalizes double-encoded Base64url credential IDs, guaranteeing biometric authentication works out of the box.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v3/v4](https://tailwindcss.com/)
- **Auth SDK**: `@custom-auth/react` (Provides hooks like `useSession`, `useSignIn`, `useMfa`)

### Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Auth Core**: `@custom-auth/core` + `@custom-auth/mongoose`
- **Email Delivery**: `nodemailer` via `@custom-auth/adapter-nodemailer`
- **Security Middleware**: `helmet`, `cors`, `cookie-parser`, `express-rate-limit`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Instance (Local or Atlas)
- SMTP Server Credentials (e.g., Gmail App Passwords, SendGrid, Mailgun)

### 1. Clone & Install
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Environment Configuration

#### Client Configuration (`client/.env`)
Duplicate `client/.env.example` to create a `client/.env` file:
```env
# The base URL where your SecureAuthX backend API is hosted.
VITE_API_URL=http://localhost:5001/api/auth
```

#### Server Configuration (`server/.env`)
Duplicate `server/.env.example` to create a `server/.env` file:
```env
PORT=5001
CLIENT_URL=http://localhost:5173

# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/secureauthx

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key

# SMTP Configuration (For Magic Links & Password Resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
EMAIL_FROM="SecureAuthX <your_email@gmail.com>"

# Security & Limits
GLOBAL_RATE_LIMIT_WINDOW_MINUTES=15
GLOBAL_RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX_REQUESTS=5
COOKIE_MAX_AGE_DAYS=7

# OAuth Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Application URL (for OAuth redirection callback)
APP_URL=http://localhost:5001
```

### 3. Start the Development Servers

**Run Backend:**
```bash
cd server
npm run dev
```

**Run Frontend:**
```bash
cd client
npm run dev
```

Your application will be running locally at `http://localhost:5173`.

---

## 🏗️ Architecture & Security Highlights

### 1. The Seamless Auto-Login Pipeline
To provide a flawless user experience, the standard multi-step processes have been minimized:
- **Registration**: Creating an account issues a `201 Created` but does *not* issue a session cookie. The user remains unauthenticated until they prove email ownership.
- **Verification**: When the verification link is clicked, the backend validates the token, generates a session cookie on the spot, and the frontend silently syncs the global context (`await refresh()`) before routing the user directly into the Dashboard.
- **Password Reset**: After setting a new password via the OTP verification screen or reset email link, the backend immediately executes a login flow with the new credentials, removing the need for the user to type their new password twice to log in.

### 2. Custom WebAuthn Adapter Bypass
Due to a serialization bug in the core `@custom-auth/core` library, WebAuthn biometric credentials get double-encoded into Base64url during database insertion and options generation, breaking login matches. SecureAuthX resolves this by overriding the Mongoose adapter with a subclass `WrappedMongooseAdapter` inside the controllers layer, intercepting all insertion and lookup queries to normalize the credential IDs automatically.

### 3. Attack Mitigation Strategy
- **Brute Force**: The `/api/auth/*` routes are protected by a strict memory-store rate limiter (`AUTH_RATE_LIMIT`). If an attacker tries to guess passwords, they are locked out after 5 attempts.
- **XSS (Cross-Site Scripting)**: Because JWT tokens are stored in `httpOnly` cookies, malicious JavaScript executing in the browser cannot read or steal the session token.
- **CSRF (Cross-Site Request Forgery)**: Cookies are issued with `sameSite: "strict"` and strict CORS origins, meaning the session cannot be hijacked by a malicious third-party tab.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).