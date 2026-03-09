import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { FaUserPlus, FaArrowLeft, FaSpinner, FaUsers, FaSearch } from "react-icons/fa";
import "./AssignTask.css";
import { FREQUENCY_OPTIONS } from "./TaskList";
import { computeNextDueDateYmd, formatDateLabel } from "../../utils/dueDateUtils";

function frequencyLabel(value) {
  if (!value) return "—";
  const match = FREQUENCY_OPTIONS.find((o) => o.value === value);
  return match?.label ?? value.replace(/_/g, " ");
}

export default function AssignTask() {
  const { id: taskIdParam } = useParams();
  const navigate = useNavigate();
  const taskId = taskIdParam ? parseInt(taskIdParam, 10) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [suggestedDates, setSuggestedDates] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(taskId || "");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [assignMode, setAssignMode] = useState("single"); // "single" | "recurring"
  const [recurringCount, setRecurringCount] = useState(12);
  const [dueDateMode, setDueDateMode] = useState("suggested"); // "suggested" | "custom"
  const [customDueDate, setCustomDueDate] = useState("");
  const [selectedSuggestedDate, setSelectedSuggestedDate] = useState("");
  const [errors, setErrors] = useState({});

  const activeAOs = personnel.filter((p) => p.role === "administrative_officer" && p.status === "active");

  const filteredAOs = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return activeAOs;
    return activeAOs.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const empId = (u.employee_id || "").toLowerCase();
      const position = (u.position || "").toLowerCase();
      const division = (u.division || "").toLowerCase();
      const school = (u.school_name || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        position.includes(q) ||
        division.includes(q) ||
        school.includes(q)
      );
    });
  }, [activeAOs, userSearch]);

  const selectedTask = useMemo(
    () => tasks.find((t) => String(t.id) === String(selectedTaskId)),
    [tasks, selectedTaskId]
  );

  const selectedTaskNextDueLabel = useMemo(() => {
    if (!selectedTask) return "—";
    const ymd = computeNextDueDateYmd({
      frequency: selectedTask.frequency,
      submission_date_rule: selectedTask.submission_date_rule,
    });
    return formatDateLabel(ymd);
  }, [selectedTask]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/tasks", { auth: true });
      setTasks(res.tasks || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load tasks.");
      setTasks([]);
    }
  }, []);

  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/personnel?status=active", { auth: true });
      setPersonnel(res.personnel || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load personnel.");
      setPersonnel([]);
    }
  }, []);

  const fetchSuggestedDates = useCallback(async (tid) => {
    if (!tid) return;
    try {
      const res = await apiRequest(`/admin/tasks/${tid}/suggested-due-dates?count=12`, { auth: true });
      const dates = res.due_dates || [];
      setSuggestedDates(dates);
      if (dates.length > 0) setSelectedSuggestedDate(dates[0]);
    } catch {
      setSuggestedDates([]);
      setSelectedSuggestedDate("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchTasks(), fetchPersonnel()])
      .then(() => {
        if (!cancelled && taskIdParam) {
          setSelectedTaskId(taskIdParam);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchTasks, fetchPersonnel, taskIdParam]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchSuggestedDates(selectedTaskId);
    } else {
      setSuggestedDates([]);
      setSelectedSuggestedDate("");
    }
  }, [selectedTaskId, fetchSuggestedDates]);

  const resolvedDueDate = () => {
    if (dueDateMode === "custom" && customDueDate) return customDueDate;
    if (dueDateMode === "suggested" && selectedSuggestedDate) return selectedSuggestedDate;
    return null;
  };

  const validate = () => {
    const next = {};
    if (!selectedTaskId) next.task = "Please select a task.";
    if (selectedUserIds.length === 0) next.users = "Please select at least one user.";
    const due = resolvedDueDate();
    if (!due) next.dueDate = "Please select or enter a due date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (assignMode === "single") {
        const due = resolvedDueDate();
        const assignments = selectedUserIds.map((uid) => ({ user_id: uid, due_date: due }));
        await apiRequest(`/admin/tasks/${selectedTaskId}/assign`, {
          method: "POST",
          auth: true,
          body: { assignments },
        });
        showToast.success("Task assigned successfully.");
      } else {
        let totalCreated = 0;
        for (const uid of selectedUserIds) {
          const res = await apiRequest(`/admin/tasks/${selectedTaskId}/assign-recurring`, {
            method: "POST",
            auth: true,
            body: { user_id: uid, count: recurringCount },
          });
          totalCreated += (res?.assignments?.length ?? 0);
        }
        showToast.success(`${totalCreated} recurring assignment(s) created.`);
      }
      navigate("/central-admin/tasks");
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to assign task.";
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAssignCommon = async () => {
    if (activeAOs.length === 0) {
      showToast.error("There are no active personnel to assign tasks to.");
      return;
    }
    setBulkSubmitting(true);
    try {
      const body = selectedUserIds.length > 0 ? { user_ids: selectedUserIds } : {};
      const res = await apiRequest("/admin/tasks/bulk-assign-common", {
        method: "POST",
        auth: true,
        body,
      });
      const createdCount = res?.created_count ?? 0;
      const userCount = res?.user_count ?? (selectedUserIds.length || activeAOs.length);
      if (createdCount === 0) {
        showToast.info(
          userCount > 0
            ? "No new assignments were created. All selected personnel already have upcoming task dates from the standard task list."
            : "No new assignments were created."
        );
      } else {
        showToast.success(
          "Standard tasks have been scheduled. Timelines for the selected personnel now include upcoming due dates for all tasks in the central Task list."
        );
        navigate("/central-admin/tasks");
      }
    } catch (err) {
      showToast.error(err?.message || "Failed to bulk assign.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleUser = (uid) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
    if (errors.users) setErrors((e) => ({ ...e, users: null }));
  };

  const selectAllUsers = () => {
    if (selectedUserIds.length === activeAOs.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(activeAOs.map((u) => u.id));
    }
    if (errors.users) setErrors((e) => ({ ...e, users: null }));
  };

  return (
    <div className="assign-task-page page-transition-enter">
      <header className="assign-task-header">
        <div className="assign-task-header-inner">
          <Link to="/central-admin/tasks" className="assign-task-back-btn" aria-label="Back to task list">
            <FaArrowLeft aria-hidden="true" />
            Back to task list
          </Link>
        </div>
      </header>

      <div className="assign-task-card">
        <div className="assign-task-card-header">
          <span className="assign-task-card-icon" aria-hidden="true">
            <FaUserPlus />
          </span>
          <div>
            <h1 className="assign-task-card-title">Assign task</h1>
            <p className="assign-task-card-subtitle">
              Select a task, choose Administrative Officers, and set a due date. Assignees will receive an email notification when a task is assigned to them.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="assign-task-loading">
            <FaSpinner className="spinner" aria-hidden="true" />
            <span>Loading…</span>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="assign-task-form">
          <div className="assign-task-form-group">
            <label htmlFor="assign-task-select" className="assign-task-label">
              Task <span className="assign-task-required">*</span>
            </label>
            <select
              id="assign-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className={`assign-task-select ${errors.task ? "assign-task-input-error" : ""}`}
              disabled={!!taskIdParam}
            >
              <option value="">— Select task —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.task && <p className="assign-task-error">{errors.task}</p>}
            {selectedTask && (
              <div key={selectedTaskId} className="assign-task-task-meta assign-task-fade-panel">
                <p className="assign-task-task-meta-title">Task details</p>
                <p className="assign-task-task-meta-row">
                  <span className="assign-task-task-meta-label">Frequency:</span>
                  <span className="assign-task-task-meta-value">
                    {frequencyLabel(selectedTask.frequency)}
                  </span>
                </p>
                <p className="assign-task-task-meta-row">
                  <span className="assign-task-task-meta-label">Schedule:</span>
                  <span className="assign-task-task-meta-value">
                    {selectedTask.submission_date_rule || "Based on frequency"}
                  </span>
                </p>
                <p className="assign-task-task-meta-row">
                  <span className="assign-task-task-meta-label">Action:</span>
                  <span className="assign-task-task-meta-value">
                    {selectedTask.action === "upload" ? "Upload (file/document)" : "Input (data entry)"}
                  </span>
                </p>
                <p className="assign-task-task-meta-row">
                  <span className="assign-task-task-meta-label">Next due date (preview):</span>
                  <span className="assign-task-task-meta-value">{selectedTaskNextDueLabel}</span>
                </p>
              </div>
            )}
          </div>

          <div className="assign-task-form-group">
            <label className="assign-task-label">
              Assign to <span className="assign-task-required">*</span>
            </label>
            <div className="assign-task-users-select">
              <div className="assign-task-users-header">
                <button
                  type="button"
                  className="assign-task-select-all"
                  onClick={selectAllUsers}
                >
                  {selectedUserIds.length === activeAOs.length ? "Deselect all" : "Select all"} ({activeAOs.length} active personnel)
                </button>
                <div className="assign-task-users-search">
                  <div className="assign-task-users-search-input-wrap">
                    <span className="assign-task-users-search-icon">
                      <FaSearch aria-hidden="true" />
                    </span>
                    <input
                      id="assign-task-users-search"
                      type="text"
                      className="assign-task-users-search-input"
                      placeholder="Search personnel by name, email, ID, position, division, or school"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      aria-label="Search personnel"
                    />
                    {userSearch && (
                      <button
                        type="button"
                        className="assign-task-users-search-clear"
                        onClick={() => setUserSearch("")}
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="assign-task-users-list">
                {activeAOs.length === 0 ? (
                  <p className="assign-task-no-users">No active personnel.</p>
                ) : filteredAOs.length === 0 ? (
                  <div className="assign-task-empty-search">
                    <p className="assign-task-empty-search-icon" aria-hidden="true">
                      <FaUsers />
                    </p>
                    <p className="assign-task-empty-search-title">No personnel found</p>
                    <p className="assign-task-empty-search-text">
                      No active personnel match your search. Try different keywords or clear the search to view all available personnel.
                    </p>
                  </div>
                ) : (
                  filteredAOs.map((u) => (
                    <label key={u.id} className="assign-task-user-check">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                      />
                      <span className="assign-task-user-name">{u.name}</span>
                      {u.email && (
                        <span className="assign-task-user-email">{u.email}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
            {errors.users && <p className="assign-task-error">{errors.users}</p>}
          </div>

          <div className="assign-task-form-group">
            <label className="assign-task-label">
              Assignment mode <span className="assign-task-required">*</span>
            </label>
            <div className="assign-task-assign-mode">
              <label className="assign-task-radio-wrap">
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === "single"}
                  onChange={() => setAssignMode("single")}
                />
                <span>Single due date</span>
              </label>
              <label className="assign-task-radio-wrap">
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === "recurring"}
                  onChange={() => setAssignMode("recurring")}
                />
                <span>Recurring (next N due dates)</span>
              </label>
            </div>
          </div>

          <div key={assignMode} className="assign-task-fade-panel">
            {assignMode === "single" && (
              <div className="assign-task-form-group">
                <label className="assign-task-label">
                  Due date <span className="assign-task-required">*</span>
                </label>
                <div className="assign-task-due-mode">
                  <label className="assign-task-radio-wrap">
                    <input
                      type="radio"
                      name="dueMode"
                      checked={dueDateMode === "suggested"}
                      onChange={() => setDueDateMode("suggested")}
                    />
                    <span>Use suggested date</span>
                  </label>
                  <label className="assign-task-radio-wrap">
                    <input
                      type="radio"
                      name="dueMode"
                      checked={dueDateMode === "custom"}
                      onChange={() => setDueDateMode("custom")}
                    />
                    <span>Custom date</span>
                  </label>
                </div>
                <div key={dueDateMode} className="assign-task-fade-panel">
                  {dueDateMode === "suggested" && suggestedDates.length > 0 && (
                    <select
                      value={selectedSuggestedDate}
                      onChange={(e) => setSelectedSuggestedDate(e.target.value)}
                      className="assign-task-select"
                      disabled={submitting}
                    >
                      {suggestedDates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                  {dueDateMode === "custom" && (
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="assign-task-input"
                      disabled={submitting}
                    />
                  )}
                  {dueDateMode === "suggested" && suggestedDates.length === 0 && selectedTaskId && (
                    <p className="assign-task-hint">No suggested dates available. Use custom date.</p>
                  )}
                </div>
                {errors.dueDate && <p className="assign-task-error">{errors.dueDate}</p>}
              </div>
            )}

            {assignMode === "recurring" && (
              <div className="assign-task-form-group">
                <label htmlFor="assign-recurring-count" className="assign-task-label">
                  Number of due dates <span className="assign-task-required">*</span>
                </label>
                <input
                  id="assign-recurring-count"
                  type="number"
                  min={1}
                  max={24}
                  value={recurringCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setRecurringCount(Math.min(24, Math.max(1, v)));
                  }}
                  className={`assign-task-input assign-task-input-narrow ${errors.recurringCount ? "assign-task-input-error" : ""}`}
                  disabled={submitting}
                />
                <p className="assign-task-hint">Creates the next 1–24 due dates per personnel based on task frequency.</p>
                {errors.recurringCount && <p className="assign-task-error">{errors.recurringCount}</p>}
              </div>
            )}
          </div>

          <div className="assign-task-form-footer">
            <Link to="/central-admin/tasks" className="assign-task-btn-cancel" disabled={submitting}>
              Cancel
            </Link>
            <button
              type="submit"
              className="assign-task-btn-submit"
              disabled={submitting || activeAOs.length === 0}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Assigning…</span>
                </>
              ) : (
                <>
                  <FaUserPlus aria-hidden="true" />
                  <span>Assign task</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>

      <div className="assign-task-bulk-card">
        <div className="assign-task-bulk-header">
          <FaUsers className="assign-task-bulk-icon" aria-hidden="true" />
          <div>
            <h2 className="assign-task-bulk-title">Bulk assign standard tasks</h2>
            <p className="assign-task-bulk-subtitle">
              Assign all standard tasks from the Task list to active personnel. Leave personnel unselected to assign to all eligible personnel, or select personnel above to assign only to them.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="assign-task-bulk-btn"
          onClick={handleBulkAssignCommon}
          disabled={submitting || bulkSubmitting || activeAOs.length === 0}
          title={selectedUserIds.length > 0 ? "Assign to selected personnel only" : "Assign to all active personnel"}
          aria-busy={bulkSubmitting}
        >
          {bulkSubmitting ? (
            <>
              <FaSpinner className="spinner" aria-hidden="true" />
              <span>Assigning…</span>
            </>
          ) : (
            <>
              <FaUsers aria-hidden="true" />
              <span>
                {selectedUserIds.length > 0
                  ? `Assign standard tasks to ${selectedUserIds.length} selected personnel`
                  : "Assign standard tasks to all eligible personnel"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
