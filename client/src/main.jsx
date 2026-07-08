import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@custom-auth/react";

import router from "./router/index.jsx";
import "./index.css";

/**
 * v1.0.17: AuthProvider now accepts a `tokenStorage` prop.
 * - 'localStorage' — token is stored in localStorage and sent via Authorization header.
 *   Works around third-party cookie blocking (e.g. Safari ITP, Brave).
 * - 'cookie'       — traditional httpOnly cookie flow (default).
 *
 * We use 'localStorage' so the token survives cross-site Vercel deployments
 * where third-party cookies are blocked. The global fetch interceptor in the
 * custom-auth/react library handles injecting the Authorization header.
 * The server still sets httpOnly cookies as a secondary mechanism.
 */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider
      apiBaseUrl={import.meta.env.VITE_API_URL}
      tokenStorage="localStorage"
    >
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
