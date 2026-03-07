import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaSpinner,
  FaUpload,
} from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
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

export default function Submissions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTasks, setUserTasks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiRequest("/my-tasks", { auth: true })
      .then((res) => {
        if (cancelled) return;
        const tasks = Array.isArray(res?.user_tasks) ? res.user_tasks : [];
        setUserTasks(tasks);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load submissions.");
        setUserTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { submitted, completed } = useMemo(() => {
    const submittedTasks = [];
    const completedTasks = [];

    for (const ut of userTasks) {
      if (!ut?.task) continue;
      if (ut.status === "submitted") {
        submittedTasks.push(ut);
      } else if (ut.status === "completed") {
        completedTasks.push(ut);
      }
    }

    const byDueDateDesc = (a, b) => {
      const ad = a?.due_date || "";
      const bd = b?.due_date || "";
      if (ad === bd) return (b.id || 0) - (a.id || 0);
      return ad < bd ? 1 : -1;
    };

    submittedTasks.sort(byDueDateDesc);
    completedTasks.sort(byDueDateDesc);

    return {
      submitted: submittedTasks,
      completed: completedTasks,
    };
  }, [userTasks]);

  const [tab, setTab] = useState("submitted");

  const submittedCount = submitted.length;
  const completedCount = completed.length;

  return (
    <div className="ao-dashboard-page page-transition-enter">
      <PersonnelAccountStatus />

      <header className="ao-dashboard-header">
        <div className="ao-dashboard-header-inner">
          <div className="ao-dashboard-header-text">
            <span className="ao-dashboard-title-icon" aria-hidden="true">
              <FaClipboardList />
            </span>
            <div>
              <h1 className="ao-dashboard-title">My submissions</h1>
              <p className="ao-dashboard-subtitle">
                View reports you have submitted for validation and those already
                completed, in a clear and organized list.
              </p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="ao-dashboard-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading submissions…</span>
        </div>
      ) : error ? (
        <div className="ao-dashboard-section">
          <p className="ao-dashboard-empty">{error}</p>
        </div>
      ) : (
        <>
          <div className="ao-dashboard-kpi-grid">
            <article
              className="ao-dashboard-kpi-card ao-dashboard-kpi-submitted"
              aria-label={`Submitted for validation: ${submittedCount}`}
            >
              <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaUpload className="ao-dashboard-kpi-icon" />
              </div>
              <div className="ao-dashboard-kpi-body">
                <p className="ao-dashboard-kpi-label">Submitted for validation</p>
                <p className="ao-dashboard-kpi-value">{submittedCount}</p>
                <p className="ao-dashboard-kpi-hint">
                  Tasks already forwarded to the School Head.
                </p>
              </div>
            </article>
            <article
              className="ao-dashboard-kpi-card ao-dashboard-kpi-completed"
              aria-label={`Completed: ${completedCount}`}
            >
              <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaCheckCircle className="ao-dashboard-kpi-icon" />
              </div>
              <div className="ao-dashboard-kpi-body">
                <p className="ao-dashboard-kpi-label">Completed</p>
                <p className="ao-dashboard-kpi-value">{completedCount}</p>
                <p className="ao-dashboard-kpi-hint">
                  Tasks with approved validation or marked done.
                </p>
              </div>
            </article>
          </div>

          <div className="ao-tabs-wrap">
            <nav
              className="ao-tabs"
              role="tablist"
              aria-label="Submission status"
            >
              <button
                type="button"
                role="tab"
                id="submissions-tab-submitted"
                aria-selected={tab === "submitted"}
                aria-controls="submissions-panel-submitted"
                className={`ao-tab ${tab === "submitted" ? "ao-tab-active" : ""}`}
                onClick={() => setTab("submitted")}
              >
                <FaClock className="ao-tab-icon" aria-hidden="true" />
                <span>Awaiting validation</span>
                <span
                  className="ao-tab-count"
                  aria-label={`${submittedCount} submissions awaiting validation`}
                >
                  {submittedCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="submissions-tab-completed"
                aria-selected={tab === "completed"}
                aria-controls="submissions-panel-completed"
                className={`ao-tab ${tab === "completed" ? "ao-tab-active" : ""}`}
                onClick={() => setTab("completed")}
              >
                <FaCheckCircle className="ao-tab-icon" aria-hidden="true" />
                <span>Completed</span>
                <span
                  className="ao-tab-count"
                  aria-label={`${completedCount} completed submissions`}
                >
                  {completedCount}
                </span>
              </button>
            </nav>

            <div
              id="submissions-panel-submitted"
              role="tabpanel"
              aria-labelledby="submissions-tab-submitted"
              hidden={tab !== "submitted"}
              className="ao-tab-panel"
            >
              <section
                className="ao-dashboard-section"
                aria-labelledby="submissions-submitted-heading"
              >
                <h2
                  id="submissions-submitted-heading"
                  className="ao-dashboard-section-title"
                >
                  <FaUpload
                    className="ao-dashboard-section-icon"
                    aria-hidden="true"
                  />
                  Submitted for validation
                </h2>
                {submitted.length === 0 ? (
                  <p className="ao-dashboard-empty">
                    You have no tasks currently awaiting validation.
                  </p>
                ) : (
                  <div className="ao-dashboard-task-list">
                    {submitted.map((ut) => (
                      <SubmissionCard key={ut.id} userTask={ut} status="submitted" />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div
              id="submissions-panel-completed"
              role="tabpanel"
              aria-labelledby="submissions-tab-completed"
              hidden={tab !== "completed"}
              className="ao-tab-panel"
            >
              <section
                className="ao-dashboard-section"
                aria-labelledby="submissions-completed-heading"
              >
                <h2
                  id="submissions-completed-heading"
                  className="ao-dashboard-section-title ao-dashboard-section-completed"
                >
                  <FaCheckCircle
                    className="ao-dashboard-section-icon"
                    aria-hidden="true"
                  />
                  Completed submissions
                </h2>
                {completed.length === 0 ? (
                  <p className="ao-dashboard-empty">
                    You have no completed submissions yet.
                  </p>
                ) : (
                  <div className="ao-dashboard-task-list">
                    {completed.map((ut) => (
                      <SubmissionCard key={ut.id} userTask={ut} status="completed" />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SubmissionCard({ userTask, status }) {
  const task = userTask?.task;
  const isUpload = task?.action === "upload";

  return (
    <Link
      to={`/dashboard/my-tasks/${userTask?.id}`}
      className={`ao-dashboard-task-card ao-dashboard-task-card-link ${
        status === "completed" ? "ao-dashboard-task-card-completed" : "ao-dashboard-task-card-submitted"
      }`}
    >
      <div className="ao-dashboard-task-card-body">
        <div className="ao-dashboard-task-card-header">
          <h3 className="ao-dashboard-task-card-title">
            {task?.name ?? "Task"}
          </h3>
          <span className="ao-dashboard-task-card-due">
            {formatDate(userTask?.due_date)}
          </span>
        </div>
        <div className="ao-dashboard-task-card-meta">
          <span className="ao-dashboard-task-card-frequency">
            {task?.frequency ? task.frequency.replace(/_/g, " ") : "—"}
          </span>
          <span className="ao-dashboard-task-card-action">
            {isUpload ? (
              <>
                <FaUpload
                  className="ao-dashboard-task-card-action-icon"
                  aria-hidden="true"
                />
                Upload
              </>
            ) : (
              <>
                <FaClipboardList
                  className="ao-dashboard-task-card-action-icon"
                  aria-hidden="true"
                />
                Input
              </>
            )}
          </span>
        </div>
        {task?.mov_description && (
          <p className="ao-dashboard-task-card-mov">
            <span className="ao-dashboard-task-card-mov-label">MOV:</span>{" "}
            {task.mov_description}
          </p>
        )}
      </div>
    </Link>
  );
}

