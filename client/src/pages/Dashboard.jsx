import { useState } from "react";
import { useSession, useSignOut, useMfa, usePasskeys, useAuth, useUpdatePassword } from "@custom-auth/react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";

export default function Dashboard() {
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const { user, isLoading: isSessionLoading } = useSession();
  // v1.0.17: useSignOut takes NO arguments — reads apiBaseUrl from AuthProvider context
  const { signOut, isLoading: isSignOutLoading } = useSignOut();
  const { refresh } = useAuth();
  
  // Custom-auth Hooks
  const { setupMfa, enableMfa, disableMfa, isLoading: isMfaLoading } = useMfa(apiBaseUrl);
  const { registerPasskey, isLoading: isPasskeyLoading } = usePasskeys(apiBaseUrl);
  // v1.0.17: useUpdatePassword hook replaces manual fetch + hashing pattern.
  // It delegates to AuthFlows.updatePassword which also calls deleteSessionsByUserId.
  const { updatePassword, isLoading: isUpdatingPassword } = useUpdatePassword(apiBaseUrl);
  
  const navigate = useNavigate();

  // Component UI States
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  
  // RBAC Diagnostics States
  const [testResult, setTestResult] = useState(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleStartMfaSetup = async () => {
    setError("");
    setSuccess("");
    try {
      const data = await setupMfa();
      if (data && data.qrCodeUrl) {
        setMfaQrCode(data.qrCodeUrl);
        setMfaSecret(data.secret);
      }
      setShowMfaSetup(true);
      setShowMfaDisable(false);
    } catch (err) {
      setError(err.message || "Failed to generate MFA setup QR code.");
    }
  };

  const handleEnableMfaSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await enableMfa(mfaSecret, mfaSetupCode);
      setSuccess("Two-factor authentication has been successfully enabled on your account!");
      setShowMfaSetup(false);
      setMfaSetupCode("");
      setMfaQrCode("");
      setMfaSecret("");
      await refresh(); // Refresh user details context
    } catch (err) {
      setError(err.message || "Invalid verification code.");
    }
  };

  const handleDisableMfaSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await disableMfa(mfaDisableCode);
      setSuccess("Two-factor authentication has been disabled.");
      setShowMfaDisable(false);
      setMfaDisableCode("");
      await refresh(); // Refresh user details context
    } catch (err) {
      setError(err.message || "Failed to disable MFA. Verify your verification code.");
    }
  };

  const handleRegisterDevicePasskey = async () => {
    setError("");
    setSuccess("");
    try {
      await registerPasskey(user?.id);
      setSuccess("Passkey registered successfully! You can now log in passwordlessly using your biometric FaceID/fingerprint scanner on this device.");
    } catch (err) {
      setError(err.message || "Failed to register Passkey.");
    }
  };

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // v1.0.17: useUpdatePassword hook — delegates to AuthFlows.updatePassword
      // which verifies current password, hashes new password, and invalidates all
      // existing sessions via deleteSessionsByUserId for security.
      await updatePassword(currentPassword, newPassword);
      setSuccess("Your password has been updated successfully! Other active sessions have been invalidated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Refresh session context to pick up the newly issued token from the server
      await new Promise((resolve) => setTimeout(resolve, 150));
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to update password.");
    }
  };

  const testRoute = async (path) => {
    setTestResult(null);
    try {
      const backendOrigin = import.meta.env.VITE_API_URL.replace('/api/auth', '');
      // Include stored auth token in Authorization header for requireAuth middleware
      const storedToken = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      const res = await fetch(`${backendOrigin}${path}`, {
        method: "GET",
        credentials: "include",
        headers,
      });
      const data = await res.json();
      setTestResult({
        success: res.ok,
        status: res.status,
        message: data.message || data.error || "Request completed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        status: "Network",
        message: err.message,
      });
    }
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

          {/* Alerts */}
          {(success || error) && (
            <div className="px-8 pt-6">
              <div className="rounded-2xl p-4 text-sm font-semibold shadow-sm text-center border-l-4"
                style={{
                  backgroundColor: success ? "#DCFCE7" : "#FEE2E2",
                  borderColor: success ? "#22C55E" : "#EF4444",
                  color: success ? "#15803D" : "#B91C1C",
                }}
              >
                {success || error}
              </div>
            </div>
          )}

          {/* Dashboard Content */}
          <div className="p-8 space-y-8">
            {/* Welcome Area */}
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
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>Two-Factor Auth</p>
                  <p className="font-medium flex items-center" style={{ color: user?.mfaEnabled ? "#15803D" : "#B91C1C" }}>
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: user?.mfaEnabled ? "#22C55E" : "#EF4444" }}></span>
                    {user?.mfaEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#ECFAE5" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#255F38", opacity: 0.8 }}>Session Status</p>
                  <p className="font-medium text-green-700 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></span> Active
                  </p>
                </div>
              </div>
            </div>

            {/* Portal Controls Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Authenticator App / MFA Config Card */}
              <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-sm backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#18230F" }}>Two-Factor Auth (MFA)</h3>
                  <p className="text-sm mb-4" style={{ color: "#255F38" }}>
                    Secure your account using a standard authenticator app (Google Authenticator, Authy, etc.).
                  </p>
                </div>

                <div className="mt-4">
                  {user?.mfaEnabled ? (
                    showMfaDisable ? (
                      <form onSubmit={handleDisableMfaSubmit} className="space-y-3">
                        <div className="relative">
                          <input
                            id="disableCode"
                            type="text"
                            placeholder=" "
                            maxLength={6}
                            value={mfaDisableCode}
                            onChange={(e) => setMfaDisableCode(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border text-center font-mono focus:outline-none"
                            style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                            required
                          />
                          <label htmlFor="disableCode" className="absolute left-3 -top-2 px-1 text-2xs font-semibold bg-[#DDF6D2]" style={{ color: "#255F38" }}>
                            Authenticator Code
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={isMfaLoading}
                            className="flex-1 py-2 rounded-full font-bold text-xs bg-red-600 text-white shadow hover:bg-red-700 transition-colors"
                          >
                            Disable
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMfaDisable(false)}
                            className="flex-1 py-2 rounded-full border border-gray-400 font-bold text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setShowMfaDisable(true); setShowMfaSetup(false); }}
                        className="w-full py-3 rounded-full font-bold text-sm bg-red-100 text-red-700 hover:bg-red-200 transition-all shadow-md hover:shadow-lg"
                      >
                        Disable 2FA
                      </button>
                    )
                  ) : showMfaSetup ? (
                    <form onSubmit={handleEnableMfaSubmit} className="space-y-4">
                      {mfaQrCode && (
                        <div className="flex flex-col items-center p-3 bg-white rounded-xl border" style={{ borderColor: "#CAE8BD" }}>
                          <img src={mfaQrCode} alt="MFA QR Code" className="h-40 w-40" />
                          <p className="text-2xs text-center mt-2" style={{ color: "#255F38" }}>
                            Scan this QR code with your authenticator app
                          </p>
                        </div>
                      )}
                      
                      <div className="relative">
                        <input
                          id="setupCode"
                          type="text"
                          placeholder=" "
                          maxLength={6}
                          value={mfaSetupCode}
                          onChange={(e) => setMfaSetupCode(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border text-center font-mono focus:outline-none"
                          style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                          required
                        />
                        <label htmlFor="setupCode" className="absolute left-3 -top-2 px-1 text-2xs font-semibold bg-[#DDF6D2]" style={{ color: "#255F38" }}>
                          Verify Setup Code
                        </label>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={isMfaLoading}
                          className="flex-1 py-2.5 rounded-full font-bold text-xs shadow hover:scale-[0.98] transition-all"
                          style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                        >
                          Enable 2FA
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMfaSetup(false)}
                          className="flex-1 py-2.5 rounded-full border border-gray-400 font-bold text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={handleStartMfaSetup}
                      className="w-full py-3 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all"
                      style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                    >
                      Setup 2FA Authenticator
                    </button>
                  )}
                </div>
              </div>

              {/* Passkeys Device Registration Card */}
              <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-sm backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#18230F" }}>Passkeys & Biometrics</h3>
                  <p className="text-sm mb-4" style={{ color: "#255F38" }}>
                    Enable passwordless login. Securely bind this device's fingerprint or face scanner to your profile.
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleRegisterDevicePasskey}
                    disabled={isPasskeyLoading}
                    className="w-full py-3 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center space-x-2 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4zm-8 4c0-4.4 3.6-8 8-8s8 3.6 8 8M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    </svg>
                    <span>{isPasskeyLoading ? "Registering..." : "Register Biometric Passkey"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Update Password Settings Card */}
            <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-sm backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-2" style={{ color: "#18230F" }}>Update Password</h3>
              <p className="text-sm mb-4" style={{ color: "#255F38" }}>
                Ensure your account is secure by changing your password regularly.
              </p>
              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 max-w-md">
                <div className="relative">
                  <input
                    id="dashboardCurrentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder=" "
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border focus:outline-none"
                    style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                    required
                  />
                  <label htmlFor="dashboardCurrentPassword" className="absolute left-3 -top-2 px-1 text-2xs font-semibold bg-[#DDF6D2]" style={{ color: "#255F38" }}>
                    Current Password
                  </label>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors cursor-pointer"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 0010 3a9.97 9.97 0 00-5.345 1.566L3.28 2.22zM7.5 10a2.5 2.5 0 002.5 2.5c.346 0 .675-.07 1-.194l-3.306-3.306c-.124.325-.194.654-.194 1zM10 5a5 5 0 00-4.546 2.916L10 12.5a2.5 2.5 0 002.5-2.5 5 5 0 00-2.5-5z" clipRule="evenodd" />
                        <path d="M2.52 7.76A10.016 10.016 0 001.334 9.4a1.651 1.651 0 000 1.186A10.004 10.004 0 0010 17c2.13 0 4.108-.67 5.72-1.802L2.52 7.76z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="dashboardNewPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder=" "
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border focus:outline-none"
                    style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                    required
                  />
                  <label htmlFor="dashboardNewPassword" className="absolute left-3 -top-2 px-1 text-2xs font-semibold bg-[#DDF6D2]" style={{ color: "#255F38" }}>
                    New Password (min 8 characters)
                  </label>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors cursor-pointer"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 0010 3a9.97 9.97 0 00-5.345 1.566L3.28 2.22zM7.5 10a2.5 2.5 0 002.5 2.5c.346 0 .675-.07 1-.194l-3.306-3.306c-.124.325-.194.654-.194 1zM10 5a5 5 0 00-4.546 2.916L10 12.5a2.5 2.5 0 002.5-2.5 5 5 0 00-2.5-5z" clipRule="evenodd" />
                        <path d="M2.52 7.76A10.016 10.016 0 001.334 9.4a1.651 1.651 0 000 1.186A10.004 10.004 0 0010 17c2.13 0 4.108-.67 5.72-1.802L2.52 7.76z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="dashboardConfirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border focus:outline-none"
                    style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                    required
                  />
                  <label htmlFor="dashboardConfirmPassword" className="absolute left-3 -top-2 px-1 text-2xs font-semibold bg-[#DDF6D2]" style={{ color: "#255F38" }}>
                    Confirm New Password
                  </label>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#255F38]">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 0010 3a9.97 9.97 0 00-5.345 1.566L3.28 2.22zM7.5 10a2.5 2.5 0 002.5 2.5c.346 0 .675-.07 1-.194l-3.306-3.306c-.124.325-.194.654-.194 1zM10 5a5 5 0 00-4.546 2.916L10 12.5a2.5 2.5 0 002.5-2.5 5 5 0 00-2.5-5z" clipRule="evenodd" />
                        <path d="M2.52 7.76A10.016 10.016 0 001.334 9.4a1.651 1.651 0 000 1.186A10.004 10.004 0 0010 17c2.13 0 4.108-.67 5.72-1.802L2.52 7.76z" />
                      </svg>
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-xs shadow hover:scale-[0.98] transition-all cursor-pointer disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>

            {/* RBAC Diagnostics Area */}
            <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-sm backdrop-blur-sm mt-6">
              <h3 className="text-lg font-bold mb-2" style={{ color: "#18230F" }}>Role-Based Access Control (RBAC) Diagnostics</h3>
              <p className="text-sm mb-4" style={{ color: "#255F38" }}>
                Test the backend's route protection and role-based permissions in real-time. Your current role is <strong className="capitalize">{user?.role || 'user'}</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => testRoute("/api/protected")}
                  className="flex-1 py-3 px-4 rounded-full font-bold text-xs bg-white border border-[#CAE8BD] hover:bg-[#ECFAE5] shadow-sm transition-all duration-300 transform hover:scale-[0.98]"
                  style={{ color: "#18230F" }}
                >
                  Test Authenticated Route (/api/protected)
                </button>
                <button
                  onClick={() => testRoute("/api/admin-data")}
                  className="flex-1 py-3 px-4 rounded-full font-bold text-xs bg-white border border-[#CAE8BD] hover:bg-[#ECFAE5] shadow-sm transition-all duration-300 transform hover:scale-[0.98]"
                  style={{ color: "#18230F" }}
                >
                  Test Admin-Only Route (/api/admin-data)
                </button>
              </div>

              {testResult && (
                <div className="mt-4 p-4 rounded-xl font-mono text-xs border shadow-inner transition-all duration-300"
                  style={{
                    backgroundColor: testResult.success ? "#E8F5E9" : "#FFEBEE",
                    borderColor: testResult.success ? "#81C784" : "#E57373",
                    color: testResult.success ? "#2E7D32" : "#C62828",
                  }}
                >
                  <p className="font-bold mb-1">
                    {testResult.success ? `✓ HTTP 200 Success` : `✗ HTTP ${testResult.status} Response`}
                  </p>
                  <p className="break-all">{testResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
