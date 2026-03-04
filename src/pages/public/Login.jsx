import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import { getHomePathForUser } from "../../utils/authRouting";
import LoginBackground from "../../assets/images/login-bg.png";
import Logo from "../../assets/images/logo.png";
import TextLogo from "../../assets/images/logo-text.png";
import "./Login.css";

const REJECTION_STORAGE_KEY = "midtask_login_rejection";
const DEACTIVATION_STORAGE_KEY = "midtask_login_deactivated";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountStatusModal, setAccountStatusModal] = useState(null); // { type: 'rejected'|'deactivated', remarks: string|null } or null
  const navigate = useNavigate();

  const { login } = useAuth();

  const closeAccountStatusModal = useCallback(() => setAccountStatusModal(null), []);

  // Show rejection or deactivation modal when redirected here (e.g. admin rejected/deactivated while user was logged in)
  useEffect(() => {
    try {
      const rejectionRaw = sessionStorage.getItem(REJECTION_STORAGE_KEY);
      if (rejectionRaw) {
        sessionStorage.removeItem(REJECTION_STORAGE_KEY);
        const data = JSON.parse(rejectionRaw);
        setAccountStatusModal({
          type: "rejected",
          remarks: data?.rejection_remarks ?? data?.rejectionRemarks ?? null,
        });
        return;
      }
      const deactivationRaw = sessionStorage.getItem(DEACTIVATION_STORAGE_KEY);
      if (deactivationRaw) {
        sessionStorage.removeItem(DEACTIVATION_STORAGE_KEY);
        try {
          const data = JSON.parse(deactivationRaw);
          setAccountStatusModal({
            type: "deactivated",
            remarks: data?.deactivation_remarks ?? data?.deactivationRemarks ?? null,
          });
        } catch {
          setAccountStatusModal({ type: "deactivated", remarks: null });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Client color scheme
  const theme = {
    primary: "#0B558F",       // DepEd-inspired blue (buttons, title, links)
    primaryDark: "#094a75",  // blue hover
    accent: "#ea580c",        // orange (accent text)
    accentDark: "#c2410c",    // orange hover
    textPrimary: "#1e3a5f",
    textSecondary: "#475569",
    backgroundLight: "#f8fafc",
    backgroundWhite: "#ffffff",
    borderColor: "#e2e8f0",
  };

  useEffect(() => {
    const img = new Image();
    img.src = LoginBackground;
  }, []);

  useEffect(() => {
    if (!accountStatusModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeAccountStatusModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [accountStatusModal, closeAccountStatusModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      showToast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(form.email, form.password);

      if (result.success) {
        showToast.success(`Welcome back, ${result.user?.name ?? "User"}!`);
        setTimeout(() => {
          navigate(getHomePathForUser(result.user), { replace: true });
        }, 1500);
      } else {
        // 403: show rejection or deactivation modal based on accountStatus from server.
        // For 401/422 (e.g. invalid credentials) always show toast.
        if (result.httpStatus === 403) {
          const type = result.accountStatus === "deactivated" ? "deactivated" : "rejected";
          let remarks = type === "deactivated" ? (result.deactivation_remarks ?? null) : (result.rejection_remarks ?? null);
          if (!remarks && result.error && result.error.includes(" Reason: ")) {
            const parts = result.error.split(" Reason: ");
            remarks = parts[1] ? parts[1].trim() : null;
          }
          setAccountStatusModal({ type, remarks: remarks || null });
        } else {
          showToast.error(
            result.error || "Invalid credentials. Please check your email and password."
          );
        }
      }
    } catch (error) {
      showToast.error(
        "Unable to connect to the server. Please check your internet connection and try again."
      );
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-vh-100 d-flex flex-column position-relative">
      {/* Background image - no blur (same as BRIMS: image only, no overlay) */}
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

      {/* Main content - centered vertically */}
      <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative">
        {/* Form content - always clear */}
        <div
          className="bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-4 mx-sm-0 position-relative"
          style={{
            maxWidth: "420px",
            border: `1px solid ${theme.borderColor}`,
            animation: "fadeIn 0.6s ease-in-out",
          }}
        >
        {/* Logo section - responsive via CSS (mobile: larger icon, more gap; desktop: from media queries) */}
        <div className="logo-section mb-4 w-100">
          <div className="d-flex align-items-center logo-block logo-block-auth mx-auto">
            {/* Left: logo image */}
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

            {/* Right: text logo + tagline */}
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
                Midsalip Integrated Digital Task and Administrative Synchronization Kit
              </p>
            </div>
          </div>
        </div>

        {/* Title - centered (same as BRIMS) */}
        <h5
          className="text-center fw-bolder fs-4"
          style={{
            marginTop: "2rem",
            marginBottom: "2rem",
            color: theme.primary,
          }}
        >
          Log in to your account
        </h5>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <label
            htmlFor="email"
            className="mb-1 fw-semibold"
            style={{ fontSize: ".9rem", color: theme.textSecondary }}
          >
            Email
          </label>
          <div className="mb-3 position-relative">
            <FaEnvelope
              className="position-absolute top-50 translate-middle-y text-muted ms-3"
              size={16}
            />
            <input
              type="email"
              name="email"
              id="email"
              className="form-control ps-5 fw-semibold"
              placeholder="Email"
              value={form.email}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>

          {/* Password */}
          <label
            htmlFor="password"
            className="mb-1 fw-semibold"
            style={{ fontSize: ".9rem", color: theme.textSecondary }}
          >
            Password
          </label>
          <div className="mb-3 position-relative">
            <FaLock
              className="position-absolute top-50 translate-middle-y text-muted ms-3"
              size={16}
            />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              className="form-control ps-5 pe-5 fw-semibold"
              placeholder="Password"
              value={form.password}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
            <span
              onClick={() => !isSubmitting && setShowPassword(!showPassword)}
              className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
              style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!isSubmitting) setShowPassword((prev) => !prev);
                }
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Forgot password link – same hover as Register here / Sign in here */}
          <div className="d-flex justify-content-end mb-3">
            <Link
              to="/forgot-password"
              className="register-link small fw-semibold"
              style={{ color: theme.primary }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit button - .btn-login for hover effect (same as BRIMS) */}
          <button
            type="submit"
            className="btn-login w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner me-2" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Register link - centered, hover uses primary color */}
          <p
            className="text-center mt-3 small fw-semibold"
            style={{ color: theme.primary }}
          >
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="register-link fw-bold"
              style={{ color: theme.primary }}
            >
              Register here
            </Link>
          </p>
        </form>
      </div>
      </div>

      {accountStatusModal &&
        createPortal(
          <div
            className="login-rejection-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-account-status-title"
            aria-describedby="login-account-status-desc"
          >
            <div
              className="login-rejection-backdrop modal-backdrop-animation"
              onClick={closeAccountStatusModal}
              onKeyDown={(e) => e.key === "Enter" && closeAccountStatusModal()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="login-rejection-wrap">
              <div className="login-rejection-box modal-content-animation">
                <header className="login-rejection-header">
                  <div className="login-rejection-header-text">
                    <h2 id="login-account-status-title" className="login-rejection-title">
                      {accountStatusModal.type === "deactivated" ? "Account deactivated" : "Account rejected"}
                    </h2>
                    <p id="login-account-status-desc" className="login-rejection-subtitle">
                      {accountStatusModal.type === "deactivated"
                        ? "Your account has been deactivated by an administrator. You are not permitted to sign in until your account is reactivated."
                        : "Your account has been rejected. You are not permitted to sign in."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="login-rejection-close"
                    aria-label="Close"
                    onClick={closeAccountStatusModal}
                  >
                    ×
                  </button>
                </header>
                <div className="login-rejection-body">
                  <p className="login-rejection-message">
                    {accountStatusModal.type === "deactivated"
                      ? "Your account has been deactivated. Please contact your administrator for assistance or to request reactivation."
                      : "Your registration has been reviewed and was not approved. You do not have access to this system."}
                  </p>
                  <div className="login-rejection-remarks">
                    <p className="login-rejection-remarks-label">Remarks from administrator</p>
                    {accountStatusModal.remarks ? (
                      <p className="login-rejection-remarks-text">{accountStatusModal.remarks}</p>
                    ) : (
                      <p className="login-rejection-remarks-empty">No additional remarks provided.</p>
                    )}
                  </div>
                </div>
                <footer className="login-rejection-footer">
                  <button
                    type="button"
                    className="login-rejection-btn-close"
                    onClick={closeAccountStatusModal}
                  >
                    Close
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Login page footer – system footprint, corporate / government style */}
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
