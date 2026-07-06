import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import logo from "../assets/secure-auth-x-logo.png";
import { useAuth } from "@custom-auth/react";

export default function MagicLink() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const navigate = useNavigate();
  const { refresh } = useAuth(); // Call refresh to update the session context after setting cookie

  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setError("Invalid or missing magic link.");
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/magic-link/verify?token=${token}&email=${encodeURIComponent(email)}`, {
          method: "GET",
          credentials: "include"
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Authentication failed");
        }

        setStatus("success");
        // Ensure the auth context picks up the new session cookie
        await new Promise((resolve) => setTimeout(resolve, 150));
        await refresh();
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setError(err.message);
      }
    };

    verify();
  }, [token, email, navigate, refresh]);

  return (
    <div className="min-h-screen flex flex-col justify-center py-4" style={{ backgroundColor: "#ECFAE5" }}>
      <div className="px-2 w-full max-w-sm mx-auto">
        <div
          className="rounded-2xl shadow-xl py-10 px-6 border-1 text-center"
          style={{
            backgroundColor: "#DDF6D2",
            borderColor: "#CAE8BD",
          }}
        >
          <div className="flex items-center justify-center pb-6">
            <img src={logo} alt="SecureAuthX_logo" className="h-20 w-20" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#18230F" }}>
            Magic Link Login
          </h2>
          
          <div className="min-h-[120px] flex flex-col items-center justify-center">
            {status === "verifying" && (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 rounded-full animate-spin border-t-transparent mb-4" style={{ borderColor: "#255F38", borderTopColor: "transparent" }}></div>
                <p className="font-medium animate-pulse" style={{ color: "#255F38" }}>
                  Authenticating securely...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 border-2 border-green-500 text-green-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg text-green-700">Login Successful!</p>
                  <p className="text-sm mt-1 text-green-600">Redirecting to dashboard...</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 border-2 border-red-500 text-red-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg text-red-700">Authentication Failed</p>
                  <p className="text-sm mt-1 text-red-600 px-4">{error}</p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="mt-4 px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "#18230F",
                    color: "#ECFAE5"
                  }}
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
