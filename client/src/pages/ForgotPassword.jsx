import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForgotPassword, useOtp, useAuth } from "@custom-auth/react";
import logo from "../assets/secure-auth-x-logo.png";

export default function ForgotPassword() {
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: Select recovery mode, 2: Verification
  const [recoveryMode, setRecoveryMode] = useState("link"); // 'link', 'otp'
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // New Password state (for Step 2 OTP recovery reset)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { requestReset, isLoading: isResetLoading } = useForgotPassword(apiBaseUrl);
  const { requestOtp, isLoading: isOtpLoading } = useOtp(apiBaseUrl);
  const { refresh, setSession } = useAuth();
  const navigate = useNavigate();

  const handleSendResetLink = async () => {
    if (!email) {
      setMessage("Please enter your email address first.");
      return;
    }
    setMessage("");
    setRecoveryMode("link");
    try {
      await requestReset(email.toLowerCase().trim());
      setRecoverySent(true);
    } catch (err) {
      setMessage(err.message || "Failed to send reset link.");
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setMessage("Please enter your email address first.");
      return;
    }
    setMessage("");
    setRecoveryMode("otp");
    try {
      await requestOtp(email.toLowerCase().trim());
      setStep(2);
      setMessage("A 6-digit recovery code has been sent to your email.");
    } catch (err) {
      setMessage(err.message || "Failed to send OTP code.");
    }
  };

  const handleVerifyOtpAndResetSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`${apiBaseUrl}/reset-password-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: otpCode,
          password: newPassword,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSession(data.user || null, data.token || null);
      setMessage("Password reset successfully! Logging you in...");
      await new Promise((resolve) => setTimeout(resolve, 150));
      await refresh(); // Refresh session context in state
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setMessage(err.message || "OTP verification failed");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const goBackToOptions = () => {
    setStep(1);
    setMessage("");
  };

  const isAnyLoading = isResetLoading || isOtpLoading || isUpdatingPassword;

  return (
    <div className="min-h-screen py-6 flex flex-col justify-center" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="px-4 w-full max-w-md mx-auto">
        <div
          className="rounded-3xl shadow-2xl py-8 px-6 border-1"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center pb-4">
            <img src={logo} alt="SecureAuthX Logo" className="h-16 w-16" />
          </div>
          
          {/* Header (Only show if not sent) */}
          {!recoverySent && (
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: "#18230F" }}>
                Recover Account
              </h1>
              <p className="text-sm font-medium" style={{ color: "#255F38" }}>
                {step === 1 && "Choose your preferred recovery option"}
                {step === 2 && "Enter your verification code and set a new password"}
              </p>
            </div>
          )}

          {/* Success / Info Messages (Only show if not sent) */}
          {!recoverySent && message && (
            <div className="rounded-2xl p-4 mb-4 text-sm text-center border-l-4 font-semibold shadow-sm transition-all duration-300"
              style={{
                backgroundColor: message.includes("successfully") || message.includes("sent") ? "#DCFCE7" : "#FEE2E2",
                borderColor: message.includes("successfully") || message.includes("sent") ? "#22C55E" : "#EF4444",
                color: message.includes("successfully") || message.includes("sent") ? "#15803D" : "#B91C1C",
              }}
            >
              {message}
            </div>
          )}

          {/* Step 1: Input Email & Select Recovery Mode */}
          {!recoverySent && step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Registered Email Address
                </label>
              </div>

              {/* Recovery Option Buttons */}
              <div className="space-y-3 pt-3">
                <button
                  type="button"
                  onClick={handleSendResetLink}
                  disabled={isAnyLoading}
                  className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)",
                    color: "#18230F",
                  }}
                >
                  {isResetLoading ? "Sending Link..." : "Email Password Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isAnyLoading}
                  className="w-full font-bold py-3.5 rounded-full border-2 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 cursor-pointer"
                  style={{
                    borderColor: "#CAE8BD",
                    backgroundColor: "#DDF6D2",
                    color: "#255F38",
                  }}
                >
                  Email OTP Recovery Code
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Verification Input + Password Reset Fields (For OTP mode only) */}
          {!recoverySent && step === 2 && recoveryMode === "otp" && (
            <form onSubmit={handleVerifyOtpAndResetSubmit} className="space-y-4">
              {/* Back Header */}
              <div className="flex items-center space-x-3 pb-2">
                <button
                  type="button"
                  onClick={goBackToOptions}
                  className="p-2 rounded-full hover:bg-[#CAE8BD]/50 transition-colors cursor-pointer"
                  title="Go Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-[#255F38]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                </button>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#255F38" }}>Recovering email</p>
                  <p className="font-semibold text-sm truncate" style={{ color: "#18230F" }}>{email}</p>
                </div>
              </div>

              {/* Code Verification Input */}
              <div className="relative">
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  placeholder=" "
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 text-center font-mono text-xl tracking-wider focus:outline-none transition-all duration-300 shadow-sm"
                  style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                  required
                  autoFocus
                />
                <label
                  htmlFor="otpCode"
                  className="absolute left-1/2 -translate-x-1/2 top-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#255F38" }}
                >
                  Enter 6-Digit Code
                </label>
              </div>

              {/* New Password */}
              <div className="relative">
                <input
                  id="recoveryNewPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder=" "
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  required
                />
                <label
                  htmlFor="recoveryNewPassword"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  New Password
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

              {/* Confirm Password */}
              <div className="relative">
                <input
                  id="recoveryConfirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder=" "
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  required
                />
                <label
                  htmlFor="recoveryConfirmPassword"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Confirm Password
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
                disabled={isAnyLoading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
              >
                {isUpdatingPassword ? "Resetting..." : "Reset Password & Sign In"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-xs font-bold hover:underline cursor-pointer"
                  style={{ color: "#255F38" }}
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Recovery Success State (for Link mode only) */}
          {recoverySent && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 text-green-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="font-extrabold text-xl" style={{ color: "#18230F" }}>Check your inbox</h3>
              <p className="text-sm font-medium leading-relaxed px-2" style={{ color: "#255F38" }}>
                We've sent a password reset link to:
                <br />
                <strong className="block mt-2 text-base font-bold" style={{ color: "#18230F" }}>{email}</strong>
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full font-bold py-3.5 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}

          {/* Back to Login Link (Only show if not sent) */}
          {!recoverySent && (
            <div className="mt-8 text-center">
              <Link
                to="/"
                className="text-sm font-semibold hover:underline transition-all duration-200 inline-flex items-center justify-center space-x-1"
                style={{ color: "#255F38" }}
              >
                <span>←</span>
                <span>Back to login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
