import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert, showToast } from "../../services/notificationService";
import LoginBackground from "../../assets/images/login-bg.png";
import Logo from "../../assets/images/logo.png";
import TextLogo from "../../assets/images/logo-text.png";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const navigate = useNavigate();

  const { login } = useAuth();

  // Client color scheme: DepEd blue (#0B558F) & orange
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
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      showAlert.error("Validation Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const loadingAlert = showAlert.loading("Signing you in...");

      const result = await login(form.email, form.password);

      showAlert.close();

      if (result.success) {
        showToast.success(`Welcome back, ${result.user?.name ?? "User"}!`);
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        showAlert.error(
          "Login Failed",
          result.error || "Please check your credentials and try again."
        );
      }
    } catch (error) {
      showAlert.close();
      showAlert.error(
        "Connection Error",
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
    <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative">
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

      {/* Form content - always clear */}
      <div
        className="bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-4 mx-sm-0 position-relative"
        style={{
          maxWidth: "420px",
          border: `1px solid ${theme.borderColor}`,
          animation: "fadeIn 0.6s ease-in-out",
        }}
      >
        {/* Logo section - centered in same content width as form (even left/right margins) */}
        <div className="logo-section mb-4 w-100">
          <div
            className="d-flex align-items-center logo-block mx-auto"
            style={{ gap: "0.3rem", width: "fit-content", maxWidth: "100%" }}
          >
            {/* Left: logo image - responsive */}
            <div
              className="d-flex align-items-center justify-content-center logo-img-wrap flex-shrink-0"
              style={{ width: "min(95px, 20vw)", minWidth: "52px" }}
            >
              <img
                src={Logo}
                alt="MidTask Logo"
                className="img-fluid"
                style={{
                  width: "100%",
                  height: "auto",
                  maxWidth: "110px",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Right: text logo + description - bigger, responsive */}
            <div
              className="d-flex flex-column justify-content-center align-items-start text-logo-wrap flex-shrink-1"
              style={{ width: "min(220px, 42vw)", minWidth: "120px", maxWidth: "100%" }}
            >
              <img
                src={TextLogo}
                alt="THE MID-TASK APP"
                className="img-fluid"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "clamp(28px, 5vw, 42px)",
                  objectFit: "contain",
                  marginBottom: "0.2rem",
                }}
              />
              <p
                className="fw-bolder text-start"
                style={{
                  fontSize: "9px",
                  color: theme.accent,
                  margin: 0,
                  lineHeight: "1.2",
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
  );
}
