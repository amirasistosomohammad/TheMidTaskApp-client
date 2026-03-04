import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaBuilding,
  FaIdCard,
  FaMapMarkerAlt,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import { getHomePathForUser } from "../../utils/authRouting";
import LoginBackground from "../../assets/images/login-bg.png";
import Logo from "../../assets/images/logo.png";
import TextLogo from "../../assets/images/logo-text.png";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [step, setStep] = useState("form"); // 'form' | 'otp'
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);
  const rightPanelRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    employee_id: "",
    position: "",
    division: "",
    school_name: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sliderAtOtp, setSliderAtOtp] = useState(false);
  const navigate = useNavigate();
  const { register: registerUser, verifyEmail, resendOtp, login } = useAuth();

  const theme = {
    primary: "#0B558F",
    primaryDark: "#094a75",
    textPrimary: "#1e3a5f",
    textSecondary: "#6b7280",
    backgroundLight: "#f5f7fb",
    borderColor: "#e5e7eb",
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  useEffect(() => {
    let rafId1;
    let rafId2;
    if (step === "otp") {
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setSliderAtOtp(true);
        });
      });
      return () => {
        if (rafId1 != null) cancelAnimationFrame(rafId1);
        if (rafId2 != null) cancelAnimationFrame(rafId2);
      };
    } else {
      rafId1 = requestAnimationFrame(() => {
        setSliderAtOtp(false);
      });
      return () => {
        if (rafId1 != null) cancelAnimationFrame(rafId1);
      };
    }
  }, [step]);

  useEffect(() => {
    if (step === "otp") {
      const scrollEl = rightPanelRef.current;
      if (scrollEl) {
        scrollEl.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const t = setTimeout(() => otpInputRefs.current[0]?.focus(), 500);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    setOtpError("");
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const arr = pasted.split("").concat(Array(6 - pasted.length).fill(""));
      setOtpDigits(arr.slice(0, 6));
      setOtpError("");
      const last = Math.min(pasted.length - 1, 5);
      otpInputRefs.current[last]?.focus();
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const otpString = otpDigits.join("");
    if (otpString.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }
    setVerifyLoading(true);
    setOtpError("");
    try {
      const verifyResult = await verifyEmail(form.email.trim(), otpString);
      if (!verifyResult.success) {
        setOtpError(verifyResult.error || "Invalid or expired code. Please try again.");
        setOtpDigits(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
        return;
      }
      const loginResult = await login(form.email.trim(), form.password);
      if (loginResult.success) {
        showToast.success("Email verified. Welcome!");
        navigate(getHomePathForUser(loginResult.user), { replace: true });
      } else {
        showToast.error(loginResult.error || "Sign in failed.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      const msg =
        err.data?.message ||
        (err.data?.errors?.otp ? err.data.errors.otp[0] : null) ||
        err.message ||
        "Verification failed.";
      setOtpError(msg);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setOtpError("");
    try {
      await resendOtp(form.email.trim());
      setResendCooldown(60);
      showToast.success("A new code has been sent to your email.");
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        "Failed to resend code. Please try again.";
      setOtpError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmailFormat = (email) => emailPattern.test(email);

  const validateEmailFormat = (email) => {
    if (!isValidEmailFormat(email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
      return false;
    }
    setFieldErrors((prev) => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };
    setPasswordValidation(validation);
    return validation;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "password" && value.length > 0) {
      setShowPasswordCriteria(true);
    }
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password") {
      validatePassword(value);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Please enter your full name";
    }

    if (!form.email.trim()) {
      errors.email = "Please enter your email address";
    } else if (!validateEmailFormat(form.email)) {
      errors.email =
        fieldErrors.email || "Please enter a valid email address";
    }

    if (!form.employee_id.trim()) {
      errors.employee_id = "Please enter your employee ID";
    }

    if (!form.position.trim()) {
      errors.position = "Please enter your position";
    }

    if (!form.division.trim()) {
      errors.division = "Please enter your division";
    }

    if (!form.school_name.trim()) {
      errors.school_name = "Please enter your school name";
    }

    if (!form.password) {
      errors.password = "Please enter a password";
    } else {
      const validation = validatePassword(form.password);
      const allOk =
        validation.minLength && validation.hasLetter && validation.hasNumber;
      if (!allOk) {
        errors.password =
          "Password must be at least 8 characters and include a letter and a number.";
      }
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      showToast.error(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await registerUser(form);
      if (result.success) {
        showToast.success(
          result.message || "Check your email for the 6-digit code."
        );
        setStep("otp");
        setOtpError("");
        setOtpDigits(["", "", "", "", "", ""]);
      } else {
        showToast.error(result.error || "Please try again.");
      }
    } catch (error) {
      const errData = error.data || {};
      const message =
        errData.message ||
        (errData.errors ? Object.values(errData.errors).flat().join(" ") : null) ||
        error.message ||
        "There was an error creating your account. Please try again.";
      showToast.error(message);
      if (errData.errors && typeof errData.errors === "object") {
        const flat = {};
        for (const [k, v] of Object.entries(errData.errors)) {
          flat[k] = Array.isArray(v) ? v[0] : v;
        }
        setFieldErrors(flat);
      }
      console.error("Registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldStatus = (fieldName) => {
    if (fieldErrors[fieldName]) {
      return "error";
    }
    if (form[fieldName] && !fieldErrors[fieldName]) {
      return "success";
    }
    return "default";
  };

  const renderFieldIcon = (fieldName) => {
    const status = getFieldStatus(fieldName);
    switch (status) {
      case "error":
      case "success":
      default:
        return null;
    }
  };

  return (
    <div className="auth-layout">
      {/* Left side – fixed background */}
      <div
        className="auth-left d-none d-lg-block"
        style={{
          backgroundImage: `url(${LoginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Right Panel - Scrollable with top/bottom spacing */}
      <div ref={rightPanelRef} className="auth-right">
        <div
          className={`d-flex align-items-center justify-content-center w-100 ${
            isMounted ? "fadeIn" : ""
          }`}
          style={{ minHeight: "100vh", padding: "2.5rem 1rem" }}
        >
          <div
            className="bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-3 mx-sm-4 mx-md-5"
            style={{
              maxWidth: "520px",
              border: `1px solid ${theme.borderColor}`,
            }}
          >
            {/* Logo – slightly smaller for mobile */}
            <div className="text-center mb-4">
              <div className="d-inline-flex flex-column align-items-center gap-2">
                <img
                  src={Logo}
                  alt="MID-TASK Logo"
                  style={{
                    width: "clamp(36px, 10vw, 48px)",
                    height: "clamp(36px, 10vw, 48px)",
                    borderRadius: "999px",
                    objectFit: "cover",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
                <img
                  src={TextLogo}
                  alt="MID-TASK Text"
                  className="auth-text-logo"
                  style={{
                    maxWidth: "min(150px, 34vw)",
                    height: "auto",
                    maxHeight: "clamp(14px, 2.5vw, 22px)",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>

            <div className="auth-steps-wrapper">
              <div
                className={`auth-steps-slider ${
                  sliderAtOtp ? "auth-slider-otp" : ""
                }`}
              >
              <div className="auth-step auth-step-form">
                <h1
                  className="h4 fw-bold text-center mb-2"
                  style={{ color: theme.textPrimary }}
                >
                  Create Your Account
                </h1>
                <p className="small text-secondary text-center mb-4">
                  Register using your official DepEd institutional email to securely
                  access the MID-TASK APP timeline management system.
                </p>

                <form onSubmit={handleSubmit}>
                  {/* Full Name */}
                  <label className="form-label small fw-semibold">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaUser size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.name ? "is-invalid" : form.name ? "is-valid" : ""
                      }`}
                      name="name"
                      placeholder="Full name"
                      value={form.name}
                      onChange={handleInputChange}
                    />
                    {renderFieldIcon("name")}
                  </div>
                  {fieldErrors.name && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.name}
                    </div>
                  )}

                  {/* Institutional Email */}
                  <label className="form-label small fw-semibold">
                    Institutional Email <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-1">
                    <span className="input-group-text">
                      <FaEnvelope size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.email || (form.email && !isValidEmailFormat(form.email))
                          ? "is-invalid"
                          : (form.email && isValidEmailFormat(form.email))
                          ? "is-valid"
                          : ""
                      }`}
                      name="email"
                      type="email"
                      placeholder="Institutional email address"
                      value={form.email}
                      onChange={handleInputChange}
                    />
                    {renderFieldIcon("email")}
                  </div>
                  {(fieldErrors.email || (form.email && !isValidEmailFormat(form.email))) && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.email || "Please enter a valid email address."}
                    </div>
                  )}
                  {/* Employee ID */}
                  <label className="form-label small fw-semibold">
                    Employee ID <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaIdCard size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.employee_id
                          ? "is-invalid"
                          : form.employee_id
                          ? "is-valid"
                          : ""
                      }`}
                      name="employee_id"
                      placeholder="Employee ID"
                      value={form.employee_id}
                      onChange={handleInputChange}
                    />
                    {renderFieldIcon("employee_id")}
                  </div>
                  {fieldErrors.employee_id && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.employee_id}
                    </div>
                  )}

                  {/* Position */}
                  <label className="form-label small fw-semibold">
                    Position <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaBuilding size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.position
                          ? "is-invalid"
                          : form.position
                          ? "is-valid"
                          : ""
                      }`}
                      name="position"
                      placeholder="Position"
                      value={form.position}
                      onChange={handleInputChange}
                    />
                  </div>
                  {fieldErrors.position && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.position}
                    </div>
                  )}

                  {/* Division */}
                  <label className="form-label small fw-semibold">
                    Division <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaMapMarkerAlt size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.division
                          ? "is-invalid"
                          : form.division
                          ? "is-valid"
                          : ""
                      }`}
                      name="division"
                      placeholder="Division / Office"
                      value={form.division}
                      onChange={handleInputChange}
                    />
                  </div>
                  {fieldErrors.division && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.division}
                    </div>
                  )}

                  {/* School Name */}
                  <label className="form-label small fw-semibold">
                    School Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaBuilding size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.school_name
                          ? "is-invalid"
                          : form.school_name
                          ? "is-valid"
                          : ""
                      }`}
                      name="school_name"
                      placeholder="School name"
                      value={form.school_name}
                      onChange={handleInputChange}
                    />
                  </div>
                  {fieldErrors.school_name && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.school_name}
                    </div>
                  )}

                  {/* Password */}
                  <label className="form-label small fw-semibold">
                    Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <FaLock size={14} />
                    </span>
                    <input
                      className={`form-control border-start-0 ps-2 fw-semibold ${
                        form.password &&
                        passwordValidation.minLength &&
                        passwordValidation.hasLetter &&
                        passwordValidation.hasNumber
                          ? "is-valid"
                          : form.password
                          ? "is-invalid"
                          : ""
                      }`}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={form.password}
                      onChange={handleInputChange}
                      onFocus={() => setShowPasswordCriteria(true)}
                      required
                      minLength={8}
                      disabled={isSubmitting}
                      id="password"
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                        borderColor: fieldErrors.password
                          ? "#dc3545"
                          : "var(--input-border)",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div className="invalid-feedback d-block small mb-2">
                      {fieldErrors.password}
                    </div>
                  )}

                  {/* Password criteria animation */}
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

                  {/* Confirm Password */}
                  <label className="form-label small fw-semibold">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-3">
                    <span className="input-group-text">
                      <FaLock size={14} />
                    </span>
                    <input
                      className={`form-control ${
                        fieldErrors.confirmPassword ||
                        (form.confirmPassword && form.confirmPassword !== form.password)
                          ? "is-invalid"
                          : form.confirmPassword && form.confirmPassword === form.password
                          ? "is-valid"
                          : ""
                      }`}
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={handleInputChange}
                      required
                      minLength={8}
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                        borderColor:
                          fieldErrors.confirmPassword ||
                          (form.confirmPassword && form.confirmPassword !== form.password)
                            ? "#dc3545"
                            : "var(--input-border)",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        !isSubmitting && setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <div
                    className={`confirm-password-error-wrapper ${
                      fieldErrors.confirmPassword ||
                      (form.confirmPassword && form.confirmPassword !== form.password)
                        ? "confirm-password-error-visible"
                        : ""
                    }`}
                  >
                    <div className="confirm-password-error-inner">
                      <div className="invalid-feedback d-block small mb-3 confirm-password-error-msg">
                        {(fieldErrors.confirmPassword ||
                          (form.confirmPassword && form.confirmPassword !== form.password)) &&
                          (fieldErrors.confirmPassword || "Passwords do not match.")}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-login w-100 rounded-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="spinner me-2" size={14} />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>

                  {/* Login link - same styling as Login page */}
                  <p
                    className="text-center mt-3 small fw-semibold"
                    style={{ color: theme.primary }}
                  >
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="register-link fw-bold"
                      style={{ color: theme.primary }}
                    >
                      Sign in here
                    </Link>
                  </p>
                </form>
              </div>

              <div className="auth-step auth-step-otp">
                <button
                  type="button"
                  className="auth-text-link btn btn-link p-0 mb-3 small d-inline-flex align-items-center gap-2"
                  onClick={() => {
                    setStep("form");
                    setOtpError("");
                    setOtpDigits(["", "", "", "", "", ""]);
                  }}
                >
                  <FaArrowLeft size={12} />
                  Back to sign up
                </button>

                <h2
                  className="h5 fw-bold mb-2"
                  style={{ color: theme.textPrimary }}
                >
                  Verify your email
                </h2>
                <p className="small text-secondary mb-3">
                  Enter the 6-digit code we sent to{" "}
                  <span className="fw-semibold">
                    {form.email || "your email"}
                  </span>
                  .
                </p>

                <form onSubmit={handleOtpVerify}>
                  <div className="d-flex justify-content-center gap-2 mb-3">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleOtpDigitChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="form-control text-center fw-bold otp-input"
                        style={{
                          width: "clamp(36px, 10vw, 48px)",
                          height: "48px",
                          fontSize: "1.25rem",
                          border: otpError
                            ? "2px solid #dc3545"
                            : `2px solid ${theme.borderColor}`,
                          borderRadius: "8px",
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className={`otp-error-wrapper ${otpError ? "otp-error-visible" : ""}`}
                  >
                    <div className="otp-error-inner">
                      <div className="invalid-feedback d-block small mb-0 otp-error-msg">
                        {otpError}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-login w-100 rounded-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center mb-2"
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? (
                      <>
                        <FaSpinner className="spinner me-2" size={14} />
                        Verifying...
                      </>
                    ) : (
                      "Verify email"
                    )}
                  </button>

                  <div className="mb-2">
                    <button
                      type="button"
                      className="btn-resend w-100 rounded-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center"
                      disabled={resendLoading || resendCooldown > 0}
                      onClick={handleResendOtp}
                    >
                      {resendLoading
                        ? "Sending..."
                        : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                    </button>
                  </div>

                  <p
                    className="text-center mt-3 small fw-semibold"
                    style={{ color: theme.primary }}
                  >
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="register-link fw-bold"
                      style={{ color: theme.primary }}
                    >
                      Sign in here
        </Link>
                  </p>
                </form>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

