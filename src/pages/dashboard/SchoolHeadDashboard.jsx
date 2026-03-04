import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaSpinner, FaClipboardCheck } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";

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
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (user?.role !== "school_head" || user?.status !== "active") {
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
    fetchReminders();
  }, [fetchReminders]);

  const handleReminderRead = async (reminderId) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    try {
      await apiRequest(`/reminders/${reminderId}/read`, { method: "POST", auth: true });
    } catch {
      // best-effort only; dashboard refresh will correct any mismatch
    }
  };

  const isActive = user?.status === "active";
  const showDashboard = isActive && user?.role === "school_head";

  return (
    <div className="page-transition-enter">
      <div className="row g-3">
        <div className="col-12">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h1 className="h4 fw-bold mb-1">School Head dashboard</h1>
              <p className="text-secondary mb-0">
                Welcome, <span className="fw-semibold">{user?.name ?? "User"}</span>. Monitor
                submissions from your personnel and review what needs validation.
              </p>
            </div>
          </div>
        </div>

        {showDashboard && (
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm rounded-4 h-100">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div className="d-flex align-items-start gap-2">
                    <span className="badge bg-light text-primary rounded-circle p-2 d-inline-flex align-items-center justify-content-center">
                      <FaBell aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="h6 fw-semibold mb-1">New submissions for validation</h2>
                      <p className="text-secondary small mb-0">
                        When Administrative Officers submit tasks, they appear here and in your
                        Validations page.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={fetchReminders}
                    disabled={remindersLoading}
                  >
                    {remindersLoading && (
                      <FaSpinner className="spinner-border spinner-border-sm" aria-hidden="true" />
                    )}
                    <span>Refresh</span>
                  </button>
                </div>

                {remindersLoading ? (
                  <div className="d-flex align-items-center gap-2 text-secondary small">
                    <FaSpinner className="spinner-border spinner-border-sm" aria-hidden="true" />
                    <span>Checking for new submissions…</span>
                  </div>
                ) : reminders.length === 0 ? (
                  <div className="d-flex flex-column align-items-start gap-2 text-secondary small">
                    <div className="d-flex align-items-center gap-2">
                      <FaClipboardCheck aria-hidden="true" className="text-success" />
                      <span>No new submissions awaiting your attention.</span>
                    </div>
                    <div>New submissions will appear here automatically.</div>
                  </div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {reminders.map((r) => {
                      const userTask = r.user_task || {};
                      const task = r.task || {};
                      const dueLabel = userTask.due_date ? formatDate(userTask.due_date) : "—";
                      const label =
                        r.type === "submission_pending"
                          ? "Submitted for your validation"
                          : "Notification";
                      return (
                        <li key={r.id} className="list-group-item px-0">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <div className="fw-semibold">
                                {task.name || "Task"}{" "}
                                <span className="badge bg-primary-subtle text-primary ms-1">
                                  {label}
                                </span>
                              </div>
                              <div className="small text-secondary">Due date: {dueLabel}</div>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-1">
                              <Link
                                to="/school-head/validations"
                                className="btn btn-link btn-sm p-0"
                                onClick={() => handleReminderRead(r.id)}
                              >
                                Open validations
                              </Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="col-12 col-lg-6">
          <div className="card rounded-4 h-100">
            <div className="card-body">
              <div className="fw-semibold mb-1">Performance evaluation</div>
              <div className="text-secondary small">
                System-computed performance reports for Administrative Officers will be available
                here in a future phase (Phase 8).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


