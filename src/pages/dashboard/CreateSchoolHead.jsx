import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import {
  FaUserPlus,
  FaArrowLeft,
  FaSpinner,
  FaCopy,
  FaCheck,
  FaKey,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "./CreateSchoolHead.css";

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pwd = "";
  pwd += chars[Math.floor(Math.random() * 26)]; // letter
  pwd += chars[26 + Math.floor(Math.random() * 10)]; // number
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export default function CreateSchoolHead() {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "school_head",
    employee_id: "",
    position: "",
    division: "",
    school_name: "",
    school_head_id: "",
  });
  const [errors, setErrors] = useState({});
  const [schoolHeads, setSchoolHeads] = useState([]);
  const [schoolHeadsLoading, setSchoolHeadsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleGeneratePassword = () => {
    setForm((prev) => ({ ...prev, password: generatePassword() }));
    setShowPassword(true);
    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = "Full name is required.";
    if (!form.email?.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = "Password must include a letter and a number.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  useEffect(() => {
    // Load active School Heads for AO assignment when needed.
    const loadSchoolHeads = async () => {
      setSchoolHeadsLoading(true);
      try {
        const res = await apiRequest("/admin/personnel?status=active&role=school_head", { auth: true });
        const list = Array.isArray(res?.personnel) ? res.personnel : [];
        setSchoolHeads(list);
      } catch (err) {
        // Soft-fail: AO creation can still proceed without pre-selecting a School Head.
        showToast.error(err?.message || "Failed to load School Heads.");
        setSchoolHeads([]);
      } finally {
        setSchoolHeadsLoading(false);
      }
    };

    if (form.role === "administrative_officer" && schoolHeads.length === 0 && !schoolHeadsLoading) {
      void loadSchoolHeads();
    }
  }, [form.role, schoolHeads.length, schoolHeadsLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setCredentials(null);
    try {
      const res = await apiRequest("/admin/users", {
        method: "POST",
        auth: true,
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          employee_id: form.employee_id.trim() || null,
          position: form.position.trim() || null,
          division: form.division.trim() || null,
          school_name: form.school_name.trim() || null,
          school_head_id:
            form.role === "administrative_officer" && form.school_head_id
              ? Number(form.school_head_id)
              : undefined,
        },
      });
      setCredentials(res.credentials || { email: res.user?.email, password: form.password });
      showToast.success("Account created. Share the credentials with the user.");
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to create account.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast.success("Credentials copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Could not copy. Please copy manually.");
    }
  };

  const handleCloseCredentials = () => {
    setCredentials(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "school_head",
      employee_id: "",
      position: "",
      division: "",
      school_name: "",
      school_head_id: "",
    });
    setErrors({});
  };

  return (
    <div className="create-school-head-page page-transition-enter">
      <header className="create-school-head-header">
        <div className="create-school-head-header-inner">
          <Link to="/central-admin/personnel" className="create-school-head-back-btn" aria-label="Back to personnel directory">
            <FaArrowLeft aria-hidden="true" />
            Back to personnel directory
          </Link>
        </div>
      </header>

      <div className="create-school-head-card">
        <div className="create-school-head-card-header">
          <span className="create-school-head-card-icon" aria-hidden="true">
            <FaUserPlus />
          </span>
          <div>
            <h1 className="create-school-head-card-title">Create School Head</h1>
            <p className="create-school-head-card-subtitle">
              Create an account for a School Head. Share the credentials with them securely.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-school-head-form">
          <div className="create-school-head-form-group">
            <label htmlFor="csh-name" className="create-school-head-label">
              Full name <span className="create-school-head-required">*</span>
            </label>
            <input
              id="csh-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              className={`create-school-head-input ${errors.name ? "create-school-head-input-error" : ""}`}
              disabled={submitting}
              maxLength={255}
              autoFocus
            />
            {errors.name && <p className="create-school-head-error">{errors.name}</p>}
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-email" className="create-school-head-label">
              Email <span className="create-school-head-required">*</span>
            </label>
            <input
              id="csh-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Institutional email"
              className={`create-school-head-input ${errors.email ? "create-school-head-input-error" : ""}`}
              disabled={submitting}
              maxLength={255}
            />
            {errors.email && <p className="create-school-head-error">{errors.email}</p>}
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-password" className="create-school-head-label">
              Temporary password <span className="create-school-head-required">*</span>
            </label>
            <div className="create-school-head-password-wrap">
              <div className="create-school-head-password-input-wrap">
                <input
                  id="csh-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars, letter + number"
                  className={`create-school-head-input ${errors.password ? "create-school-head-input-error" : ""}`}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="create-school-head-password-toggle"
                  onClick={() => !submitting && setShowPassword((prev) => !prev)}
                  disabled={submitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
              <button
                type="button"
                className="create-school-head-gen-btn"
                onClick={handleGeneratePassword}
                disabled={submitting}
                title="Generate password"
              >
                <FaKey aria-hidden="true" />
                Generate
              </button>
            </div>
            <p className="create-school-head-hint">Share this password with the user. They can change it after logging in.</p>
            {errors.password && <p className="create-school-head-error">{errors.password}</p>}
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-role" className="create-school-head-label">
              Role <span className="create-school-head-required">*</span>
            </label>
            <select
              id="csh-role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="create-school-head-select"
              disabled={submitting}
            >
              <option value="school_head">School Head</option>
              <option value="administrative_officer">Administrative Officer</option>
            </select>
          </div>

          {form.role === "administrative_officer" && (
            <div className="create-school-head-form-group">
              <label htmlFor="csh-school-head" className="create-school-head-label">
                Assigned School Head <span className="create-school-head-optional">(optional)</span>
              </label>
              <select
                id="csh-school-head"
                name="school_head_id"
                value={form.school_head_id}
                onChange={handleChange}
                className="create-school-head-select"
                disabled={submitting || schoolHeadsLoading}
              >
                <option value="">
                  {schoolHeadsLoading ? "Loading School Heads…" : "Select School Head (optional)"}
                </option>
                {schoolHeads.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.name} {sh.school_name ? `· ${sh.school_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="create-school-head-form-group">
            <label htmlFor="csh-employee-id" className="create-school-head-label">
              Employee ID <span className="create-school-head-optional">(optional)</span>
            </label>
            <input
              id="csh-employee-id"
              name="employee_id"
              type="text"
              value={form.employee_id}
              onChange={handleChange}
              placeholder="Employee ID"
              className="create-school-head-input"
              disabled={submitting}
              maxLength={100}
            />
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-position" className="create-school-head-label">
              Position <span className="create-school-head-optional">(optional)</span>
            </label>
            <input
              id="csh-position"
              name="position"
              type="text"
              value={form.position}
              onChange={handleChange}
              placeholder="e.g. School Head"
              className="create-school-head-input"
              disabled={submitting}
              maxLength={255}
            />
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-division" className="create-school-head-label">
              Division <span className="create-school-head-optional">(optional)</span>
            </label>
            <input
              id="csh-division"
              name="division"
              type="text"
              value={form.division}
              onChange={handleChange}
              placeholder="Division / Office"
              className="create-school-head-input"
              disabled={submitting}
              maxLength={255}
            />
          </div>

          <div className="create-school-head-form-group">
            <label htmlFor="csh-school-name" className="create-school-head-label">
              School name <span className="create-school-head-optional">(optional)</span>
            </label>
            <input
              id="csh-school-name"
              name="school_name"
              type="text"
              value={form.school_name}
              onChange={handleChange}
              placeholder="School name"
              className="create-school-head-input"
              disabled={submitting}
              maxLength={255}
            />
          </div>

          <div className="create-school-head-form-footer">
            <Link to="/central-admin/personnel" className="create-school-head-btn-cancel" disabled={submitting}>
              Cancel
            </Link>
            <button
              type="submit"
              className="create-school-head-btn-submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <FaUserPlus aria-hidden="true" />
                  <span>Create account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {credentials &&
        createPortal(
          <div
            className="create-school-head-credentials-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="csh-credentials-title"
          >
            <div className="create-school-head-credentials-backdrop" />
            <div className="create-school-head-credentials-wrap">
              <div className="create-school-head-credentials-modal">
                <h2 id="csh-credentials-title" className="create-school-head-credentials-title">
                  Account created
                </h2>
                <p className="create-school-head-credentials-subtitle">
                  Share these credentials with the user securely.
                </p>
                <div className="create-school-head-credentials-box">
                  <div className="create-school-head-credentials-row">
                    <span className="create-school-head-credentials-label">Email:</span>
                    <code className="create-school-head-credentials-value">{credentials.email}</code>
                  </div>
                  <div className="create-school-head-credentials-row">
                    <span className="create-school-head-credentials-label">Password:</span>
                    <code className="create-school-head-credentials-value">{credentials.password}</code>
                  </div>
                </div>
                <div className="create-school-head-credentials-footer">
                  <button
                    type="button"
                    className="create-school-head-credentials-copy"
                    onClick={handleCopyCredentials}
                  >
                    {copied ? (
                      <>
                        <FaCheck aria-hidden="true" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <FaCopy aria-hidden="true" />
                        <span>Copy credentials</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="create-school-head-credentials-done"
                    onClick={handleCloseCredentials}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
