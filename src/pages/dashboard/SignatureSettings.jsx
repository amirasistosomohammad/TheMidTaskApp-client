import React, { useEffect, useState, useCallback } from "react";
import { FaSpinner, FaPenFancy } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, apiRequestFormData, getAuthToken } from "../../services/apiClient";
import { normalizeLogoUrl } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { showAlert } from "../../services/notificationService";
import "./Profile.css";
import "./CentralAdminSettings.css";
import "./SignatureSettings.css";

export default function SignatureSettings() {
  const { user } = useAuth();
  const token = getAuthToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const fetchSignature = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest("/school-head/profile/signature", { method: "GET", auth: true });
      setSignatureUrl(data?.data?.signature_url || null);
    } catch (err) {
      showToast.error(err?.message || "Failed to load signature.");
      setSignatureUrl(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "school_head") {
      fetchSignature();
    } else {
      setLoading(false);
    }
  }, [user?.role, fetchSignature]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setFilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      showToast.warning("Signature file is too large (max 2 MB).");
      return;
    }
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
    setFile(selected);
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast.warning("Please choose a signature image first.");
      return;
    }
    if (!token) return;
    setSaving(true);
    showAlert.loadingWithOverlay("Uploading signature...");
    try {
      const form = new FormData();
      form.append("signature", file);
      const data = await apiRequestFormData("/school-head/profile/signature", {
        method: "POST",
        formData: form,
        auth: true,
      });
      setSignatureUrl(data?.data?.signature_url || null);
      setFile(null);
      setFilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      showToast.success("Signature updated.");
    } catch (err) {
      showToast.error(err?.message || "Failed to upload signature.");
    } finally {
      showAlert.close();
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!token) return;
    const result = await showAlert.confirm(
      "Remove signature",
      "Are you sure you want to remove your saved signature?",
      "Yes, remove",
      "Cancel"
    );
    if (!result?.isConfirmed) return;

    setRemoving(true);
    showAlert.loadingWithOverlay("Removing signature...");
    try {
      const form = new FormData();
      form.append("remove_signature", "1");
      await apiRequestFormData("/school-head/profile/signature", {
        method: "POST",
        formData: form,
        auth: true,
      });
      setSignatureUrl(null);
      setFile(null);
      showToast.success("Signature removed.");
    } catch (err) {
      showToast.error(err?.message || "Failed to remove signature.");
    } finally {
      showAlert.close();
      setRemoving(false);
    }
  };

  const displaySignatureUrl = signatureUrl ? normalizeLogoUrl(signatureUrl) || signatureUrl : null;

  return (
    <div className="system-settings-container page-enter profile-settings-container">
      <div className="system-settings-header">
        <div className="profile-settings-avatar-wrap" aria-hidden="true">
          <FaPenFancy style={{ fontSize: "1.25rem" }} />
        </div>
        <h1 className="system-settings-header-title">Digital signature</h1>
        <p className="system-settings-header-subtitle">
          {user?.name || "User"} · School Head
        </p>
        <p className="system-settings-header-desc">
          Upload and manage your official signature for validations and report documents.
        </p>
      </div>

      <div className="system-settings-row signature-settings-row-single">
        <div className="system-settings-card system-settings-card-right">
          <div className="system-settings-content-body">
            {loading && signatureUrl === null && file === null ? (
              <div className="system-settings-loading">
                <FaSpinner className="spinner" aria-hidden="true" />
                <span>Loading...</span>
              </div>
            ) : (
              <div className="system-settings-tab-panel tab-transition-enter">
                <h2 className="system-settings-card-title">
                  <FaPenFancy className="system-settings-card-title-icon" aria-hidden="true" />
                  <span>Digital signature</span>
                </h2>
                <div className="system-settings-admin-note">
                  Upload your official signature image for use in validations and generated reports.
                  Accepted formats: PNG or JPG, maximum 2 MB. For best results, use a transparent
                  PNG on a white background.
                </div>

                <div className="system-settings-branding-preview-wrap signature-settings-preview-wrap">
                  <label className="system-settings-label">Current signature</label>
                  <div className="system-settings-logo-row">
                    <div className="system-settings-logo-preview signature-settings-logo-preview">
                      {displaySignatureUrl ? (
                        <img src={displaySignatureUrl} alt="Current signature" />
                      ) : (
                        <span className="system-settings-logo-placeholder signature-settings-placeholder">
                          No signature uploaded.
                        </span>
                      )}
                    </div>
                    <div className="system-settings-logo-actions">
                      <input
                        id="signature-file"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange}
                        className="system-settings-logo-input"
                      />
                      <label htmlFor="signature-file" className="system-settings-logo-btn">
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>

                {file && filePreviewUrl && (
                  <div className="signature-settings-upload-preview-wrap">
                    <label className="system-settings-label">Preview — confirm before saving</label>
                    <div className="signature-settings-upload-preview">
                      <img src={filePreviewUrl} alt="Preview of selected signature" />
                    </div>
                    <p className="signature-settings-upload-preview-note">
                      This is how your signature will appear. Click &quot;Save signature&quot; to confirm.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSave} className="system-settings-form">
                  <div className="system-settings-form-footer signature-settings-form-footer">
                    <button
                      type="submit"
                      className="system-settings-btn-primary"
                      disabled={saving || !file}
                      aria-busy={saving}
                    >
                      {saving ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        "Save signature"
                      )}
                    </button>
                    <button
                      type="button"
                      className="system-settings-btn-secondary signature-settings-btn-remove"
                      onClick={handleRemove}
                      disabled={removing || !displaySignatureUrl}
                      aria-busy={removing}
                    >
                      {removing ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Removing…</span>
                        </>
                      ) : (
                        "Remove signature"
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
