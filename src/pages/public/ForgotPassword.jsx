import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaSpinner, FaArrowLeft } from "react-icons/fa";
import { showAlert, showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import LoginBackground from "../../assets/images/login-bg.png";
import Logo from "../../assets/images/logo.png";
import TextLogo from "../../assets/images/logo-text.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();
  const { forgotPassword, loading } = useAuth();

  const theme = {
    primary: "#0B558F",
    primaryDark: "#094a75",
    accent: "#ea580c",
    textPrimary: "#1e3a5f",
    textSecondary: "#475569",
    backgroundLight: "#f8fafc",
    borderColor: "#e2e8f0",
  };

  useEffect(() => {
    const img = new Image();
    img.src = LoginBackground;
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showAlert.error("Email required", "Please enter your email address.");
      return;
    }

    setLoadingLocal(true);
    try {
      const res = await forgotPassword(email.trim());
      if (!res.success) {
        throw new Error(res.error || "Failed to send reset link.");
      }
      showToast.success(
        "If an account exists with this email, a password reset link has been sent. Please check your inbox."
      );
      navigate("/login", { replace: true });
    } catch (error) {
      showToast.error(
        error.message || "An error occurred. Please try again later."
      );
    } finally {
      setLoadingLocal(false);
    }
  };

  const submitting = loading || loadingLocal;

  return (
    <div className="min-vh-100 d-flex flex-column position-relative">
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: `url(${LoginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: theme.backgroundLight,
        }}
        aria-hidden
      />

      <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative">
      <div
        className={`bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-4 mx-sm-0 position-relative ${
          isMounted ? "fadeIn" : ""
        }`}
        style={{
          maxWidth: "420px",
          border: `1px solid ${theme.borderColor}`,
          animation: "fadeIn 0.6s ease-in-out",
        }}
      >
        {/* Logo section – same as Login (responsive via CSS) */}
        <div className="logo-section mb-4 w-100">
          <div className="d-flex align-items-center logo-block logo-block-auth mx-auto">
            <div className="d-flex align-items-center justify-content-center logo-img-wrap logo-img-wrap-auth flex-shrink-0">
              <img
                src={Logo}
                alt="MidTask Logo"
                className="img-fluid logo-icon-img"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
            <div className="d-flex flex-column justify-content-center align-items-start text-logo-wrap text-logo-wrap-auth flex-shrink-1">
              <img
                src={TextLogo}
                alt="MID-TASK APP"
                className="img-fluid auth-text-logo"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  objectPosition: "left top",
                  display: "block",
                }}
              />
              <p
                className="fw-bolder text-start auth-tagline"
                style={{
                  fontSize: "9px",
                  color: theme.accent,
                  margin: 0,
                  padding: 0,
                  paddingLeft: 0,
                  marginLeft: 0,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                Midsalip Integrated Digital Task and Administrative Synchronization
                Kit
              </p>
            </div>
          </div>
        </div>

        {/* Title – same style as Login */}
        <h5
          className="text-center fw-bolder fs-4"
          style={{
            marginTop: "2rem",
            marginBottom: "2rem",
            color: theme.primary,
          }}
        >
          Forgot password?
        </h5>

        <p className="small text-center mb-4" style={{ color: theme.textSecondary }}>
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="forgot-email"
            className="mb-1 fw-semibold"
            style={{ fontSize: ".9rem", color: theme.textSecondary }}
          >
            Email
          </label>
          <div className="mb-4 position-relative">
            <FaEnvelope
              className="position-absolute top-50 translate-middle-y text-muted ms-3"
              size={16}
            />
            <input
              type="email"
              id="forgot-email"
              className="form-control ps-5 fw-semibold"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>

          {/* Submit button – btn-login for consistency */}
          <button
            type="submit"
            className="btn-login w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <FaSpinner className="spinner me-2" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        {/* Back to sign in – centered */}
        <div className="text-center mt-3">
          <button
            type="button"
            className="auth-text-link btn btn-link p-0 small d-inline-flex align-items-center gap-2"
            onClick={() => navigate("/login")}
          >
            <FaArrowLeft size={12} />
            Back to sign in
          </button>
        </div>
      </div>
      </div>

      {/* Same footer as Login – system footprint, corporate / government style */}
      <footer className="login-page-footer position-relative" role="contentinfo">
        <div className="login-page-footer-inner">
          <p className="login-page-footer-name">MID-TASK APP</p>
          <p className="login-page-footer-tagline">
            Midsalip Integrated Digital Task and Administrative Synchronization Kit
          </p>
          <p className="login-page-footer-copy">
            © {new Date().getFullYear()} All rights reserved · Task Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
