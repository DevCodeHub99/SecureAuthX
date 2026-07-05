import { Navigate } from "react-router-dom";
import { useSession } from "@custom-auth/react";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useSession();
  
  if (isLoading) return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
    </div>
  );
  return user ? children : <Navigate to="/" />;
}
