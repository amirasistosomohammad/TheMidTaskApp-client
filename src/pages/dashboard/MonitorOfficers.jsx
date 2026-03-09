import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { apiRequest, normalizeLogoUrl } from "../../services/apiClient";
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
  FaChevronRight,
  FaUsers,
  FaSearch,
} from "react-icons/fa";
import "./PersonnelDirectory.css";
import "./MonitorOfficers.css";

const API_BASE = (import.meta.env.VITE_LARAVEL_API || "").replace(/\/$/, "");

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `${API_BASE}/storage/${avatarUrl.replace(/^\//, "")}`;
}

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

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function formatCountFull(n) {
  return (Number(n) || 0).toLocaleString();
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
  const [refreshing, setRefreshing] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [kpiModalStat, setKpiModalStat] = useState(null); // 'pending' | 'missing' | 'completed' | 'officers'
  const [kpiModalClosing, setKpiModalClosing] = useState(false);

  /* Client-side filtering: school then search (no refetch, no reload) */
  const filteredOfficers = useMemo(() => {
    let list = officers;
    if (schoolFilter) {
      list = list.filter((o) => (o.school_name || "") === schoolFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const name = (o.name || "").toLowerCase();
        const email = (o.email || "").toLowerCase();
        const empId = (o.employee_id || "").toLowerCase();
        const position = (o.position || "").toLowerCase();
        const school = (o.school_name || "").toLowerCase();
        const division = (o.division || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          empId.includes(q) ||
          position.includes(q) ||
          school.includes(q) ||
          division.includes(q)
        );
      });
    }
    return list;
  }, [officers, schoolFilter, searchQuery]);

  const kpiCounts = useMemo(() => ({
    pending: filteredOfficers.reduce((s, o) => s + o.pending_count, 0),
    missing: filteredOfficers.reduce((s, o) => s + o.missing_count, 0),
    completed: filteredOfficers.reduce((s, o) => s + o.completed_count, 0),
    officers: filteredOfficers.length,
  }), [filteredOfficers]);

  const fetchAllOfficers = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/monitor-officers", { auth: true });
      setOfficers(res.officers || []);
      setSchools(res.schools || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load officer data.");
      setOfficers([]);
      setSchools([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllOfficers().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchAllOfficers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllOfficers();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllOfficers]);

  useEffect(() => {
    if (!kpiModalStat) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !kpiModalClosing) {
        setKpiModalClosing(true);
        setTimeout(() => {
          setKpiModalClosing(false);
          setKpiModalStat(null);
        }, 200);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiModalStat, kpiModalClosing]);

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
                View task progress and activity across all Administrative Officers. Filter and search below.
              </p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="monitor-officers-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading officer data…</span>
        </div>
      ) : (
        <>
          {/* Filter panel – one line: search, school, refresh (corporate / government style) */}
          <div className="monitor-officers-filter-card">
            <h2 className="monitor-officers-filter-card-title">Search & filter</h2>
            <div className="monitor-officers-filter-panel" role="search" aria-label="Search and filter officers">
              <div className="monitor-officers-filter-row">
                <label htmlFor="monitor-officers-search" className="monitor-officers-search-label">
                  Search
                </label>
                <div className="monitor-officers-search-wrap">
                  <span className="monitor-officers-search-icon-wrap">
                    <FaSearch className="monitor-officers-search-icon" aria-hidden="true" />
                  </span>
                  <div className="monitor-officers-search-input-wrap">
                    <input
                      id="monitor-officers-search"
                      type="search"
                      className="monitor-officers-search-input"
                      placeholder="Name, email, employee ID, position, school, division…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search officers"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="monitor-officers-search-clear"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <label htmlFor="monitor-officers-school" className="monitor-officers-filter-label">
                  School
                </label>
                <select
                  id="monitor-officers-school"
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
                <button
                  type="button"
                  className="monitor-officers-refresh-btn"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh data"
                  title="Refresh"
                >
                  {refreshing ? (
                    <FaSpinner className="spinner" aria-hidden="true" />
                  ) : (
                    <FaSync aria-hidden="true" />
                  )}
                  <span>Refresh</span>
                </button>
                {(searchQuery || schoolFilter) && (
                  <span className="monitor-officers-results-text">
                    {filteredOfficers.length} result{filteredOfficers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="monitor-officers-content-card">
          {officers.length === 0 ? (
            <div className="monitor-officers-empty">
              <FaUsers className="monitor-officers-empty-icon" aria-hidden="true" />
              <p className="monitor-officers-empty-title">No officers</p>
              <p className="monitor-officers-empty-desc">
                {schoolFilter
                  ? `No active Administrative Officers found for ${schoolFilter}.`
                  : "No active Administrative Officers. Approve registrations to see officers here."}
              </p>
            </div>
          ) : filteredOfficers.length === 0 ? (
            <div className="monitor-officers-empty-state">
              <FaUsers className="monitor-officers-empty-state-icon" aria-hidden="true" />
              <p className="monitor-officers-empty-state-title">No officers match your search</p>
              <p className="monitor-officers-empty-state-desc">
                Try different keywords or clear the search and school filter.
              </p>
              <button
                type="button"
                className="monitor-officers-empty-state-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSchoolFilter("");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="monitor-officers-kpi-grid" role="region" aria-label="Task summary">
                <article
                  className="monitor-officers-kpi-card monitor-officers-kpi-pending"
                  role="button"
                  tabIndex={0}
                  onClick={() => setKpiModalStat("pending")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("pending"))}
                  aria-label={`Pending tasks: ${formatCountFull(kpiCounts.pending)}. View full count.`}
                >
                  <div className="monitor-officers-kpi-icon-wrap" aria-hidden="true">
                    <FaClock className="monitor-officers-kpi-icon" />
                  </div>
                  <div className="monitor-officers-kpi-body">
                    <p className="monitor-officers-kpi-label">Pending</p>
                    <p className="monitor-officers-kpi-value">{formatCount(kpiCounts.pending)}</p>
                    <p className="monitor-officers-kpi-hint">View full count</p>
                  </div>
                  <FaChevronRight className="monitor-officers-kpi-chevron" aria-hidden="true" />
                </article>
                <article
                  className="monitor-officers-kpi-card monitor-officers-kpi-missing"
                  role="button"
                  tabIndex={0}
                  onClick={() => setKpiModalStat("missing")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("missing"))}
                  aria-label={`Missing (overdue): ${formatCountFull(kpiCounts.missing)}. View full count.`}
                >
                  <div className="monitor-officers-kpi-icon-wrap" aria-hidden="true">
                    <FaExclamationTriangle className="monitor-officers-kpi-icon" />
                  </div>
                  <div className="monitor-officers-kpi-body">
                    <p className="monitor-officers-kpi-label">Missing (overdue)</p>
                    <p className="monitor-officers-kpi-value">{formatCount(kpiCounts.missing)}</p>
                    <p className="monitor-officers-kpi-hint">View full count</p>
                  </div>
                  <FaChevronRight className="monitor-officers-kpi-chevron" aria-hidden="true" />
                </article>
                <article
                  className="monitor-officers-kpi-card monitor-officers-kpi-completed"
                  role="button"
                  tabIndex={0}
                  onClick={() => setKpiModalStat("completed")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("completed"))}
                  aria-label={`Completed: ${formatCountFull(kpiCounts.completed)}. View full count.`}
                >
                  <div className="monitor-officers-kpi-icon-wrap" aria-hidden="true">
                    <FaCheckCircle className="monitor-officers-kpi-icon" />
                  </div>
                  <div className="monitor-officers-kpi-body">
                    <p className="monitor-officers-kpi-label">Completed</p>
                    <p className="monitor-officers-kpi-value">{formatCount(kpiCounts.completed)}</p>
                    <p className="monitor-officers-kpi-hint">View full count</p>
                  </div>
                  <FaChevronRight className="monitor-officers-kpi-chevron" aria-hidden="true" />
                </article>
                <article
                  className="monitor-officers-kpi-card monitor-officers-kpi-officers"
                  role="button"
                  tabIndex={0}
                  onClick={() => setKpiModalStat("officers")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("officers"))}
                  aria-label={`Officers: ${formatCountFull(kpiCounts.officers)}. View full count.`}
                >
                  <div className="monitor-officers-kpi-icon-wrap" aria-hidden="true">
                    <FaUsers className="monitor-officers-kpi-icon" />
                  </div>
                  <div className="monitor-officers-kpi-body">
                    <p className="monitor-officers-kpi-label">Officers</p>
                    <p className="monitor-officers-kpi-value">{formatCount(kpiCounts.officers)}</p>
                    <p className="monitor-officers-kpi-hint">View full count</p>
                  </div>
                  <FaChevronRight className="monitor-officers-kpi-chevron" aria-hidden="true" />
                </article>
              </div>
              <div className="monitor-officers-list">
                {filteredOfficers.map((officer) => (
                  <OfficerCard
                    key={officer.id}
                    officer={officer}
                    expanded={expanded.has(officer.id)}
                    onToggle={() => toggleExpand(officer.id)}
                    formatDate={formatDate}
                    frequencyLabel={frequencyLabel}
                    getInitials={getInitials}
                    buildAvatarUrl={buildAvatarUrl}
                  />
                ))}
              </div>
            </>
          )}
          </div>

          {/* KPI full count modal – same structure as Personnel Directory & School Head Accounts */}
          {kpiModalStat &&
            createPortal(
              <div
                className="monitor-officers-kpi-overlay personnel-dir-overlay personnel-dir-kpi-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="monitor-officers-kpi-modal-title"
                aria-describedby="monitor-officers-kpi-modal-desc"
              >
                <div
                  className={`personnel-dir-backdrop modal-backdrop-animation${kpiModalClosing ? " exit" : ""}`}
                  onClick={() => {
                    if (kpiModalClosing) return;
                    setKpiModalClosing(true);
                    setTimeout(() => {
                      setKpiModalClosing(false);
                      setKpiModalStat(null);
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !kpiModalClosing) {
                      setKpiModalClosing(true);
                      setTimeout(() => {
                        setKpiModalClosing(false);
                        setKpiModalStat(null);
                      }, 200);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Close"
                />
                <div className="personnel-dir-wrap personnel-dir-kpi-modal-wrap" data-stat={kpiModalStat}>
                  <div className={`personnel-dir-modal personnel-dir-kpi-modal modal-content-animation${kpiModalClosing ? " exit" : ""}`}>
                    <header className="personnel-dir-modal-header">
                      <div className="personnel-dir-modal-header-text">
                        <h2 id="monitor-officers-kpi-modal-title" className="personnel-dir-modal-title">
                          {kpiModalStat === "pending" && "Pending tasks"}
                          {kpiModalStat === "missing" && "Missing (overdue)"}
                          {kpiModalStat === "completed" && "Completed tasks"}
                          {kpiModalStat === "officers" && "Officers"}
                        </h2>
                        <p id="monitor-officers-kpi-modal-desc" className="personnel-dir-modal-subtitle">
                          Full count for current filters
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
                            setKpiModalStat(null);
                          }, 200);
                        }}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </header>
                    <div className="personnel-dir-modal-body personnel-dir-kpi-modal-body">
                      <div className="personnel-dir-kpi-modal-value">
                        {formatCountFull(
                          kpiModalStat === "pending" ? kpiCounts.pending :
                          kpiModalStat === "missing" ? kpiCounts.missing :
                          kpiModalStat === "completed" ? kpiCounts.completed :
                          kpiCounts.officers
                        )}
                      </div>
                      <p className="personnel-dir-kpi-modal-label">
                        {kpiModalStat === "pending" && "Pending task assignments"}
                        {kpiModalStat === "missing" && "Overdue task assignments"}
                        {kpiModalStat === "completed" && "Completed task submissions"}
                        {kpiModalStat === "officers" && "Administrative officers in view"}
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
                            setKpiModalStat(null);
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
        </>
      )}
    </div>
  );
}

function OfficerCard({ officer, expanded, onToggle, formatDate, frequencyLabel, getInitials, buildAvatarUrl }) {
  const { pending, missing, completed } = officer;
  const LIST_PREVIEW_LIMIT = 5;
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const hasTasks = pending.length + missing.length + completed.length > 0;
  const rawAvatar = normalizeLogoUrl(officer.avatar_url || officer.profile_avatar_url) || (officer.avatar_url || officer.profile_avatar_url);
  const avatarSrc = rawAvatar ? buildAvatarUrl(rawAvatar) : null;

  const pendingItems = showAllPending ? pending : pending.slice(0, LIST_PREVIEW_LIMIT);
  const missingItems = showAllMissing ? missing : missing.slice(0, LIST_PREVIEW_LIMIT);
  const completedItems = showAllCompleted ? completed : completed.slice(0, LIST_PREVIEW_LIMIT);

  return (
    <article className="monitor-officers-card">
      <div className="monitor-officers-card-profile">
        <div className="monitor-officers-card-avatar-wrap" aria-hidden="true">
          <div className="monitor-officers-card-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="monitor-officers-card-avatar-img" />
            ) : (
              <span className="monitor-officers-card-avatar-initials">{getInitials(officer.name)}</span>
            )}
          </div>
        </div>
        <div className="monitor-officers-card-info-block">
          <h2 className="monitor-officers-card-name">{officer.name}</h2>
          {officer.email && <p className="monitor-officers-card-email">{officer.email}</p>}
          {officer.school_name && (
            <p className="monitor-officers-card-school">{officer.school_name}</p>
          )}
          {officer.position && (
            <p className="monitor-officers-card-position">{officer.position}</p>
          )}
        </div>
      </div>
      <div className="monitor-officers-card-main">
        <button
          type="button"
          className="monitor-officers-card-header"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`monitor-officer-${officer.id}-tasks`}
        >
          <span className="monitor-officers-card-chevron" aria-hidden="true">
            <FaChevronRight />
          </span>
          <span className="monitor-officers-card-expand-label">
            {expanded ? "Hide" : "View"} task progress
          </span>
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

        <div
          className="monitor-officers-card-body-wrap"
          data-expanded={expanded ? "true" : "false"}
          aria-hidden={!expanded}
        >
          <div
            id={`monitor-officer-${officer.id}-tasks`}
            className="monitor-officers-card-body"
            role="region"
            aria-label={expanded ? `Tasks for ${officer.name}` : undefined}
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
                      {pendingItems.map((ut) => (
                        <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} />
                      ))}
                    </div>
                    {pending.length > LIST_PREVIEW_LIMIT && (
                      <button
                        type="button"
                        className="monitor-officers-show-more-btn"
                        onClick={() => setShowAllPending((v) => !v)}
                      >
                        {showAllPending ? "Show less" : `Show all (${pending.length})`}
                      </button>
                    )}
                  </section>
                )}
                {missing.length > 0 && (
                  <section className="monitor-officers-section" aria-labelledby={`monitor-${officer.id}-missing`}>
                    <h3 id={`monitor-${officer.id}-missing`} className="monitor-officers-section-title monitor-officers-section-missing">
                      <FaExclamationTriangle className="monitor-officers-section-icon" aria-hidden="true" />
                      Missing (overdue) ({missing.length})
                    </h3>
                    <div className="monitor-officers-task-list">
                      {missingItems.map((ut) => (
                        <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} isOverdue />
                      ))}
                    </div>
                    {missing.length > LIST_PREVIEW_LIMIT && (
                      <button
                        type="button"
                        className="monitor-officers-show-more-btn"
                        onClick={() => setShowAllMissing((v) => !v)}
                      >
                        {showAllMissing ? "Show less" : `Show all (${missing.length})`}
                      </button>
                    )}
                  </section>
                )}
                {completed.length > 0 && (
                  <section className="monitor-officers-section" aria-labelledby={`monitor-${officer.id}-completed`}>
                    <h3 id={`monitor-${officer.id}-completed`} className="monitor-officers-section-title monitor-officers-section-completed">
                      <FaCheckCircle className="monitor-officers-section-icon" aria-hidden="true" />
                      Completed ({completed.length})
                    </h3>
                    <div className="monitor-officers-task-list">
                      {completedItems.map((ut) => (
                        <TaskItem key={ut.id} userTask={ut} formatDate={formatDate} frequencyLabel={frequencyLabel} isCompleted />
                      ))}
                    </div>
                    {completed.length > LIST_PREVIEW_LIMIT && (
                      <button
                        type="button"
                        className="monitor-officers-show-more-btn"
                        onClick={() => setShowAllCompleted((v) => !v)}
                      >
                        {showAllCompleted ? "Show less" : `Show all (${completed.length})`}
                      </button>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
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
