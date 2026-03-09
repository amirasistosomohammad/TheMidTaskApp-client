import React, { useEffect, useState, useCallback } from "react";
import {
  FaClipboardCheck,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaKeyboard,
  FaUpload,
  FaSync,
  FaInbox,
  FaFilePdf,
  FaDownload,
} from "react-icons/fa";
import { apiRequest, getAuthToken } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import "./AdminOfficerDashboard.css";
import "./MyTasks.css";
import "./SchoolHeadValidations.css";

const API_BASE = (import.meta.env.VITE_LARAVEL_API || "").replace(/\/$/, "");

function buildFileUrl(file) {
  if (!file?.path) return "#";
  const base = API_BASE || "/api";
  return `${base}/storage/${file.path}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function frequencyLabel(freq) {
  if (!freq) return "—";
  const map = {
    monthly: "Monthly",
    twice_a_year: "Twice a year",
    yearly: "Yearly",
    end_of_sy: "End of school year",
    quarterly: "Quarterly",
    every_two_months: "Every 2 months",
    once_or_twice_a_year: "Once or twice a year",
  };
  return map[freq] || String(freq).replace(/_/g, " ");
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function isImageFile(file) {
  if (!file) return false;
  const mime = (file.mime_type || "").toLowerCase();
  const name = (file.original_name || "").toLowerCase();
  return mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(name);
}

function isPdfFile(file) {
  if (!file) return false;
  const mime = (file.mime_type || "").toLowerCase();
  const name = (file.original_name || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

/** Image preview with fallback placeholder (matches TaskDetail / personnel style). */
function ImagePreviewWithFallback({ src, alt, className }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={`shv-file-preview-thumb-placeholder ${className || ""}`}>
        <FaUpload className="shv-file-preview-placeholder-icon" aria-hidden="true" />
        <span className="shv-file-preview-placeholder-text">Preview unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export default function SchoolHeadValidations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [decision, setDecision] = useState("approved");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/school-head/validations/pending", { auth: true });
      setSubmissions(Array.isArray(res?.submissions) ? res.submissions : []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load pending submissions.");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSelect = (id) => {
    if (submitting) return;
    if (activeId === id) {
      setActiveId(null);
      setDecision("approved");
      setFeedback("");
    } else {
      setActiveId(id);
      setDecision("approved");
      setFeedback("");
    }
  };

  const activeSubmission = submissions.find((s) => s.id === activeId) || null;
  const activeTask = activeSubmission?.user_task?.task;

  const handleValidate = async () => {
    if (!activeSubmission) return;
    if (!decision) {
      showToast.error("Select Approve or Reject before saving.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/school-head/validations/${activeSubmission.id}`, {
        method: "POST",
        auth: true,
        body: {
          status: decision,
          feedback: feedback.trim() || null,
        },
      });
      showToast.success(
        decision === "approved"
          ? "Submission approved successfully."
          : "Submission rejected with feedback."
      );
      setActiveId(null);
      setDecision("approved");
      setFeedback("");
      await fetchPending();
    } catch (err) {
      const msg =
        err?.data?.errors
          ? Object.values(err.data.errors).flat().join(" ")
          : err?.message || "Failed to save validation.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = async (file) => {
    if (!file?.id) return;
    const endpoint = `${API_BASE || "/api"}/submission-files/${file.id}/download`;
    setDownloadingId(file.id);
    try {
      const token = getAuthToken();
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        let message = "Failed to download file.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.original_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
      showToast.success("File downloaded successfully.");
    } catch (err) {
      showToast.error(err?.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="shv-page page-transition-enter">
      <header className="ao-dashboard-header" aria-label="Validations page header">
        <div className="ao-dashboard-header-inner">
          <div className="ao-dashboard-header-text">
            <span className="ao-dashboard-title-icon" aria-hidden="true">
              <FaClipboardCheck />
            </span>
            <div>
              <h1 className="ao-dashboard-title">Validations</h1>
              <p className="ao-dashboard-subtitle">
                Review submissions from personnel and approve or reject them with feedback.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ao-dashboard-refresh-btn"
            onClick={fetchPending}
            disabled={loading}
            aria-label="Refresh pending submissions"
          >
            {loading ? (
              <FaSpinner className="spinner" aria-hidden="true" />
            ) : (
              <FaSync aria-hidden="true" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ao-dashboard-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading pending submissions…</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="shv-empty-state">
          <div className="shv-empty-icon-wrap">
            <FaInbox className="shv-empty-icon" aria-hidden="true" />
          </div>
          <h2 className="shv-empty-title">No submissions to validate</h2>
          <p className="shv-empty-text">
            There are currently no submitted tasks awaiting your validation. New submissions will
            appear here when personnel submit their work.
          </p>
        </div>
      ) : (
        <div className="shv-layout">
          <section
            className="ao-dashboard-card shv-list-card"
            aria-label="Pending submissions list"
          >
            <div className="ao-dashboard-card-header">
              <div className="ao-dashboard-card-title-wrap">
                <span className="ao-dashboard-card-icon" aria-hidden="true">
                  <FaClipboardCheck />
                </span>
                <div>
                  <h2 className="ao-dashboard-card-title">Pending submissions</h2>
                  <p className="ao-dashboard-card-subtitle">
                    Select an item to view details and record your remarks.
                  </p>
                </div>
              </div>
            </div>
            <div className="shv-list-body">
              <ul className="shv-items" role="list">
                {submissions.map((s) => {
                  const ut = s.user_task;
                  const task = ut?.task;
                  const isActive = s.id === activeId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`ao-dashboard-task-card shv-item ${isActive ? "shv-item-active" : ""}`}
                        onClick={() => handleSelect(s.id)}
                        aria-pressed={isActive}
                        aria-label={`Review submission: ${task?.name ?? "Task"}`}
                      >
                        <div className="ao-dashboard-task-card-body shv-item-body">
                          <div className="ao-dashboard-task-card-header">
                            <h3 className="ao-dashboard-task-card-title shv-item-title">
                              {task?.name ?? "Task"}
                            </h3>
                            <span className="ao-dashboard-task-card-due shv-item-date">
                              {ut?.due_date
                                ? formatDateTime(ut.due_date + "T00:00:00")
                                : "No due date"}
                            </span>
                          </div>
                          <div className="ao-dashboard-task-card-meta">
                            <span
                              className={
                                s.type === "input"
                                  ? "shv-badge shv-badge-input"
                                  : "shv-badge shv-badge-upload"
                              }
                            >
                              {s.type === "input" ? (
                                <>
                                  <FaKeyboard aria-hidden="true" /> Input
                                </>
                              ) : (
                                <>
                                  <FaUpload aria-hidden="true" /> Upload
                                </>
                              )}
                            </span>
                            <span className="ao-dashboard-task-card-frequency">
                              {task?.frequency ? frequencyLabel(task.frequency) : "—"}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section
            className={`ao-dashboard-card shv-detail-card ${activeSubmission ? "has-selection" : ""}`}
            aria-label="Submission details and remarks"
          >
            {activeSubmission ? (
              <>
                <div className="ao-dashboard-card-header">
                  <div className="ao-dashboard-card-title-wrap">
                    <span className="ao-dashboard-card-icon" aria-hidden="true">
                      <FaCheckCircle />
                    </span>
                    <div>
                      <h2 className="ao-dashboard-card-title">Submission details</h2>
                      <p className="ao-dashboard-card-subtitle">
                        Task: {activeTask?.name ?? "Task"} · Personnel:{" "}
                        {activeSubmission.user_task?.user?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="shv-detail-body">
                  <dl className="shv-meta-list">
                    <div className="shv-meta-row">
                      <dt>Due date</dt>
                      <dd>
                        {activeSubmission.user_task?.due_date
                          ? formatDateTime(
                              activeSubmission.user_task.due_date + "T00:00:00"
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div className="shv-meta-row">
                      <dt>Type</dt>
                      <dd>
                        {activeSubmission.type === "input" ? (
                          <span className="shv-badge shv-badge-input">
                            <FaKeyboard aria-hidden="true" /> Input (data entry)
                          </span>
                        ) : (
                          <span className="shv-badge shv-badge-upload">
                            <FaUpload aria-hidden="true" /> Upload (MOV)
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {activeSubmission.type === "upload" &&
                    activeSubmission.notes != null &&
                    activeSubmission.notes !== "" && (
                      <div className="shv-block shv-input-data">
                        <h3 className="shv-block-title">Notes</h3>
                        <div className="shv-input-data-content">{activeSubmission.notes}</div>
                      </div>
                    )}

                  {activeSubmission.type === "input" && (
                    <div className="shv-block shv-input-data">
                      <h3 className="shv-block-title">Input data</h3>
                      {activeSubmission.input_data ? (
                        <dl className="shv-input-data-dl">
                          {activeSubmission.input_data.period != null &&
                            activeSubmission.input_data.period !== "" && (
                              <div className="shv-input-data-row">
                                <dt>Period</dt>
                                <dd>{activeSubmission.input_data.period}</dd>
                              </div>
                            )}
                          {activeSubmission.input_data.reference_no != null &&
                            activeSubmission.input_data.reference_no !== "" && (
                              <div className="shv-input-data-row">
                                <dt>Reference no.</dt>
                                <dd>{activeSubmission.input_data.reference_no}</dd>
                              </div>
                            )}
                          {activeSubmission.input_data.amount != null &&
                            activeSubmission.input_data.amount !== "" && (
                              <div className="shv-input-data-row">
                                <dt>Amount</dt>
                                <dd>
                                  {Number(activeSubmission.input_data.amount).toLocaleString(
                                    "en-PH",
                                    { minimumFractionDigits: 2 }
                                  )}
                                </dd>
                              </div>
                            )}
                          {activeSubmission.input_data.notes != null &&
                            activeSubmission.input_data.notes !== "" && (
                              <div className="shv-input-data-row">
                                <dt>Notes</dt>
                                <dd>{activeSubmission.input_data.notes}</dd>
                              </div>
                            )}
                          {(!activeSubmission.input_data.period ||
                            activeSubmission.input_data.period === "") &&
                            (!activeSubmission.input_data.reference_no ||
                              activeSubmission.input_data.reference_no === "") &&
                            (activeSubmission.input_data.amount == null ||
                              activeSubmission.input_data.amount === "") &&
                            (!activeSubmission.input_data.notes ||
                              activeSubmission.input_data.notes === "") && (
                              <p className="shv-input-data-empty">No input fields filled.</p>
                            )}
                        </dl>
                      ) : (
                        <p className="shv-input-data-empty">No input data for this submission.</p>
                      )}
                    </div>
                  )}

                  <div className="shv-block shv-files">
                    <h3 className="shv-block-title">
                      {activeSubmission.type === "input"
                        ? "Optional attached file"
                        : "Attached files"}
                    </h3>
                    {!activeSubmission.files || activeSubmission.files.length === 0 ? (
                      <p className="shv-files-empty">
                        {activeSubmission.type === "input"
                          ? "No optional file was uploaded for this submission."
                          : "No files were uploaded for this submission."}
                      </p>
                    ) : (
                      <div className="shv-file-previews">
                        {activeSubmission.files.map((f) => {
                          const fileUrl = buildFileUrl(f);
                          const isImg = isImageFile(f);
                          const isPdf = isPdfFile(f);
                          return (
                            <div key={f.id} className="shv-file-preview-card">
                              {isImg ? (
                                <div className="shv-file-preview-thumb-wrap">
                                  <ImagePreviewWithFallback
                                    src={fileUrl}
                                    alt=""
                                    className="shv-file-preview-thumb"
                                  />
                                </div>
                              ) : isPdf ? (
                                <div className="shv-file-preview-pdf-wrap">
                                  <FaFilePdf
                                    className="shv-file-preview-pdf-icon"
                                    aria-hidden="true"
                                  />
                                  <span className="shv-file-preview-pdf-label">PDF</span>
                                </div>
                              ) : (
                                <div className="shv-file-preview-generic-wrap">
                                  <FaUpload
                                    className="shv-file-preview-generic-icon"
                                    aria-hidden="true"
                                  />
                                </div>
                              )}
                              <div className="shv-file-preview-info">
                                <span
                                  className="shv-file-preview-name"
                                  title={f.original_name}
                                >
                                  {f.original_name}
                                </span>
                                <span className="shv-file-preview-size">
                                  {formatFileSize(f.size)}
                                </span>
                                <div className="shv-file-preview-actions">
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shv-file-preview-view"
                                  >
                                    <FaExternalLinkAlt aria-hidden="true" />
                                    View file
                                  </a>
                                  <button
                                    type="button"
                                    className="shv-file-preview-download"
                                    onClick={() => handleDownloadFile(f)}
                                    disabled={downloadingId === f.id}
                                    aria-label={`Download ${f.original_name || "file"}`}
                                  >
                                    {downloadingId === f.id ? (
                                      <FaSpinner className="spinner" aria-hidden="true" />
                                    ) : (
                                      <FaDownload aria-hidden="true" />
                                    )}
                                    Download
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="shv-block shv-decision">
                    <h3 className="shv-block-title">Remarks</h3>
                    <div className="shv-decision-options">
                      <label className="shv-radio">
                        <input
                          type="radio"
                          name="decision"
                          value="approved"
                          checked={decision === "approved"}
                          onChange={() => setDecision("approved")}
                          aria-label="Approve submission"
                        />
                        <span>Approve</span>
                      </label>
                      <label className="shv-radio">
                        <input
                          type="radio"
                          name="decision"
                          value="rejected"
                          checked={decision === "rejected"}
                          onChange={() => setDecision("rejected")}
                          aria-label="Reject submission"
                        />
                        <span>Reject</span>
                      </label>
                    </div>
                    <label className="shv-feedback-label" htmlFor="shv-feedback">
                      Feedback (optional)
                    </label>
                    <textarea
                      id="shv-feedback"
                      className="shv-feedback-input"
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide brief remarks for this validation to guide the personnel."
                      aria-describedby="shv-feedback-hint"
                    />
                    <p id="shv-feedback-hint" className="shv-feedback-hint">
                      Max 2,000 characters. The personnel will receive an email notification of your decision (approved or rejected).
                    </p>
                    <div className="shv-actions">
                      <button
                        type="button"
                        className="shv-primary-btn"
                        onClick={handleValidate}
                        disabled={submitting}
                        aria-busy={submitting}
                      >
                        {submitting ? (
                          <>
                            <FaSpinner className="spinner" aria-hidden="true" />
                            <span>Saving…</span>
                          </>
                        ) : decision === "approved" ? (
                          <>
                            <FaCheckCircle aria-hidden="true" />
                            <span>Approve submission</span>
                          </>
                        ) : (
                          <>
                            <FaExclamationTriangle aria-hidden="true" />
                            <span>Reject with feedback</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="shv-detail-placeholder">
                <div className="shv-placeholder-icon-wrap">
                  <FaClipboardCheck className="shv-placeholder-icon" aria-hidden="true" />
                </div>
                <p className="shv-detail-placeholder-text">
                  Select a submission from the list on the left to view details and record your
                  remarks.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
