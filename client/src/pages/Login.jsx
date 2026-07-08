import { useState, useEffect } from "react";
import {
  useSignIn,
  useMagicLink,
  useSession,
  useAuth,
  usePasskeys,
  useOtp,
  useMfa,
} from "@custom-auth/react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";

export default function Login() {
  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // v1.0.17: useSignIn / useSignOut / useSignUp take NO arguments —
  // they read apiBaseUrl from AuthProvider context internally.
  const { signIn } = useSignIn();
  const { refresh } = useAuth();

  // These hooks still accept apiBaseUrl (they call specific endpoints directly)
  const { requestMagicLink, isLoading: isMagicLinkLoading } = useMagicLink(apiBaseUrl);
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const { loginWithPasskey, isLoading: isPasskeyLoading } = usePasskeys(apiBaseUrl);
  const { requestOtp, verifyOtp, isLoading: isOtpLoading } = useOtp(apiBaseUrl);
  const { verifyMfa, isLoading: isMfaLoading } = useMfa(apiBaseUrl);

  const navigate = useNavigate();

  // UI & Form States
  const [step, setStep] = useState(1); // 1: Email, 2: Credentials/Verification
  const [loginMode, setLoginMode] = useState("password"); // 'password' | 'otp' | 'mfa' | 'magic'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaTempToken, setMfaTempToken] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect to Dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setMessage("Please enter your email address to continue.");
      setIsSuccess(false);
      return;
    }
    setMessage("");
    setLoginMode("password");
    setStep(2);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await signIn(email, password);
      if (res && res.mfaRequired) {
        setMfaTempToken(res.tempToken);
        setLoginMode("mfa");
        setStep(2);
        return;
      }
      if (res && res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await refresh();
        navigate("/dashboard");
      } else {
        setIsSuccess(false);
        setMessage((res && res.error) || "Login Failed");
      }
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "Login failed");
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setMessage("Please enter your email address first.");
      setIsSuccess(false);
      return;
    }
    setMessage("");
    try {
      await requestOtp(email);
      setLoginMode("otp");
      setStep(2);
      setIsSuccess(true);
      setMessage("A 6-digit verification code has been sent to your email.");
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "Failed to send OTP code.");
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      setMessage("Please enter your email address first.");
      setIsSuccess(false);
      return;
    }
    setMessage("");
    try {
      // v1.0.17: requestMagicLink requires (email, callbackUrl) — callbackUrl is REQUIRED
      const callbackUrl = `${window.location.origin}/magic-link`;
      await requestMagicLink(email, callbackUrl);
      setLoginMode("magic");
      setStep(2);
      setIsSuccess(true);
      setMessage("A passwordless magic link has been sent to your email!");
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "Failed to send Magic Link.");
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await verifyOtp(email, otpCode);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "OTP verification failed");
    }
  };

  const handleMfaVerifySubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await verifyMfa(mfaTempToken, mfaCode);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "Invalid 2FA code");
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      setMessage("Please enter your email first to authenticate with Passkey.");
      setIsSuccess(false);
      return;
    }
    setMessage("");
    try {
      const result = await loginWithPasskey(email);
      if (result) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await refresh();
        navigate("/dashboard");
      }
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || "Passkey authentication failed.");
    }
  };

  const triggerOAuth = (provider) => {
    window.location.href = `${apiBaseUrl}/oauth/${provider}`;
  };

  const goBackToEmail = () => {
    setStep(1);
    setMessage("");
    setLoginMode("password");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#ECFAE5" }}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: "#255F38" }}></div>
          <p className="text-sm font-semibold" style={{ color: "#255F38" }}>Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 flex flex-col justify-center" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="px-4 max-w-md mx-auto w-full">
        {/* Card Container */}
        <div
          className="rounded-3xl shadow-2xl py-8 px-6 border-1 backdrop-blur-md"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-center pb-4">
            <img src={logo} alt="SecureAuthX Logo" className="h-16 w-16" />
          </div>

          {/* Title and Descriptions */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: "#18230F" }}>
              {loginMode === "mfa" ? "Two-Factor Auth" : "Sign In"}
            </h1>
            <p className="text-sm font-medium" style={{ color: "#255F38" }}>
              {step === 1 && "Enter email to access your account"}
              {step === 2 && loginMode === "password" && "Enter your password to sign in"}
              {step === 2 && loginMode === "otp" && "Enter the verification code sent to your inbox"}
              {step === 2 && loginMode === "mfa" && "Enter the 6-digit code from your authenticator app"}
              {step === 2 && loginMode === "magic" && "Verify your inbox to log in"}
            </p>
          </div>

          {/* Error / Info Messages */}
          {message && (
            <div
              className="rounded-2xl p-4 mb-4 text-sm text-center border-l-4 font-semibold shadow-sm transition-all duration-300"
              style={{
                backgroundColor: isSuccess ? "#DCFCE7" : "#FEE2E2",
                borderColor: isSuccess ? "#22C55E" : "#EF4444",
                color: isSuccess ? "#15803D" : "#B91C1C",
              }}
            >
              {message}
            </div>
          )}

          {/* --- STEP 1: Enter Email --- */}
          {step === 1 && (
            <div className="space-y-4">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder=" "
                    onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                    value={email}
                    className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 focus:outline-none peer transition-all duration-300 shadow-sm"
                    style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
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

                <button
                  type="submit"
                  className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                >
                  Continue
                </button>
              </form>

              {/* Social Login Divider */}
              <div className="my-6 flex items-center">
                <div className="flex-1 h-px" style={{ backgroundColor: "#CAE8BD" }}></div>
                <span className="px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "#255F38" }}>
                  Or Social Logins
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: "#CAE8BD" }}></div>
              </div>

              {/* OAuth Providers */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => triggerOAuth("google")}
                  className="flex items-center justify-center space-x-2 py-3 rounded-full bg-white border border-[#CAE8BD] hover:bg-[#F0FDF4] shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[0.98] cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.97 1 12 1 7.24 1 3.21 3.73 1.25 7.72l3.85 2.99C6.06 7.42 8.81 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.71z" />
                    <path fill="#FBBC05" d="M5.1 10.71c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.25 7.14C.45 8.74 0 10.52 0 12.42s.45 3.68 1.25 5.28l3.85-2.99z" />
                    <path fill="#34A853" d="M12 18.96c-3.19 0-5.94-2.38-6.9-5.67l-3.85 2.99c1.96 3.99 5.99 6.72 10.75 6.72 2.98 0 5.8-.97 7.92-2.77l-3.73-2.89c-1.16.78-2.61 1.62-4.19 1.62z" />
                  </svg>
                  <span className="text-sm font-bold text-[#18230F]">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerOAuth("github")}
                  className="flex items-center justify-center space-x-2 py-3 rounded-full bg-white border border-[#CAE8BD] hover:bg-[#F0FDF4] shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[0.98] cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span className="text-sm font-bold text-[#18230F]">GitHub</span>
                </button>
              </div>

              {/* Create Account Link */}
              <div className="text-center mt-6">
                <p className="text-xs font-semibold" style={{ color: "#255F38" }}>
                  New to SecureAuthX?{" "}
                  <Link to="/signup" className="underline font-bold" style={{ color: "#18230F" }}>
                    Create an Account
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* --- STEP 2: Authenticate --- */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Back & Email Header */}
              <div className="flex items-center space-x-3 pb-2">
                <button
                  onClick={goBackToEmail}
                  className="p-2 rounded-full hover:bg-[#CAE8BD]/50 transition-colors cursor-pointer"
                  title="Go Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-[#255F38]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                </button>
                <div className="truncate">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#255F38" }}>Signing in as</p>
                  <p className="font-semibold text-sm truncate" style={{ color: "#18230F" }}>{email}</p>
                </div>
              </div>

              {/* Mode A: Password */}
              {loginMode === "password" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder=" "
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                      className="w-full pl-4 pr-12 pt-6 pb-3 rounded-2xl border-1 focus:outline-none peer transition-all duration-300 shadow-sm"
                      style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                      required
                      autoFocus
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

                  <button
                    type="submit"
                    className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                  >
                    Sign In
                  </button>

                  <div className="text-center pt-2">
                    <Link to="/forgot-password" className="text-xs font-bold hover:underline" style={{ color: "#255F38" }}>
                      Forgot your password?
                    </Link>
                  </div>
                </form>
              )}

              {/* Mode B: Email OTP */}
              {loginMode === "otp" && (
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      id="otpCode"
                      name="otpCode"
                      type="text"
                      inputMode="numeric"
                      placeholder=" "
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
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

                  <button
                    type="submit"
                    disabled={isOtpLoading || otpCode.length !== 6}
                    className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-75 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                  >
                    {isOtpLoading ? "Verifying..." : "Verify Code"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isOtpLoading}
                      className="text-xs font-bold hover:underline cursor-pointer disabled:opacity-60"
                      style={{ color: "#255F38" }}
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              )}

              {/* Mode C: MFA Verification */}
              {loginMode === "mfa" && (
                <form onSubmit={handleMfaVerifySubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      id="mfaCode"
                      name="mfaCode"
                      type="text"
                      inputMode="numeric"
                      placeholder=" "
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 pt-6 pb-3 rounded-2xl border-1 text-center font-mono text-xl tracking-widest focus:outline-none transition-all duration-300 shadow-sm"
                      style={{ backgroundColor: "#ECFAE5", borderColor: "#CAE8BD", color: "#18230F" }}
                      required
                      autoFocus
                    />
                    <label
                      htmlFor="mfaCode"
                      className="absolute left-1/2 -translate-x-1/2 top-1 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#255F38" }}
                    >
                      Authenticator Code
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isMfaLoading || mfaCode.length !== 6}
                    className="w-full font-bold py-4 rounded-full transition-all duration-300 transform hover:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-75 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #B0DB9C 0%, #CAE8BD 100%)", color: "#18230F" }}
                  >
                    {isMfaLoading ? "Verifying..." : "Verify & Login"}
                  </button>
                </form>
              )}

              {/* Mode D: Magic Link feedback */}
              {loginMode === "magic" && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 border border-green-500 text-green-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#255F38" }}>
                    A magic link has been sent to your email. Click the link in your email to log in automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={isMagicLinkLoading}
                    className="w-full font-bold py-3.5 rounded-full border-2 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 cursor-pointer text-xs"
                    style={{ borderColor: "#CAE8BD", backgroundColor: "#ECFAE5", color: "#255F38" }}
                  >
                    {isMagicLinkLoading ? "Resending Magic Link..." : "Resend Magic Link"}
                  </button>
                </div>
              )}

              {/* Try another way to sign in */}
              {loginMode !== "mfa" && (
                <div className="pt-6 border-t border-[#CAE8BD] space-y-3">
                  <p className="text-2xs font-extrabold uppercase tracking-wider text-center" style={{ color: "#255F38" }}>
                    Try another way to sign in
                  </p>

                  {loginMode !== "password" && (
                    <button
                      type="button"
                      onClick={() => { setLoginMode("password"); setMessage(""); setIsSuccess(false); }}
                      className="w-full font-bold py-3 rounded-full border border-[#CAE8BD] transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer text-xs"
                      style={{ backgroundColor: "#ECFAE5", color: "#255F38" }}
                    >
                      Sign in with Password
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={isPasskeyLoading}
                    className="w-full flex items-center justify-center space-x-2 font-bold py-3 rounded-full border border-[#B0DB9C] transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-70 cursor-pointer text-xs"
                    style={{ backgroundColor: "#DDF6D2", color: "#255F38" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4zm-8 4c0-4.4 3.6-8 8-8s8 3.6 8 8M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    </svg>
                    <span>{isPasskeyLoading ? "Reading biometric..." : "Use Biometric Passkey / FaceID"}</span>
                  </button>

                  {loginMode !== "otp" && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isOtpLoading}
                      className="w-full font-bold py-3 rounded-full border border-[#CAE8BD] transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-70 cursor-pointer text-xs"
                      style={{ backgroundColor: "#ECFAE5", color: "#255F38" }}
                    >
                      {isOtpLoading ? "Sending OTP..." : "Receive 6-Digit OTP Code"}
                    </button>
                  )}

                  {loginMode !== "magic" && (
                    <button
                      type="button"
                      onClick={handleSendMagicLink}
                      disabled={isMagicLinkLoading}
                      className="w-full font-bold py-3 rounded-full border border-[#CAE8BD] transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-70 cursor-pointer text-xs"
                      style={{ backgroundColor: "#ECFAE5", color: "#255F38" }}
                    >
                      {isMagicLinkLoading ? "Sending Magic Link..." : "Receive Passwordless Magic Link"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
