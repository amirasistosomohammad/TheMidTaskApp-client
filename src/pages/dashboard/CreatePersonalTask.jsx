import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link, useBlocker } from "react-router-dom";
import { FaPlus, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import "./CreateTask.css";
import "./PersonnelDirectory.css";

const INITIAL_FORM = {
  name: "",
  due_date: "",
  mov_description: "",
  action: "upload",
};

function formEquals(a, b) {
  return (
    (a.name || "").trim() === (b.name || "").trim() &&
    (a.due_date || "").trim() === (b.due_date || "").trim() &&
    (a.mov_description || "").trim() === (b.mov_description || "").trim() &&
    a.action === b.action
  );
}

export default function CreatePersonalTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveConfirmClosing, setLeaveConfirmClosing] = useState(false);
  const [blockerClosing, setBlockerClosing] = useState(false);

  const isFormDirty = useMemo(() => !formEquals(form, INITIAL_FORM), [form]);
  const allowNavigationRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (allowNavigationRef.current) return false;
      return isFormDirty && currentLocation.pathname !== nextLocation.pathname;
    }
  );

  useEffect(() => {
    if (!isFormDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  const closeLeaveConfirm = useCallback(() => {
    if (leaveConfirmClosing) return;
    setLeaveConfirmClosing(true);
    setTimeout(() => {
      setLeaveConfirmClosing(false);
      setShowLeaveConfirm(false);
    }, 200);
  }, [leaveConfirmClosing]);

  const closeBlocker = useCallback(() => {
    if (blockerClosing || blocker.state !== "blocked") return;
    setBlockerClosing(true);
    setTimeout(() => {
      setBlockerClosing(false);
      blocker.reset();
    }, 200);
  }, [blockerClosing, blocker]);

  useEffect(() => {
    if (!showLeaveConfirm && blocker.state !== "blocked") return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showLeaveConfirm) closeLeaveConfirm();
        else closeBlocker();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLeaveConfirm, blocker.state, closeLeaveConfirm, closeBlocker]);

  const handleBackClick = (e) => {
    if (isFormDirty) {
      e.preventDefault();
      setShowLeaveConfirm(true);
    }
  };

  const handleLeaveConfirm = () => {
    if (leaveConfirmClosing) return;
    setLeaveConfirmClosing(true);
    setTimeout(() => {
      setLeaveConfirmClosing(false);
      setShowLeaveConfirm(false);
      allowNavigationRef.current = true;
      navigate("/dashboard/timeline");
    }, 200);
  };

  const handleStayFromBlocker = () => closeBlocker();

  const handleLeaveFromBlocker = () => {
    if (blockerClosing || blocker.state !== "blocked") return;
    setBlockerClosing(true);
    setTimeout(() => {
      setBlockerClosing(false);
      blocker.proceed();
    }, 200);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = "Task name is required.";
    if (!form.due_date) next.due_date = "Due date is required.";
    if (!form.action) next.action = "Action is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        due_date: form.due_date,
        mov_description: form.mov_description.trim() || null,
        action: form.action,
      };

      const res = await apiRequest("/my-personal-tasks", {
        method: "POST",
        auth: true,
        body,
      });

      showToast.success("Personal task created successfully.");
      // After successful save, treat navigation as allowed and go back to Task schedule.
      allowNavigationRef.current = true;
      navigate("/dashboard/timeline");
    } catch (err) {
      const msg =
        err?.data?.errors
          ? Object.values(err.data.errors).flat().join(" ")
          : err?.message || "Failed to create personal task.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page page-transition-enter">
      <header className="create-task-header">
        <div className="create-task-header-inner">
          <Link
            to="/dashboard/timeline"
            className="create-task-back-btn"
            aria-label="Back to task schedule"
            onClick={handleBackClick}
          >
            <FaArrowLeft aria-hidden="true" />
            Back to task schedule
          </Link>
        </div>
      </header>

      <div className="create-task-card">
        <div className="create-task-card-header">
          <span className="create-task-card-icon" aria-hidden="true">
            <FaPlus />
          </span>
          <div>
            <h1 className="create-task-card-title">New personal task</h1>
            <p className="create-task-card-subtitle">
              Set up a task for your individual workplan. Personal tasks are automatically included in the appropriate monitoring and validation views.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-task-form">
          <div className="create-task-form-group">
            <label htmlFor="personal-task-name" className="create-task-label">
              Task name <span className="create-task-required">*</span>
            </label>
            <input
              id="personal-task-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Prepare division report"
              className={`create-task-input ${errors.name ? "create-task-input-error" : ""}`}
              disabled={submitting}
              maxLength={255}
              autoFocus
            />
            {errors.name && <p className="create-task-error">{errors.name}</p>}
          </div>

          <div className="create-task-form-group">
            <label htmlFor="personal-task-due-date" className="create-task-label">
              Due date <span className="create-task-required">*</span>
            </label>
            <input
              id="personal-task-due-date"
              name="due_date"
              type="date"
              value={form.due_date}
              onChange={handleChange}
              className={`create-task-input ${errors.due_date ? "create-task-input-error" : ""}`}
              disabled={submitting}
            />
            {errors.due_date && <p className="create-task-error">{errors.due_date}</p>}
          </div>

          <div className="create-task-form-group">
            <label htmlFor="personal-task-mov-description" className="create-task-label">
              Notes / MOV description <span className="create-task-optional">(optional)</span>
            </label>
            <textarea
              id="personal-task-mov-description"
              name="mov_description"
              value={form.mov_description}
              onChange={handleChange}
              placeholder="Describe what you need to upload or input for this task."
              className="create-task-textarea"
              disabled={submitting}
              rows={4}
            />
          </div>

          <div className="create-task-form-group">
            <label className="create-task-label">
              Action required <span className="create-task-required">*</span>
            </label>
            <div className="create-task-radio-group">
              <label className="create-task-radio-label">
                <input
                  type="radio"
                  name="action"
                  value="upload"
                  checked={form.action === "upload"}
                  onChange={handleChange}
                  disabled={submitting}
                  className="create-task-radio"
                />
                <span className="create-task-radio-text">Upload</span>
                <span className="create-task-radio-desc">You will upload file(s) as MOV</span>
              </label>
              <label className="create-task-radio-label">
                <input
                  type="radio"
                  name="action"
                  value="input"
                  checked={form.action === "input"}
                  onChange={handleChange}
                  disabled={submitting}
                  className="create-task-radio"
                />
                <span className="create-task-radio-text">Input</span>
                <span className="create-task-radio-desc">You will enter data (values, figures, etc.)</span>
              </label>
            </div>
            {errors.action && <p className="create-task-error">{errors.action}</p>}
          </div>

          {/* Personal tasks are always visible in monitoring/validation views; explicit visibility options removed. */}

          <div className="create-task-form-footer">
            <Link
              to="/dashboard/timeline"
              className="create-task-btn-cancel"
              disabled={submitting}
              onClick={handleBackClick}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="create-task-btn-submit"
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
                  <FaPlus aria-hidden="true" />
                  <span>Create personal task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {/* Unsaved changes confirmation modal – from Cancel/Back button */}
      {showLeaveConfirm &&
        createPortal(
          <div
            className="personnel-dir-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="create-personal-task-unsaved-title"
            aria-describedby="create-personal-task-unsaved-desc"
          >
            <div
              className="personnel-dir-backdrop modal-backdrop-animation"
              onClick={() => setShowLeaveConfirm(false)}
              onKeyDown={(e) => e.key === "Enter" && setShowLeaveConfirm(false)}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="create-personal-task-unsaved-title" className="personnel-dir-modal-title">
                      Unsaved changes
                    </h2>
                    <p id="create-personal-task-unsaved-desc" className="personnel-dir-modal-subtitle">
                      Leaving this page will discard your changes.
                    </p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    Do you want to leave?
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button
                    type="button"
                    className="personnel-dir-btn-close"
                    onClick={() => setShowLeaveConfirm(false)}
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    className="personnel-dir-btn-primary create-task-unsaved-leave-btn"
                    onClick={handleLeaveConfirm}
                  >
                    Leave
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Unsaved changes confirmation modal – from sidebar / other navigation (useBlocker) */}
      {blocker.state === "blocked" &&
        createPortal(
          <div
            className="personnel-dir-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="create-personal-task-unsaved-title-blocked"
            aria-describedby="create-personal-task-unsaved-desc-blocked"
          >
            <div
              className="personnel-dir-backdrop modal-backdrop-animation"
              onClick={handleStayFromBlocker}
              onKeyDown={(e) => e.key === "Enter" && handleStayFromBlocker()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="create-personal-task-unsaved-title-blocked" className="personnel-dir-modal-title">
                      Unsaved changes
                    </h2>
                    <p id="create-personal-task-unsaved-desc-blocked" className="personnel-dir-modal-subtitle">
                      Leaving this page will discard your changes.
                    </p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    Do you want to leave?
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button
                    type="button"
                    className="personnel-dir-btn-close"
                    onClick={handleStayFromBlocker}
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    className="personnel-dir-btn-primary create-task-unsaved-leave-btn"
                    onClick={handleLeaveFromBlocker}
                  >
                    Leave
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

