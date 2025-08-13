import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send reset link.");
      }
      setSuccessMsg("Password reset link sent to your email.");
      setEmailSent(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center px-4 font-sans" style={{ minHeight: "calc(100vh - 100px)" }}>
      <div className="w-full max-w-md rounded-xl shadow-lg p-8 border border-white">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#9146FF] rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Forgot Password</h2>
          <p className="text-gray-400 text-sm text-center">
            {!emailSent
              ? "Enter your email to receive a reset link."
              : "If your email is registered, you will receive a password reset link shortly."}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-600 text-white rounded-md px-4 py-2 mb-4 text-center text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-600 text-white rounded-md px-4 py-2 mb-4 text-center text-sm">
            {successMsg}
          </div>
        )}

        {!emailSent ? (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Email Address</label>
              <input
                type="email"
                className="w-full p-3 bg-[#252529] border border-gray-600 rounded-md text-white focus:outline-none focus:border-white"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#9146FF] hover:bg-[#772ce8] text-white font-bold rounded-md transition"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-4 mt-4">
            <button
              onClick={() => navigate("/auth")}
              className="w-full py-3 bg-[#9146FF] hover:bg-[#772ce8] text-white font-bold rounded-md transition"
              type="button"
            >
              Back to Login
            </button>
          </div>
        )}

        {!emailSent && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/auth")}
              className="text-[#9146FF] hover:underline text-sm font-semibold bg-transparent border-none outline-none"
              type="button"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
