import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";
import MagicLink from "../pages/MagicLink";
import ProtectedRoute from "../components/ProtectedRoute";
import AuthRoute from "../components/AuthRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: (
          <AuthRoute>
            <Login />
          </AuthRoute>
        ),
      },
      {
        path: "signup",
        element: (
          <AuthRoute>
            <Signup />
          </AuthRoute>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <AuthRoute>
            <ForgotPassword />
          </AuthRoute>
        ),
      },
      {
        path: "reset-password",
        element: (
          <AuthRoute>
            <ResetPassword />
          </AuthRoute>
        ),
      },
      {
        path: "verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "magic-link",
        element: <MagicLink />,
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
