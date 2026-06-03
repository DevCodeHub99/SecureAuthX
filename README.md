# 🛡️ SecureAuthX

A gold-standard, production-ready authentication and authorization boilerplate built with the modern MERN stack. Designed from the ground up to prioritize maximum security, seamless user experience, and developer ergonomics. 

SecureAuthX abstracts away the complexities of session management, email verification, and brute-force protection while providing a beautiful, dynamic, and fully responsive frontend.

---

## ✨ Key Features

- **🔐 Robust Authentication**: Standard Email/Password login powered by bcrypt hashing and secure JWTs.
- **✨ Magic Links**: Passwordless authentication flow using secure, one-time email tokens.
- **✉️ Email Verification**: Mandatory email verification pipeline with seamless auto-login upon success.
- **🔄 Password Recovery**: Secure "Forgot Password" and "Reset Password" workflows with seamless auto-login.
- **🍪 Secure Sessions**: True HTTP-Only, Secure, `SameSite=Strict` cookies. Tokens are never exposed to JavaScript.
- **🛡️ Enterprise-Grade Security**: 
  - Dynamic API rate-limiting via `express-rate-limit` to prevent brute-force attacks.
  - Hardened HTTP headers via `helmet`.
  - CORS policies strictly bound to the frontend origin.
  - Graceful Express 5 global error handlers to prevent stack-trace leaks.
- **🎨 Premium UI/UX**: Built with React and Tailwind CSS, featuring floating labels, browser-autofill overlap prevention, dynamic micro-animations, and responsive design.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v3/v4](https://tailwindcss.com/)
- **Auth SDK**: `@custom-auth/react` (Provides hooks like `useSession`, `useSignIn`)

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
Navigate to the `server/` directory and duplicate the `.env.example` file to create a new `.env` file.

```bash
cp server/.env.example server/.env
```

**Required Environment Variables (`server/.env`)**:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/secureauthx
JWT_SECRET=your_super_secret_jwt_key

# SMTP Configuration (For Magic Links & Verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
EMAIL_FROM="SecureAuthX <your_email@gmail.com>"

# Security & Limits
GLOBAL_RATE_LIMIT_WINDOW_MINUTES=15
GLOBAL_RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX_REQUESTS=5
COOKIE_MAX_AGE_DAYS=7
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

Your app will be running at `http://localhost:5173`.

---

## 🏗️ Architecture & Security Highlights

### 1. The Seamless Auto-Login Pipeline
To provide a flawless user experience, the standard multi-step processes have been minimized:
- **Registration**: Creating an account issues a `201 Created` but does *not* issue a session cookie. The user remains unauthenticated until they prove email ownership.
- **Verification**: When the verification link is clicked, the backend validates the token, generates a session cookie on the spot, and the frontend silently syncs the global context (`await refresh()`) before sweeping the user directly into the Dashboard.
- **Password Reset**: After setting a new password, the backend immediately executes a login flow with the new credentials, removing the need for the user to type their new password twice.

### 2. CSS Floating Label Autofill Protection
The frontend implements a robust CSS strategy using Tailwind's `peer-valid` and React's `value={}` binding. This ensures that when a browser (like Chrome or Edge) forcibly injects saved credentials into an input field, the floating label correctly detects the injection and moves out of the way, preventing ugly text overlap.

### 3. Attack Mitigation Strategy
- **Brute Force**: The `/api/auth/*` routes are protected by a strict memory-store rate limiter (`AUTH_RATE_LIMIT`). If an attacker tries to guess passwords, they are locked out after 5 attempts.
- **XSS (Cross-Site Scripting)**: Because JWT tokens are stored in `httpOnly` cookies, malicious JavaScript executing in the browser cannot read or steal the session token.
- **CSRF (Cross-Site Request Forgery)**: Cookies are issued with `sameSite: "strict"` and strict CORS origins, meaning the session cannot be hijacked by a malicious third-party tab.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).