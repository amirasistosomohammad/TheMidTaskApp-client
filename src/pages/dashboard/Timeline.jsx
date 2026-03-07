import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
import {
  FaCalendarAlt,
  FaUpload,
  FaKeyboard,
  FaSync,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaUserCheck,
  FaUserEdit,
  FaChevronDown,
  FaChevronRight,
  FaPlus,
} from "react-icons/fa";
import "./Timeline.css";

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

function formatMonthYear(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
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
    one_time: "One time",
  };
  return map[freq] || freq.replace(/_/g, " ");
}

function groupByMonth(userTasks) {
  const groups = {};
  for (const ut of userTasks) {
    const key = ut.due_date ? ut.due_date.slice(0, 7) : "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(ut);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, tasks]) => ({
      monthKey,
      monthLabel: formatMonthYear(tasks[0]?.due_date),
      tasks: tasks.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
    }));
}

function isOverdueTask(userTask) {
  return (
    userTask?.status === "pending" &&
    userTask?.due_date &&
    userTask.due_date < new Date().toISOString().slice(0, 10)
  );
}

export default function Timeline() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [userTasks, setUserTasks] = useState([]);
  const [timelineTab, setTimelineTab] = useState("assigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [kpiModal, setKpiModal] = useState(null); // 'pending' | 'overdue' | 'submitted' | 'completed'
  const [kpiModalClosing, setKpiModalClosing] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const fetchTimeline = useCallback(async () => {
    if (user?.role !== "administrative_officer" || user?.status !== "active") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("/my-tasks", { auth: true });
      setUserTasks(res.user_tasks || []);
    } catch {
      setUserTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.status]);

  // Refetch when user navigates to this page so timeline reflects admin edits (e.g. task name, frequency).
  useEffect(() => {
    if (location.pathname === "/dashboard/timeline") {
      fetchTimeline();
    }
  }, [location.pathname, fetchTimeline]);

  const isActive = user?.status === "active";
  const showTimeline = isActive && user?.role === "administrative_officer";

  const splitByPersonal = useMemo(() => {
    const isPersonal = (ut) => ut?.task?.is_personal === true;
    const assigned = (userTasks || []).filter((ut) => !isPersonal(ut));
    const personal = (userTasks || []).filter(isPersonal);
    return { assigned, personal };
  }, [userTasks]);

  const tabTasks = timelineTab === "personal" ? splitByPersonal.personal : splitByPersonal.assigned;
  const assignedCount = splitByPersonal.assigned.length;
  const personalCount = splitByPersonal.personal.length;

  const stats = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let submitted = 0;
    let completed = 0;
    for (const ut of tabTasks) {
      if (ut.status === "completed") {
        completed++;
      } else if (ut.status === "submitted") {
        submitted++;
      } else if (isOverdueTask(ut)) {
        overdue++;
      } else if (ut.status === "pending") {
        pending++;
      }
    }
    return { pending, overdue, submitted, completed };
  }, [tabTasks]);

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const ut of tabTasks) {
      if (ut.due_date && ut.due_date.length >= 4) {
        years.add(ut.due_date.slice(0, 4));
      }
    }
    return Array.from(years).sort();
  }, [tabTasks]);

  const filteredTasks = useMemo(() => {
    let list = tabTasks;

    if (yearFilter !== "all") {
      list = list.filter((ut) => ut.due_date && ut.due_date.startsWith(yearFilter));
    }

    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        list = list.filter((ut) => isOverdueTask(ut));
      } else {
        list = list.filter((ut) => ut.status === statusFilter);
      }
    }

    if (actionFilter !== "all") {
      list = list.filter((ut) => ut.task?.action === actionFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((ut) => {
        const name = (ut.task?.name || "").toLowerCase();
        const freq = (frequencyLabel(ut.task?.frequency) || "").toLowerCase();
        return name.includes(q) || freq.includes(q);
      });
    }

    return list;
  }, [tabTasks, yearFilter, statusFilter, actionFilter, searchQuery]);

  const grouped = groupByMonth(filteredTasks);

  useEffect(() => {
    if (!kpiModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setKpiModal(null);
        setKpiModalClosing(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiModal]);

  return (
    <div className="timeline-page page-transition-enter">
      <PersonnelAccountStatus />

      {showTimeline && (
        <>
          <header className="timeline-header">
            <div className="timeline-header-inner">
              <div className="timeline-header-text">
                <span className="timeline-title-icon" aria-hidden="true">
                  <FaCalendarAlt />
                </span>
                <div>
                  <h1 className="timeline-title">Task schedule</h1>
                  <p className="timeline-subtitle">
                    Track assigned and personal tasks by due date. Use the tabs to switch views.
                  </p>
                </div>
              </div>
              <div className="timeline-header-actions">
                <button
                  type="button"
                  className="timeline-refresh-btn"
                  onClick={() => fetchTimeline()}
                  disabled={loading}
                  aria-label="Refresh timeline"
                  title="Refresh"
                >
                  {loading ? (
                    <FaSpinner className="spinner" aria-hidden="true" />
                  ) : (
                    <FaSync aria-hidden="true" />
                  )}
                  <span>Refresh</span>
                </button>
                <Link
                  to="/dashboard/personal-tasks/create"
                  className="timeline-header-create-btn"
                  aria-label="Create personal task"
                >
                  <FaPlus aria-hidden="true" />
                  <span>New personal task</span>
                </Link>
              </div>
            </div>
          </header>

          <section className="timeline-tabs-card" aria-label="Schedule view selector">
            <div className="timeline-tabs-card-header">
              <div>
                <h2 className="timeline-tabs-title">Schedule view</h2>
                <p className="timeline-tabs-subtitle">
                  Switch between assigned tasks (Central Admin) and your personal tasks. Filters apply to the selected view.
                </p>
              </div>
            </div>

            <div className="timeline-tabbar" role="tablist" aria-label="Schedule views">
              <button
                type="button"
                role="tab"
                id="timeline-tab-assigned"
                aria-selected={timelineTab === "assigned"}
                aria-controls="timeline-panel"
                className={`timeline-tab-btn ${timelineTab === "assigned" ? "active" : ""}`}
                onClick={() => setTimelineTab("assigned")}
              >
                <FaUserCheck className="timeline-tab-btn-icon" aria-hidden="true" />
                <span className="timeline-tab-btn-label">Assigned tasks</span>
                <span className="timeline-tab-badge" aria-label={`${assignedCount} tasks`}>
                  {assignedCount}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="timeline-tab-personal"
                aria-selected={timelineTab === "personal"}
                aria-controls="timeline-panel"
                className={`timeline-tab-btn ${timelineTab === "personal" ? "active" : ""}`}
                onClick={() => setTimelineTab("personal")}
              >
                <FaUserEdit className="timeline-tab-btn-icon" aria-hidden="true" />
                <span className="timeline-tab-btn-label">Personal tasks</span>
                <span className="timeline-tab-badge" aria-label={`${personalCount} tasks`}>
                  {personalCount}
                </span>
              </button>
            </div>

          </section>

          <div
            id="timeline-panel"
            role="tabpanel"
            aria-labelledby={timelineTab === "assigned" ? "timeline-tab-assigned" : "timeline-tab-personal"}
          >
          {showTimeline && (
            <section className="timeline-kpi-grid" aria-label="Task summary">
              <article
                className={`timeline-kpi-card timeline-kpi-pending ${
                  statusFilter === "pending" ? "timeline-kpi-active" : ""
                }`}
                onClick={() => setKpiModal("pending")}
              >
                <div className="timeline-kpi-icon-wrap" aria-hidden="true">
                  <FaClock className="timeline-kpi-icon" />
                </div>
                <div className="timeline-kpi-body">
                  <div className="timeline-kpi-label">Pending</div>
                  <div className="timeline-kpi-value">{stats.pending}</div>
                  <div className="timeline-kpi-hint">Due on or after today</div>
                </div>
              </article>
              <article
                className={`timeline-kpi-card timeline-kpi-overdue ${
                  statusFilter === "overdue" ? "timeline-kpi-active" : ""
                }`}
                onClick={() => setKpiModal("overdue")}
              >
                <div className="timeline-kpi-icon-wrap" aria-hidden="true">
                  <FaExclamationTriangle className="timeline-kpi-icon" />
                </div>
                <div className="timeline-kpi-body">
                  <div className="timeline-kpi-label">Overdue</div>
                  <div className="timeline-kpi-value">{stats.overdue}</div>
                  <div className="timeline-kpi-hint">Past due and not yet submitted</div>
                </div>
              </article>
              <article
                className={`timeline-kpi-card timeline-kpi-submitted ${
                  statusFilter === "submitted" ? "timeline-kpi-active" : ""
                }`}
                onClick={() => setKpiModal("submitted")}
              >
                <div className="timeline-kpi-icon-wrap" aria-hidden="true">
                  <FaCheckCircle className="timeline-kpi-icon" />
                </div>
                <div className="timeline-kpi-body">
                  <div className="timeline-kpi-label">Submitted</div>
                  <div className="timeline-kpi-value">{stats.submitted}</div>
                  <div className="timeline-kpi-hint">Waiting for School Head validation</div>
                </div>
              </article>
              <article
                className={`timeline-kpi-card timeline-kpi-completed ${
                  statusFilter === "completed" ? "timeline-kpi-active" : ""
                }`}
                onClick={() => setKpiModal("completed")}
              >
                <div className="timeline-kpi-icon-wrap" aria-hidden="true">
                  <FaCheckCircle className="timeline-kpi-icon" />
                </div>
                <div className="timeline-kpi-body">
                  <div className="timeline-kpi-label">Completed</div>
                  <div className="timeline-kpi-value">{stats.completed}</div>
                  <div className="timeline-kpi-hint">Validated and done</div>
                </div>
              </article>
            </section>
          )}

          {showTimeline && (
            <section className="timeline-filters-card" aria-label="Filter tasks on timeline">
              <div className="timeline-filters-header">
                <div>
                  <h2 className="timeline-filters-title">Search & filters</h2>
                </div>
                <button
                  type="button"
                  className="timeline-filters-reset-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setYearFilter("all");
                    setStatusFilter("all");
                    setActionFilter("all");
                  }}
                >
                  Reset
                </button>
              </div>
              <div className="timeline-filters">
              <div className="timeline-filter-group">
                <label htmlFor="timeline-search" className="timeline-filter-label">
                  Search
                </label>
                <div className="timeline-filter-search-wrap">
                  <FaSearch className="timeline-filter-search-icon" aria-hidden="true" />
                  <input
                    id="timeline-search"
                    type="search"
                    className="timeline-filter-control timeline-filter-search"
                    placeholder="Search by task name or frequency"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="timeline-filter-group">
                <label htmlFor="timeline-year" className="timeline-filter-label">
                  Year
                </label>
                <select
                  id="timeline-year"
                  className="timeline-filter-control"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="all">All years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="timeline-filter-group">
                <label htmlFor="timeline-status" className="timeline-filter-label">
                  Status
                </label>
                <select
                  id="timeline-status"
                  className="timeline-filter-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="submitted">Submitted for validation</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="timeline-filter-group">
                <label htmlFor="timeline-action" className="timeline-filter-label">
                  Action
                </label>
                <select
                  id="timeline-action"
                  className="timeline-filter-control"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="upload">Upload</option>
                  <option value="input">Input</option>
                </select>
              </div>
            </div>
          </section>
          )}

          {loading ? (
            <div className="timeline-loading">
              <FaSpinner className="spinner" aria-hidden="true" />
              <span>Loading timeline…</span>
            </div>
          ) : tabTasks.length === 0 ? (
            <div className="timeline-empty">
              <FaCalendarAlt className="timeline-empty-icon" aria-hidden="true" />
              <p className="timeline-empty-title">
                {timelineTab === "personal" ? "No personal tasks yet" : "No tasks assigned"}
              </p>
              <p className="timeline-empty-desc">
                {timelineTab === "personal"
                  ? "Create a personal task to populate your personal timeline. Personal tasks remain separate from tasks assigned by the Central Administrative Officer."
                  : "You have no tasks on your timeline yet. Tasks will appear here once they are assigned to you by the Central Administrative Officer."}
              </p>
              {timelineTab === "personal" && (
                <Link to="/dashboard/personal-tasks/create" className="timeline-empty-create-btn">
                  Create personal task
                </Link>
              )}
            </div>
          ) : (
            <div className="timeline-container">
              {grouped.map(({ monthKey, monthLabel, tasks }) => (
                (() => {
                  const isCollapsed = !!collapsedMonths[monthKey];
                  const monthTotal = tasks.length;
                  return (
                <section
                  key={monthKey}
                  className={`timeline-month-group ${isCollapsed ? "timeline-month-group-collapsed" : ""}`}
                  aria-labelledby={`timeline-month-${monthKey}`}
                >
                  <button
                    type="button"
                    className="timeline-month-header"
                    onClick={() =>
                      setCollapsedMonths((prev) => ({
                        ...prev,
                        [monthKey]: !prev[monthKey],
                      }))
                    }
                    aria-expanded={!isCollapsed}
                    aria-controls={`timeline-month-panel-${monthKey}`}
                  >
                    <span className="timeline-month-title-wrap">
                      <span id={`timeline-month-${monthKey}`} className="timeline-month-title">
                        {monthLabel}
                      </span>
                      <span className="timeline-month-count">
                        {monthTotal} task{monthTotal !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="timeline-month-chevron" aria-hidden="true">
                      {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                    </span>
                  </button>
                  <div
                    id={`timeline-month-panel-${monthKey}`}
                    className={`timeline-month-body ${isCollapsed ? "collapsed" : ""}`}
                  >
                    <div className="timeline-track">
                    {tasks.map((ut, idx) => (
                      <TimelineItem key={ut.id} userTask={ut} isLast={idx === tasks.length - 1} />
                    ))}
                    </div>
                  </div>
                </section>
                  );
                })()
              ))}
            </div>
          )}
          </div>
        </>
      )}

      {user?.role === "administrative_officer" && user?.status === "pending_approval" && (
        <div className="timeline-pending-note">
          <p className="mb-0 text-secondary small">
            Your timeline will be available once your account has been approved.
          </p>
        </div>
      )}

      {kpiModal &&
        createPortal(
          <div
            className="personnel-dir-overlay personnel-dir-kpi-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-kpi-modal-title"
            aria-describedby="timeline-kpi-modal-desc"
          >
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation${kpiModalClosing ? " exit" : ""}`}
              onClick={() => {
                if (kpiModalClosing) return;
                setKpiModalClosing(true);
                setTimeout(() => {
                  setKpiModalClosing(false);
                  setKpiModal(null);
                }, 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !kpiModalClosing) {
                  setKpiModalClosing(true);
                  setTimeout(() => {
                    setKpiModalClosing(false);
                    setKpiModal(null);
                  }, 200);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap personnel-dir-kpi-modal-wrap">
              <div
                className={`personnel-dir-modal personnel-dir-kpi-modal modal-content-animation${
                  kpiModalClosing ? " exit" : ""
                }`}
              >
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="timeline-kpi-modal-title" className="personnel-dir-modal-title">
                      {kpiModal === "pending" && "Pending tasks"}
                      {kpiModal === "overdue" && "Overdue tasks"}
                      {kpiModal === "submitted" && "Submitted tasks"}
                      {kpiModal === "completed" && "Completed tasks"}
                    </h2>
                    <p id="timeline-kpi-modal-desc" className="personnel-dir-modal-subtitle">
                      Full count for your current schedule view.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="personnel-dir-modal-close"
                    onClick={() => {
                      if (kpiModalClosing) return;
                      setKpiModalClosing(true);
                      setTimeout(() => {
                        setKpiModalClosing(false);
                        setKpiModal(null);
                      }, 200);
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-kpi-modal-body">
                  <div className="personnel-dir-kpi-modal-value">
                    {kpiModal === "pending" && stats.pending}
                    {kpiModal === "overdue" && stats.overdue}
                    {kpiModal === "submitted" && stats.submitted}
                    {kpiModal === "completed" && stats.completed}
                  </div>
                  <p className="personnel-dir-kpi-modal-label">
                    {timelineTab === "assigned" ? "Assigned tasks in this status" : "Personal tasks in this status"}
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer">
                  <button
                    type="button"
                    className="personnel-dir-btn-close"
                    onClick={() => {
                      if (kpiModalClosing) return;
                      setKpiModalClosing(true);
                      setTimeout(() => {
                        setKpiModalClosing(false);
                        setKpiModal(null);
                      }, 200);
                    }}
                  >
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

function TimelineItem({ userTask, isLast }) {
  const task = userTask?.task;
  const isUpload = task?.action === "upload";
  const isCompleted = userTask?.status === "completed";
  const isSubmitted = userTask?.status === "submitted";
  const isOverdue = isOverdueTask(userTask);
  const isPending = !isCompleted && !isSubmitted && !isOverdue;

  return (
    <Link
      to={`/dashboard/my-tasks/${userTask?.id}`}
      className={`timeline-item ${isOverdue ? "timeline-item-overdue" : ""} ${isCompleted ? "timeline-item-completed" : ""} ${isSubmitted ? "timeline-item-submitted" : ""}`}
    >
      <div className="timeline-item-dot" aria-hidden="true" />
      {!isLast && <div className="timeline-item-line" aria-hidden="true" />}
      <div className="timeline-item-content">
        <div className="timeline-item-header">
          <span className="timeline-item-date">{formatDate(userTask?.due_date)}</span>
          <span className="timeline-item-action">
            {isUpload ? (
              <>
                <FaUpload className="timeline-item-action-icon" aria-hidden="true" />
                Upload
              </>
            ) : (
              <>
                <FaKeyboard className="timeline-item-action-icon" aria-hidden="true" />
                Input
              </>
            )}
          </span>
        </div>
        <h3 className="timeline-item-title">{task?.name ?? "Task"}</h3>
        <p className="timeline-item-meta">{frequencyLabel(task?.frequency)}</p>
        {isOverdue && (
          <span className="timeline-item-badge timeline-item-badge-overdue">
            <FaExclamationTriangle aria-hidden="true" />
            Overdue
          </span>
        )}
        {isCompleted && (
          <span className="timeline-item-badge timeline-item-badge-completed">
            <FaCheckCircle aria-hidden="true" />
            Completed
          </span>
        )}
        {isSubmitted && !isCompleted && (
          <span className="timeline-item-badge timeline-item-badge-submitted">
            <FaCheckCircle aria-hidden="true" />
            Submitted for validation
          </span>
        )}
        {isPending && (
          <span className="timeline-item-badge timeline-item-badge-pending">
            <FaClock aria-hidden="true" />
            Pending
          </span>
        )}
      </div>
    </Link>
  );
}
