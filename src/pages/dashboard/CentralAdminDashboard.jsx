import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import {
  FaTachometerAlt,
  FaSync,
  FaSpinner,
  FaUserCheck,
  FaUsers,
  FaClipboardList,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaClipboard,
  FaCog,
  FaPlus,
  FaUserPlus,
  FaDesktop,
  FaEye,
} from "react-icons/fa";
import "./PersonnelDirectory.css";
import "./CentralAdminDashboard.css";

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function formatCountFull(n) {
  return (Number(n) || 0).toLocaleString();
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    const timeStr = d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
}

function humanizeAction(action) {
  if (!action) return "—";
  return String(action)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function kpiTone(kind) {
  switch (kind) {
    case "danger":
      return "danger";
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "primary";
  }
}

export default function CentralAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const [detailsLog, setDetailsLog] = useState(null);
  const [detailsModalClosing, setDetailsModalClosing] = useState(false);

  const fetchDashboard = useCallback(async ({ withSpinner } = {}) => {
    if (withSpinner) setRefreshing(true);
    try {
      const res = await apiRequest("/admin/dashboard", { auth: true });
      setData(res || null);
    } catch (err) {
      showToast.error(err?.message || "Failed to load dashboard.");
      setData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard({ withSpinner: false });
  }, [fetchDashboard]);

  const kpis = useMemo(() => {
    const k = data?.kpis || {};
    const a = k.assignments || {};
    return {
      pendingApprovals: Number(k.pending_approvals) || 0,
      activeOfficers: Number(k.active_officers) || 0,
      totalTasks: Number(k.total_tasks) || 0,
      overdueAssignments: Number(a.overdue) || 0,
      pendingAssignments: Number(a.pending) || 0,
      submittedAssignments: Number(a.submitted) || 0,
      completedAssignments: Number(a.completed) || 0,
    };
  }, [data]);

  const recent = Array.isArray(data?.recent_activity) ? data.recent_activity : [];
  const backup = data?.backup || {};

  const closeDetails = useCallback(() => {
    setDetailsModalClosing(true);
    setTimeout(() => {
      setDetailsModalClosing(false);
      setDetailsLog(null);
    }, 200);
  }, []);

  return (
    <div className="ca-dashboard-page page-transition-enter">
      <header className="ca-dashboard-header">
        <div className="ca-dashboard-header-inner">
          <div className="ca-dashboard-header-text">
            <span className="ca-dashboard-title-icon" aria-hidden="true">
              <FaTachometerAlt />
            </span>
            <div>
              <h1 className="ca-dashboard-title">Dashboard</h1>
              <p className="ca-dashboard-subtitle">
                Welcome, <strong>{user?.name ?? "User"}</strong>. Overview of users, tasks, and system activity.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ca-dashboard-refresh-btn"
            onClick={() => fetchDashboard({ withSpinner: true })}
            disabled={loading || refreshing}
            aria-label="Refresh dashboard"
            title="Refresh"
          >
            {loading || refreshing ? <FaSpinner className="spinner" aria-hidden="true" /> : <FaSync aria-hidden="true" />}
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ca-dashboard-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading dashboard…</span>
        </div>
      ) : (
        <>
          <section className="ca-dashboard-kpi-grid" role="region" aria-label="Dashboard summary">
            <article
              className={`ca-dashboard-kpi-card ca-dashboard-kpi-${kpiTone(kpis.pendingApprovals > 0 ? "warning" : "primary")}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/central-admin/account-approvals")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), navigate("/central-admin/account-approvals"))}
              aria-label={`Pending approvals: ${formatCountFull(kpis.pendingApprovals)}. Open account approvals.`}
            >
              <div className="ca-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaUserCheck className="ca-dashboard-kpi-icon" />
              </div>
              <div className="ca-dashboard-kpi-body">
                <p className="ca-dashboard-kpi-label">Pending approvals</p>
                <p className="ca-dashboard-kpi-value">{formatCount(kpis.pendingApprovals)}</p>
                <p className="ca-dashboard-kpi-hint">Review registrations</p>
              </div>
            </article>

            <article
              className="ca-dashboard-kpi-card ca-dashboard-kpi-primary"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/central-admin/monitor")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), navigate("/central-admin/monitor"))}
              aria-label={`Active officers: ${formatCountFull(kpis.activeOfficers)}. Open monitor officers.`}
            >
              <div className="ca-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaUsers className="ca-dashboard-kpi-icon" />
              </div>
              <div className="ca-dashboard-kpi-body">
                <p className="ca-dashboard-kpi-label">Active officers</p>
                <p className="ca-dashboard-kpi-value">{formatCount(kpis.activeOfficers)}</p>
                <p className="ca-dashboard-kpi-hint">View progress</p>
              </div>
            </article>

            <article
              className={`ca-dashboard-kpi-card ca-dashboard-kpi-${kpiTone(kpis.overdueAssignments > 0 ? "danger" : "primary")}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/central-admin/monitor")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), navigate("/central-admin/monitor"))}
              aria-label={`Overdue assignments: ${formatCountFull(kpis.overdueAssignments)}. Open monitor officers.`}
            >
              <div className="ca-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaExclamationTriangle className="ca-dashboard-kpi-icon" />
              </div>
              <div className="ca-dashboard-kpi-body">
                <p className="ca-dashboard-kpi-label">Overdue (missing)</p>
                <p className="ca-dashboard-kpi-value">{formatCount(kpis.overdueAssignments)}</p>
                <p className="ca-dashboard-kpi-hint">Follow up</p>
              </div>
            </article>

            <article
              className="ca-dashboard-kpi-card ca-dashboard-kpi-primary"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/central-admin/tasks")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), navigate("/central-admin/tasks"))}
              aria-label={`Total tasks: ${formatCountFull(kpis.totalTasks)}. Open task list.`}
            >
              <div className="ca-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaClipboardList className="ca-dashboard-kpi-icon" />
              </div>
              <div className="ca-dashboard-kpi-body">
                <p className="ca-dashboard-kpi-label">Tasks</p>
                <p className="ca-dashboard-kpi-value">{formatCount(kpis.totalTasks)}</p>
                <p className="ca-dashboard-kpi-hint">Manage tasks</p>
              </div>
            </article>
          </section>

          <section className="ca-dashboard-grid" aria-label="Central admin dashboard panels">
            <div className="ca-dashboard-card">
              <header className="ca-dashboard-card-header">
                <div className="ca-dashboard-card-title-wrap">
                  <span className="ca-dashboard-card-icon" aria-hidden="true">
                    <FaClock />
                  </span>
                  <div>
                    <h2 className="ca-dashboard-card-title">Assignments summary</h2>
                    <p className="ca-dashboard-card-subtitle">Overall task assignment status across personnel</p>
                  </div>
                </div>
                <Link to="/central-admin/monitor" className="ca-dashboard-card-link">
                  Open monitor
                </Link>
              </header>

              <div className="ca-dashboard-summary-grid" role="list" aria-label="Assignment summary cards">
                <div className="ca-dashboard-summary-item" role="listitem">
                  <span className="ca-dashboard-summary-label">Pending</span>
                  <span className="ca-dashboard-summary-value">{formatCount(kpis.pendingAssignments)}</span>
                </div>
                <div className="ca-dashboard-summary-item" role="listitem" data-tone="danger">
                  <span className="ca-dashboard-summary-label">Overdue</span>
                  <span className="ca-dashboard-summary-value">{formatCount(kpis.overdueAssignments)}</span>
                </div>
                <div className="ca-dashboard-summary-item" role="listitem" data-tone="warning">
                  <span className="ca-dashboard-summary-label">Submitted</span>
                  <span className="ca-dashboard-summary-value">{formatCount(kpis.submittedAssignments)}</span>
                </div>
                <div className="ca-dashboard-summary-item" role="listitem" data-tone="success">
                  <span className="ca-dashboard-summary-label">Completed</span>
                  <span className="ca-dashboard-summary-value">{formatCount(kpis.completedAssignments)}</span>
                </div>
              </div>
            </div>

            <div className="ca-dashboard-card">
              <header className="ca-dashboard-card-header">
                <div className="ca-dashboard-card-title-wrap">
                  <span className="ca-dashboard-card-icon" aria-hidden="true">
                    <FaPlus />
                  </span>
                  <div>
                    <h2 className="ca-dashboard-card-title">Quick actions</h2>
                    <p className="ca-dashboard-card-subtitle">Common administrative actions</p>
                  </div>
                </div>
              </header>

              <div className="ca-dashboard-actions">
                <Link to="/central-admin/account-approvals" className="ca-dashboard-btn ca-dashboard-btn-primary">
                  <FaUserCheck aria-hidden="true" />
                  Account approvals
                </Link>
                <Link to="/central-admin/tasks/create" className="ca-dashboard-btn ca-dashboard-btn-primary">
                  <FaPlus aria-hidden="true" />
                  Create task
                </Link>
                <Link to="/central-admin/tasks/assign" className="ca-dashboard-btn ca-dashboard-btn-outline">
                  <FaUserPlus aria-hidden="true" />
                  Assign task
                </Link>
                <Link to="/central-admin/monitor" className="ca-dashboard-btn ca-dashboard-btn-outline">
                  <FaDesktop aria-hidden="true" />
                  Monitor officers
                </Link>
                <Link to="/central-admin/activity-logs" className="ca-dashboard-btn ca-dashboard-btn-outline">
                  <FaClipboard aria-hidden="true" />
                  Activity logs
                </Link>
                <Link to="/central-admin/settings" className="ca-dashboard-btn ca-dashboard-btn-outline">
                  <FaCog aria-hidden="true" />
                  Settings & backup
                </Link>
              </div>
            </div>

            <div className="ca-dashboard-card ca-dashboard-card-wide">
              <header className="ca-dashboard-card-header">
                <div className="ca-dashboard-card-title-wrap">
                  <span className="ca-dashboard-card-icon" aria-hidden="true">
                    <FaClipboard />
                  </span>
                  <div>
                    <h2 className="ca-dashboard-card-title">Recent activity</h2>
                    <p className="ca-dashboard-card-subtitle">Latest system actions (audit trail)</p>
                  </div>
                </div>
                <Link to="/central-admin/activity-logs" className="ca-dashboard-card-link">
                  View all
                </Link>
              </header>

              {recent.length === 0 ? (
                <div className="ca-dashboard-empty">
                  <p className="ca-dashboard-empty-title">No activity yet</p>
                  <p className="ca-dashboard-empty-desc">Activity will appear as users sign in and actions are performed.</p>
                </div>
              ) : (
                <div className="ca-dashboard-table-wrap">
                  <table className="ca-dashboard-table" role="grid" aria-label="Recent activity table">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col" className="ca-dashboard-col-actions">
                          Details
                        </th>
                        <th scope="col">Date & time</th>
                        <th scope="col">Actor</th>
                        <th scope="col">Action</th>
                        <th scope="col">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((log, idx) => {
                        const actorName = log?.actor?.name || "System";
                        const actorEmail = log?.actor?.email || "";
                        return (
                          <tr key={log?.id || idx}>
                            <td data-label="#">{idx + 1}</td>
                            <td data-label="Details" className="ca-dashboard-col-actions">
                              <button
                                type="button"
                                className="btn ca-dashboard-btn-details"
                                onClick={() => setDetailsLog(log)}
                                aria-label="View log details"
                                title="View details"
                              >
                                <FaEye aria-hidden="true" />
                              </button>
                            </td>
                            <td data-label="Date & time">{formatDateTime(log?.created_at)}</td>
                            <td data-label="Actor">
                              <div className="ca-dashboard-actor">
                                <div className="ca-dashboard-actor-name">{actorName}</div>
                                {actorEmail && <div className="ca-dashboard-actor-email">{actorEmail}</div>}
                              </div>
                            </td>
                            <td data-label="Action">{humanizeAction(log?.action)}</td>
                            <td data-label="Description" className="ca-dashboard-desc">
                              {log?.description || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ca-dashboard-card ca-dashboard-card-wide">
              <header className="ca-dashboard-card-header">
                <div className="ca-dashboard-card-title-wrap">
                  <span className="ca-dashboard-card-icon" aria-hidden="true">
                    <FaCheckCircle />
                  </span>
                  <div>
                    <h2 className="ca-dashboard-card-title">Backup status</h2>
                    <p className="ca-dashboard-card-subtitle">Automated backup schedule (Asia/Manila)</p>
                  </div>
                </div>
                <Link to="/central-admin/settings" className="ca-dashboard-card-link">
                  Manage
                </Link>
              </header>

              <div className="ca-dashboard-backup-grid" role="list" aria-label="Backup status summary">
                <div className="ca-dashboard-backup-item" role="listitem">
                  <span className="ca-dashboard-backup-label">Frequency</span>
                  <span className="ca-dashboard-backup-value">{backup?.frequency || "—"}</span>
                </div>
                <div className="ca-dashboard-backup-item" role="listitem">
                  <span className="ca-dashboard-backup-label">Run time</span>
                  <span className="ca-dashboard-backup-value">{backup?.run_at_time || "—"}</span>
                </div>
                <div className="ca-dashboard-backup-item" role="listitem">
                  <span className="ca-dashboard-backup-label">Last run</span>
                  <span className="ca-dashboard-backup-value">{formatDateTime(backup?.last_run_at)}</span>
                </div>
                <div className="ca-dashboard-backup-item" role="listitem">
                  <span className="ca-dashboard-backup-label">Next run</span>
                  <span className="ca-dashboard-backup-value">{formatDateTime(backup?.next_run_at)}</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {detailsLog &&
        createPortal(
          <div className="personnel-dir-overlay" role="dialog" aria-modal="true" aria-labelledby="ca-log-details-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${detailsModalClosing ? "exit" : ""}`}
              onClick={closeDetails}
              onKeyDown={(e) => e.key === "Enter" && closeDetails()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal modal-content-animation ${detailsModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="ca-log-details-title" className="personnel-dir-modal-title">
                      Activity details
                    </h2>
                    <p className="personnel-dir-modal-subtitle">
                      {formatDateTime(detailsLog?.created_at)} · {detailsLog?.ip_address || "IP —"}
                    </p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={closeDetails} aria-label="Close">
                    ×
                  </button>
                </header>

                <div className="personnel-dir-modal-body">
                  <div className="ca-dashboard-details-grid">
                    <div className="ca-dashboard-details-row">
                      <div className="ca-dashboard-details-label">Actor</div>
                      <div className="ca-dashboard-details-value">
                        {detailsLog?.actor?.name || "System"}
                        {detailsLog?.actor?.email ? (
                          <span className="ca-dashboard-details-subvalue"> · {detailsLog.actor.email}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="ca-dashboard-details-row">
                      <div className="ca-dashboard-details-label">Action</div>
                      <div className="ca-dashboard-details-value">{detailsLog?.action || "—"}</div>
                    </div>
                    <div className="ca-dashboard-details-row">
                      <div className="ca-dashboard-details-label">Description</div>
                      <div className="ca-dashboard-details-value">{detailsLog?.description || "—"}</div>
                    </div>
                  </div>
                </div>

                <footer className="personnel-dir-modal-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={closeDetails}>
                    Close
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

