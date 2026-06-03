import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForgotPassword } from "@custom-auth/react";
import logo from "../assets/secure-auth-x-logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const { requestReset, isLoading, error, sent } = useForgotPassword(import.meta.env.VITE_API_URL);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestReset(email);
      localStorage.setItem("resetEmail", email);
    } catch (err) {
      console.error(err);
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
              Forgot Password
            </h1>
            <p className="text-sm" style={{ color: "#255F38" }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (setError) setError("");
                  }}
                  className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
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
                  htmlFor="email"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Registered Email
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl mt-2"
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
                {isLoading ? "Sending..." : "Send Reset Email"}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl bg-green-100 mt-6 py-6 px-4 text-center border-2 border-green-500 shadow-md">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
              <h3 className="font-bold text-green-800 text-lg mb-1">Check your inbox</h3>
              <p className="text-sm text-green-700">We've sent a password reset link to <br/><strong>{email}</strong></p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-100 mt-4 py-3 px-4 text-center text-red-600 font-semibold text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-sm font-semibold hover:underline transition-all duration-200 flex items-center justify-center space-x-1"
              style={{ color: "#255F38" }}
            >
              <span>←</span>
              <span>Back to login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
