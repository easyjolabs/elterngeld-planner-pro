import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ===========================================
// DESIGN TOKENS (matching Guide)
// ===========================================
const colors = {
  background: "#F9F8F4",
  tile: "#F0EEE6",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  buttonDark: "#3D3D3A",
  error: "#E07B3C",
};

// ===========================================
// TYPES
// ===========================================
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  redirectTo?: string;
}

// ===========================================
// MAIN COMPONENT
// ===========================================
const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  title = "Sign in",
  description = "Enter your email to receive a magic link.",
  redirectTo,
}) => {
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  // Email validation helper
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailIsValid = isValidEmail(email);

  const handleSubmit = async () => {
    if (!emailIsValid) {
      setError("Please enter a valid email");
      return;
    }

    setIsLoading(true);
    setError("");

    const { error: signInError } = await signInWithEmail(email, emailConsent, redirectTo);

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    } else {
      setEmailSent(true);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError("");

    const { error: signInError } = await signInWithEmail(email, emailConsent, redirectTo);

    setIsLoading(false);
    if (signInError) {
      setError(signInError.message);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail("");
    setEmailSent(false);
    setError("");
    setEmailConsent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl p-6 relative"
        style={{ backgroundColor: colors.white }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: colors.text }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Check your email screen */}
        {emailSent ? (
          <div className="text-center">
            {/* Email Icon */}
            <div
              className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: colors.tile }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: colors.textDark }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>

            <p className="text-[20px] font-semibold mb-2" style={{ color: colors.textDark }}>
              Check your email
            </p>
            <p className="text-[14px] mb-1" style={{ color: colors.text }}>
              We sent a login link to
            </p>
            <p className="text-[14px] font-medium mb-4" style={{ color: colors.textDark }}>
              {email}
            </p>
            <p className="text-[13px] mb-6" style={{ color: colors.text }}>
              Click the link to sign in. The link expires in 24 hours.
            </p>

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 mb-3"
              style={{
                backgroundColor: colors.tile,
                color: colors.textDark,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend email"
              )}
            </button>

            {error && (
              <p className="text-[12px] mb-2" style={{ color: colors.error }}>
                {error}
              </p>
            )}

            {/* Use different email */}
            <button
              onClick={() => {
                setEmailSent(false);
                setError("");
              }}
              className="text-[13px] underline"
              style={{ color: colors.text }}
            >
              Use a different email
            </button>

            <p className="text-[12px] mt-4" style={{ color: colors.text }}>
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{ backgroundColor: colors.tile }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: colors.textDark }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </div>

            {/* Title */}
            <p className="text-[18px] font-semibold mb-1" style={{ color: colors.textDark }}>
              {title}
            </p>
            <p className="text-[14px] mb-5" style={{ color: colors.text }}>
              {description}
            </p>

            {/* Email Input */}
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none mb-3"
              style={{
                backgroundColor: colors.white,
                color: colors.textDark,
                border: error ? `1.5px solid ${colors.error}` : `1.5px solid ${colors.border}`,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            {error && (
              <p className="text-[12px] mb-3 -mt-2" style={{ color: colors.error }}>
                {error}
              </p>
            )}

            {/* Email Consent Checkbox */}
            <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded"
                style={{ accentColor: colors.buttonDark }}
              />
              <span className="text-[12px] leading-snug" style={{ color: colors.text }}>
                Send me helpful tips about Elterngeld and important reminders.
              </span>
            </label>

            {/* Email Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !emailIsValid}
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: emailIsValid ? "#C0630B" : colors.buttonDark,
                color: colors.white,
                opacity: isLoading ? 0.7 : emailIsValid ? 1 : 0.5,
                cursor: isLoading || !emailIsValid ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending link...
                </>
              ) : (
                "Continue with Email"
              )}
            </button>

            {/* Terms */}
            <p className="text-[12px] text-center mt-4" style={{ color: colors.text }}>
              By signing in, you agree to our{" "}
              <a href="/terms" className="underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
