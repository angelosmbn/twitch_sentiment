import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmNewPassword: false,
  });
  const navigate = useNavigate();

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password.");
      setSuccessMsg("Password reset! Redirecting to login...");
      setResetDone(true);
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };

  if (!token)
    return (
      <div className="flex justify-center items-center px-4 font-sans" style={{ minHeight: "calc(100vh - 100px)" }}>
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border border-white">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-red-600 rounded-full w-16 h-16 flex items-center justify-center mb-2">
              <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Invalid or Missing Token</h2>
            <p className="text-gray-400 text-sm text-center">
              The password reset link is invalid or expired. Please request a new one.
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex justify-center items-center px-4 font-sans" style={{ minHeight: "calc(100vh - 100px)" }}>
      <div className="w-full max-w-md rounded-xl shadow-lg p-8 border border-white">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#9146FF] rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
          <p className="text-gray-400 text-sm text-center">
            {resetDone
              ? "Your password has been reset. Redirecting to login..."
              : "Enter your new password below."}
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

        {!resetDone && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">New Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword.newPassword ? "text" : "password"}
                  className="w-full p-3 bg-[#252529] border border-white rounded-md text-white focus:outline-none focus:border-white"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("newPassword")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white"
                  tabIndex={-1}
                >
                  {showPassword.newPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Confirm New Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword.confirmNewPassword ? "text" : "password"}
                  className="w-full p-3 bg-[#252529] border border-white rounded-md text-white focus:outline-none focus:border-white"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmNewPassword")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white"
                  tabIndex={-1}
                >
                  {showPassword.confirmNewPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#9146FF] hover:bg-[#772ce8] text-white font-bold rounded-md transition"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
