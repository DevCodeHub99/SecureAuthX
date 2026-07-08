import { useState } from "react";
import { useSignUp } from "@custom-auth/react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";

export default function Signup() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // v1.0.17: useSignUp takes NO arguments — reads apiBaseUrl from AuthProvider context
  const { signUp, isLoading } = useSignUp();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.name === "email"
      ? e.target.value.toLowerCase().trim()
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      await signUp(formData.email, formData.password, formData.name);
      // Replace browser alert() with in-UI success message
      setSuccessMessage(
        "Account created! Please check your email for the verification link before signing in."
      );
      setFormData({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen py-4" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="px-2 max-w-sm mx-auto">
        <div
          className="rounded-2xl shadow-xl py-5 px-3 border-1"
          style={{ backgroundColor: "#DDF6D2", borderColor: "#CAE8BD" }}
        >
          <div className="flex items-center justify-center pb-2">
            <img src={logo} alt="SecureAuthX_logo" className="h-20 w-20" />
          </div>

          <div className="mb-4 text-center">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#18230F" }}>
              Create Account
            </h1>
            <p className="text-base" style={{ color: "#255F38" }}>
              Join us and start your journey
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-2xl bg-green-50 border border-green-200 mt-2 mb-4 py-3 px-4 text-center text-green-700 font-semibold text-sm">
              {successMessage}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-xs font-bold underline cursor-pointer"
                  style={{ color: "#255F38" }}
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-red-100 mt-2 mb-4 py-3 px-4 text-center text-red-600 font-semibold text-sm">
              {error}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder=" "
                  onChange={handleChange}
                  value={formData.name}
                  className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
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
                  htmlFor="name"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Full Name
                </label>
              </div>

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
                  style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
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
                  Email address
                </label>
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  onChange={handleChange}
                  value={formData.password}
                  className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 placeholder-transparent focus:outline-none peer transition-all duration-300 shadow-sm"
                  style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#B0DB9C";
                    e.target.style.boxShadow = "0 0 0 3px rgba(176, 219, 156, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#CAE8BD";
                    e.target.style.boxShadow = "none";
                  }}
                  minLength={8}
                  required
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-5 text-base font-normal transition-all peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold peer-valid:top-2 peer-valid:text-sm peer-valid:font-semibold peer-autofill:top-2 peer-autofill:text-sm peer-autofill:font-semibold"
                  style={{ color: "#255F38", pointerEvents: "none" }}
                >
                  Password (min 8 characters)
                </label>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#DDF6D2] transition-colors cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl mt-2 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)",
                  color: "#18230F",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-4 flex items-center">
            <div className="flex-1 h-px" style={{ backgroundColor: "#CAE8BD" }}></div>
            <span className="px-6 text-sm font-medium" style={{ color: "#255F38" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#CAE8BD" }}></div>
          </div>

          {/* Login Link */}
          <div className="text-center space-y-2">
            <p className="text-sm" style={{ color: "#255F38" }}>Already have an account?</p>
            <Link
              to="/"
              className="block w-full border-2 font-bold py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[0.98] text-center"
              style={{ borderColor: "#B0DB9C", backgroundColor: "transparent", color: "#255F38" }}
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
