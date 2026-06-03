import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@custom-auth/react";

import router from "./router/index.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider apiBaseUrl={import.meta.env.VITE_API_URL}>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
