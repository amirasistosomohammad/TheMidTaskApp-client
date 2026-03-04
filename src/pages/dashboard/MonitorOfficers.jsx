import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import {
  FaDesktop,
  FaSync,
  FaSpinner,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUpload,
  FaKeyboard,
  FaChevronDown,
  FaChevronRight,
  FaUsers,
} from "react-icons/fa";
import "./MonitorOfficers.css";

function formatDate(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
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

export default function MonitorOfficers() {
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = schoolFilter
        ? `/admin/monitor-officers?school=${encodeURIComponent(schoolFilter)}`
        : "/admin/monitor-officers";
      const res = await apiRequest(url, { auth: true });
      setOfficers(res.officers || []);
      setSchools(res.schools || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load officer data.");
      setOfficers([]);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [schoolFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="monitor-officers-page page-transition-enter">
      <header className="monitor-officers-header">
        <div className="monitor-officers-header-inner">
          <div className="monitor-officers-header-text">
            <span className="monitor-officers-title-icon" aria-hidden="true">
              <FaDesktop />
            </span>
            <div>
              <h1 className="monitor-officers-title">Monitor officers</h1>
              <p className="monitor-officers-subtitle">
                View task progress and activity across all Administrative Officers. Filter by school.
              </p>
            </div>
          </div>
          <div className="monitor-officers-header-actions">
            <label className="monitor-officers-filter-label">
              <span className="monitor-officers-filter-text">School:</span>
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="monitor-officers-filter-select"
                disabled={loading}
                aria-label="Filter by school"
              >
                <option value="">All schools</option>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="monitor-officers-refresh-btn"
              onClick={fetchData}
              disabled={loading}
              aria-label="Refresh"
              title="Refresh"
            >
              {loading ? (
                <FaSpinner className="spinner" aria-hidden="true" />
              ) : (
                <FaSync aria-hidden="true" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="monitor-officers-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading officer data…</span>
        </div>
      ) : officers.length === 0 ? (
        <div className="monitor-officers-empty">
          <FaUsers className="monitor-officers-empty-icon" aria-hidden="true" />
          <p className="monitor-officers-empty-title">No officers</p>
          <p className="monitor-officers-empty-desc">
            {schoolFilter
              ? `No active Administrative Officers found for ${schoolFilter}.`
              : "No active Administrative Officers. Approve registrations to see officers here."}
          </p>
        </div>
      ) : (
        <>
          <div className="monitor-officers-summary">
            <div className="monitor-officers-summary-kpi">
              <FaClock className="monitor-officers-summary-icon" aria-hidden="true" />
              <span className="monitor-officers-summary-value">
                {officers.reduce((s, o) => s + o.pending_count, 0)}
              </span>
              <span className="monitor-officers-summary-label">Pending</span>
            </div>
            <div className="monitor-officers-summary-kpi">
              <FaExclamationTriangle className="monitor-officers-summary-icon" aria-hidden="true" />
              <span className="monitor-officers-summary-value">
                {officers.reduce((s, o) => s + o.missing_count, 0)}
              </span>
              <span className="monitor-officers-summary-label">Missing (overdue)</span>
            </div>
            <div className="monitor-officers-summary-kpi">
              <FaCheckCircle className="monitor-officers-summary-icon" aria-hidden="true" />
              <span className="monitor-officers-summary-value">
                {officers.reduce((s, o) => s + o.completed_count, 0)}
              </span>
              <span className="monitor-officers-summary-label">Completed</span>
            </div>
            <div className="monitor-officers-summary-kpi">
              <FaUsers className="monitor-officers-summary-icon" aria-hidden="true" />
              <span className="monitor-officers-summary-value">{officers.length}</span>
              <span className="monitor-officers-summary-label">Officers</span>
            </div>
          </div>
          <div className="monitor-officers-list">
          {officers.map((officer) => (
            <OfficerCard
              key={officer.id}
              officer={officer}
              expanded={expanded.has(officer.id)}
              onToggle={() => toggleExpand(officer.id)}
              formatDate={formatDate}
              frequencyLabel={frequencyLabel}
            />
          ))}
          </div>
        </>
      )}
    </div>
  );
}

function OfficerCard({ officer, expanded, onToggle, formatDate, frequencyLabel }) {
  const { pending, missing, completed } = officer;
  const hasTasks = pending.length + missing.length + completed.length > 0;

  return (
    <article className="monitor-officers-card">
      <button
        type="button"
        className="monitor-officers-card-header"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`monitor-officer-${officer.id}-tasks`}
      >
        <span className="monitor-officers-card-chevron" aria-hidden="true">
          {expanded ? <FaChevronDown /> : <FaChevronRight />}
        </span>
        <div className="monitor-officers-card-info">
          <h2 className="monitor-officers-card-name">{officer.name}</h2>
          <div className="monitor-officers-card-meta">
            {officer.email && <span className="monitor-officers-card-email">{officer.email}</span>}
            {officer.school_name && (
              <span className="monitor-officers-card-school">{officer.school_name}</span>
            )}
            {officer.position && (
              <span className="monitor-officers-card-position">{officer.position}</span>
            )}
          </div>
        </div>
        <div className="monitor-officers-card-kpis">
          <span className="monitor-officers-kpi monitor-officers-kpi-pending" title="Pending">
            <FaClock aria-hidden="true" />
            {officer.pending_count}
          </span>
          <span className="monitor-officers-kpi monitor-officers-kpi-missing" title="Missing (overdue)">
            <FaExclamationTriangle aria-hidden="true" />
            {officer.missing_count}
          </span>
          <span className="monitor-officers-kpi monitor-officers-kpi-completed" title="Completed">
            <FaCheckCircle aria-hidden="true" />
            {officer.completed_count}
          </span>
        </div>
      </button>

      {expanded && (
        <div
          id={`monitor-officer-${officer.id}-tasks`}
          className="monitor-officers-card-body"
          role="region"
          aria-label={`Tasks for ${officer.name}`}
        >
          {!hasTasks ? (
            <p className="monitor-officers-no-tasks">No tasks assigned.</p>
          ) : (
            <>
              {pending.length > 0 && (
                <section className="monitor-officers-section" aria-labelledby={`monitor-${officer.id}-pending`}>
                  <h3 id={`monitor-${officer.id}-pending`} className="monitor-officers-section-title">
                    <FaClock className="monitor-officers-section-icon" aria-hidden="true" />
                    Pending ({pending.length})
                  </h3>
                  <div className="monitor-officers-task-list">
                    {pending.map((ut) => (
                      <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} />
                    ))}
                  </div>
                </section>
              )}
              {missing.length > 0 && (
                <section className="monitor-officers-section" aria-labelledby={`monitor-${officer.id}-missing`}>
                  <h3 id={`monitor-${officer.id}-missing`} className="monitor-officers-section-title monitor-officers-section-missing">
                    <FaExclamationTriangle className="monitor-officers-section-icon" aria-hidden="true" />
                    Missing (overdue) ({missing.length})
                  </h3>
                  <div className="monitor-officers-task-list">
                    {missing.map((ut) => (
                      <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} isOverdue />
                    ))}
                  </div>
                </section>
              )}
              {completed.length > 0 && (
                <section className="monitor-officers-section" aria-labelledby={`monitor-${officer.id}-completed`}>
                  <h3 id={`monitor-${officer.id}-completed`} className="monitor-officers-section-title monitor-officers-section-completed">
                    <FaCheckCircle className="monitor-officers-section-icon" aria-hidden="true" />
                    Completed ({completed.length})
                  </h3>
                  <div className="monitor-officers-task-list">
                    {completed.map((ut) => (
                      <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} isCompleted />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function TaskItem({ userTask, formatDate, frequencyLabel, isOverdue, isCompleted }) {
  const task = userTask?.task;
  const isUpload = task?.action === "upload";

  return (
    <div
      className={`monitor-officers-task-item ${isOverdue ? "monitor-officers-task-overdue" : ""} ${isCompleted ? "monitor-officers-task-completed" : ""}`}
    >
      <div className="monitor-officers-task-header">
        <span className="monitor-officers-task-title">{task?.name ?? "Task"}</span>
        <span className="monitor-officers-task-due">{formatDate(userTask?.due_date)}</span>
      </div>
      <div className="monitor-officers-task-meta">
        <span className="monitor-officers-task-frequency">{frequencyLabel(task?.frequency)}</span>
        <span className="monitor-officers-task-action">
          {isUpload ? (
            <>
              <FaUpload className="monitor-officers-task-action-icon" aria-hidden="true" />
              Upload
            </>
          ) : (
            <>
              <FaKeyboard className="monitor-officers-task-action-icon" aria-hidden="true" />
              Input
            </>
          )}
        </span>
      </div>
      {task?.mov_description && (
        <p className="monitor-officers-task-mov">
          <span className="monitor-officers-task-mov-label">MOV:</span> {task.mov_description}
        </p>
      )}
    </div>
  );
}
