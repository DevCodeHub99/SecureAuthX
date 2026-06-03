# 🎨 SecureAuthX - Frontend Client

This is the frontend component of the SecureAuthX platform. It is a blazing-fast, strictly-typed (conceptually), and beautifully designed React application powered by Vite and Tailwind CSS. 

It handles complex authentication flows like magic links, secure password resets, and session management—all while providing a premium, dynamic user experience.

---

## 🚀 Quick Start

### Prerequisites
Make sure the [Backend Server](../server/README.md) is running on `http://localhost:5001`.

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root of the `client/` directory:
```env
# The URL where your backend server is running
VITE_API_URL=http://localhost:5001/api/auth
```

### Run Development Server
```bash
npm run dev
```
By default, the Vite server will run at `http://localhost:5173`. 
> **Important:** The backend is configured to accept CORS requests specifically from `5173`. If Vite falls back to port `5174` (because `5173` is in use by a zombie process), authentication requests may fail.

---

## 🛠️ Technology Stack

- **React 18**: Core library for building the UI.
- **Vite 7**: Extremely fast development server and bundler.
- **Tailwind CSS v3**: Utility-first CSS framework used for all styling.
- **React Router DOM v6**: Client-side routing, handling protected routes and nested layouts.
- **@custom-auth/react**: Our custom authentication SDK that provides hooks like `useSession`, `useSignIn`, and `useAuth`.

---

## ✨ Key Features & UX Highlights

### 1. Seamless Auto-Login Workflows
We have built custom manual `fetch` overrides for specific routes to ensure the smoothest possible user transitions:
- **Email Verification**: When a user clicks a verification link, the backend validates it and issues a session cookie. The frontend `VerifyEmail.jsx` intercepts this, attaches `credentials: "include"`, refreshes the global `useAuth()` context, and instantly drops the user into the Dashboard.
- **Password Reset**: After setting a new password, the user is automatically logged in behind the scenes and immediately redirected to the Dashboard, removing the friction of a secondary login screen.

### 2. Floating Label Autofill Protection
Modern browsers (Chrome, Edge, Safari) aggressively inject saved passwords into inputs. This often causes "floating labels" to break and overlap with the injected text.
We solved this purely with CSS:
- Inputs are marked as `required`.
- Tailwind's `peer-valid:top-2` class is used on the label.
- When the browser injects text, the input becomes `:valid`, immediately triggering the label to float up elegantly, preventing any overlap.

### 3. Dynamic Micro-Animations
The UI feels alive and responsive:
- **Hover States**: Buttons feature dynamic scale transformations (`hover:scale-[0.98]`) and gradient shifts.
- **Focus Rings**: Inputs glow with subtle, custom-colored box shadows when focused.
- **Loading States**: Spinners and pulsing text give immediate feedback during async network requests (like Magic Link verification).

---

## 📂 Project Structure

```text
client/
├── public/                 # Static assets (favicons, etc.)
├── src/
│   ├── assets/             # Images and logos
│   ├── components/         # Reusable UI components
│   │   └── ProtectedRoute.jsx # Wrapper that blocks unauthenticated users
│   ├── pages/              # Main route views
│   │   ├── Dashboard.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── Login.jsx
│   │   ├── MagicLink.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── Signup.jsx
│   │   └── VerifyEmail.jsx
│   ├── router/             # React Router DOM configuration
│   │   └── index.jsx
│   ├── App.jsx             # Main layout wrapper
│   └── main.jsx            # React DOM entry point
├── .env                    # Environment variables
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite configuration
```

---

## 🎨 Theme Details
The application uses a custom, soothing green color palette designed to feel secure and premium:
- Backgrounds: `#ECFAE5`, `#DDF6D2`
- Borders & Accents: `#CAE8BD`, `#B0DB9C`
- Text: `#18230F`, `#255F38`
