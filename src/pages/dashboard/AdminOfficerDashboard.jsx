import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
import {
  FaTachometerAlt,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUpload,
  FaKeyboard,
  FaSync,
  FaSpinner,
  FaBell,
} from "react-icons/fa";
import "./AdminOfficerDashboard.css";

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

export default function AdminOfficerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ pending: [], missing: [], submitted: [], completed: [] });
   const [reminders, setReminders] = useState([]);
   const [remindersLoading, setRemindersLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (user?.role !== "administrative_officer" || user?.status !== "active") {
      setLoading(false);
      setReminders([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("/dashboard", { auth: true });
      setData({
        pending: res.pending || [],
        missing: res.missing || [],
        submitted: res.submitted || [],
        completed: res.completed || [],
      });
    } catch {
      setData({ pending: [], missing: [], submitted: [], completed: [] });
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.status]);

  const fetchReminders = useCallback(async () => {
    if (user?.role !== "administrative_officer" || user?.status !== "active") {
      setReminders([]);
      return;
    }
    setRemindersLoading(true);
    try {
      const res = await apiRequest("/reminders?status=unread&limit=10", { auth: true });
      setReminders(res?.reminders || []);
    } catch {
      setReminders([]);
    } finally {
      setRemindersLoading(false);
    }
  }, [user?.role, user?.status]);

  useEffect(() => {
    fetchDashboard();
    fetchReminders();
  }, [fetchDashboard, fetchReminders]);

  const handleRefreshAll = () => {
    fetchDashboard();
    fetchReminders();
  };

  const handleReminderRead = async (reminderId) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    try {
      await apiRequest(`/reminders/${reminderId}/read`, { method: "POST", auth: true });
    } catch {
      // best-effort; we don't re-add on failure to avoid flicker, dashboard reload will correct it
    }
  };

  const isActive = user?.status === "active";
  const showDashboard = isActive && user?.role === "administrative_officer";

  return (
    <div className="ao-dashboard-page page-transition-enter">
      <PersonnelAccountStatus />

      {showDashboard && (
        <>
          <header className="ao-dashboard-header">
            <div className="ao-dashboard-header-inner">
              <div className="ao-dashboard-header-text">
                <span className="ao-dashboard-title-icon" aria-hidden="true">
                  <FaTachometerAlt />
                </span>
                <div>
                  <h1 className="ao-dashboard-title">Dashboard</h1>
                  <p className="ao-dashboard-subtitle">
                    Welcome, <strong>{user?.name ?? "User"}</strong>. Your task overview, pending items, and timeline summary.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="ao-dashboard-refresh-btn"
                onClick={handleRefreshAll}
                disabled={loading}
                aria-label="Refresh dashboard"
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
          </header>

          {loading ? (
            <div className="ao-dashboard-loading">
              <FaSpinner className="spinner" aria-hidden="true" />
              <span>Loading dashboard…</span>
            </div>
          ) : (
            <>
              <section
                className="ao-dashboard-reminders"
                aria-label="Upcoming reminders and due-soon tasks"
              >
                <header className="ao-dashboard-reminders-header">
                  <div className="ao-dashboard-reminders-title-wrap">
                    <span className="ao-dashboard-reminders-icon" aria-hidden="true">
                      <FaBell />
                    </span>
                    <div>
                      <h2 className="ao-dashboard-reminders-title">Due soon</h2>
                      <p className="ao-dashboard-reminders-subtitle">
                        Tasks with approaching due dates. Reminders are created automatically based on your task timeline.
                      </p>
                    </div>
                  </div>
                  {remindersLoading && (
                    <span className="ao-dashboard-reminders-loading">
                      <FaSpinner className="spinner" aria-hidden="true" />
                      <span>Checking reminders…</span>
                    </span>
                  )}
                </header>
                {reminders.length === 0 ? (
                  <p className="ao-dashboard-reminders-empty">
                    You have no upcoming reminders at the moment.
                  </p>
                ) : (
                  <ul className="ao-dashboard-reminders-list">
                    {reminders.map((r) => {
                      const userTask = r.user_task || {};
                      const task = r.task || {};
                      const dueLabel = userTask.due_date ? formatDate(userTask.due_date) : "—";
                      let badge;
                      if (r.days_before_due === 0) {
                        badge = "Due today";
                      } else if (r.days_before_due === 1) {
                        badge = "Due in 1 day";
                      } else if (typeof r.days_before_due === "number") {
                        badge = `Due in ${r.days_before_due} days`;
                      } else {
                        badge = "Upcoming";
                      }
                      return (
                        <li key={r.id} className="ao-dashboard-reminder-item">
                          <div className="ao-dashboard-reminder-main">
                            <p className="ao-dashboard-reminder-task">
                              <span className="ao-dashboard-reminder-task-name">
                                {task.name || "Task"}
                              </span>
                              <span className="ao-dashboard-reminder-badge">{badge}</span>
                            </p>
                            <p className="ao-dashboard-reminder-meta">
                              <span className="ao-dashboard-reminder-label">Due date:</span>{" "}
                              {dueLabel}
                            </p>
                          </div>
                          {userTask.id && (
                            <div className="ao-dashboard-reminder-actions">
                              <Link
                                to={`/dashboard/my-tasks/${userTask.id}`}
                                className="ao-dashboard-reminder-link"
                                onClick={() => handleReminderRead(r.id)}
                              >
                                View task
                              </Link>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <div className="ao-dashboard-kpi-grid">
                <article className="ao-dashboard-kpi-card ao-dashboard-kpi-pending" aria-label={`Pending tasks: ${data.pending.length}`}>
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaClock className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Pending</p>
                    <p className="ao-dashboard-kpi-value">{data.pending.length}</p>
                    <p className="ao-dashboard-kpi-hint">Due on or after today</p>
                  </div>
                </article>
                <article className="ao-dashboard-kpi-card ao-dashboard-kpi-submitted" aria-label={`Submitted tasks: ${data.submitted.length}`}>
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaCheckCircle className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Submitted for validation</p>
                    <p className="ao-dashboard-kpi-value">{data.submitted.length}</p>
                    <p className="ao-dashboard-kpi-hint">Awaiting School Head review</p>
                  </div>
                </article>
                <article
                  className="ao-dashboard-kpi-card ao-dashboard-kpi-missing"
                  aria-label={`Missing (overdue): ${data.missing.length}`}
                >
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaExclamationTriangle className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Missing (overdue)</p>
                    <p className="ao-dashboard-kpi-value">{data.missing.length}</p>
                    <p className="ao-dashboard-kpi-hint">Past due date</p>
                  </div>
                </article>
                <article
                  className="ao-dashboard-kpi-card ao-dashboard-kpi-completed"
                  aria-label={`Completed: ${data.completed.length}`}
                >
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaCheckCircle className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Completed</p>
                    <p className="ao-dashboard-kpi-value">{data.completed.length}</p>
                    <p className="ao-dashboard-kpi-hint">Submitted or done</p>
                  </div>
                </article>
              </div>

              <div className="ao-dashboard-sections">
                <section className="ao-dashboard-section" aria-labelledby="ao-dashboard-pending-heading">
                  <h2 id="ao-dashboard-pending-heading" className="ao-dashboard-section-title">
                    <FaClock className="ao-dashboard-section-icon" aria-hidden="true" />
                    Pending
                  </h2>
                  {data.pending.length === 0 ? (
                    <p className="ao-dashboard-empty">No pending tasks.</p>
                  ) : (
                    <div className="ao-dashboard-task-list">
                      {data.pending.map((ut) => (
                        <TaskCard key={ut.id} userTask={ut} />
                      ))}
                    </div>
                  )}
                </section>

                <section className="ao-dashboard-section" aria-labelledby="ao-dashboard-missing-heading">
                  <h2 id="ao-dashboard-missing-heading" className="ao-dashboard-section-title ao-dashboard-section-missing">
                    <FaExclamationTriangle className="ao-dashboard-section-icon" aria-hidden="true" />
                    Missing (overdue)
                  </h2>
                  {data.missing.length === 0 ? (
                    <p className="ao-dashboard-empty">No overdue tasks.</p>
                  ) : (
                    <div className="ao-dashboard-task-list">
                      {data.missing.map((ut) => (
                        <TaskCard key={ut.id} userTask={ut} isOverdue />
                      ))}
                    </div>
                  )}
                </section>

                <section className="ao-dashboard-section" aria-labelledby="ao-dashboard-submitted-heading">
                  <h2 id="ao-dashboard-submitted-heading" className="ao-dashboard-section-title">
                    <FaCheckCircle className="ao-dashboard-section-icon" aria-hidden="true" />
                    Submitted for validation
                  </h2>
                  {data.submitted.length === 0 ? (
                    <p className="ao-dashboard-empty">No tasks are currently awaiting validation.</p>
                  ) : (
                    <div className="ao-dashboard-task-list">
                      {data.submitted.map((ut) => (
                        <TaskCard key={ut.id} userTask={ut} isSubmitted />
                      ))}
                    </div>
                  )}
                </section>

                <section className="ao-dashboard-section" aria-labelledby="ao-dashboard-completed-heading">
                  <h2 id="ao-dashboard-completed-heading" className="ao-dashboard-section-title ao-dashboard-section-completed">
                    <FaCheckCircle className="ao-dashboard-section-icon" aria-hidden="true" />
                    Completed
                  </h2>
                  {data.completed.length === 0 ? (
                    <p className="ao-dashboard-empty">No completed tasks yet.</p>
                  ) : (
                    <div className="ao-dashboard-task-list">
                      {data.completed.map((ut) => (
                        <TaskCard key={ut.id} userTask={ut} isCompleted />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}

      {user?.role === "administrative_officer" && user?.status === "pending_approval" && (
        <div className="ao-dashboard-pending-note">
          <p className="mb-0 text-secondary small">
            Your task dashboard will be available once your account has been approved.
          </p>
        </div>
      )}
    </div>
  );
}

function TaskCard({ userTask, isOverdue, isCompleted, isSubmitted }) {
  const task = userTask?.task;
  const action = task?.action;
  const isUpload = action === "upload";

  return (
    <Link
      to={`/dashboard/my-tasks/${userTask?.id}`}
      className={`ao-dashboard-task-card ao-dashboard-task-card-link ${isOverdue ? "ao-dashboard-task-card-overdue" : ""} ${isCompleted ? "ao-dashboard-task-card-completed" : ""} ${isSubmitted ? "ao-dashboard-task-card-submitted" : ""}`}
    >
      <div className="ao-dashboard-task-card-body">
        <div className="ao-dashboard-task-card-header">
          <h3 className="ao-dashboard-task-card-title">{task?.name ?? "Task"}</h3>
          <span className="ao-dashboard-task-card-due">{formatDate(userTask?.due_date)}</span>
        </div>
        <div className="ao-dashboard-task-card-meta">
          <span className="ao-dashboard-task-card-frequency">{frequencyLabel(task?.frequency)}</span>
          <span className="ao-dashboard-task-card-action">
            {isUpload ? (
              <>
                <FaUpload className="ao-dashboard-task-card-action-icon" aria-hidden="true" />
                Upload
              </>
            ) : (
              <>
                <FaKeyboard className="ao-dashboard-task-card-action-icon" aria-hidden="true" />
                Input
              </>
            )}
          </span>
        </div>
        {task?.mov_description && (
          <p className="ao-dashboard-task-card-mov">
            <span className="ao-dashboard-task-card-mov-label">MOV:</span> {task.mov_description}
          </p>
        )}
      </div>
    </Link>
  );
}
