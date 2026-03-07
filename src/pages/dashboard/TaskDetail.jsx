import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { apiRequest, apiRequestFormData, getAuthToken } from "../../services/apiClient";
import {
  FaArrowLeft,
  FaClipboardList,
  FaCalendarAlt,
  FaUpload,
  FaKeyboard,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFilePdf,
  FaExternalLinkAlt,
  FaDownload,
} from "react-icons/fa";
import { showToast } from "../../services/notificationService";
import "./TaskDetail.css";

const API_BASE = (import.meta.env.VITE_LARAVEL_API || "").replace(/\/$/, "");

/**
 * URL for stored files. Uses /api/storage/{path} so the request goes through the same
 * origin (and Vite proxy) as other API calls – fixes "opens dashboard" and broken image previews.
 */
function buildFileUrl(file) {
  if (!file?.path) return "#";
  const base = API_BASE || "/api";
  return `${base}/storage/${file.path}`;
}

function formatDate(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return ymd;
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
  return map[freq] || freq.replace(/_/g, " ");
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
  return (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp)$/i.test(name)
  );
}

function isPdfFile(file) {
  if (!file) return false;
  const mime = (file.mime_type || "").toLowerCase();
  const name = (file.original_name || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

function statusLabel(status, dueDate) {
  if (status === "completed") return "Completed";
  if (status === "submitted") return "Submitted for validation";
  if (status === "pending" && dueDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) return "Overdue";
  }
  return "Pending";
}

/** Renders image; on load error shows a placeholder so we don't show broken icon. */
function ImagePreviewWithFallback({ src, alt, className }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={`task-detail-upload-preview-thumb-placeholder ${className || ""}`}>
        <FaUpload className="task-detail-upload-preview-placeholder-icon" aria-hidden="true" />
        <span className="task-detail-upload-preview-placeholder-text">Preview unavailable</span>
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

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userTask, setUserTask] = useState(null);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const optionalMovInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiRequest(`/user-tasks/${id}`, { auth: true })
      .then((res) => {
        if (!cancelled) setUserTask(res.user_task);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load task");
          setUserTask(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const task = userTask?.task;
  const isUpload = task?.action === "upload";
  const isInput = task?.action === "input";

  useEffect(() => {
    if (!userTask || (!isUpload && !isInput)) {
      setSubmissions([]);
      setSubmissionsLoading(false);
      return;
    }
    let cancelled = false;
    setSubmissionsLoading(true);
    apiRequest(`/user-tasks/${id}/submissions`, { auth: true })
      .then((res) => {
        if (!cancelled) setSubmissions(res?.submissions || []);
      })
      .catch(() => {
        if (!cancelled) setSubmissions([]);
      })
      .finally(() => {
        if (!cancelled) setSubmissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, userTask, isUpload, isInput]);

  const inputSubmission = submissions?.find((s) => s.type === "input") || null;
  const uploadSubmission = submissions?.find((s) => s.type === "upload") || null;
  const savedInputData = inputSubmission?.input_data || null;

  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadNotesError, setUploadNotesError] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (uploadSubmission?.notes !== undefined && uploadSubmission?.notes !== null) {
      setUploadNotes(uploadSubmission.notes);
    } else if (isUpload && submissions.length === 0 && !submissionsLoading) {
      setUploadNotes("");
    }
  }, [uploadSubmission?.notes, isUpload, submissions.length, submissionsLoading]);

  const [inputForm, setInputForm] = useState({
    period: "",
    reference_no: "",
    amount: "",
    notes: "",
  });
  const [inputFormErrors, setInputFormErrors] = useState({});

  useEffect(() => {
    if (savedInputData) {
      setInputForm({
        period: savedInputData.period ?? "",
        reference_no: savedInputData.reference_no ?? "",
        amount: savedInputData.amount != null ? formatAmountDisplay(String(savedInputData.amount)) : "",
        notes: savedInputData.notes ?? "",
      });
    } else if (isInput && submissions.length === 0 && !submissionsLoading) {
      setInputForm({ period: "", reference_no: "", amount: "", notes: "" });
    }
  }, [savedInputData, isInput, submissions.length, submissionsLoading]);

  const isCompleted = userTask?.status === "completed";
  const isSubmitted = userTask?.status === "submitted";

  const stripCommas = (v) => String(v || "").replace(/,/g, "");

  /** Format amount for display: add thousand separators, preserve decimal (e.g. 1234567.89 → 1,234,567.89). */
  const formatAmountDisplay = (raw) => {
    const cleaned = stripCommas(raw).trim();
    if (!cleaned) return "";
    const hasDot = cleaned.includes(".");
    const parts = cleaned.split(".");
    const intStr = (parts[0] || "").replace(/\D/g, "") || "0";
    const decStr = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
    const intNum = parseInt(intStr, 10);
    if (Number.isNaN(intNum) && intStr !== "" && intStr !== "0") return raw;
    const numForFormat = intStr === "" ? 0 : (Number.isNaN(intNum) ? 0 : intNum);
    const intFormatted = Number(numForFormat).toLocaleString("en-US");
    return hasDot ? `${intFormatted}.${decStr}` : intFormatted;
  };

  /** Normalize to "D.00" for API; "" if empty; null if invalid. */
  const normalizeAmountToTwoDecimals = (raw) => {
    const cleaned = stripCommas(raw).trim();
    if (!cleaned) return "";
    // Allow: digits, digits., digits.5, digits.50
    const m = cleaned.match(/^(\d*)(\.?)(\d{0,2})$/);
    if (!m) return null;
    const [, intStr, dot, decStr] = m;
    if (!intStr && !decStr) return null;
    const n = parseFloat(`${intStr || "0"}.${decStr || "0"}`);
    if (!Number.isFinite(n) || n < 0) return null;
    return n.toFixed(2);
  };

  /** Client-side validation for input form (corporate-style: required fields before submit). */
  const validateInputForm = () => {
    const period = (inputForm.period || "").trim();
    const reference_no = (inputForm.reference_no || "").trim();
    const amountNormalized = normalizeAmountToTwoDecimals(inputForm.amount);
    const notes = (inputForm.notes || "").trim();
    const errors = {};
    if (!period) errors.period = "Period is required (e.g. month or reporting period).";
    if (!reference_no) errors.reference_no = "Reference no. is required.";
    if (amountNormalized === "") errors.amount = "Amount is required (e.g. 1,234.00).";
    else if (amountNormalized === null) errors.amount = "Enter a valid amount (0 or greater).";
    if ((inputForm.notes || "").length > 2000) errors.notes = "Notes must be 2,000 characters or less.";
    return { valid: Object.keys(errors).length === 0, errors };
  };
  const isOverdue =
    userTask?.status === "pending" &&
    userTask?.due_date &&
    userTask.due_date < new Date().toISOString().slice(0, 10);

  const handleUploadClick = () => {
    if (uploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleOptionalMovClick = () => {
    if (uploading) return;
    if (optionalMovInputRef.current) optionalMovInputRef.current.click();
  };

  const handleDownloadFile = async (file) => {
    if (!file?.id) return;
    const base = API_BASE || "/api";
    const endpoint = `${base}/submission-files/${file.id}/download`;
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

  const handleOptionalMovChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast.error("File must be 10MB or less.");
      e.target.value = "";
      return;
    }
    const type = file.type || "";
    const name = file.name || "";
    const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
    const isImage = /^image\/(jpeg|jpg|png)$/i.test(type) || /\.(jpe?g|png)$/i.test(name);
    if (!isPdf && !isImage) {
      showToast.error("Allowed file types: PDF, JPG, JPEG, PNG.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files[]", file);
      await apiRequestFormData(`/user-tasks/${id}/submissions/upload`, {
        method: "POST",
        formData: fd,
        auth: true,
      });
      showToast.success("Optional MOV file uploaded successfully.");
      const res = await apiRequest(`/user-tasks/${id}/submissions`, { auth: true });
      setSubmissions(res?.submissions || []);
    } catch (err) {
      const msg = err?.data?.message || err?.data?.errors
        ? Object.values(err.data.errors || {}).flat().join(" ")
        : err?.message || "Failed to upload file.";
      showToast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10 MB
    for (const file of files) {
      if (file.size > maxSize) {
        showToast.error("Each file must be 10MB or less.");
        e.target.value = "";
        return;
      }
      const type = file.type || "";
      const name = file.name || "";
      const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
      const isImage = /^image\/(jpeg|jpg|png)$/i.test(type) || /\.(jpe?g|png)$/i.test(name);
      if (!isPdf && !isImage) {
        showToast.error("Allowed file types: PDF, JPG, JPEG, PNG.");
        e.target.value = "";
        return;
      }
    }

    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append("files[]", file));
      await apiRequestFormData(`/user-tasks/${id}/submissions/upload`, {
        method: "POST",
        formData: fd,
        auth: true,
      });
      showToast.success("File(s) uploaded successfully.");

      // Refresh submissions list
      try {
        setSubmissionsLoading(true);
        const res = await apiRequest(`/user-tasks/${id}/submissions`, { auth: true });
        setSubmissions(res?.submissions || []);
      } catch {
        // keep existing submissions if refresh fails
      } finally {
        setSubmissionsLoading(false);
      }
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to upload file(s).";
      showToast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmitForValidation = async () => {
    if (submitting || uploading) return;
    if (isUpload) {
      const hasFiles =
        submissions && submissions.some((s) => Array.isArray(s.files) && s.files.length > 0);
      if (!hasFiles) {
        showToast.error("Upload at least one MOV file before submitting this task for validation.");
        return;
      }
    } else if (isInput) {
      const { valid, errors } = validateInputForm();
      if (!valid) {
        setInputFormErrors(errors);
        showToast.error("Please correct the errors below before submitting for validation.");
        return;
      }
      setInputFormErrors({});
    } else {
      return;
    }

    setSubmitting(true);
    try {
      if (isUpload) {
        const notesToSave = (uploadNotes || "").trim();
        if (notesToSave.length > 2000) {
          setUploadNotesError("Notes must be 2,000 characters or less.");
          setSubmitting(false);
          return;
        }
        const savedNotes = (uploadSubmission?.notes ?? "").trim();
        if (notesToSave !== savedNotes) {
          const saveRes = await apiRequest(`/user-tasks/${id}/submission/notes`, {
            method: "PUT",
            auth: true,
            body: { notes: notesToSave || null },
          });
          if (saveRes?.submission) {
            setSubmissions((prev) => {
              const rest = prev.filter((s) => s.type !== "upload");
              return [...rest, saveRes.submission];
            });
          }
        }
      }
      if (isInput) {
        const period = (inputForm.period || "").trim();
        const reference_no = (inputForm.reference_no || "").trim();
        const amountNormalized = normalizeAmountToTwoDecimals(inputForm.amount);
        const notes = (inputForm.notes || "").trim();
        const amount = amountNormalized ? Number(amountNormalized) : null;
        const saveRes = await apiRequest(`/user-tasks/${id}/submissions/input`, {
          method: "POST",
          auth: true,
          body: { period: period || null, reference_no: reference_no || null, amount, notes: notes || null },
        });
        if (saveRes?.submission) {
          setSubmissions((prev) => {
            const rest = prev.filter((s) => s.type !== "input");
            return [...rest, saveRes.submission];
          });
        }
        if (amountNormalized) {
          setInputForm((f) => ({ ...f, amount: formatAmountDisplay(amountNormalized) }));
        }
      }
      if (!isCompleted) {
        const res = await apiRequest(`/user-tasks/${id}/submit`, {
          method: "POST",
          auth: true,
        });
        if (res?.user_task) {
          setUserTask(res.user_task);
        }
      }
      showToast.success(
        isSubmitted || isCompleted
          ? "Changes saved successfully."
          : "Task submitted for validation."
      );
    } catch (err) {
      const errors = err?.data?.errors || {};
      const msg = err?.data?.message || err?.message || "Failed to submit task for validation.";
      if (isInput && Object.keys(errors).length > 0) {
        setInputFormErrors(
          Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
        );
      }
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasUnsavedUploadNotes =
    isUpload &&
    String(uploadNotes || "").trim() !== String(uploadSubmission?.notes ?? "").trim();

  // Determine if the input form differs from the last saved data.
  const isInputFormDirty = (() => {
    if (!isInput) return false;
    const period = (inputForm.period || "").trim();
    const referenceNo = (inputForm.reference_no || "").trim();
    const notes = (inputForm.notes || "").trim();
    const amountNormalized = normalizeAmountToTwoDecimals(inputForm.amount);

    if (!savedInputData) {
      // No saved data yet — treat any non-empty field as unsaved progress.
      return Boolean(period || referenceNo || notes || amountNormalized);
    }

    const savedPeriod = (savedInputData.period || "").trim();
    const savedRef = (savedInputData.reference_no || "").trim();
    const savedNotes = (savedInputData.notes || "").trim();
    const savedAmount =
      savedInputData.amount != null
        ? normalizeAmountToTwoDecimals(String(savedInputData.amount))
        : "";

    return (
      period !== savedPeriod ||
      referenceNo !== savedRef ||
      notes !== savedNotes ||
      (amountNormalized || "") !== (savedAmount || "")
    );
  })();

  const hasUnsavedProgress =
    (isUpload && hasUnsavedUploadNotes) ||
    (isInput && isInputFormDirty);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedProgress && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!hasUnsavedProgress) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedProgress]);

  const handleBack = () => {
    // Always trigger navigation and let the router blocker decide
    // whether to show the "Progress will be lost" modal.
    navigate(-1);
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    if (blocker.state === "blocked") blocker.proceed();
    else navigate(-1);
  };

  const handleStayLeaveModal = () => {
    setShowLeaveConfirm(false);
    if (blocker.state === "blocked") blocker.reset();
  };

  if (loading) {
    return (
      <div className="task-detail-page page-transition-enter">
        <div className="task-detail-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading task…</span>
        </div>
      </div>
    );
  }

  if (error || !userTask) {
    return (
      <div className="task-detail-page page-transition-enter">
        <div className="task-detail-error">
          <FaExclamationTriangle className="task-detail-error-icon" aria-hidden="true" />
          <p className="task-detail-error-text">{error || "Task not found."}</p>
          <button type="button" className="task-detail-back-btn" onClick={handleBack}>
            <FaArrowLeft aria-hidden="true" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const status = statusLabel(userTask.status, userTask.due_date);

  return (
    <>
    <div className="task-detail-page page-transition-enter">
      <header className="task-detail-header">
        <div className="task-detail-header-inner">
          <button
            type="button"
            className="task-detail-back-btn"
            onClick={handleBack}
            aria-label="Go back"
          >
            <FaArrowLeft aria-hidden="true" />
            Back
          </button>
        </div>
      </header>

      <div className="task-detail-card">
        <div className="task-detail-card-header">
          <div className="task-detail-title-row">
            <span className="task-detail-icon" aria-hidden="true">
              <FaClipboardList />
            </span>
            <div>
              <h1 className="task-detail-title">{task?.name ?? "Task"}</h1>
              <span
                className={`task-detail-status-badge ${
                  isOverdue ? "task-detail-status-overdue" : ""
                } ${isCompleted ? "task-detail-status-completed" : ""}`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="task-detail-body">
          <dl className="task-detail-dl">
            <div className="task-detail-dl-row">
              <dt>Due date</dt>
              <dd>
                <FaCalendarAlt className="task-detail-dl-icon" aria-hidden="true" />
                {formatDate(userTask.due_date)}
              </dd>
            </div>
            <div className="task-detail-dl-row">
              <dt>Frequency</dt>
              <dd>{frequencyLabel(task?.frequency)}</dd>
            </div>
            {task?.submission_date_rule && (
              <div className="task-detail-dl-row">
                <dt>Submission rule</dt>
                <dd>{task.submission_date_rule}</dd>
              </div>
            )}
            <div className="task-detail-dl-row">
              <dt>Action required</dt>
              <dd>
                {isUpload ? (
                  <span className="task-detail-action-tag task-detail-action-upload">
                    <FaUpload aria-hidden="true" />
                    Upload
                  </span>
                ) : (
                  <span className="task-detail-action-tag task-detail-action-input">
                    <FaKeyboard aria-hidden="true" />
                    Input
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {task?.mov_description && (
            <div className="task-detail-mov">
              <h3 className="task-detail-mov-title">Means of Verification (MOV)</h3>
              <p className="task-detail-mov-text">{task.mov_description}</p>
            </div>
          )}

          {isInput && (
            <div className="task-detail-input">
              <h3 className="task-detail-input-title">Input data</h3>
              <p className="task-detail-input-hint">
                Complete the form below. When ready, click <strong>Submit for validation</strong> to save your data and send this task to the School Head for approval.
              </p>
              {submissionsLoading ? (
                <div className="task-detail-input-loading">
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Loading saved data…</span>
                </div>
              ) : (
                <div className="task-detail-input-form">
                  {Object.keys(inputFormErrors).length > 0 && (
                    <div className="task-detail-input-validation-summary" role="alert">
                      <FaExclamationTriangle className="task-detail-input-validation-summary-icon" aria-hidden="true" />
                      <div>
                        <p className="task-detail-input-validation-summary-title">Please correct the following before submitting for validation:</p>
                        <ul className="task-detail-input-validation-summary-list">
                          {Object.entries(inputFormErrors).map(([key, message]) => (
                            <li key={key}>{message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="task-detail-input-row">
                    <div className="task-detail-input-group">
                      <label htmlFor="task-input-period" className="task-detail-input-label">
                        Period (e.g. month covered)
                      </label>
                      <input
                        id="task-input-period"
                        type="text"
                        className={`task-detail-input-field ${inputFormErrors.period ? "task-detail-input-field-error" : ""}`}
                        placeholder="e.g. January 2026"
                        value={inputForm.period}
                        onChange={(e) => {
                          setInputForm((f) => ({ ...f, period: e.target.value }));
                          if (inputFormErrors.period) setInputFormErrors((prev) => { const next = { ...prev }; delete next.period; return next; });
                        }}
                        disabled={false}
                        aria-invalid={Boolean(inputFormErrors.period)}
                        aria-describedby={inputFormErrors.period ? "task-input-period-err" : undefined}
                      />
                      {inputFormErrors.period && (
                        <span id="task-input-period-err" className="task-detail-input-error" role="alert">
                          {inputFormErrors.period}
                        </span>
                      )}
                    </div>
                    <div className="task-detail-input-group">
                      <label htmlFor="task-input-reference" className="task-detail-input-label">
                        Reference no. (e.g. Form 7 reference)
                      </label>
                      <input
                        id="task-input-reference"
                        type="text"
                        className={`task-detail-input-field ${inputFormErrors.reference_no ? "task-detail-input-field-error" : ""}`}
                        placeholder="e.g. Form 7 ref."
                        value={inputForm.reference_no}
                        onChange={(e) => {
                          setInputForm((f) => ({ ...f, reference_no: e.target.value }));
                          if (inputFormErrors.reference_no) setInputFormErrors((prev) => { const next = { ...prev }; delete next.reference_no; return next; });
                        }}
                        disabled={false}
                        aria-invalid={Boolean(inputFormErrors.reference_no)}
                        aria-describedby={inputFormErrors.reference_no ? "task-input-reference-err" : undefined}
                      />
                      {inputFormErrors.reference_no && (
                        <span id="task-input-reference-err" className="task-detail-input-error" role="alert">
                          {inputFormErrors.reference_no}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-detail-input-group">
                    <label htmlFor="task-input-amount" className="task-detail-input-label">
                      Amount
                    </label>
                    <input
                      id="task-input-amount"
                      type="text"
                      inputMode="decimal"
                      className={`task-detail-input-field task-detail-input-amount ${inputFormErrors.amount ? "task-detail-input-field-error" : ""}`}
                      placeholder="e.g. 1,234.00"
                      value={inputForm.amount}
                      onChange={(e) => {
                        const nextRaw = stripCommas(e.target.value);
                        // Allow digits + optional decimal + up to 2 decimals while typing.
                        if (nextRaw === "" || /^\d*(\.\d{0,2})?$/.test(nextRaw)) {
                          setInputForm((f) => ({ ...f, amount: formatAmountDisplay(nextRaw) }));
                          if (inputFormErrors.amount) {
                            setInputFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.amount;
                              return next;
                            });
                          }
                        }
                      }}
                      onBlur={() => {
                        const normalized = normalizeAmountToTwoDecimals(inputForm.amount);
                        if (normalized && normalized !== null) {
                          setInputForm((f) => ({ ...f, amount: formatAmountDisplay(normalized) }));
                        }
                      }}
                      disabled={false}
                      aria-invalid={Boolean(inputFormErrors.amount)}
                      aria-describedby={inputFormErrors.amount ? "task-input-amount-err" : undefined}
                    />
                    {inputFormErrors.amount && (
                      <span id="task-input-amount-err" className="task-detail-input-error" role="alert">
                        {inputFormErrors.amount}
                      </span>
                    )}
                  </div>
                  <div className="task-detail-input-group">
                    <label htmlFor="task-input-notes" className="task-detail-input-label">
                      Notes (optional)
                    </label>
                    <textarea
                      id="task-input-notes"
                      className={`task-detail-input-field task-detail-input-textarea ${inputFormErrors.notes ? "task-detail-input-field-error" : ""}`}
                      placeholder="Additional notes"
                      rows={3}
                      value={inputForm.notes}
                      onChange={(e) => {
                        setInputForm((f) => ({ ...f, notes: e.target.value }));
                        if (inputFormErrors.notes) setInputFormErrors((prev) => { const next = { ...prev }; delete next.notes; return next; });
                      }}
                      disabled={false}
                      aria-invalid={Boolean(inputFormErrors.notes)}
                      aria-describedby={inputFormErrors.notes ? "task-input-notes-err" : undefined}
                    />
                    {inputFormErrors.notes && (
                      <span id="task-input-notes-err" className="task-detail-input-error" role="alert">
                        {inputFormErrors.notes}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isInput && !submissionsLoading && (
                <div className="task-detail-input-optional-mov">
                  <h4 className="task-detail-input-optional-mov-title">Optional MOV</h4>
                  <p className="task-detail-input-optional-mov-hint">
                    You may attach one file (e.g. scanned copy of Form 7). PDF or image, max 10MB.
                  </p>
                  <input
                    ref={optionalMovInputRef}
                    type="file"
                    className="task-detail-upload-input"
                    style={{ display: "none" }}
                    accept=".pdf,image/jpeg,image/jpg,image/png"
                    onChange={handleOptionalMovChange}
                  />
                  <div className="task-detail-input-optional-mov-actions">
                    <button
                      type="button"
                      className="task-detail-secondary-btn"
                      onClick={handleOptionalMovClick}
                      disabled={uploading || submitting}
                      aria-busy={uploading}
                    >
                      {uploading ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <FaUpload aria-hidden="true" />
                          <span>{(inputSubmission?.files?.length || 0) > 0 ? "Replace file" : "Upload file"}</span>
                        </>
                      )}
                    </button>
                  </div>
                  {(inputSubmission?.files?.length || 0) > 0 && (
                    <div className="task-detail-upload-previews task-detail-input-optional-previews">
                      {inputSubmission.files.map((f) => {
                        const fileUrl = buildFileUrl(f);
                        const isImg = isImageFile(f);
                        const isPdf = isPdfFile(f);
                        return (
                          <div key={f.id} className="task-detail-upload-preview-card">
                            {isImg ? (
                              <div className="task-detail-upload-preview-thumb-wrap">
                                <ImagePreviewWithFallback src={fileUrl} alt="" className="task-detail-upload-preview-thumb" />
                              </div>
                            ) : isPdf ? (
                              <div className="task-detail-upload-preview-pdf-wrap">
                                <FaFilePdf className="task-detail-upload-preview-pdf-icon" aria-hidden="true" />
                                <span className="task-detail-upload-preview-pdf-label">PDF</span>
                              </div>
                            ) : (
                              <div className="task-detail-upload-preview-generic-wrap">
                                <FaUpload className="task-detail-upload-preview-generic-icon" aria-hidden="true" />
                              </div>
                            )}
                            <div className="task-detail-upload-preview-info">
                              <span className="task-detail-upload-preview-name" title={f.original_name}>
                                {f.original_name}
                              </span>
                              <span className="task-detail-upload-preview-size">{formatFileSize(f.size)}</span>
                              <div className="task-detail-upload-preview-actions">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="task-detail-upload-preview-open"
                                >
                                  <FaExternalLinkAlt aria-hidden="true" />
                                  View file
                                </a>
                                <button
                                  type="button"
                                  className="task-detail-upload-preview-download"
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
              )}

              {isInput && !submissionsLoading && (
                <div className="task-detail-upload-submit-section task-detail-input-submit-section">
                  <p className="task-detail-upload-submit-hint">
                    When the form is complete, click the button below to save your data and submit this task to the School Head for validation.
                  </p>
                  <button
                    type="button"
                    className="task-detail-primary-btn task-detail-submit-btn"
                    onClick={handleSubmitForValidation}
                    disabled={submitting || uploading || submissionsLoading}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Submitting…</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle aria-hidden="true" />
                        <span>Submit for validation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {isUpload && (
            <>
              <div className="task-detail-upload-notes">
                <h3 className="task-detail-input-title">Notes <span className="task-detail-optional-label">(optional)</span></h3>
                {submissionsLoading ? (
                  <div className="task-detail-input-loading">
                    <FaSpinner className="spinner" aria-hidden="true" />
                    <span>Loading…</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="task-detail-upload-notes"
                      className={`task-detail-input-field task-detail-input-textarea ${uploadNotesError ? "task-detail-input-field-error" : ""}`}
                      placeholder="Additional notes for this submission"
                      rows={4}
                      maxLength={2000}
                      value={uploadNotes}
                      onChange={(e) => {
                        setUploadNotes(e.target.value);
                        if (uploadNotesError) setUploadNotesError("");
                      }}
                      disabled={false}
                      aria-invalid={Boolean(uploadNotesError)}
                      aria-describedby={uploadNotesError ? "task-detail-upload-notes-err" : undefined}
                    />
                    <div className="task-detail-upload-notes-meta">
                      <span className="task-detail-upload-notes-count" aria-live="polite">{uploadNotes.length}/2000</span>
                    </div>
                    {uploadNotesError && (
                      <span id="task-detail-upload-notes-err" className="task-detail-input-error" role="alert">
                        {uploadNotesError}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="task-detail-upload">
                <h3 className="task-detail-upload-title">Uploaded files</h3>
                <p className="task-detail-upload-hint">
                  Attach supporting documents in PDF or image format. Maximum 10MB per file.
                </p>
              <div className="task-detail-upload-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="task-detail-upload-input"
                  style={{ display: "none" }}
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                />
                <button
                  type="button"
                  className="task-detail-primary-btn"
                  onClick={handleUploadClick}
                  disabled={uploading || submitting}
                  aria-busy={uploading}
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="spinner" aria-hidden="true" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <FaUpload aria-hidden="true" />
                      <span>Upload file(s)</span>
                    </>
                  )}
                </button>
              </div>

              {submissionsLoading ? (
                <div className="task-detail-upload-loading">
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Loading uploaded files…</span>
                </div>
              ) : submissions.length === 0 ? (
                <p className="task-detail-upload-empty">No files uploaded yet.</p>
              ) : (
                <div className="task-detail-upload-previews">
                  {submissions.flatMap((s) =>
                    (s.files || []).map((f) => {
                      const fileUrl = buildFileUrl(f);
                      const isImg = isImageFile(f);
                      const isPdf = isPdfFile(f);
                      return (
                        <div key={f.id} className="task-detail-upload-preview-card">
                          {isImg ? (
                            <div className="task-detail-upload-preview-thumb-wrap">
                              <ImagePreviewWithFallback src={fileUrl} alt="" className="task-detail-upload-preview-thumb" />
                            </div>
                          ) : isPdf ? (
                            <div className="task-detail-upload-preview-pdf-wrap">
                              <FaFilePdf className="task-detail-upload-preview-pdf-icon" aria-hidden="true" />
                              <span className="task-detail-upload-preview-pdf-label">PDF</span>
                            </div>
                          ) : (
                            <div className="task-detail-upload-preview-generic-wrap">
                              <FaUpload className="task-detail-upload-preview-generic-icon" aria-hidden="true" />
                            </div>
                          )}
                          <div className="task-detail-upload-preview-info">
                            <span className="task-detail-upload-preview-name" title={f.original_name}>
                              {f.original_name}
                            </span>
                            <span className="task-detail-upload-preview-size">{formatFileSize(f.size)}</span>
                            <div className="task-detail-upload-preview-actions">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="task-detail-upload-preview-open"
                              >
                                <FaExternalLinkAlt aria-hidden="true" />
                                View file
                              </a>
                              <button
                                type="button"
                                className="task-detail-upload-preview-download"
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
                    })
                  )}
                </div>
              )}

              {isUpload && !isCompleted && submissions?.some((s) => Array.isArray(s.files) && s.files.length > 0) && (
                <div className="task-detail-upload-submit-section">
                  <p className="task-detail-upload-submit-hint">
                    When all required MOV files are uploaded, submit this task for validation by the School Head.
                  </p>
                  <button
                    type="button"
                    className="task-detail-primary-btn task-detail-submit-btn"
                    onClick={handleSubmitForValidation}
                    disabled={submitting || uploading || submissionsLoading}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Submitting…</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle aria-hidden="true" />
                        <span>Submit for validation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
          )}

          {isCompleted && (
            <div className="task-detail-completed-msg">
              <FaCheckCircle className="task-detail-completed-icon" aria-hidden="true" />
              <span>This task has been submitted or completed.</span>
            </div>
          )}
        </div>
      </div>
    </div>
    {(showLeaveConfirm || blocker.state === "blocked") &&
      createPortal(
        <div
          className="task-detail-leave-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="task-detail-leave-title"
          aria-describedby="task-detail-leave-desc"
        >
          <div
            className="task-detail-leave-backdrop modal-backdrop-animation"
            onClick={handleStayLeaveModal}
            onKeyDown={(e) => e.key === "Enter" && handleStayLeaveModal()}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="task-detail-leave-wrap">
            <div className="task-detail-leave-modal modal-content-animation">
              <header className="task-detail-leave-header">
                <h2 id="task-detail-leave-title" className="task-detail-leave-title">
                  Progress will be lost
                </h2>
              </header>
              <div className="task-detail-leave-body">
                <p id="task-detail-leave-desc" className="task-detail-leave-text">
                  You have unsaved progress. Leaving this page will discard your uploads and notes. Submit for validation first to save your work.
                </p>
                <p className="task-detail-leave-text-secondary">Do you want to leave?</p>
              </div>
              <footer className="task-detail-leave-footer">
                <button
                  type="button"
                  className="task-detail-leave-btn-cancel"
                  onClick={handleStayLeaveModal}
                >
                  Stay
                </button>
                <button
                  type="button"
                  className="task-detail-leave-btn-leave"
                  onClick={handleConfirmLeave}
                >
                  Leave
                </button>
              </footer>
            </div>
          </div>
        </div>,
        document.body
      )}
  </>
  );
}
