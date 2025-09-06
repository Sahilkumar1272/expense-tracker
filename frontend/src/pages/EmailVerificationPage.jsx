import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ApiService from "../api/authApi";

const EmailVerificationPage = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const userId = location.state?.userId;
  const userEmail = location.state?.userEmail;

  useEffect(() => {
    if (!userId) {
      navigate("/register");
    }
  }, [userId, navigate]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyEmail({
        user_id: userId,
        otp: otpValue,
      });

      setSuccess("Email verified successfully! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      setError(error.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError("");

    try {
      await ApiService.resendOtp(userId);
      setSuccess("Verification code sent successfully!");
      setResendCooldown(60); // 1 minute cooldown
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.message || "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d+$/.test(pasteData)) return;

    const newOtp = pasteData.split("");
    while (newOtp.length < 6) newOtp.push("");

    setOtp(newOtp);

    // Focus the last input with data or the first empty one
    const lastIndex = Math.min(pasteData.length - 1, 5);
    document.getElementById(`otp-${lastIndex}`)?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to register link */}
        <Link 
          to="/register" 
          className="inline-flex items-center text-gray-300 hover:text-white mb-8 transition-colors group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Register
        </Link>

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
            <p className="text-gray-300 mb-2">We've sent a code to {userEmail}</p>
            <p className="text-sm text-gray-400">Enter the 6-digit code below</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-center">{success}</p>
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                Enter the 6-digit code
              </label>
              <div
                className="flex justify-center space-x-2"
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg text-center text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                You can paste the code directly into any field
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Verifying...</span>
                </div>
              ) : (
                "Verify Email"
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="text-center mt-6 pt-6 border-t border-white/10">
            <p className="text-gray-400 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResendCode}
              disabled={resendLoading || resendCooldown > 0}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend Code"}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;