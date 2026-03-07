import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import {
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUpload,
  FaKeyboard,
  FaSync,
  FaSpinner,
  FaUserCheck,
  FaUserEdit,
} from "react-icons/fa";
import "./AdminOfficerDashboard.css";
import "./MyTasks.css";

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
    one_time: "One time",
  };
  return map[freq] || (freq && freq.replace(/_/g, " ")) || "—";
}

/** Group user_tasks into pending, missing, submitted, completed (same logic as dashboard). */
function groupUserTasks(userTasks) {
  const today = new Date().toISOString().slice(0, 10);
  const pending = [];
  const missing = [];
  const submitted = [];
  const completed = [];

  for (const ut of userTasks || []) {
    const status = ut.status;
    const dueDate = ut.due_date;

    if (status === "completed") {
      completed.push(ut);
    } else if (status === "submitted") {
      submitted.push(ut);
    } else if (status === "pending" && dueDate && dueDate < today) {
      missing.push(ut);
    } else {
      pending.push(ut);
    }
  }

  return { pending, missing, submitted, completed };
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

function TaskSections({ pending, missing, submitted, completed }) {
  return (
    <div className="ao-dashboard-sections">
      <section className="ao-dashboard-section" aria-labelledby="my-tasks-pending-heading">
        <h2 id="my-tasks-pending-heading" className="ao-dashboard-section-title">
          <FaClock className="ao-dashboard-section-icon" aria-hidden="true" />
          Pending
        </h2>
        {pending.length === 0 ? (
          <p className="ao-dashboard-empty">No pending tasks.</p>
        ) : (
          <div className="ao-dashboard-task-list">
            {pending.map((ut) => (
              <TaskCard key={ut.id} userTask={ut} />
            ))}
          </div>
        )}
      </section>
      <section className="ao-dashboard-section" aria-labelledby="my-tasks-missing-heading">
        <h2 id="my-tasks-missing-heading" className="ao-dashboard-section-title ao-dashboard-section-missing">
          <FaExclamationTriangle className="ao-dashboard-section-icon" aria-hidden="true" />
          Missing (overdue)
        </h2>
        {missing.length === 0 ? (
          <p className="ao-dashboard-empty">No overdue tasks.</p>
        ) : (
          <div className="ao-dashboard-task-list">
            {missing.map((ut) => (
              <TaskCard key={ut.id} userTask={ut} isOverdue />
            ))}
          </div>
        )}
      </section>
      <section className="ao-dashboard-section" aria-labelledby="my-tasks-submitted-heading">
        <h2 id="my-tasks-submitted-heading" className="ao-dashboard-section-title">
          <FaCheckCircle className="ao-dashboard-section-icon" aria-hidden="true" />
          Submitted for validation
        </h2>
        {submitted.length === 0 ? (
          <p className="ao-dashboard-empty">No tasks awaiting validation.</p>
        ) : (
          <div className="ao-dashboard-task-list">
            {submitted.map((ut) => (
              <TaskCard key={ut.id} userTask={ut} isSubmitted />
            ))}
          </div>
        )}
      </section>
      <section className="ao-dashboard-section" aria-labelledby="my-tasks-completed-heading">
        <h2 id="my-tasks-completed-heading" className="ao-dashboard-section-title ao-dashboard-section-completed">
          <FaCheckCircle className="ao-dashboard-section-icon" aria-hidden="true" />
          Completed
        </h2>
        {completed.length === 0 ? (
          <p className="ao-dashboard-empty">No completed tasks yet.</p>
        ) : (
          <div className="ao-dashboard-task-list">
            {completed.map((ut) => (
              <TaskCard key={ut.id} userTask={ut} isCompleted />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const TAB_ASSIGNED = "assigned";
const TAB_PERSONAL = "personal";

export default function MyTasks() {
  const [loading, setLoading] = useState(true);
  const [userTasks, setUserTasks] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_ASSIGNED);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/my-tasks", { auth: true });
      setUserTasks(res?.user_tasks || []);
    } catch {
      setUserTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const assigned = userTasks.filter((ut) => !ut.task?.is_personal);
  const personal = userTasks.filter((ut) => ut.task?.is_personal);

  const assignedGrouped = groupUserTasks(assigned);
  const personalGrouped = groupUserTasks(personal);

  return (
    <div className="my-tasks-page page-transition-enter">
      <header className="ao-dashboard-header my-tasks-header">
        <div className="ao-dashboard-header-inner">
          <div className="ao-dashboard-header-text">
            <span className="ao-dashboard-title-icon" aria-hidden="true">
              <FaClipboardList />
            </span>
            <div>
              <h1 className="ao-dashboard-title">My tasks</h1>
              <p className="ao-dashboard-subtitle">
                View tasks assigned to you by Central Admin and your personal tasks in separate tabs.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ao-dashboard-refresh-btn"
            onClick={fetchTasks}
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
      </header>

      <div className="ao-tabs-wrap">
        <nav className="ao-tabs" role="tablist" aria-label="Task type">
          <button
            type="button"
            role="tab"
            id="tab-assigned"
            aria-selected={activeTab === TAB_ASSIGNED}
            aria-controls="panel-assigned"
            className={`ao-tab ${activeTab === TAB_ASSIGNED ? "ao-tab-active" : ""}`}
            onClick={() => setActiveTab(TAB_ASSIGNED)}
          >
            <FaUserCheck className="ao-tab-icon" aria-hidden="true" />
            <span>Assigned to me</span>
            <span className="ao-tab-count" aria-label={`${assigned.length} tasks`}>
              {assigned.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-personal"
            aria-selected={activeTab === TAB_PERSONAL}
            aria-controls="panel-personal"
            className={`ao-tab ${activeTab === TAB_PERSONAL ? "ao-tab-active" : ""}`}
            onClick={() => setActiveTab(TAB_PERSONAL)}
          >
            <FaUserEdit className="ao-tab-icon" aria-hidden="true" />
            <span>Personal tasks</span>
            <span className="ao-tab-count" aria-label={`${personal.length} tasks`}>
              {personal.length}
            </span>
          </button>
        </nav>

        {loading ? (
          <div className="ao-dashboard-loading">
            <FaSpinner className="spinner" aria-hidden="true" />
            <span>Loading tasks…</span>
          </div>
        ) : (
          <>
            <div
              id="panel-assigned"
              role="tabpanel"
              aria-labelledby="tab-assigned"
              hidden={activeTab !== TAB_ASSIGNED}
              className="ao-tab-panel"
            >
              <TaskSections
                pending={assignedGrouped.pending}
                missing={assignedGrouped.missing}
                submitted={assignedGrouped.submitted}
                completed={assignedGrouped.completed}
              />
            </div>
            <div
              id="panel-personal"
              role="tabpanel"
              aria-labelledby="tab-personal"
              hidden={activeTab !== TAB_PERSONAL}
              className="ao-tab-panel"
            >
              <TaskSections
                pending={personalGrouped.pending}
                missing={personalGrouped.missing}
                submitted={personalGrouped.submitted}
                completed={personalGrouped.completed}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
