import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@custom-auth/react";

import router from "./router/index.jsx";
import "./index.css";

// Global fetch interceptor to support header-based authentication, bypassing third-party cookie blocking
const originalFetch = window.fetch;
window.fetch = async (resource, config = {}) => {
  const url = typeof resource === 'string' ? resource : (resource.url || "");
  const token = localStorage.getItem("authToken");
  const apiUrl = import.meta.env.VITE_API_URL || "/api/auth";
  const isTargetApi = url.includes(apiUrl);

  let updatedConfig = { ...config };

  if (token && isTargetApi) {
    if (!updatedConfig.headers) {
      updatedConfig.headers = {};
    }

    const headers = updatedConfig.headers;
    if (headers instanceof Headers) {
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } else if (Array.isArray(headers)) {
      const hasAuth = headers.some(([k]) => k.toLowerCase() === 'authorization');
      if (!hasAuth) {
        headers.push(["Authorization", `Bearer ${token}`]);
      }
    } else {
      updatedConfig.headers = { ...headers };
      const hasAuth = Object.keys(updatedConfig.headers).some(k => k.toLowerCase() === 'authorization');
      if (!hasAuth) {
        updatedConfig.headers["Authorization"] = `Bearer ${token}`;
      }
    }
  }

  const response = await originalFetch(resource, updatedConfig);

  if (response.ok && isTargetApi) {
    if (url.includes("/logout")) {
      localStorage.removeItem("authToken");
    } else {
      const clone = response.clone();
      try {
        const data = await clone.json();
        if (data && data.token) {
          localStorage.setItem("authToken", data.token);
        }
      } catch (e) {}
    }
  }

  return response;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider apiBaseUrl={import.meta.env.VITE_API_URL}>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
