import React, { useEffect, useState, useCallback } from "react";
import { FaClipboardCheck, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaExternalLinkAlt, FaKeyboard, FaUpload } from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
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

export default function SchoolHeadValidations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [decision, setDecision] = useState("approved");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/school-head/validations/pending", { auth: true });
      setSubmissions(res?.submissions || []);
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
      showToast.error("Select a decision before saving.");
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
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to save validation.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="school-head-validations page-transition-enter">
      <header className="shv-header">
        <div className="shv-header-inner">
          <div className="shv-header-text">
            <span className="shv-header-icon" aria-hidden="true">
              <FaClipboardCheck />
            </span>
            <div>
              <h1 className="shv-title">Validations</h1>
              <p className="shv-subtitle">
                Review submissions from personnel and approve or reject them with feedback.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shv-refresh-btn"
            onClick={fetchPending}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="spinner" aria-hidden="true" />
            ) : (
              <span className="shv-refresh-dot" aria-hidden="true" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="shv-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading pending submissions…</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="shv-empty">
          <FaCheckCircle className="shv-empty-icon" aria-hidden="true" />
          <p className="shv-empty-title">No submissions to validate</p>
          <p className="shv-empty-text">
            There are currently no submitted tasks awaiting your validation. New submissions will
            appear here automatically.
          </p>
        </div>
      ) : (
        <div className="shv-layout">
          <section className="shv-list">
            <h2 className="shv-section-title">Pending submissions</h2>
            <ul className="shv-items">
              {submissions.map((s) => {
                const ut = s.user_task;
                const task = ut?.task;
                const isActive = s.id === activeId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`shv-item ${isActive ? "shv-item-active" : ""}`}
                      onClick={() => handleSelect(s.id)}
                    >
                      <div className="shv-item-main">
                        <span className="shv-item-title">{task?.name ?? "Task"}</span>
                        <span className="shv-item-meta">
                          {s.type === "input" ? (
                            <span className="shv-item-type shv-item-type-input" title="Input (data entry)">
                              <FaKeyboard aria-hidden="true" /> Input
                            </span>
                          ) : (
                            <span className="shv-item-type shv-item-type-upload" title="Upload (MOV)">
                              <FaUpload aria-hidden="true" /> Upload
                            </span>
                          )}
                          {" · "}
                          {task?.frequency ? task.frequency.replace(/_/g, " ") : "—"}
                        </span>
                      </div>
                      <div className="shv-item-side">
                        <span className="shv-item-date">
                          {ut?.due_date ? formatDateTime(ut.due_date + "T00:00:00") : "No due date"}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="shv-detail">
            {activeSubmission ? (
              <div className="shv-detail-card">
                <h2 className="shv-detail-title">Submission details</h2>
                <p className="shv-detail-meta">
                  Task: <strong>{activeTask?.name ?? "Task"}</strong>
                </p>
                <p className="shv-detail-meta">
                  Due date:{" "}
                  <strong>
                    {activeSubmission.user_task?.due_date
                      ? formatDateTime(activeSubmission.user_task.due_date + "T00:00:00")
                      : "—"}
                  </strong>
                </p>
                <p className="shv-detail-meta">
                  Personnel: <strong>{activeSubmission.user_task?.user?.name ?? "—"}</strong>
                </p>
                <p className="shv-detail-meta">
                  Type:{" "}
                  <strong>
                    {activeSubmission.type === "input" ? (
                      <span className="shv-detail-type-input">
                        <FaKeyboard aria-hidden="true" /> Input (data entry)
                      </span>
                    ) : (
                      <span className="shv-detail-type-upload">
                        <FaUpload aria-hidden="true" /> Upload (MOV)
                      </span>
                    )}
                  </strong>
                </p>

                {activeSubmission.type === "input" && (
                  <div className="shv-input-data">
                    <h3 className="shv-input-data-title">Input data</h3>
                    {activeSubmission.input_data ? (
                      <dl className="shv-input-data-dl">
                        {activeSubmission.input_data.period != null && activeSubmission.input_data.period !== "" && (
                          <div className="shv-input-data-row">
                            <dt>Period</dt>
                            <dd>{activeSubmission.input_data.period}</dd>
                          </div>
                        )}
                        {activeSubmission.input_data.reference_no != null && activeSubmission.input_data.reference_no !== "" && (
                          <div className="shv-input-data-row">
                            <dt>Reference no.</dt>
                            <dd>{activeSubmission.input_data.reference_no}</dd>
                          </div>
                        )}
                        {activeSubmission.input_data.amount != null && activeSubmission.input_data.amount !== "" && (
                          <div className="shv-input-data-row">
                            <dt>Amount</dt>
                            <dd>{Number(activeSubmission.input_data.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd>
                          </div>
                        )}
                        {activeSubmission.input_data.notes != null && activeSubmission.input_data.notes !== "" && (
                          <div className="shv-input-data-row">
                            <dt>Notes</dt>
                            <dd>{activeSubmission.input_data.notes}</dd>
                          </div>
                        )}
                        {(!activeSubmission.input_data.period || activeSubmission.input_data.period === "") &&
                          (!activeSubmission.input_data.reference_no || activeSubmission.input_data.reference_no === "") &&
                          (activeSubmission.input_data.amount == null || activeSubmission.input_data.amount === "") &&
                          (!activeSubmission.input_data.notes || activeSubmission.input_data.notes === "") && (
                            <p className="shv-input-data-empty">No input fields filled.</p>
                          )}
                      </dl>
                    ) : (
                      <p className="shv-input-data-empty">No input data for this submission.</p>
                    )}
                  </div>
                )}

                <div className="shv-files">
                  <h3 className="shv-files-title">
                    {activeSubmission.type === "input" ? "Optional attached file" : "Attached files"}
                  </h3>
                  {(!activeSubmission.files || activeSubmission.files.length === 0) ? (
                    <p className="shv-files-empty">
                      {activeSubmission.type === "input"
                        ? "No optional file was uploaded for this submission."
                        : "No files were uploaded for this submission."}
                    </p>
                  ) : (
                    <ul className="shv-files-list">
                      {activeSubmission.files.map((f) => (
                        <li key={f.id} className="shv-files-item">
                          <a
                            href={buildFileUrl(f)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shv-files-link"
                          >
                            <FaExternalLinkAlt className="shv-files-link-icon" aria-hidden="true" />
                            {f.original_name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shv-decision">
                  <h3 className="shv-decision-title">Decision</h3>
                  <div className="shv-decision-options">
                    <label className="shv-radio">
                      <input
                        type="radio"
                        name="decision"
                        checked={decision === "approved"}
                        onChange={() => setDecision("approved")}
                      />
                      <span>Approve</span>
                    </label>
                    <label className="shv-radio">
                      <input
                        type="radio"
                        name="decision"
                        checked={decision === "rejected"}
                        onChange={() => setDecision("rejected")}
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
                  />
                  <div className="shv-actions">
                    <button
                      type="button"
                      className="shv-primary-btn"
                      onClick={handleValidate}
                      disabled={submitting}
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
            ) : (
              <div className="shv-detail-placeholder">
                <p className="shv-detail-placeholder-text">
                  Select a submission from the list on the left to view details and record your
                  decision.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

