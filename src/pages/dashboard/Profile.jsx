import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, apiRequestFormData } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { FaUser, FaSpinner, FaLock, FaSave } from "react-icons/fa";
import "./Profile.css";

export default function Profile() {
  const { user, refreshUser } = useAuth();
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
  const [showNewPassword, setShowNewPassword] = useState(false);
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
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) return false;
    return true;
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
      showToast.success("Password changed successfully.");
    } catch (err) {
      const msg = err?.data?.errors?.current_password?.[0]
        || err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to change password.";
      showToast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page page-transition-enter">
      <header className="profile-header">
        <div className="profile-header-inner">
          <span className="profile-header-icon" aria-hidden="true">
            <FaUser />
          </span>
          <div>
            <h1 className="profile-header-title">Profile</h1>
            <p className="profile-header-subtitle">
              View and edit your account information. Change your password.
            </p>
          </div>
        </div>
      </header>

      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-card-title">Account information</h2>
        </div>
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-preview">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" />
              ) : (
                <span className="profile-avatar-placeholder"><FaUser aria-hidden="true" /></span>
              )}
            </div>
            <div className="profile-avatar-actions">
              <input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                disabled={avatarLoading}
                className="profile-avatar-input"
              />
              <label htmlFor="profile-avatar" className="profile-avatar-btn">
                {avatarLoading ? "Uploading…" : "Change photo"}
              </label>
            </div>
          </div>
        </div>
        <form onSubmit={handleProfileSubmit} className="profile-form">
          <div className="profile-form-group">
            <label htmlFor="profile-name" className="profile-label">
              Full name <span className="profile-required">*</span>
            </label>
            <input
              id="profile-name"
              name="name"
              type="text"
              value={profileForm.name}
              onChange={handleProfileChange}
              className={`profile-input ${profileErrors.name ? "profile-input-error" : ""}`}
              disabled={profileLoading}
              maxLength={255}
            />
            {profileErrors.name && <p className="profile-error">{profileErrors.name}</p>}
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-email" className="profile-label">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email || ""}
              readOnly
              className="profile-input profile-input-readonly"
              aria-describedby="profile-email-hint"
            />
            <p id="profile-email-hint" className="profile-hint">Email cannot be changed.</p>
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-employee-id" className="profile-label">
              Employee ID
            </label>
            <input
              id="profile-employee-id"
              name="employee_id"
              type="text"
              value={profileForm.employee_id}
              onChange={handleProfileChange}
              className="profile-input"
              disabled={profileLoading}
              maxLength={100}
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-position" className="profile-label">
              Position
            </label>
            <input
              id="profile-position"
              name="position"
              type="text"
              value={profileForm.position}
              onChange={handleProfileChange}
              className="profile-input"
              disabled={profileLoading}
              maxLength={255}
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-division" className="profile-label">
              Division
            </label>
            <input
              id="profile-division"
              name="division"
              type="text"
              value={profileForm.division}
              onChange={handleProfileChange}
              className="profile-input"
              disabled={profileLoading}
              maxLength={255}
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-school-name" className="profile-label">
              School name
            </label>
            <input
              id="profile-school-name"
              name="school_name"
              type="text"
              value={profileForm.school_name}
              onChange={handleProfileChange}
              className="profile-input"
              disabled={profileLoading}
              maxLength={255}
            />
          </div>

          <div className="profile-form-footer">
            <button
              type="submit"
              className="profile-btn-submit"
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

      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-card-title">
            <FaLock className="profile-card-title-icon" aria-hidden="true" />
            Change password
          </h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <div className="profile-form-group">
            <label htmlFor="profile-current-password" className="profile-label">
              Current password <span className="profile-required">*</span>
            </label>
            <input
              id="profile-current-password"
              name="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              className={`profile-input ${passwordErrors.current_password ? "profile-input-error" : ""}`}
              disabled={passwordLoading}
              placeholder="Enter your current password"
            />
            {passwordErrors.current_password && (
              <p className="profile-error">{passwordErrors.current_password}</p>
            )}
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-new-password" className="profile-label">
              New password <span className="profile-required">*</span>
            </label>
            <input
              id="profile-new-password"
              name="new_password"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              className={`profile-input ${passwordErrors.new_password ? "profile-input-error" : ""}`}
              disabled={passwordLoading}
              placeholder="Min 8 chars, letter + number"
            />
            <label className="profile-checkbox-label">
              <input
                type="checkbox"
                checked={showNewPassword}
                onChange={(e) => setShowNewPassword(e.target.checked)}
                className="profile-checkbox"
              />
              <span>Show password</span>
            </label>
            {passwordErrors.new_password && (
              <p className="profile-error">{passwordErrors.new_password}</p>
            )}
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-confirm-password" className="profile-label">
              Confirm new password <span className="profile-required">*</span>
            </label>
            <input
              id="profile-confirm-password"
              name="new_password_confirmation"
              type="password"
              value={passwordForm.new_password_confirmation}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              className={`profile-input ${passwordErrors.new_password_confirmation ? "profile-input-error" : ""}`}
              disabled={passwordLoading}
              placeholder="Confirm new password"
            />
            {passwordErrors.new_password_confirmation && (
              <p className="profile-error">{passwordErrors.new_password_confirmation}</p>
            )}
          </div>

          <div className="profile-form-footer">
            <button
              type="submit"
              className="profile-btn-submit"
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
    </div>
  );
}
