import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock, FaUpload, FaKeyboard, FaCheckCircle } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
import "./Calendar.css";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthYearTitle(date) {
  try {
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

function formatShortDate(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return ymd;
  }
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildCalendarGrid(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday

  const cells = [];
  const todayStr = ymdLocal(new Date());

  const startDate = new Date(year, month, 1 - firstDayOfWeek);

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const iso = ymdLocal(d);
    const inCurrentMonth = m === month;

    cells.push({
      date: d,
      dateStr: iso,
      label: day,
      inCurrentMonth,
      isToday: iso === todayStr,
    });
  }

  return cells;
}

function isOverdue(userTask) {
  return (
    userTask?.status === "pending" &&
    userTask?.due_date &&
    userTask.due_date < ymdLocal(new Date())
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [userTasks, setUserTasks] = useState([]);
  const [viewTab, setViewTab] = useState("assigned");
  const [monthDate, setMonthDate] = useState(() => startOfDay(new Date()));
  const [selectedDateStr, setSelectedDateStr] = useState(() => ymdLocal(new Date()));

  const fetchTasks = useCallback(async () => {
    if (user?.role !== "administrative_officer" || user?.status !== "active") {
      setLoading(false);
      setUserTasks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("/my-tasks", { auth: true });
      setUserTasks(res?.user_tasks || []);
    } catch {
      setUserTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.status]);

  useEffect(() => {
    if (location.pathname === "/dashboard/calendar") {
      fetchTasks();
    }
  }, [location.pathname, fetchTasks]);

  const isActive = user?.status === "active" && user?.role === "administrative_officer";

  const splitByPersonal = useMemo(() => {
    const isPersonal = (ut) => ut?.task?.is_personal === true;
    return {
      assigned: (userTasks || []).filter((ut) => !isPersonal(ut)),
      personal: (userTasks || []).filter(isPersonal),
    };
  }, [userTasks]);

  const tasksForView = viewTab === "personal" ? splitByPersonal.personal : splitByPersonal.assigned;

  const calendarCells = useMemo(() => buildCalendarGrid(monthDate), [monthDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const ut of tasksForView) {
      const key = ut?.due_date;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ut);
    }
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const an = (a.task?.name || "").toLowerCase();
        const bn = (b.task?.name || "").toLowerCase();
        return an.localeCompare(bn);
      });
    });
    return map;
  }, [tasksForView]);

  const selectedTasks = useMemo(() => tasksByDate[selectedDateStr] || [], [tasksByDate, selectedDateStr]);

  const stats = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let submitted = 0;
    let completed = 0;
    for (const ut of tasksForView) {
      if (ut.status === "completed") {
        completed++;
      } else if (ut.status === "submitted") {
        submitted++;
      } else if (isOverdue(ut)) {
        overdue++;
      } else if (ut.status === "pending") {
        pending++;
      }
    }
    return { pending, overdue, submitted, completed };
  }, [tasksForView]);

  const handlePrevMonth = () => {
    setMonthDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return startOfDay(d);
    });
  };

  const handleNextMonth = () => {
    setMonthDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return startOfDay(d);
    });
  };

  const handleToday = () => {
    const today = startOfDay(new Date());
    setMonthDate(today);
    setSelectedDateStr(ymdLocal(today));
  };

  return (
    <div className="calendar-page page-transition-enter">
      <PersonnelAccountStatus />

      {isActive && (
        <>
          <header className="calendar-header">
            <div className="calendar-header-inner">
              <div className="calendar-header-text">
                <span className="calendar-title-icon" aria-hidden="true">
                  <FaCalendarAlt />
                </span>
                <div>
                  <h1 className="calendar-title">Calendar</h1>
                  <p className="calendar-subtitle">
                    Monitor task due dates and reporting activities in a structured monthly calendar view.
                  </p>
                </div>
              </div>
              <div className="calendar-header-actions">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <FaChevronLeft aria-hidden="true" />
                </button>
                <div className="calendar-month-label" aria-live="polite">
                  {formatMonthYearTitle(monthDate)}
                </div>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <FaChevronRight aria-hidden="true" />
                </button>
                <button type="button" className="calendar-today-btn" onClick={handleToday}>
                  Today
                </button>
              </div>
            </div>
          </header>

          <section className="calendar-tabs-card" aria-label="Task scope">
            <div className="calendar-tabs-card-header">
              <div>
                <h2 className="calendar-tabs-title">Task scope</h2>
                <p className="calendar-tabs-subtitle">
                  Switch between tasks assigned by the Central Administrative Officer and your personal tasks.
                </p>
              </div>
            </div>
            <div className="calendar-tabbar" role="tablist" aria-label="Calendar task scope">
              <button
                type="button"
                role="tab"
                id="calendar-tab-assigned"
                aria-selected={viewTab === "assigned"}
                aria-controls="calendar-panel"
                className={`calendar-tab-btn ${viewTab === "assigned" ? "active" : ""}`}
                onClick={() => setViewTab("assigned")}
              >
                <span className="calendar-tab-btn-label">Assigned tasks</span>
                <span
                  className="calendar-tab-badge"
                  aria-label={`${splitByPersonal.assigned.length} assigned tasks`}
                >
                  {splitByPersonal.assigned.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="calendar-tab-personal"
                aria-selected={viewTab === "personal"}
                aria-controls="calendar-panel"
                className={`calendar-tab-btn ${viewTab === "personal" ? "active" : ""}`}
                onClick={() => setViewTab("personal")}
              >
                <span className="calendar-tab-btn-label">Personal tasks</span>
                <span
                  className="calendar-tab-badge"
                  aria-label={`${splitByPersonal.personal.length} personal tasks`}
                >
                  {splitByPersonal.personal.length}
                </span>
              </button>
            </div>
          </section>

          <section className="calendar-kpi-grid" aria-label="Task summary">
            <article className="calendar-kpi-card calendar-kpi-pending">
              <div className="calendar-kpi-icon-wrap" aria-hidden="true">
                <FaClock className="calendar-kpi-icon" />
              </div>
              <div className="calendar-kpi-body">
                <div className="calendar-kpi-label">Pending</div>
                <div className="calendar-kpi-value">{stats.pending}</div>
                <div className="calendar-kpi-hint">Due on or after today</div>
              </div>
            </article>
            <article className="calendar-kpi-card calendar-kpi-submitted">
              <div className="calendar-kpi-icon-wrap" aria-hidden="true">
                <FaCheckCircle className="calendar-kpi-icon" />
              </div>
              <div className="calendar-kpi-body">
                <div className="calendar-kpi-label">Submitted</div>
                <div className="calendar-kpi-value">{stats.submitted}</div>
                <div className="calendar-kpi-hint">Awaiting School Head validation</div>
              </div>
            </article>
            <article className="calendar-kpi-card calendar-kpi-overdue">
              <div className="calendar-kpi-icon-wrap" aria-hidden="true">
                <FaClock className="calendar-kpi-icon" />
              </div>
              <div className="calendar-kpi-body">
                <div className="calendar-kpi-label">Overdue</div>
                <div className="calendar-kpi-value">{stats.overdue}</div>
                <div className="calendar-kpi-hint">Past due and not yet submitted</div>
              </div>
            </article>
            <article className="calendar-kpi-card calendar-kpi-completed">
              <div className="calendar-kpi-icon-wrap" aria-hidden="true">
                <FaCheckCircle className="calendar-kpi-icon" />
              </div>
              <div className="calendar-kpi-body">
                <div className="calendar-kpi-label">Completed</div>
                <div className="calendar-kpi-value">{stats.completed}</div>
                <div className="calendar-kpi-hint">Validated and done</div>
              </div>
            </article>
          </section>

          {loading ? (
            <div className="calendar-loading">
              <span className="spinner" aria-hidden="true" />
              <span>Loading calendar…</span>
            </div>
          ) : tasksForView.length === 0 ? (
            <div className="calendar-empty">
              <FaCalendarAlt className="calendar-empty-icon" aria-hidden="true" />
              <p className="calendar-empty-title">
                {viewTab === "personal" ? "No personal tasks yet" : "No tasks assigned"}
              </p>
              <p className="calendar-empty-desc">
                {viewTab === "personal"
                  ? "Create a personal task to see it in your calendar."
                  : "Tasks assigned to you will appear on this calendar once created by the Central Administrative Officer."}
              </p>
            </div>
          ) : (
            <section
              id="calendar-panel"
              role="tabpanel"
              aria-labelledby={viewTab === "assigned" ? "calendar-tab-assigned" : "calendar-tab-personal"}
              className="calendar-layout"
            >
              <div className="calendar-grid-card" aria-label="Monthly calendar">
                <div className="calendar-grid-header">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="calendar-weekday">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="calendar-grid-body">
                  {calendarCells.map((cell) => {
                    const dayTasks = tasksByDate[cell.dateStr] || [];
                    const isSelected = cell.dateStr === selectedDateStr;
                    return (
                      <button
                        key={cell.dateStr + (cell.inCurrentMonth ? "" : "-o")}
                        type="button"
                        className={[
                          "calendar-day-cell",
                          cell.inCurrentMonth ? "" : "calendar-day-outside",
                          cell.isToday ? "calendar-day-today" : "",
                          isSelected ? "calendar-day-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedDateStr(cell.dateStr)}
                      >
                        <div className="calendar-day-label-row">
                          <span className="calendar-day-number">{cell.label}</span>
                          {cell.isToday && <span className="calendar-day-pill">Today</span>}
                        </div>
                        <div className="calendar-day-events">
                          {dayTasks.slice(0, 3).map((ut) => {
                            const isUpload = ut.task?.action === "upload";
                            const isCompleted = ut.status === "completed";
                            const isSubmitted = ut.status === "submitted";
                            const statusClass = isCompleted
                              ? "calendar-event-completed"
                              : isSubmitted
                              ? "calendar-event-submitted"
                              : isOverdue(ut)
                              ? "calendar-event-overdue"
                              : "calendar-event-pending";
                            return (
                              <span
                                key={ut.id}
                                className={`calendar-event-pill ${statusClass}`}
                                title={ut.task?.name || "Task"}
                              >
                                <span className="calendar-event-dot" aria-hidden="true" />
                                <span className="calendar-event-text">
                                  {ut.task?.name || "Task"}{" "}
                                  <span className="calendar-event-action">
                                    {isUpload ? <FaUpload aria-hidden="true" /> : <FaKeyboard aria-hidden="true" />}
                                  </span>
                                </span>
                              </span>
                            );
                          })}
                          {dayTasks.length > 3 && (
                            <span className="calendar-event-more">+{dayTasks.length - 3} more</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="calendar-side-panel" aria-label="Tasks for selected date">
                <header className="calendar-side-header">
                  <h2 className="calendar-side-title">Tasks on {formatShortDate(selectedDateStr)}</h2>
                  <p className="calendar-side-subtitle">
                    {selectedTasks.length === 0
                      ? "No tasks due on this date."
                      : `${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""} due on this date.`}
                  </p>
                </header>
                {selectedTasks.length === 0 ? (
                  <p className="calendar-side-empty">Choose another date on the calendar to view its tasks.</p>
                ) : (
                  <ul className="calendar-side-list">
                    {selectedTasks.map((ut) => {
                      const task = ut.task;
                      const isUpload = task?.action === "upload";
                      const isCompleted = ut.status === "completed";
                      const isSubmitted = ut.status === "submitted";
                      const statusText = isCompleted
                        ? "Completed"
                        : isSubmitted
                        ? "Submitted for validation"
                        : isOverdue(ut)
                        ? "Overdue"
                        : "Pending";
                      return (
                        <li key={ut.id} className="calendar-side-item">
                          <Link
                            to={`/dashboard/my-tasks/${ut.id}`}
                            className="calendar-side-link"
                          >
                            <div className="calendar-side-main">
                              <h3 className="calendar-side-task-name">{task?.name || "Task"}</h3>
                              <span className="calendar-side-status">{statusText}</span>
                            </div>
                            <div className="calendar-side-meta">
                              <span className="calendar-side-meta-date">Due {formatShortDate(ut.due_date)}</span>
                              <span className="calendar-side-meta-action">
                                {isUpload ? (
                                  <>
                                    <FaUpload aria-hidden="true" />
                                    <span>Upload</span>
                                  </>
                                ) : (
                                  <>
                                    <FaKeyboard aria-hidden="true" />
                                    <span>Input</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </section>
          )}
        </>
      )}

      {user?.role === "administrative_officer" && user?.status === "pending_approval" && (
        <div className="calendar-pending-note">
          <p className="mb-0 text-secondary small">
            Your calendar will be available once your account has been approved.
          </p>
        </div>
      )}
    </div>
  );
}

