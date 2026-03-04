import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import {
  FaList,
  FaPlus,
  FaSync,
  FaSpinner,
  FaInbox,
  FaUpload,
  FaKeyboard,
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaClipboardList,
  FaChevronRight,
  FaSearch,
  FaChevronLeft,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import "./TaskList.css";
import "./PersonnelDirectory.css";
import { computeNextDueDateYmd, formatDateLabel } from "../../utils/dueDateUtils";

const PER_PAGE_OPTIONS = [5, 10, 25, 50];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "twice_a_year", label: "Twice a year" },
  { value: "yearly", label: "Yearly" },
  { value: "end_of_sy", label: "End of school year" },
  { value: "quarterly", label: "Quarterly" },
  { value: "every_two_months", label: "Every 2 months" },
  { value: "once_or_twice_a_year", label: "Once or twice a year" },
];

function frequencyLabel(value) {
  return FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? value?.replace(/_/g, " ") ?? "—";
}

export default function TaskList() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [deleteTask, setDeleteTask] = useState(null);
  const [deleteTaskDetail, setDeleteTaskDetail] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteModalClosing, setDeleteModalClosing] = useState(false);
  const [kpiModalStat, setKpiModalStat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/admin/tasks", { auth: true });
      setTasks(res.tasks || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const location = useLocation();

  // Refetch when user navigates to this page so list reflects edits (e.g. after editing a task).
  useEffect(() => {
    if (location.pathname === "/central-admin/tasks") {
      fetchTasks();
    }
  }, [location.pathname, fetchTasks]);

  const handleDeleteClick = async (task) => {
    setDeleteTask(task);
    setShowDeleteConfirm(false);
    setDeleteTaskDetail(null);
    try {
      const res = await apiRequest(`/admin/tasks/${task.id}`, { auth: true });
      setDeleteTaskDetail({ ...res.task, assignments_count: res.assignments_count ?? 0 });
    } catch {
      setDeleteTaskDetail({ ...task, assignments_count: 0 });
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTask) return;
    setDeleteSubmitting(true);
    try {
      await apiRequest(`/admin/tasks/${deleteTask.id}`, {
        method: "DELETE",
        auth: true,
      });
      showToast.success("Task deleted successfully.");
      handleCloseDeleteModal();
      fetchTasks();
    } catch (err) {
      showToast.error(err?.message || "Failed to delete task.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalClosing(true);
    setShowDeleteConfirm(false);
    setTimeout(() => {
      setDeleteModalClosing(false);
      setDeleteTask(null);
      setDeleteTaskDetail(null);
    }, 200);
  }, []);

  useEffect(() => {
    if (!deleteTask) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (deleteSubmitting) return;
      if (showDeleteConfirm) handleCloseDeleteModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteTask, deleteSubmitting, showDeleteConfirm, handleCloseDeleteModal]);

  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.is_common && !b.is_common) return -1;
      if (!a.is_common && b.is_common) return 1;
      if (a.is_common && b.is_common && a.common_report_no != null && b.common_report_no != null) {
        return (a.common_report_no ?? 0) - (b.common_report_no ?? 0);
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [tasks]);

  const filteredTasks = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedTasks;
    return sortedTasks.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const mov = (t.mov_description || "").toLowerCase();
      const dueRule = (t.submission_date_rule || "").toLowerCase();
      const freqLabel = frequencyLabel(t.frequency).toLowerCase();
      const action = (t.action === "upload" ? "upload" : "input").toLowerCase();
      return (
        name.includes(q) ||
        mov.includes(q) ||
        dueRule.includes(q) ||
        freqLabel.includes(q) ||
        action.includes(q)
      );
    });
  }, [sortedTasks, searchQuery]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (pageIndex - 1) * perPage + 1;
  const endItem = Math.min(pageIndex * perPage, totalItems);
  const paginatedTasks = filteredTasks.slice(
    (pageIndex - 1) * perPage,
    pageIndex * perPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const stats = React.useMemo(() => ({
    total: tasks.length,
  }), [tasks]);

  useEffect(() => {
    if (!kpiModalStat) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setKpiModalStat(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiModalStat]);

  return (
    <div className="task-list-page page-transition-enter">
      <header className="task-list-header">
        <div className="task-list-header-inner">
          <div className="task-list-header-text">
            <span className="task-list-title-icon" aria-hidden="true">
              <FaList />
            </span>
            <div>
              <h1 className="task-list-title">Task list</h1>
              <p className="task-list-subtitle">
                Central task management. Create tasks or assign to designated personnel.
              </p>
            </div>
          </div>
          <div className="task-list-header-actions">
            <button
              type="button"
              className="task-list-refresh-btn"
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
            <Link
              to="/central-admin/tasks/assign"
              className="task-list-assign-btn"
              aria-label="Assign task"
            >
              <FaUserPlus aria-hidden="true" />
              <span>Assign task</span>
            </Link>
            <Link
              to="/central-admin/tasks/create"
              className="task-list-create-btn"
              aria-label="Create task"
            >
              <FaPlus aria-hidden="true" />
              <span>Create task</span>
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="task-list-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading tasks…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="task-list-empty">
          <FaInbox className="task-list-empty-icon" aria-hidden="true" />
          <p className="task-list-empty-title">No tasks yet</p>
          <p className="task-list-empty-desc">
            Default reports are available in the system. Create additional tasks or assign existing tasks to personnel.
          </p>
          <Link to="/central-admin/tasks/create" className="task-list-create-btn task-list-create-btn-empty">
            <FaPlus aria-hidden="true" />
            Create task
          </Link>
        </div>
      ) : (
        <>
          {/* Summary KPI card – corporate / government dashboard style */}
          <div className="personnel-dir-kpi-grid task-list-kpi-grid">
            <article
              className="personnel-dir-kpi-card personnel-dir-kpi-total"
              role="button"
              tabIndex={0}
              onClick={() => setKpiModalStat("total")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("total"))}
              aria-label={`Total tasks: ${stats.total}. View full count.`}
            >
              <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true">
                <FaClipboardList className="personnel-dir-kpi-icon" />
              </div>
              <div className="personnel-dir-kpi-body">
                <p className="personnel-dir-kpi-label">Total tasks</p>
                <p className="personnel-dir-kpi-value">{stats.total}</p>
                <p className="personnel-dir-kpi-hint">View full count</p>
              </div>
              <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
            </article>
          </div>

          <div className="personnel-dir-card">
            <div className="personnel-dir-filter-panel">
              <div className="personnel-dir-filter-row">
                <label htmlFor="task-list-search" className="personnel-dir-search-label">
                  Search
                </label>
                <div className="personnel-dir-search-wrap">
                  <span className="personnel-dir-search-icon-wrap">
                    <FaSearch className="personnel-dir-search-icon" aria-hidden="true" />
                  </span>
                  <div className="personnel-dir-search-input-wrap">
                    <input
                      id="task-list-search"
                      type="search"
                      className="personnel-dir-search-input"
                      placeholder="Task name, due rule, MOV, frequency, action…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search tasks"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="personnel-dir-search-clear"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {searchQuery && (
                  <span className="personnel-dir-results-text">
                    {filteredTasks.length} result{filteredTasks.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="personnel-dir-empty-state">
                <FaInbox className="personnel-dir-empty-icon" aria-hidden="true" />
                <p className="personnel-dir-empty-title">No tasks found</p>
                <p className="personnel-dir-empty-text">
                  {tasks.length === 0
                    ? "No tasks in the system. Create a task to get started."
                    : "No results match your search. Try different keywords or clear the search."}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    className="personnel-dir-empty-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="personnel-dir-cards-container">
                  <div className="task-list-grid task-list-grid-in-card" role="list" aria-label="Task list">
                    {paginatedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onDelete={() => handleDeleteClick(task)} />
                    ))}
                  </div>

                  <footer className="personnel-dir-table-footer">
                    <div className="personnel-dir-footer-left">
                      <label className="personnel-dir-perpage-label">
                        <span className="personnel-dir-perpage-text">Show</span>
                        <select
                          className="personnel-dir-perpage-select"
                          value={perPage}
                          onChange={(e) => {
                            setPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          aria-label="Tasks per page"
                        >
                          {PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span className="personnel-dir-perpage-text">per page</span>
                      </label>
                      <span className="personnel-dir-range">
                        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong>
                      </span>
                    </div>
                    <nav className="personnel-dir-pagination" aria-label="Task list pagination">
                      <div className="personnel-dir-pagination-inner">
                        <button
                          type="button"
                          className="personnel-dir-page-btn"
                          onClick={() => goToPage(1)}
                          disabled={pageIndex <= 1}
                          aria-label="First page"
                        >
                          <FaAngleDoubleLeft aria-hidden="true" />
                          <span className="personnel-dir-page-btn-text">First</span>
                        </button>
                        <button
                          type="button"
                          className="personnel-dir-page-btn"
                          onClick={() => goToPage(pageIndex - 1)}
                          disabled={pageIndex <= 1}
                          aria-label="Previous page"
                        >
                          <FaChevronLeft aria-hidden="true" />
                          <span className="personnel-dir-page-btn-text">Previous</span>
                        </button>
                        <div className="personnel-dir-page-numbers">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (pageIndex <= 3) pageNum = i + 1;
                            else if (pageIndex >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = pageIndex - 2 + i;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                className={`personnel-dir-page-btn personnel-dir-page-num ${pageNum === pageIndex ? "active" : ""}`}
                                onClick={() => goToPage(pageNum)}
                                disabled={pageNum === pageIndex}
                                aria-label={`Page ${pageNum}`}
                                aria-current={pageNum === pageIndex ? "page" : undefined}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="personnel-dir-page-btn"
                          onClick={() => goToPage(pageIndex + 1)}
                          disabled={pageIndex >= totalPages}
                          aria-label="Next page"
                        >
                          <span className="personnel-dir-page-btn-text">Next</span>
                          <FaChevronRight aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="personnel-dir-page-btn"
                          onClick={() => goToPage(totalPages)}
                          disabled={pageIndex >= totalPages}
                          aria-label="Last page"
                        >
                          <span className="personnel-dir-page-btn-text">Last</span>
                          <FaAngleDoubleRight aria-hidden="true" />
                        </button>
                      </div>
                    </nav>
                  </footer>
                </div>
              </>
            )}
          </div>

          {/* KPI full count modal */}
          {kpiModalStat &&
            createPortal(
              <div
                className="personnel-dir-overlay personnel-dir-kpi-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-list-kpi-modal-title"
                aria-describedby="task-list-kpi-modal-desc"
              >
                <div
                  className="personnel-dir-backdrop modal-backdrop-animation"
                  onClick={() => setKpiModalStat(null)}
                  onKeyDown={(e) => e.key === "Enter" && setKpiModalStat(null)}
                  role="button"
                  tabIndex={0}
                  aria-label="Close"
                />
                <div className="personnel-dir-wrap personnel-dir-kpi-modal-wrap">
                  <div className="personnel-dir-modal personnel-dir-kpi-modal modal-content-animation">
                    <div className="personnel-dir-modal-header">
                      <div>
                        <h2 id="task-list-kpi-modal-title" className="personnel-dir-modal-title">
                          Total tasks
                        </h2>
                        <p id="task-list-kpi-modal-desc" className="personnel-dir-modal-subtitle">
                          Full count recorded in the system
                        </p>
                      </div>
                      <button
                        type="button"
                        className="personnel-dir-modal-close"
                        onClick={() => setKpiModalStat(null)}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    <div className="personnel-dir-modal-body personnel-dir-kpi-modal-body">
                      <div className="personnel-dir-kpi-modal-value">
                        {stats.total}
                      </div>
                      <p className="personnel-dir-kpi-modal-label">
                        Total tasks in the system
                      </p>
                      <button type="button" className="personnel-dir-btn-close" onClick={() => setKpiModalStat(null)}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}

      {deleteTask && showDeleteConfirm &&
        createPortal(
          <div
            className="task-list-delete-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="task-list-delete-title"
            aria-describedby="task-list-delete-desc"
          >
            <div
              className={`task-list-delete-backdrop modal-backdrop-animation ${deleteModalClosing ? "exit" : ""}`}
              onClick={() => !deleteSubmitting && handleCloseDeleteModal()}
              onKeyDown={(e) => e.key === "Enter" && !deleteSubmitting && handleCloseDeleteModal()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="task-list-delete-wrap">
              <div className={`task-list-delete-modal modal-content-animation ${deleteModalClosing ? "exit" : ""}`}>
                <div className="task-list-delete-header">
                  <h2 id="task-list-delete-title" className="task-list-delete-title">
                    Delete task
                  </h2>
                  <p id="task-list-delete-desc" className="task-list-delete-subtitle">
                    {deleteTask.name}
                  </p>
                </div>
                <div className="task-list-delete-body">
                  <p className="task-list-delete-text">
                    You are about to delete <strong>{deleteTask.name}</strong>.
                    {deleteTaskDetail?.assignments_count > 0 && (
                      <> This task has <strong>{deleteTaskDetail.assignments_count}</strong> assignment(s). Deleting will remove all of them.</>
                    )}
                    {" "}This action cannot be undone.
                  </p>
                </div>
                <div className="task-list-delete-footer">
                  <button
                    type="button"
                    className="task-list-delete-btn-cancel"
                    onClick={handleCloseDeleteModal}
                    disabled={deleteSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="task-list-delete-btn-confirm"
                    onClick={handleDeleteConfirm}
                    disabled={deleteSubmitting}
                    aria-busy={deleteSubmitting}
                  >
                    {deleteSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Deleting…</span>
                      </>
                    ) : (
                      <>
                        <FaTrash aria-hidden="true" />
                        <span>Delete task</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function TaskCard({ task, onDelete }) {
  const isUpload = task?.action === "upload";
  const nextDue = React.useMemo(() => computeNextDueDateYmd({
    frequency: task?.frequency,
    submission_date_rule: task?.submission_date_rule,
  }), [task?.frequency, task?.submission_date_rule]);

  return (
    <article className="task-list-card">
      <div className="task-list-card-body">
        <div className="task-list-card-header">
          <h3 className="task-list-card-title">{task?.name ?? "Task"}</h3>
        </div>
        <div className="task-list-card-meta">
          <span className="task-list-card-frequency">{frequencyLabel(task?.frequency)}</span>
          <span className="task-list-card-action">
            {isUpload ? (
              <>
                <FaUpload className="task-list-card-action-icon" aria-hidden="true" />
                Upload
              </>
            ) : (
              <>
                <FaKeyboard className="task-list-card-action-icon" aria-hidden="true" />
                Input
              </>
            )}
          </span>
        </div>
        <p className="task-list-card-due">
          <span className="task-list-card-due-label">Next due date:</span> {formatDateLabel(nextDue)}
        </p>
        {task?.mov_description && (
          <p className="task-list-card-mov">
            <span className="task-list-card-mov-label">MOV:</span> {task.mov_description}
          </p>
        )}
        <div className="task-list-card-actions">
          <Link
            to={`/central-admin/tasks/${task.id}/assign`}
            className="task-list-card-btn task-list-card-btn-assign"
            aria-label={`Assign ${task?.name}`}
          >
            <FaUserPlus aria-hidden="true" />
            <span>Assign</span>
          </Link>
          <Link
            to={`/central-admin/tasks/${task.id}/edit`}
            className="task-list-card-btn task-list-card-btn-edit"
            aria-label={`Edit ${task?.name}`}
          >
            <FaEdit aria-hidden="true" />
            <span>Edit</span>
          </Link>
          <button
            type="button"
            className="task-list-card-btn task-list-card-btn-delete"
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            aria-label={`Delete ${task?.name}`}
          >
            <FaTrash aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export { FREQUENCY_OPTIONS };
