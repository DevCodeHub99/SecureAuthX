import { Navigate } from "react-router-dom";
import { useSession } from "@custom-auth/react";

export default function ProtecttedRoute({ children }) {
  const { user, isLoading } = useSession();
  
  if (isLoading) return null;
  return user ? children : <Navigate to="/" />;
}
