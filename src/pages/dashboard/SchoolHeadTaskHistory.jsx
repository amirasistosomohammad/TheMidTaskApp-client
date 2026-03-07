import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FaCalendarAlt,
  FaSpinner,
  FaSync,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUpload,
  FaKeyboard,
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaListAlt,
} from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import "./Timeline.css";
import "./SchoolHeadTaskHistory.css";

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
  return map[freq] || String(freq).replace(/_/g, " ");
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

export default function SchoolHeadTaskHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, submitted: 0, completed: 0 });
  const [tab, setTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const fetchHistory = useCallback(async () => {
    if (user?.role !== "school_head") {
      setLoading(false);
      setItems([]);
      setCounts({ all: 0, pending: 0, submitted: 0, completed: 0 });
      return;
    }
    setLoading(true);
    try {
      const params = tab === "all" ? {} : { status: tab };
      const query = new URLSearchParams(params).toString();
      const url = query ? `/school-head/task-history?${query}` : "/school-head/task-history";
      const res = await apiRequest(url, { auth: true });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setCounts({
        all: res?.counts?.all ?? 0,
        pending: res?.counts?.pending ?? 0,
        submitted: res?.counts?.submitted ?? 0,
        completed: res?.counts?.completed ?? 0,
      });
    } catch (err) {
      showToast.error(err?.message || "Failed to load task history.");
      setItems([]);
      setCounts({ all: 0, pending: 0, submitted: 0, completed: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.role, tab]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const ut of items) {
      if (ut.due_date && ut.due_date.length >= 4) years.add(ut.due_date.slice(0, 4));
    }
    return Array.from(years).sort();
  }, [items]);

  const filteredTasks = useMemo(() => {
    let list = items;
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
        const personnel = (ut.user?.name || "").toLowerCase();
        return name.includes(q) || freq.includes(q) || personnel.includes(q);
      });
    }
    return list;
  }, [items, yearFilter, statusFilter, actionFilter, searchQuery]);

  const grouped = groupByMonth(filteredTasks);
  const isEmpty = !loading && filteredTasks.length === 0;
  const hasNoAssignedAos = !loading && counts.all === 0 && items.length === 0;
  const showFilters = !loading && !hasNoAssignedAos;
  const emptyBecauseOfFilters = items.length > 0 && filteredTasks.length === 0;

  return (
    <div className="timeline-page page-transition-enter">
      <header className="timeline-header" aria-label="Task history page header">
        <div className="timeline-header-inner">
          <div className="timeline-header-text">
            <span className="timeline-title-icon" aria-hidden="true">
              <FaCalendarAlt />
            </span>
            <div>
              <h1 className="timeline-title">Task history</h1>
              <p className="timeline-subtitle">
                Track task and submission history for personnel under your supervision. Use the tabs and filters to narrow the view.
              </p>
            </div>
          </div>
          <div className="timeline-header-actions">
            <button
              type="button"
              className="timeline-refresh-btn"
              onClick={() => fetchHistory()}
              disabled={loading}
              aria-label="Refresh task history"
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

      <section className="timeline-tabs-card" aria-label="Status view selector">
        <div className="timeline-tabs-card-header">
          <div>
            <h2 className="timeline-tabs-title">Schedule view</h2>
            <p className="timeline-tabs-subtitle">
              Filter by status. Counts show tasks for all personnel assigned to you.
            </p>
          </div>
        </div>
        <div className="timeline-tabbar" role="tablist" aria-label="Status views">
          <button
            type="button"
            role="tab"
            id="shth-tab-all"
            aria-selected={tab === "all"}
            aria-controls="shth-panel"
            className={`timeline-tab-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            <FaListAlt className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">All</span>
            <span className="timeline-tab-badge" aria-label={`${counts.all} tasks`}>
              {counts.all}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="shth-tab-pending"
            aria-selected={tab === "pending"}
            aria-controls="shth-panel"
            className={`timeline-tab-btn ${tab === "pending" ? "active" : ""}`}
            onClick={() => setTab("pending")}
          >
            <FaClock className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">Pending</span>
            <span className="timeline-tab-badge" aria-label={`${counts.pending} tasks`}>
              {counts.pending}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="shth-tab-submitted"
            aria-selected={tab === "submitted"}
            aria-controls="shth-panel"
            className={`timeline-tab-btn ${tab === "submitted" ? "active" : ""}`}
            onClick={() => setTab("submitted")}
          >
            <FaCheckCircle className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">Submitted</span>
            <span className="timeline-tab-badge" aria-label={`${counts.submitted} tasks`}>
              {counts.submitted}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="shth-tab-completed"
            aria-selected={tab === "completed"}
            aria-controls="shth-panel"
            className={`timeline-tab-btn ${tab === "completed" ? "active" : ""}`}
            onClick={() => setTab("completed")}
          >
            <FaCheckCircle className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">Completed</span>
            <span className="timeline-tab-badge" aria-label={`${counts.completed} tasks`}>
              {counts.completed}
            </span>
          </button>
        </div>
      </section>

      <div id="shth-panel" role="tabpanel" aria-labelledby={`shth-tab-${tab}`}>
        {showFilters && (
          <section className="timeline-filters-card" aria-label="Filter tasks">
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
                <label htmlFor="shth-search" className="timeline-filter-label">
                  Search
                </label>
                <div className="timeline-filter-search-wrap">
                  <FaSearch className="timeline-filter-search-icon" aria-hidden="true" />
                  <input
                    id="shth-search"
                    type="search"
                    className="timeline-filter-control timeline-filter-search"
                    placeholder="Search by task name, frequency, or personnel"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="timeline-filter-group">
                <label htmlFor="shth-year" className="timeline-filter-label">
                  Year
                </label>
                <select
                  id="shth-year"
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
                <label htmlFor="shth-status" className="timeline-filter-label">
                  Status
                </label>
                <select
                  id="shth-status"
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
                <label htmlFor="shth-action" className="timeline-filter-label">
                  Action
                </label>
                <select
                  id="shth-action"
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
            <span>Loading task history…</span>
          </div>
        ) : hasNoAssignedAos ? (
          <div className="timeline-empty">
            <FaListAlt className="timeline-empty-icon" aria-hidden="true" />
            <p className="timeline-empty-title">No personnel assigned</p>
            <p className="timeline-empty-desc">
              There are no Administrative Officers assigned to you yet. Task history will appear here once personnel are assigned and have tasks.
            </p>
          </div>
        ) : isEmpty ? (
          <div className="timeline-empty">
            <FaCalendarAlt className="timeline-empty-icon" aria-hidden="true" />
            <p className="timeline-empty-title">
              {emptyBecauseOfFilters
                ? "No tasks match your search or filters"
                : "No tasks in this view"}
            </p>
            <p className="timeline-empty-desc">
              {emptyBecauseOfFilters
                ? "Try different keywords or reset the filters above to see more tasks."
                : tab === "all"
                  ? "No task history found for your assigned personnel."
                  : "No tasks match the current filters. Try another tab or reset filters."}
            </p>
          </div>
        ) : (
          <div className="timeline-container">
            {grouped.map(({ monthKey, monthLabel, tasks }) => {
              const isCollapsed = !!collapsedMonths[monthKey];
              const monthTotal = tasks.length;
              return (
                <section
                  key={monthKey}
                  className={`timeline-month-group ${isCollapsed ? "timeline-month-group-collapsed" : ""}`}
                  aria-labelledby={`shth-month-${monthKey}`}
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
                    aria-controls={`shth-month-panel-${monthKey}`}
                  >
                    <span className="timeline-month-title-wrap">
                      <span id={`shth-month-${monthKey}`} className="timeline-month-title">
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
                    id={`shth-month-panel-${monthKey}`}
                    className={`timeline-month-body ${isCollapsed ? "collapsed" : ""}`}
                  >
                    <div className="timeline-track">
                      {tasks.map((ut, idx) => (
                        <TaskHistoryItem
                          key={ut.id}
                          userTask={ut}
                          isLast={idx === tasks.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskHistoryItem({ userTask, isLast }) {
  const task = userTask?.task;
  const isUpload = task?.action === "upload";
  const isCompleted = userTask?.status === "completed";
  const isSubmitted = userTask?.status === "submitted";
  const isOverdue = isOverdueTask(userTask);
  const isPending = !isCompleted && !isSubmitted && !isOverdue;

  return (
    <div
      className={`timeline-item timeline-item-readonly ${isOverdue ? "timeline-item-overdue" : ""} ${isCompleted ? "timeline-item-completed" : ""} ${isSubmitted ? "timeline-item-submitted" : ""}`}
      role="article"
      aria-label={`${task?.name ?? "Task"} – ${userTask?.user?.name ?? "Personnel"}, due ${formatDate(userTask?.due_date)}`}
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
        <p className="timeline-item-meta">
          {frequencyLabel(task?.frequency)}
          {userTask?.user?.name && (
            <>
              {" · "}
              <span className="shth-item-personnel-label">Personnel: {userTask.user.name}</span>
            </>
          )}
        </p>
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
    </div>
  );
}
