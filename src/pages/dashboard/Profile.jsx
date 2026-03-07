import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, apiRequestFormData } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { FaUser, FaSpinner, FaLock, FaSave, FaEnvelope, FaIdCard, FaBuilding, FaMapMarkerAlt, FaImage, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Profile.css";
import "./CentralAdminSettings.css";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    employee_id: "",
    position: "",
    division: "",
    school_name: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        employee_id: user.employee_id || "",
        position: user.position || "",
        division: user.division || "",
        school_name: user.school_name || "",
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));

    if (name === "new_password") {
      if (value.length > 0) setShowPasswordCriteria(true);
      const validation = {
        minLength: value.length >= 8,
        hasLetter: /[A-Za-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
      };
      setPasswordValidation(validation);
    }

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validatePassword = (pwd) => {
    if (!pwd) return false;
    const validation = {
      minLength: pwd.length >= 8,
      hasLetter: /[A-Za-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
    setPasswordValidation(validation);
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Image must be 2MB or less.");
      return;
    }
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      showToast.error("Use JPEG, PNG, GIF, or WebP.");
      return;
    }
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await apiRequestFormData("/user/avatar", { method: "POST", formData: fd, auth: true });
      if (res?.user) await refreshUser();
      showToast.success("Profile photo updated.");
    } catch (err) {
      const msg = err?.data?.errors?.avatar?.[0] || err?.message || "Failed to upload photo.";
      showToast.error(msg);
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!profileForm.name?.trim()) next.name = "Name is required.";
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;

    setProfileLoading(true);
    try {
      const res = await apiRequest("/user/profile", {
        method: "PUT",
        auth: true,
        body: {
          name: profileForm.name.trim(),
          employee_id: profileForm.employee_id.trim() || null,
          position: profileForm.position.trim() || null,
          division: profileForm.division.trim() || null,
          school_name: profileForm.school_name.trim() || null,
        },
      });
      if (res?.user) await refreshUser();
      showToast.success("Profile updated successfully.");
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to update profile.";
      showToast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!passwordForm.current_password) next.current_password = "Current password is required.";
    if (!passwordForm.new_password) next.new_password = "New password is required.";
    else if (!validatePassword(passwordForm.new_password)) {
      next.new_password = "Password must be at least 8 characters and include a letter and a number.";
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      next.new_password_confirmation = "Passwords do not match.";
    }
    setPasswordErrors(next);
    if (Object.keys(next).length > 0) return;

    setPasswordLoading(true);
    try {
      await apiRequest("/user/password", {
        method: "PUT",
        auth: true,
        body: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          new_password_confirmation: passwordForm.new_password_confirmation,
        },
      });
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setPasswordErrors({});
      setPasswordValidation({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
      });
      setShowPasswordCriteria(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      showToast.success("Password changed successfully.");
    } catch (err) {
      const msg =
        err?.data?.errors?.current_password?.[0] ||
        (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
        err?.message ||
        "Failed to change password.";
      showToast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="system-settings-container page-enter profile-settings-container">
      <div className="system-settings-header">
        <div className="profile-settings-avatar-wrap" aria-hidden="true">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            <span className="profile-settings-avatar-placeholder"><FaUser /></span>
          )}
        </div>
        <h1 className="system-settings-header-title">Profile</h1>
        <p className="system-settings-header-subtitle">
          {user?.name || "User"} • {user?.email || "—"}
        </p>
        <p className="system-settings-header-desc">
          Review and maintain your official account information and access credentials.
        </p>
      </div>

      <div className="system-settings-row">
        <div className="system-settings-card system-settings-card-left">
          <h2 className="system-settings-menu-title">Profile Menu</h2>
          <nav className="system-settings-nav">
            <button
              type="button"
              className={`system-settings-nav-btn ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <FaUser className="system-settings-nav-icon" aria-hidden="true" />
              <div className="system-settings-nav-text">
                <span className="system-settings-nav-label">Account information</span>
                <span className="system-settings-nav-desc">Update your profile details</span>
              </div>
            </button>
            <button
              type="button"
              className={`system-settings-nav-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <FaLock className="system-settings-nav-icon" aria-hidden="true" />
              <div className="system-settings-nav-text">
                <span className="system-settings-nav-label">Security</span>
                <span className="system-settings-nav-desc">Change your password</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="system-settings-card system-settings-card-right">
          <div className="system-settings-content-body">
            {activeTab === "account" && (
              <div className="system-settings-tab-panel tab-transition-enter">
                <h2 className="system-settings-card-title">
                  <FaUser className="system-settings-card-title-icon" aria-hidden="true" />
                  <span>Account information</span>
                </h2>

                <div className="system-settings-admin-note">
                  <strong>Note:</strong> Your email address is used for authentication and cannot be changed.
                </div>

                <div className="system-settings-branding-preview-wrap profile-settings-photo-wrap">
                  <label className="system-settings-label">Profile photo</label>
                  <div className="system-settings-logo-row">
                    <div className="system-settings-logo-preview profile-settings-photo-preview">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile photo" />
                      ) : (
                        <span className="system-settings-logo-placeholder">
                          <FaImage aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <div className="system-settings-logo-actions">
                      <input
                        id="profile-avatar"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleAvatarChange}
                        disabled={avatarLoading}
                        className="system-settings-logo-input"
                      />
                      <label htmlFor="profile-avatar" className="system-settings-logo-btn">
                        {avatarLoading ? (
                          <>
                            <FaSpinner className="spinner" aria-hidden="true" />
                            <span>Uploading…</span>
                          </>
                        ) : (
                          "Upload photo"
                        )}
                      </label>
                      <span className="system-settings-logo-hint">PNG, JPG, WEBP up to 2MB.</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="system-settings-form">
                  <div className="profile-settings-grid">
                    <div className="system-settings-form-group">
                      <label htmlFor="profile-name" className="system-settings-label">
                        Full name <span className="system-settings-required">*</span>
                      </label>
                      <input
                        id="profile-name"
                        name="name"
                        type="text"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className={`system-settings-input ${profileErrors.name ? "error" : ""}`}
                        disabled={profileLoading}
                        maxLength={255}
                        placeholder="Enter your full name"
                      />
                      {profileErrors.name && <p className="system-settings-error">{profileErrors.name}</p>}
                    </div>

                    <div className="system-settings-form-group profile-settings-form-group-readonly">
                      <label htmlFor="profile-email" className="system-settings-label">
                        Email <span className="profile-settings-readonly-hint">(cannot be changed)</span>
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={user.email || ""}
                        readOnly
                        aria-readonly="true"
                        className="system-settings-input profile-settings-input-readonly"
                      />
                    </div>

                    <div className="system-settings-form-group">
                      <label htmlFor="profile-employee-id" className="system-settings-label">Employee ID</label>
                      <input
                        id="profile-employee-id"
                        name="employee_id"
                        type="text"
                        value={profileForm.employee_id}
                        onChange={handleProfileChange}
                        className="system-settings-input"
                        disabled={profileLoading}
                        maxLength={100}
                        placeholder="e.g. 2026-00123"
                      />
                    </div>

                    <div className="system-settings-form-group">
                      <label htmlFor="profile-position" className="system-settings-label">Position</label>
                      <input
                        id="profile-position"
                        name="position"
                        type="text"
                        value={profileForm.position}
                        onChange={handleProfileChange}
                        className="system-settings-input"
                        disabled={profileLoading}
                        maxLength={255}
                        placeholder="e.g. Administrative Officer"
                      />
                    </div>

                    <div className="system-settings-form-group">
                      <label htmlFor="profile-division" className="system-settings-label">Division</label>
                      <input
                        id="profile-division"
                        name="division"
                        type="text"
                        value={profileForm.division}
                        onChange={handleProfileChange}
                        className="system-settings-input"
                        disabled={profileLoading}
                        maxLength={255}
                        placeholder="e.g. Division Office"
                      />
                    </div>

                    <div className="system-settings-form-group">
                      <label htmlFor="profile-school-name" className="system-settings-label">School name</label>
                      <input
                        id="profile-school-name"
                        name="school_name"
                        type="text"
                        value={profileForm.school_name}
                        onChange={handleProfileChange}
                        className="system-settings-input"
                        disabled={profileLoading}
                        maxLength={255}
                        placeholder="e.g. Sample National High School"
                      />
                    </div>
                  </div>

                  <div className="system-settings-form-footer">
                    <button
                      type="submit"
                      className="system-settings-btn-primary"
                      disabled={profileLoading}
                      aria-busy={profileLoading}
                    >
                      {profileLoading ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <FaSave aria-hidden="true" />
                          <span>Save changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "security" && (
              <div className="system-settings-tab-panel tab-transition-enter">
                <h2 className="system-settings-card-title">
                  <FaLock className="system-settings-card-title-icon" aria-hidden="true" />
                  <span>Security</span>
                </h2>

                <div className="system-settings-admin-note">
                  <strong>Security note:</strong> Use a strong password and do not share your credentials.
                </div>

                <form onSubmit={handlePasswordSubmit} className="system-settings-form">
                  <div className="system-settings-form-group">
                    <label htmlFor="profile-current-password" className="system-settings-label">
                      Current password <span className="system-settings-required">*</span>
                    </label>
                    <div className="profile-settings-password-input-wrap">
                      <input
                        id="profile-current-password"
                        name="current_password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.current_password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                        className={`system-settings-input profile-settings-password-input ${passwordErrors.current_password ? "error" : ""}`}
                        disabled={passwordLoading}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="profile-settings-password-toggle"
                        onClick={() => !passwordLoading && setShowCurrentPassword(!showCurrentPassword)}
                        disabled={passwordLoading}
                        aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <div
                      className={`profile-settings-error-wrapper ${
                        passwordErrors.current_password ? "profile-settings-error-visible" : ""
                      }`}
                    >
                      <div className="profile-settings-error-inner">
                        {passwordErrors.current_password && (
                          <p className="system-settings-error">{passwordErrors.current_password}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="system-settings-form-group">
                    <label htmlFor="profile-new-password" className="system-settings-label">
                      New password <span className="system-settings-required">*</span>
                    </label>
                    <div className="profile-settings-password-input-wrap">
                      <input
                        id="profile-new-password"
                        name="new_password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.new_password}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className={`system-settings-input profile-settings-password-input ${
                          passwordForm.new_password &&
                          passwordValidation.minLength &&
                          passwordValidation.hasLetter &&
                          passwordValidation.hasNumber
                            ? "profile-settings-input-valid"
                            : passwordForm.new_password && passwordErrors.new_password
                            ? "error"
                            : ""
                        }`}
                        disabled={passwordLoading}
                        placeholder="Create a new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="profile-settings-password-toggle"
                        onClick={() => !passwordLoading && setShowNewPassword(!showNewPassword)}
                        disabled={passwordLoading}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <div
                      className={`profile-settings-password-criteria-wrapper ${
                        showPasswordCriteria ? "profile-settings-password-criteria-visible" : ""
                      }`}
                    >
                      <div className="profile-settings-password-criteria-inner">
                        <ul className="profile-settings-password-criteria-content">
                          <li className={passwordValidation.minLength ? "profile-settings-criteria-valid" : ""}>
                            • At least 8 characters
                          </li>
                          <li className={passwordValidation.hasLetter ? "profile-settings-criteria-valid" : ""}>
                            • Contains a letter
                          </li>
                          <li className={passwordValidation.hasNumber ? "profile-settings-criteria-valid" : ""}>
                            • Contains a number
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div
                      className={`profile-settings-error-wrapper ${
                        passwordErrors.new_password ? "profile-settings-error-visible" : ""
                      }`}
                    >
                      <div className="profile-settings-error-inner">
                        {passwordErrors.new_password && (
                          <p className="system-settings-error">{passwordErrors.new_password}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="system-settings-form-group">
                    <label htmlFor="profile-confirm-password" className="system-settings-label">
                      Confirm new password <span className="system-settings-required">*</span>
                    </label>
                    <div className="profile-settings-password-input-wrap">
                      <input
                        id="profile-confirm-password"
                        name="new_password_confirmation"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.new_password_confirmation}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className={`system-settings-input profile-settings-password-input ${passwordErrors.new_password_confirmation ? "error" : ""}`}
                        disabled={passwordLoading}
                        placeholder="Confirm new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="profile-settings-password-toggle"
                        onClick={() => !passwordLoading && setShowConfirmPassword(!showConfirmPassword)}
                        disabled={passwordLoading}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <div
                      className={`profile-settings-error-wrapper ${
                        passwordErrors.new_password_confirmation ? "profile-settings-error-visible" : ""
                      }`}
                    >
                      <div className="profile-settings-error-inner">
                        {passwordErrors.new_password_confirmation && (
                          <p className="system-settings-error">{passwordErrors.new_password_confirmation}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="system-settings-form-footer">
                    <button
                      type="submit"
                      className="system-settings-btn-primary"
                      disabled={passwordLoading}
                      aria-busy={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Changing…</span>
                        </>
                      ) : (
                        <>
                          <FaLock aria-hidden="true" />
                          <span>Change password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
