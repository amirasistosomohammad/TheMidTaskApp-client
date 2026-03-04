import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";
import { showAlert, showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import LoginBackground from "../../assets/images/login-bg.png";
import Logo from "../../assets/images/logo.png";
import TextLogo from "../../assets/images/logo-text.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);

  const navigate = useNavigate();
  const { resetPassword, loading } = useAuth();

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

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (!tokenParam || !emailParam) {
      showToast.error(
        "This password reset link is invalid or has expired. Please request a new one."
      );
      navigate("/forgot-password", { replace: true });
    }
  }, [searchParams, navigate]);

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };
    setPasswordValidation(validation);
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
    if (value.length > 0) setShowPasswordCriteria(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      showToast.error("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      showToast.error("Please make sure both passwords are the same.");
      return;
    }
    if (!validatePassword(password)) {
      showToast.error(
        "Password must be at least 8 characters and include a letter and a number."
      );
      return;
    }

    setLoadingLocal(true);
    try {
      const res = await resetPassword({
        email: email.trim(),
        token,
        password,
        password_confirmation: confirmPassword,
      });
      if (!res.success) {
        throw new Error(res.error || "Reset password failed.");
      }
      showToast.success(
        "Your password has been reset. Please sign in with your new password."
      );
      navigate("/login", { replace: true });
    } catch (error) {
      showToast.error(
        error.message ||
          "Invalid or expired reset link. Please request a new one."
      );
    } finally {
      setLoadingLocal(false);
    }
  };

  const submitting = loading || loadingLocal;

  if (!token || !email) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative">
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
        <div className="d-flex align-items-center gap-2 position-relative">
          <FaSpinner className="spinner" size={24} style={{ color: theme.primary }} />
          <span className="fw-semibold" style={{ color: theme.textPrimary }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative">
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
        {/* Logo section – same as Login / ForgotPassword (responsive via CSS) */}
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
                Midsalip Integrated Digital Task and Administrative
                Synchronization Kit
              </p>
            </div>
          </div>
        </div>

        {/* Title – same style as Login / ForgotPassword */}
        <h5
          className="text-center fw-bolder fs-4"
          style={{
            marginTop: "2rem",
            marginBottom: "2rem",
            color: theme.primary,
          }}
        >
          Reset password
        </h5>

        <p
          className="small text-center mb-4"
          style={{ color: theme.textSecondary }}
        >
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="reset-email"
            className="mb-1 fw-semibold form-label small"
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
              id="reset-email"
              type="email"
              className="form-control ps-5 fw-semibold"
              value={email}
              disabled
              readOnly
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>

          {/* New password – same structure as Register (input-group) */}
          <label
            htmlFor="reset-password"
            className="form-label small fw-semibold mb-1"
            style={{ fontSize: ".9rem", color: theme.textSecondary }}
          >
            New password
          </label>
          <div className="input-group mb-2">
            <span className="input-group-text">
              <FaLock size={14} />
            </span>
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              className={`form-control border-start-0 ps-2 fw-semibold ${
                password &&
                passwordValidation.minLength &&
                passwordValidation.hasLetter &&
                passwordValidation.hasNumber
                  ? "is-valid"
                  : password
                  ? "is-invalid"
                  : ""
              }`}
              placeholder="New password"
              value={password}
              onChange={handlePasswordChange}
              disabled={submitting}
              minLength={8}
              autoComplete="new-password"
              onFocus={() => setShowPasswordCriteria(true)}
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => !submitting && setShowPassword(!showPassword)}
              disabled={submitting}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {/* Password criteria – same smooth transition as Register */}
          <div
            className={`password-criteria-wrapper ${
              showPasswordCriteria ? "password-criteria-visible" : ""
            }`}
          >
            <div className="password-criteria-inner">
              <ul className="password-criteria-content small text-secondary mb-3 ps-3 list-unstyled">
                <li
                  className={
                    passwordValidation.minLength ? "text-success" : ""
                  }
                >
                  • At least 8 characters
                </li>
                <li
                  className={
                    passwordValidation.hasLetter ? "text-success" : ""
                  }
                >
                  • Contains a letter
                </li>
                <li
                  className={
                    passwordValidation.hasNumber ? "text-success" : ""
                  }
                >
                  • Contains a number
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm password – same structure as Register (input-group) */}
          <label
            htmlFor="reset-confirm-password"
            className="form-label small fw-semibold mb-1"
            style={{ fontSize: ".9rem", color: theme.textSecondary }}
          >
            Confirm password
          </label>
          <div className="input-group mb-3">
            <span className="input-group-text">
              <FaLock size={14} />
            </span>
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className={`form-control fw-semibold ${
                confirmPassword && password !== confirmPassword
                  ? "is-invalid"
                  : confirmPassword && password === confirmPassword
                  ? "is-valid"
                  : ""
              }`}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              minLength={8}
              autoComplete="new-password"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor:
                  confirmPassword && password !== confirmPassword
                    ? "#dc3545"
                    : "var(--input-border)",
              }}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                !submitting && setShowConfirmPassword((prev) => !prev)
              }
              disabled={submitting}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {/* Error message: aligned with input-group, smooth transition */}
          <div
            className={`confirm-password-error-wrapper ${
              confirmPassword && password !== confirmPassword
                ? "confirm-password-error-visible"
                : ""
            }`}
          >
            <div className="confirm-password-error-inner">
              <p className="confirm-password-error-msg small text-danger mb-0">
                Passwords do not match.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <FaSpinner className="spinner me-2" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </button>
        </form>

        <button
          type="button"
          className="auth-text-link btn btn-link p-0 mt-3 small d-inline-flex align-items-center gap-2"
          onClick={() => navigate("/login")}
        >
          <FaArrowLeft size={12} />
          Back to sign in
        </button>
      </div>
    </div>
  );
}
