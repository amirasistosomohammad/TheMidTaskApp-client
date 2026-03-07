import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaTachometerAlt,
  FaSync,
  FaSpinner,
  FaBell,
  FaClipboardCheck,
  FaUsers,
  FaClipboardList,
  FaHistory,
  FaFileAlt,
  FaFileExcel,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
import "./AdminOfficerDashboard.css";
import "./SchoolHeadDashboard.css";

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

export default function SchoolHeadDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    pending_validations_count: 0,
    assigned_personnel_count: 0,
    reminders: [],
  });

  const fetchDashboard = useCallback(async () => {
    if (user?.role !== "school_head" || user?.status !== "active") {
      setLoading(false);
      setData({ pending_validations_count: 0, assigned_personnel_count: 0, reminders: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("/school-head/dashboard", { auth: true });
      setData({
        pending_validations_count: res?.pending_validations_count ?? 0,
        assigned_personnel_count: res?.assigned_personnel_count ?? 0,
        reminders: res?.reminders ?? [],
      });
    } catch {
      setData({ pending_validations_count: 0, assigned_personnel_count: 0, reminders: [] });
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.status]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleReminderRead = async (reminderId) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== reminderId),
    }));
    try {
      await apiRequest(`/reminders/${reminderId}/read`, { method: "POST", auth: true });
    } catch {
      // best-effort; refresh will correct
    }
  };

  const isActive = user?.status === "active";
  const showDashboard = isActive && user?.role === "school_head";

  return (
    <div className="ao-dashboard-page sh-dashboard-page page-transition-enter">
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
                    Welcome, <strong>{user?.name ?? "User"}</strong>. Monitor submissions from your
                    personnel and review what needs validation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="ao-dashboard-refresh-btn"
                onClick={fetchDashboard}
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
              <div className="sh-dashboard-kpi-row ao-dashboard-kpi-grid ao-dashboard-kpi-grid-compact">
                <Link
                  to="/school-head/validations"
                  className="ao-dashboard-kpi-card ao-dashboard-kpi-submitted"
                  aria-label={`Pending validations: ${data.pending_validations_count}. Open validations.`}
                >
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaClipboardCheck className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Pending validations</p>
                    <p className="ao-dashboard-kpi-value">{data.pending_validations_count}</p>
                    <p className="ao-dashboard-kpi-hint">Awaiting your review</p>
                  </div>
                </Link>
                <article
                  className="ao-dashboard-kpi-card ao-dashboard-kpi-pending"
                  aria-label={`Assigned personnel: ${data.assigned_personnel_count}`}
                >
                  <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                    <FaUsers className="ao-dashboard-kpi-icon" />
                  </div>
                  <div className="ao-dashboard-kpi-body">
                    <p className="ao-dashboard-kpi-label">Assigned personnel</p>
                    <p className="ao-dashboard-kpi-value">{data.assigned_personnel_count}</p>
                    <p className="ao-dashboard-kpi-hint">Administrative Officers under you</p>
                  </div>
                </article>
              </div>

              <div className="ao-dashboard-top-grid">
                <section
                  className="ao-dashboard-card"
                  aria-label="New submissions for validation"
                >
                  <header className="ao-dashboard-card-header">
                    <div className="ao-dashboard-card-title-wrap">
                      <span className="ao-dashboard-card-icon" aria-hidden="true">
                        <FaBell />
                      </span>
                      <div>
                        <h2 className="ao-dashboard-card-title">New submissions for validation</h2>
                        <p className="ao-dashboard-card-subtitle">
                          When Administrative Officers submit tasks, they appear here and in your
                          Validations page.
                        </p>
                      </div>
                    </div>
                  </header>
                  <div className="ao-dashboard-reminders-body">
                    {data.reminders.length === 0 ? (
                      <p className="ao-dashboard-reminders-empty">
                        No new submissions awaiting your attention. New submissions will appear here
                        automatically.
                      </p>
                    ) : (
                      <ul className="ao-dashboard-reminders-list">
                        {data.reminders.map((r) => {
                          const userTask = r.user_task || {};
                          const task = r.task || {};
                          const dueLabel = userTask.due_date ? formatDate(userTask.due_date) : "—";
                          const label =
                            r.type === "submission_pending"
                              ? "Submitted for your validation"
                              : "Notification";
                          return (
                            <li key={r.id} className="ao-dashboard-reminder-item">
                              <div className="ao-dashboard-reminder-main">
                                <p className="ao-dashboard-reminder-task">
                                  <span className="ao-dashboard-reminder-task-name">
                                    {task.name || "Task"}
                                  </span>
                                  <span className="ao-dashboard-reminder-badge">{label}</span>
                                </p>
                                <p className="ao-dashboard-reminder-meta">
                                  <span className="ao-dashboard-reminder-label">Due date:</span>{" "}
                                  {dueLabel}
                                </p>
                              </div>
                              <div className="ao-dashboard-reminder-actions">
                                <Link
                                  to="/school-head/validations"
                                  className="ao-dashboard-reminder-link"
                                  onClick={() => handleReminderRead(r.id)}
                                >
                                  Open validations
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="ao-dashboard-card" aria-label="Quick actions">
                  <header className="ao-dashboard-card-header">
                    <div className="ao-dashboard-card-title-wrap">
                      <span className="ao-dashboard-card-icon" aria-hidden="true">
                        <FaClipboardList />
                      </span>
                      <div>
                        <h2 className="ao-dashboard-card-title">Quick actions</h2>
                        <p className="ao-dashboard-card-subtitle">
                          Common tasks and reports for School Heads.
                        </p>
                      </div>
                    </div>
                  </header>
                  <div className="sh-dashboard-actions">
                    <Link to="/school-head/validations" className="sh-dashboard-btn sh-dashboard-btn-primary">
                      <FaClipboardCheck aria-hidden="true" />
                      Validations
                    </Link>
                    <Link to="/school-head/validation-report" className="sh-dashboard-btn sh-dashboard-btn-outline">
                      <FaFileAlt aria-hidden="true" />
                      Validation report
                    </Link>
                    <Link to="/school-head/reports" className="sh-dashboard-btn sh-dashboard-btn-outline">
                      <FaFileExcel aria-hidden="true" />
                      Reports
                    </Link>
                    <Link to="/school-head/task-history" className="sh-dashboard-btn sh-dashboard-btn-outline">
                      <FaHistory aria-hidden="true" />
                      Task history
                    </Link>
                  </div>
                </section>
              </div>
            </>
          )}
        </>
      )}

      {user?.role === "school_head" && user?.status === "pending_approval" && (
        <div className="ao-dashboard-pending-note">
          <p className="mb-0 text-secondary small">
            Your dashboard will be available once your account has been approved.
          </p>
        </div>
      )}
    </div>
  );
}
