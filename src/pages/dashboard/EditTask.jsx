import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link, useBlocker } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { FaSave, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { FREQUENCY_OPTIONS } from "./TaskList";
import "./CreateTask.css";
import { parseDayOfMonth, parseMonths, buildMonthlyRule, buildMonthPairRule, buildYearlyRule, computeNextDueDateYmd, formatDateLabel, monthNumToName } from "../../utils/dueDateUtils";

function formEquals(a, b) {
  if (!a || !b) return false;
  return (
    (a.name || "").trim() === (b.name || "").trim() &&
    (a.submission_date_rule || "").trim() === (b.submission_date_rule || "").trim() &&
    a.frequency === b.frequency &&
    (a.mov_description || "").trim() === (b.mov_description || "").trim() &&
    a.action === b.action
  );
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: monthNumToName(i + 1),
}));

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    submission_date_rule: "",
    frequency: "monthly",
    mov_description: "",
    action: "upload",
  });
  const [initialForm, setInitialForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [schedule, setSchedule] = useState({
    monthlyDay: 6,
    twiceYearMonthA: 6,
    twiceYearMonthB: 12,
    yearlyMonth: 12,
  });

  const isFormDirty = useMemo(
    () => (initialForm ? !formEquals(form, initialForm) : false),
    [form, initialForm]
  );
  const allowNavigationRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (allowNavigationRef.current) return false;
      return isFormDirty && currentLocation.pathname !== nextLocation.pathname;
    }
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest(`/admin/tasks/${id}`, { auth: true })
      .then((res) => {
        if (!cancelled && res.task) {
          const t = res.task;
          const freq = t.frequency || "monthly";
          const rule = t.submission_date_rule || "";
          const months = parseMonths(rule);
          const day = parseDayOfMonth(rule);
          const baseForm = {
            name: t.name || "",
            submission_date_rule: rule,
            frequency: freq,
            mov_description: t.mov_description || "",
            action: t.action || "upload",
          };
          setForm(baseForm);
          setInitialForm(baseForm);
          setSchedule({
            monthlyDay: day || 6,
            twiceYearMonthA: months[0] || 6,
            twiceYearMonthB: months[1] || months[0] || 12,
            yearlyMonth: months[0] || 12,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showToast.error(err?.message || "Failed to load task.");
          navigate("/central-admin/tasks");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Keep submission_date_rule in sync with structured schedule controls
  useEffect(() => {
    let rule = "";
    switch (form.frequency) {
      case "monthly":
        rule = buildMonthlyRule(schedule.monthlyDay);
        break;
      case "twice_a_year":
      case "once_or_twice_a_year":
        rule = buildMonthPairRule(schedule.twiceYearMonthA, schedule.twiceYearMonthB);
        break;
      case "yearly":
        rule = buildYearlyRule(schedule.yearlyMonth);
        break;
      case "end_of_sy":
        rule = null;
        break;
      default:
        rule = form.submission_date_rule || null;
    }
    setForm((prev) => ({
      ...prev,
      submission_date_rule: rule || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.frequency, schedule.monthlyDay, schedule.twiceYearMonthA, schedule.twiceYearMonthB, schedule.yearlyMonth]);

  const nextDue = useMemo(
    () =>
      computeNextDueDateYmd({
        frequency: form.frequency,
        submission_date_rule: form.submission_date_rule,
      }),
    [form.frequency, form.submission_date_rule]
  );
  const nextDueLabel = formatDateLabel(nextDue);

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = "Task name is required.";
    if (!form.frequency) next.frequency = "Frequency is required.";
    if (!form.action) next.action = "Action is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/tasks/${id}`, {
        method: "PUT",
        auth: true,
        body: {
          name: form.name.trim(),
          submission_date_rule: form.submission_date_rule.trim() || null,
          frequency: form.frequency,
          mov_description: form.mov_description.trim() || null,
          action: form.action,
        },
      });
      showToast.success("Task updated successfully.");
      allowNavigationRef.current = true;
      navigate("/central-admin/tasks");
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to update task.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isFormDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!showLeaveConfirm && blocker.state !== "blocked") return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showLeaveConfirm) setShowLeaveConfirm(false);
        else if (blocker.state === "blocked") blocker.reset();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLeaveConfirm, blocker.state, blocker]);

  const handleBackClick = (e) => {
    if (isFormDirty) {
      e.preventDefault();
      setShowLeaveConfirm(true);
    }
  };

  const handleLeaveConfirm = () => {
    setShowLeaveConfirm(false);
    allowNavigationRef.current = true;
    navigate("/central-admin/tasks");
  };

  const handleStayFromBlocker = () => {
    if (blocker.state === "blocked") blocker.reset();
  };

  const handleLeaveFromBlocker = () => {
    if (blocker.state === "blocked") blocker.proceed();
  };

  if (loading) {
    return (
      <div className="create-task-page page-transition-enter">
        <div className="create-task-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading task…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="create-task-page page-transition-enter">
      <header className="create-task-header">
        <div className="create-task-header-inner">
          <Link to="/central-admin/tasks" className="create-task-back-btn" aria-label="Back to task list">
            <FaArrowLeft aria-hidden="true" />
            Back to task list
          </Link>
        </div>
      </header>

      <div className="create-task-card">
        <div className="create-task-card-header">
          <span className="create-task-card-icon" aria-hidden="true">
            <FaSave />
          </span>
          <div>
            <h1 className="create-task-card-title">Edit task</h1>
            <p className="create-task-card-subtitle">
              Update the task details. Changes will apply to future assignments.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-task-form">
          <div className="create-task-form-group">
            <label htmlFor="edit-task-name" className="create-task-label">
              Task name <span className="create-task-required">*</span>
            </label>
            <input
              id="edit-task-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Monthly Report"
              className={`create-task-input ${errors.name ? "create-task-input-error" : ""}`}
              disabled={submitting}
              maxLength={255}
              autoFocus
            />
            {errors.name && <p className="create-task-error">{errors.name}</p>}
          </div>

          <div className="create-task-form-group">
            <label htmlFor="edit-task-frequency" className="create-task-label">
              Frequency <span className="create-task-required">*</span>
            </label>
            <select
              id="edit-task-frequency"
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
              className={`create-task-select ${errors.frequency ? "create-task-input-error" : ""}`}
              disabled={submitting}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.frequency && <p className="create-task-error">{errors.frequency}</p>}
          </div>

          <div className="create-task-form-group">
            <label className="create-task-label">
              Due date schedule
            </label>

            {form.frequency === "monthly" && (
              <div className="create-task-schedule-row">
                <label htmlFor="edit-task-monthly-day" className="create-task-schedule-label">
                  Day of month
                </label>
                <input
                  id="edit-task-monthly-day"
                  type="number"
                  min={1}
                  max={31}
                  value={schedule.monthlyDay}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                    setSchedule((prev) => ({ ...prev, monthlyDay: v }));
                  }}
                  className="create-task-input create-task-schedule-input-small"
                  disabled={submitting}
                />
              </div>
            )}

            {(form.frequency === "twice_a_year" || form.frequency === "once_or_twice_a_year") && (
              <div className="create-task-schedule-row create-task-schedule-row-inline">
                <div className="create-task-schedule-col">
                  <label htmlFor="edit-task-month-a" className="create-task-schedule-label">
                    First month
                  </label>
                  <select
                    id="edit-task-month-a"
                    value={schedule.twiceYearMonthA}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        twiceYearMonthA: Number(e.target.value) || 6,
                      }))
                    }
                    className="create-task-select"
                    disabled={submitting}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="create-task-schedule-col">
                  <label htmlFor="edit-task-month-b" className="create-task-schedule-label">
                    Second month
                  </label>
                  <select
                    id="edit-task-month-b"
                    value={schedule.twiceYearMonthB}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        twiceYearMonthB: Number(e.target.value) || 12,
                      }))
                    }
                    className="create-task-select"
                    disabled={submitting}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {form.frequency === "yearly" && (
              <div className="create-task-schedule-row">
                <label htmlFor="edit-task-yearly-month" className="create-task-schedule-label">
                  Month
                </label>
                <select
                  id="edit-task-yearly-month"
                  value={schedule.yearlyMonth}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      yearlyMonth: Number(e.target.value) || 12,
                    }))
                  }
                  className="create-task-select"
                  disabled={submitting}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.frequency === "end_of_sy" && (
              <p className="create-task-hint">
                End of school year is fixed to March 31 (DepEd PH).
              </p>
            )}

            {(form.frequency === "every_two_months" || form.frequency === "quarterly") && (
              <p className="create-task-hint">
                Due dates are computed automatically based on the selected frequency.
              </p>
            )}

            <p className="create-task-next-due">
              <span className="create-task-next-due-label">Next due date (preview):</span> {nextDueLabel}
            </p>
          </div>

          <div className="create-task-form-group">
            <label htmlFor="edit-task-mov-description" className="create-task-label">
              Means of Verification (MOV) <span className="create-task-optional">(optional)</span>
            </label>
            <textarea
              id="edit-task-mov-description"
              name="mov_description"
              value={form.mov_description}
              onChange={handleChange}
              placeholder="e.g. Scanned copy or screenshot"
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
                <span className="create-task-radio-desc">User uploads file(s) as MOV</span>
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
                <span className="create-task-radio-desc">User enters data (e.g. Regular Payroll)</span>
              </label>
            </div>
            {errors.action && <p className="create-task-error">{errors.action}</p>}
          </div>

          <div className="create-task-form-footer">
            <Link
              to="/central-admin/tasks"
              className="create-task-btn-cancel"
              disabled={submitting}
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
      {/* Unsaved changes confirmation modal – from Back button */}
      {showLeaveConfirm &&
        createPortal(
          <div
            className="personnel-dir-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="edit-task-unsaved-title"
            aria-describedby="edit-task-unsaved-desc"
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
                    <h2 id="edit-task-unsaved-title" className="personnel-dir-modal-title">
                      Unsaved changes
                    </h2>
                    <p id="edit-task-unsaved-desc" className="personnel-dir-modal-subtitle">
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

      {/* Unsaved changes confirmation modal – navigation via sidebar / route change (useBlocker) */}
      {blocker.state === "blocked" &&
        createPortal(
          <div
            className="personnel-dir-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="edit-task-unsaved-title-blocked"
            aria-describedby="edit-task-unsaved-desc-blocked"
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
                    <h2 id="edit-task-unsaved-title-blocked" className="personnel-dir-modal-title">
                      Unsaved changes
                    </h2>
                    <p id="edit-task-unsaved-desc-blocked" className="personnel-dir-modal-subtitle">
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
