import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@custom-auth/react";
import logo from "../assets/secure-auth-x-logo.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get("token");
  // Get email from URL or fallback to localStorage
  const email = searchParams.get("email") || localStorage.getItem("resetEmail");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { refresh } = useAuth();

  // If there's no token in the URL, the link is invalid
  const isInvalidLink = !token || !email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password: newPassword }),
        credentials: "include"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }
      
      setSuccess(true);
      await refresh();
      localStorage.removeItem("resetEmail");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-4 flex flex-col justify-center" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="px-2 w-full max-w-sm mx-auto">
        <div
          className="rounded-2xl shadow-xl py-8 px-6 border-1"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          <div className="flex items-center justify-center pb-4">
            <img src={logo} alt="SecureAuthX_logo" className="h-16 w-16" />
          </div>
          
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#18230F" }}>
              Set New Password
            </h1>
            {!isInvalidLink && !success && (
              <p className="text-sm" style={{ color: "#255F38" }}>
                Create a strong new password for your account
              </p>
            )}
          </div>

          {isInvalidLink ? (
            <div className="text-center space-y-4">
              <div className="rounded-2xl bg-red-100 p-4 text-red-600 font-semibold text-sm border border-red-200">
                Invalid or missing password reset link. Please request a new password reset.
              </div>
              <button
                onClick={() => navigate("/forgot-password")}
                className="w-full font-bold py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                style={{
                  backgroundColor: "#18230F",
                  color: "#ECFAE5"
                }}
              >
                Request Reset Link
              </button>
            </div>
          ) : success ? (
             <div className="text-center space-y-4 py-4">
               <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 text-green-500 flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               <h3 className="font-bold text-lg text-green-800">Password Updated!</h3>
               <p className="text-sm text-green-700">Your password has been successfully reset. Redirecting to dashboard...</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder=" "
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setValidationError("");
                  }}
                  className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#B0DB9C";
                    e.target.style.boxShadow = "0 0 0 3px rgba(176, 219, 156, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#CAE8BD";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <label
                  htmlFor="newPassword"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  New Password
                </label>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors"
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
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder=" "
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setValidationError("");
                  }}
                  className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#B0DB9C";
                    e.target.style.boxShadow = "0 0 0 3px rgba(176, 219, 156, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#CAE8BD";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <label
                  htmlFor="confirmPassword"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Confirm Password
                </label>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors"
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

              {(validationError || error) && (
                <div className="rounded-2xl bg-red-100 mt-2 py-3 px-4 text-center text-red-600 font-semibold text-sm border border-red-200">
                  {validationError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl mt-4"
                style={{
                  background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)",
                  color: "#18230F",
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if(!isLoading) {
                    e.target.style.background = "linear-gradient(135deg, #CAE8BD 0%, #B0DB9C 100%)";
                    e.target.style.transform = "scale(0.98)";
                  }
                }}
                onMouseLeave={(e) => {
                  if(!isLoading) {
                    e.target.style.background = "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)";
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                {isLoading ? "Saving..." : "Save New Password"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-sm font-semibold hover:underline transition-all duration-200 flex items-center justify-center space-x-1"
              style={{ color: "#255F38" }}
            >
              <span>←</span>
              <span>Return to login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
