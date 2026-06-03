import { useState, useEffect } from "react";
import { useSignIn, useMagicLink, useSession, useAuth } from "@custom-auth/react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";

export default function Login() {
  const { signIn } = useSignIn();
  const { refresh } = useAuth();
  const { requestMagicLink, sent: magicLinkSent, isLoading: isMagicLinkLoading, error: magicLinkError } = useMagicLink(import.meta.env.VITE_API_URL);
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loginMode, setLoginMode] = useState("password"); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (sessionLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#ECFAE5" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: "#255F38", borderTopColor: "transparent" }}></div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (loginMode === "otp") {
      try {
        await requestMagicLink(formData.email, `${window.location.origin}/magic-link`);
      } catch (err) {
        setMessage(err.message || magicLinkError || "Failed to send magic link");
      }
    } else {
      const res = await signIn(formData.email, formData.password);
      if (res.ok) {
        await refresh();
        navigate("/dashboard");
      } else {
        setMessage(res.error || "Login Failed");
      }
    }
  };

  const toggleMode = () => {
    setLoginMode(prev => prev === "password" ? "otp" : "password");
    setMessage("");
  };

  return (
    <div className="min-h-screen py-4" style={{ backgroundColor: "#ECFAE5" }}>
      {/* Main Content */}
      <div className="px-2 max-w-sm mx-auto">
        {/* Card Container */}
        <div
          className="rounded-2xl shadow-xl py-5 px-3 border-1"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-center pb-2">
            <img src={logo} alt="SecureAuthX_logo" className="h-20 w-20" />
          </div>
          {/* Title */}
          <div className="mb-4 text-center">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "#18230F" }}
            >
              Welcome Back
            </h1>
            <p className="text-base" style={{ color: "#255F38" }}>
              {loginMode === "password" ? "Sign in to continue your journey" : "Enter your email to receive a login link"}
            </p>
          </div>

          {/* Success message for magic link */}
          {magicLinkSent && loginMode === "otp" ? (
            <div className="rounded-2xl bg-green-100 p-6 text-center border-2 border-green-500 mb-6">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
              <h3 className="font-bold text-green-800 text-lg">Check your inbox</h3>
              <p className="text-green-700 text-sm mt-1">We sent a secure sign-in link to {formData.email}</p>
              <button 
                onClick={toggleMode}
                className="mt-4 text-sm font-semibold text-green-800 hover:underline"
              >
                Return to password login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder=" "
                  onChange={handleChange}
                  value={formData.email}
                  className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: "#ECFAE5",
                    borderColor: "#CAE8BD",
                    color: "#18230F",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#B0DB9C";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(176, 219, 156, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#CAE8BD";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Email address
                </label>
              </div>

              {/* Password Input (Hidden in OTP mode) */}
              {loginMode === "password" && (
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=" "
                    onChange={handleChange}
                    value={formData.password}
                    className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                    style={{
                      backgroundColor: "#ECFAE5",
                      borderColor: "#CAE8BD",
                      color: "#18230F",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#B0DB9C";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(176, 219, 156, 0.2)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#CAE8BD";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                    style={{ color: "#255F38", pointerEvents: "none" }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
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
              )}

              {/* Error Message */}
              {message && (
                <div className="rounded-2xl bg-red-100 p-3 text-sm text-red-600 text-center border-l-4 border-red-500">
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginMode === "otp" && isMagicLinkLoading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl mt-2 disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)",
                  color: "#18230F",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #CAE8BD 0%, #B0DB9C 100%)";
                  e.target.style.transform = "scale(0.98)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)";
                  e.target.style.transform = "scale(1)";
                }}
              >
                {loginMode === "password" ? "Sign In" : (isMagicLinkLoading ? "Sending..." : "Send Magic Link")}
              </button>
            </form>
          )}

          {/* Additional Features */}
          {!magicLinkSent && (
            <div className="mt-4 space-y-4">
              {/* Quick Login Options */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="flex-1 py-3 px-4 rounded-4xl border-2 font-medium text-sm transition-all duration-200 hover:shadow-md"
                  style={{
                    borderColor: "#CAE8BD",
                    backgroundColor: "#DDF6D2",
                    color: "#255F38",
                  }}
                >
                  {loginMode === "password" ? "Sign in with Magic Link" : "Sign in with password"}
                </button>
              </div>

              {/* Forgot Password */}
              {loginMode === "password" && (
                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold hover:underline transition-all duration-200"
                    style={{ color: "#255F38" }}
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="my-4 flex items-center">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#CAE8BD" }}
            ></div>
            <span
              className="px-6 text-sm font-medium"
              style={{ color: "#255F38" }}
            >
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#CAE8BD" }}
            ></div>
          </div>

          {/* Sign Up Section */}
          <div className="text-center space-y-2">
            <p className="text-sm" style={{ color: "#255F38" }}>
              New to our platform?
            </p>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="w-full border-2 font-bold py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[0.98]"
              style={{
                borderColor: "#B0DB9C",
                backgroundColor: "transparent",
                color: "#255F38",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#ECFAE5";
                e.target.style.borderColor = "#CAE8BD";
                e.target.style.transform = "scale(0.98)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "#B0DB9C";
                e.target.style.transform = "scale(1)";
              }}
            >
              Create New Account
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 px-6 pb-8">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs max-w-sm mx-auto">
          <a href="#" className="hover:underline transition-colors duration-200" style={{ color: "#255F38" }}>About</a>
          <a href="#" className="hover:underline transition-colors duration-200" style={{ color: "#255F38" }}>Help</a>
          <a href="#" className="hover:underline transition-colors duration-200" style={{ color: "#255F38" }}>Terms</a>
          <a href="#" className="hover:underline transition-colors duration-200" style={{ color: "#255F38" }}>Privacy</a>
          <a href="#" className="hover:underline transition-colors duration-200" style={{ color: "#255F38" }}>Contact</a>
          <div className="w-full text-center mt-3">
            <span className="text-xs" style={{ color: "#255F38" }}>
              © 2025 Your Platform. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
