import { useSession, useSignOut } from "@custom-auth/react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";

export default function Dashboard() {
  const { user, isLoading: isSessionLoading } = useSession();
  const { signOut, isLoading: isSignOutLoading } = useSignOut();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#ECFAE5" }}>
        <p style={{ color: "#255F38" }} className="font-semibold text-lg animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-3xl shadow-2xl overflow-hidden border-1"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          {/* Dashboard Header */}
          <div className="px-8 py-6 border-b" style={{ borderColor: "#CAE8BD" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={logo} alt="SecureAuthX Logo" className="h-12 w-12" />
                <h1 className="text-2xl font-bold" style={{ color: "#18230F" }}>SecureAuthX Dashboard</h1>
              </div>
              <button
                onClick={handleLogout}
                disabled={isSignOutLoading}
                className="px-6 py-2 rounded-full font-bold transition-all duration-300 transform hover:scale-[0.98] shadow-md hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)",
                  color: "#18230F",
                  opacity: isSignOutLoading ? 0.7 : 1,
                }}
              >
                {isSignOutLoading ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-8 space-y-8">
            <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-sm backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#18230F" }}>
                Welcome back, {user?.name || 'User'}!
              </h2>
              <p style={{ color: "#255F38" }} className="mb-6">
                You have successfully authenticated and accessed the secure area.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#ECFAE5" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>Email Address</p>
                  <p className="font-medium" style={{ color: "#18230F" }}>{user?.email}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#ECFAE5" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>Account Role</p>
                  <p className="font-medium capitalize" style={{ color: "#18230F" }}>{user?.role || 'Member'}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#ECFAE5" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>User ID</p>
                  <p className="font-mono text-sm break-all" style={{ color: "#18230F" }}>{user?.id}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#ECFAE5" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>Status</p>
                  <p className="font-medium text-green-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Active Session
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
