import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FaUsers,
  FaSync,
  FaSpinner,
  FaInbox,
  FaEye,
  FaSearch,
  FaUserCheck,
  FaUserTimes,
  FaBan,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaClipboardList,
  FaClipboardCheck,
  FaTimesCircle,
  FaUserSlash,
} from "react-icons/fa";
import { apiRequest, normalizeLogoUrl } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import "./PersonnelDirectory.css";
import "./SchoolHeadAccounts.css";

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function statusLabel(status) {
  if (!status) return "—";
  switch (status) {
    case "active":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "inactive":
      return "Inactive";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
}

const PER_PAGE_OPTIONS = [5, 10, 25, 50];
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
];

export default function PersonnelDirectory() {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [detailsUser, setDetailsUser] = useState(null);
  const [detailsModalClosing, setDetailsModalClosing] = useState(false);
  const [detailsSchoolHeads, setDetailsSchoolHeads] = useState({ loading: false, items: [], error: null });

  const [deactivateUser, setDeactivateUser] = useState(null);
  const [deactivateModalClosing, setDeactivateModalClosing] = useState(false);
  const [deactivateRemarks, setDeactivateRemarks] = useState("");
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [approveUser, setApproveUser] = useState(null);
  const [approveModalClosing, setApproveModalClosing] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approveAssignDefaultTasks, setApproveAssignDefaultTasks] = useState(true);
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteModalClosing, setDeleteModalClosing] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activateUser, setActivateUser] = useState(null);
  const [activateModalClosing, setActivateModalClosing] = useState(false);
  const [activateRemarks, setActivateRemarks] = useState("");
  const [activateSubmitting, setActivateSubmitting] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [kpiModalStat, setKpiModalStat] = useState(null); // 'total'|'approved'|'rejected'|'inactive'
  const [kpiModalClosing, setKpiModalClosing] = useState(false);
  const filteredPersonnel = React.useMemo(() => {
    let list = personnel;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const empId = (p.employee_id || "").toLowerCase();
      const position = (p.position || "").toLowerCase();
      const division = (p.division || "").toLowerCase();
      const school = (p.school_name || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        position.includes(q) ||
        division.includes(q) ||
        school.includes(q)
      );
    });
  }, [personnel, statusFilter, searchQuery]);

  const totalItems = filteredPersonnel.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (pageIndex - 1) * perPage + 1;
  const endItem = Math.min(pageIndex * perPage, totalItems);
  const paginatedPersonnel = filteredPersonnel.slice(
    (pageIndex - 1) * perPage,
    pageIndex * perPage
  );

  const stats = React.useMemo(() => ({
    total: personnel.length,
    approved: personnel.filter((p) => p.status === "active").length,
    rejected: personnel.filter((p) => p.status === "rejected").length,
    inactive: personnel.filter((p) => p.status === "inactive").length,
  }), [personnel]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const fetchPersonnel = useCallback(async ({ silent = false } = {}) => {
    if (silent) setBackgroundRefreshing(true);
    else setLoading(true);
    try {
      // Show only personnel users (administrative_officer role). School Heads have a dedicated tab.
      const data = await apiRequest("/admin/personnel?role=administrative_officer", { auth: true });
      setPersonnel(Array.isArray(data?.personnel) ? data.personnel : []);
      setLastRefreshedAt(new Date().toISOString());
    } catch (err) {
      if (!silent) {
        showToast.error(err?.message || "Failed to load personnel.");
        setPersonnel([]);
      }
    } finally {
      if (silent) setBackgroundRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel({ silent: false });
  }, [fetchPersonnel]);

  // Auto-refresh in the background so personnel profile edits appear without manual refresh.
  useEffect(() => {
    if (!autoRefreshEnabled) return undefined;

    const intervalId = setInterval(() => {
      if (document.hidden) return;
      fetchPersonnel({ silent: true });
    }, 10000);

    const onVisibilityChange = () => {
      if (!document.hidden) fetchPersonnel({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autoRefreshEnabled, fetchPersonnel]);

  const handleCloseDetails = useCallback(() => {
    setDetailsModalClosing(true);
    setTimeout(() => {
      setDetailsModalClosing(false);
      setDetailsUser(null);
      setDetailsSchoolHeads({ loading: false, items: [], error: null });
    }, 200);
  }, []);

  const loadSchoolHeadsForUser = useCallback(async (userId) => {
    if (!userId) return;
    setDetailsSchoolHeads((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await apiRequest(`/admin/users/${userId}/school-heads`, { auth: true });
      const list = Array.isArray(res?.school_heads) ? res.school_heads : [];
      setDetailsSchoolHeads({ loading: false, items: list, error: null });
    } catch (err) {
      setDetailsSchoolHeads({ loading: false, items: [], error: err?.message || "Failed to load assigned School Head(s)." });
    }
  }, []);

  useEffect(() => {
    if (detailsUser?.role === "administrative_officer") {
      loadSchoolHeadsForUser(detailsUser.id);
    } else {
      setDetailsSchoolHeads({ loading: false, items: [], error: null });
    }
  }, [detailsUser?.id, detailsUser?.role, loadSchoolHeadsForUser]);

  const handleOpenActivate = (user) => {
    setActivateRemarks("");
    setActivateUser(user);
  };
  const handleCloseActivate = useCallback(() => {
    setActivateModalClosing(true);
    setShowActivateConfirm(false);
    setTimeout(() => {
      setActivateModalClosing(false);
      setActivateUser(null);
      setActivateRemarks("");
    }, 200);
  }, []);
  const handleActivateConfirmOpen = () => setShowActivateConfirm(true);
  const handleActivateConfirmCancel = () => setShowActivateConfirm(false);
  const handleActivateSubmit = async () => {
    if (!activateUser) return;
    setShowActivateConfirm(false);
    setActivateSubmitting(true);
    try {
      await apiRequest(`/admin/users/${activateUser.id}/activate`, {
        method: "POST",
        auth: true,
        body: { remarks: activateRemarks.trim() || undefined },
      });
      showToast.success(`Account activated: ${activateUser.name}`);
      handleCloseActivate();
      await fetchPersonnel({ silent: true });
    } catch (err) {
      showToast.error(err?.message || "Failed to activate account.");
    } finally {
      setActivateSubmitting(false);
    }
  };
  const handleOpenDeactivate = (user) => {
    setDeactivateRemarks("");
    setDeactivateUser(user);
  };
  const handleCloseDeactivate = useCallback(() => {
    setDeactivateModalClosing(true);
    setShowDeactivateConfirm(false);
    setTimeout(() => {
      setDeactivateModalClosing(false);
      setDeactivateUser(null);
      setDeactivateRemarks("");
    }, 200);
  }, []);
  const handleDeactivateConfirmOpen = () => setShowDeactivateConfirm(true);
  const handleDeactivateConfirmCancel = () => setShowDeactivateConfirm(false);
  const handleDeactivateSubmit = async () => {
    if (!deactivateUser) return;
    setShowDeactivateConfirm(false);
    setDeactivateSubmitting(true);
    try {
      await apiRequest(`/admin/users/${deactivateUser.id}/deactivate`, {
        method: "POST",
        auth: true,
        body: { remarks: deactivateRemarks.trim() || undefined },
      });
      showToast.success(`Account deactivated: ${deactivateUser.name}`);
      handleCloseDeactivate();
      await fetchPersonnel({ silent: true });
    } catch (err) {
      showToast.error(err?.message || "Failed to deactivate account.");
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  const handleOpenApprove = (user) => {
    setApproveRemarks("");
    setApproveAssignDefaultTasks(true);
    setApproveUser(user);
  };
  const handleCloseApprove = useCallback(() => {
    setApproveModalClosing(true);
    setShowApproveConfirm(false);
    setTimeout(() => {
      setApproveModalClosing(false);
      setApproveUser(null);
      setApproveRemarks("");
      setApproveAssignDefaultTasks(true);
    }, 200);
  }, []);
  const handleApproveConfirmOpen = () => setShowApproveConfirm(true);
  const handleApproveConfirmCancel = () => setShowApproveConfirm(false);
  const handleApproveSubmit = async () => {
    if (!approveUser) return;
    setShowApproveConfirm(false);
    setApproveSubmitting(true);
    try {
      await apiRequest(`/admin/users/${approveUser.id}/approve`, {
        method: "POST",
        auth: true,
        body: {
          remarks: approveRemarks.trim() || undefined,
          assign_default_tasks: approveUser.role === "administrative_officer" ? approveAssignDefaultTasks : undefined,
        },
      });
      showToast.success(`Account approved: ${approveUser.name}`);
      handleCloseApprove();
      await fetchPersonnel({ silent: true });
    } catch (err) {
      showToast.error(err?.message || "Failed to approve account.");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleOpenDelete = (user) => setDeleteUser(user);
  const handleCloseDelete = useCallback(() => {
    setDeleteModalClosing(true);
    setShowDeleteConfirm(false);
    setTimeout(() => {
      setDeleteModalClosing(false);
      setDeleteUser(null);
    }, 200);
  }, []);
  const handleDeleteConfirmOpen = () => setShowDeleteConfirm(true);
  const handleDeleteConfirmCancel = () => setShowDeleteConfirm(false);
  const handleDeleteSubmit = async () => {
    if (!deleteUser) return;
    setShowDeleteConfirm(false);
    setDeleteSubmitting(true);
    try {
      await apiRequest(`/admin/users/${deleteUser.id}`, {
        method: "DELETE",
        auth: true,
      });
      showToast.success(`User deleted: ${deleteUser.name}`);
      handleCloseDelete();
      await fetchPersonnel({ silent: true });
    } catch (err) {
      showToast.error(err?.message || "Failed to delete user.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    if (!detailsUser) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseDetails();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailsUser, handleCloseDetails]);

  useEffect(() => {
    if (!deactivateUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (deactivateSubmitting) return;
      if (showDeactivateConfirm) setShowDeactivateConfirm(false);
      else handleCloseDeactivate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deactivateUser, deactivateSubmitting, showDeactivateConfirm, handleCloseDeactivate]);

  useEffect(() => {
    if (!approveUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (approveSubmitting) return;
      if (showApproveConfirm) setShowApproveConfirm(false);
      else handleCloseApprove();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [approveUser, approveSubmitting, showApproveConfirm, handleCloseApprove]);

  useEffect(() => {
    if (!deleteUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (deleteSubmitting) return;
      if (showDeleteConfirm) setShowDeleteConfirm(false);
      else handleCloseDelete();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteUser, deleteSubmitting, showDeleteConfirm, handleCloseDelete]);

  useEffect(() => {
    if (!activateUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (activateSubmitting) return;
      if (showActivateConfirm) setShowActivateConfirm(false);
      else handleCloseActivate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activateUser, activateSubmitting, showActivateConfirm, handleCloseActivate]);

  const handleCloseKpi = useCallback(() => {
    if (kpiModalClosing) return;
    setKpiModalClosing(true);
    setTimeout(() => {
      setKpiModalClosing(false);
      setKpiModalStat(null);
    }, 200);
  }, [kpiModalClosing]);

  useEffect(() => {
    if (!kpiModalStat) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseKpi();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiModalStat, handleCloseKpi]);

  return (
    <div className="personnel-dir-page page-transition-enter">
      <header className="personnel-dir-header">
        <div className="personnel-dir-header-inner">
          <div className="personnel-dir-header-text">
            <span className="personnel-dir-title-icon" aria-hidden="true">
              <FaUsers />
            </span>
            <div>
              <h1 className="personnel-dir-title">Personnel directory</h1>
              <p className="personnel-dir-subtitle">
                View and manage approved, rejected, and inactive personnel.
              </p>
            </div>
          </div>
          <div className="personnel-dir-header-actions">
            <button
              type="button"
              className="personnel-dir-refresh-btn"
              onClick={() => fetchPersonnel({ silent: false })}
              disabled={loading}
              aria-label="Refresh list"
            >
              {loading ? (
                <FaSpinner className="spinner" aria-hidden="true" />
              ) : (
                <FaSync aria-hidden="true" />
              )}
              <span>Refresh</span>
            </button>

            <label className="personnel-dir-auto-refresh">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              />
              <span className="personnel-dir-auto-refresh-label">Auto-refresh</span>
            </label>

            <div className="personnel-dir-last-updated" aria-live="polite">
              {backgroundRefreshing
                ? "Updating…"
                : lastRefreshedAt
                  ? `Last updated: ${formatDateTime(lastRefreshedAt)}`
                  : "—"}
            </div>
          </div>
        </div>
      </header>

      {/* Summary KPI cards – corporate / government dashboard style */}
      {!loading && (
        <div className="personnel-dir-kpi-grid">
          <article
            className="personnel-dir-kpi-card personnel-dir-kpi-total"
            role="button"
            tabIndex={0}
            onClick={() => setKpiModalStat("total")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("total"))}
            aria-label={`Total personnel: ${formatCountFull(stats.total)}. View full count.`}
          >
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true">
              <FaClipboardList className="personnel-dir-kpi-icon" />
            </div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Total personnel</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.total)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
          <article
            className="personnel-dir-kpi-card personnel-dir-kpi-approved"
            role="button"
            tabIndex={0}
            onClick={() => setKpiModalStat("approved")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("approved"))}
            aria-label={`Approved: ${formatCountFull(stats.approved)}. View full count.`}
          >
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true">
              <FaClipboardCheck className="personnel-dir-kpi-icon" />
            </div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Approved</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.approved)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
          <article
            className="personnel-dir-kpi-card personnel-dir-kpi-rejected"
            role="button"
            tabIndex={0}
            onClick={() => setKpiModalStat("rejected")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("rejected"))}
            aria-label={`Rejected: ${formatCountFull(stats.rejected)}. View full count.`}
          >
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true">
              <FaTimesCircle className="personnel-dir-kpi-icon" />
            </div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Rejected</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.rejected)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
          <article
            className="personnel-dir-kpi-card personnel-dir-kpi-inactive"
            role="button"
            tabIndex={0}
            onClick={() => setKpiModalStat("inactive")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("inactive"))}
            aria-label={`Inactive: ${formatCountFull(stats.inactive)}. View full count.`}
          >
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true">
              <FaUserSlash className="personnel-dir-kpi-icon" />
            </div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Inactive</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.inactive)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
        </div>
      )}

      {/* KPI full amount modal */}
      {kpiModalStat &&
        createPortal(
          <div
            className="personnel-dir-overlay personnel-dir-kpi-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personnel-dir-kpi-modal-title"
            aria-describedby="personnel-dir-kpi-modal-desc"
          >
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation${kpiModalClosing ? " exit" : ""}`}
              onClick={handleCloseKpi}
              onKeyDown={(e) => e.key === "Enter" && handleCloseKpi()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap personnel-dir-kpi-modal-wrap">
              <div className={`personnel-dir-modal personnel-dir-kpi-modal modal-content-animation${kpiModalClosing ? " exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-kpi-modal-title" className="personnel-dir-modal-title">
                      {kpiModalStat === "total" && "Total personnel"}
                      {kpiModalStat === "approved" && "Approved personnel"}
                      {kpiModalStat === "rejected" && "Rejected personnel"}
                      {kpiModalStat === "inactive" && "Inactive personnel"}
                    </h2>
                    <p id="personnel-dir-kpi-modal-desc" className="personnel-dir-modal-subtitle">
                      Full count recorded in the system
                    </p>
                  </div>
                  <button
                    type="button"
                    className="personnel-dir-modal-close"
                    onClick={handleCloseKpi}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-kpi-modal-body">
                  <div className="personnel-dir-kpi-modal-value">
                    {formatCountFull(
                      kpiModalStat === "total" ? stats.total :
                      kpiModalStat === "approved" ? stats.approved :
                      kpiModalStat === "rejected" ? stats.rejected :
                      stats.inactive
                    )}
                  </div>
                  <p className="personnel-dir-kpi-modal-label">
                    {kpiModalStat === "total" && "Total personnel records"}
                    {kpiModalStat === "approved" && "Approved and active personnel"}
                    {kpiModalStat === "rejected" && "Rejected personnel records"}
                    {kpiModalStat === "inactive" && "Deactivated personnel records"}
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseKpi}>
                    Close
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {loading ? (
        <div className="personnel-dir-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading personnel…</span>
        </div>
      ) : (
        <div className="personnel-dir-card">
          <div className="personnel-dir-filter-panel">
            <div className="personnel-dir-filter-row">
              <label htmlFor="personnel-dir-status" className="personnel-dir-filter-label">
                Status
              </label>
              <select
                id="personnel-dir-status"
                className="personnel-dir-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label htmlFor="personnel-dir-search" className="personnel-dir-search-label">
                Search
              </label>
              <div className="personnel-dir-search-wrap">
                <span className="personnel-dir-search-icon-wrap">
                  <FaSearch className="personnel-dir-search-icon" aria-hidden="true" />
                </span>
                <div className="personnel-dir-search-input-wrap">
                  <input
                    id="personnel-dir-search"
                    type="search"
                    className="personnel-dir-search-input"
                    placeholder="Name, email, employee ID, position…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search personnel"
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
                  {filteredPersonnel.length} result{filteredPersonnel.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {filteredPersonnel.length === 0 ? (
            <div className="personnel-dir-empty-state">
              <FaInbox className="personnel-dir-empty-icon" aria-hidden="true" />
              <p className="personnel-dir-empty-title">No personnel found</p>
              <p className="personnel-dir-empty-text">
                {personnel.length === 0
                  ? "No approved, rejected, or inactive personnel in the system."
                  : "No results match your search or filter. Try different keywords or clear the filter."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  className="personnel-dir-empty-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="personnel-dir-cards-container">
                <div className="personnel-dir-cards-grid">
                  {paginatedPersonnel.map((p) => {
                    const isActionDisabled = !!deactivateUser || !!approveUser || !!deleteUser || !!activateUser;
                    return (
                      <div key={p.id} className="personnel-dir-card-col">
                        <div
                          className="personnel-dir-personnel-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => !isActionDisabled && setDetailsUser(p)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && !isActionDisabled) {
                              e.preventDefault();
                              setDetailsUser(p);
                            }
                          }}
                          aria-label={`View details for ${p.name}`}
                        >
                          {/* Top strip: full-width avatar (DATravelApp-style) */}
                          <div className="personnel-dir-card-top-strip">
                            {p.avatar_url || p.profile_avatar_url ? (
                              <img src={normalizeLogoUrl(p.avatar_url || p.profile_avatar_url) || (p.avatar_url || p.profile_avatar_url)} alt="" className="personnel-dir-card-top-img" />
                            ) : (
                              <div className="personnel-dir-card-top-initials" aria-hidden="true">
                                <span className="personnel-dir-avatar-initials">{getInitials(p.name)}</span>
                              </div>
                            )}
                          </div>

                          {/* Hover actions */}
                          <div className="personnel-dir-card-actions">
                            <button
                              type="button"
                              className="personnel-dir-card-btn personnel-dir-card-btn-view"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsUser(p);
                              }}
                              disabled={isActionDisabled}
                              aria-label={`View ${p.name}`}
                              title="View"
                            >
                              <FaEye aria-hidden="true" />
                            </button>
                            {p.status === "active" && (
                              <button
                                type="button"
                                className="personnel-dir-card-btn personnel-dir-card-btn-deactivate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeactivate(p);
                                }}
                                disabled={isActionDisabled}
                                aria-label={`Deactivate ${p.name}`}
                                title="Deactivate"
                              >
                                <FaBan aria-hidden="true" />
                              </button>
                            )}
                            {p.status === "inactive" && (
                              <button
                                type="button"
                                className="personnel-dir-card-btn personnel-dir-card-btn-activate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenActivate(p);
                                }}
                                disabled={isActionDisabled}
                                aria-label={`Activate ${p.name}`}
                                title="Activate"
                              >
                                <FaUserCheck aria-hidden="true" />
                              </button>
                            )}
                            {p.status === "rejected" && (
                              <button
                                type="button"
                                className="personnel-dir-card-btn personnel-dir-card-btn-approve"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenApprove(p);
                                }}
                                disabled={isActionDisabled}
                                aria-label={`Approve ${p.name}`}
                                title="Approve"
                              >
                                <FaUserCheck aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="personnel-dir-card-btn personnel-dir-card-btn-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete(p);
                              }}
                              disabled={isActionDisabled}
                              aria-label={`Delete ${p.name}`}
                              title="Delete"
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>

                          <div className="personnel-dir-card-body">
                            <div className="personnel-dir-card-name" title={p.name}>
                              {p.name}
                            </div>
                            <div className="personnel-dir-card-email" title={p.email}>
                              {p.email}
                            </div>
                            <div className="personnel-dir-card-divider" />
                            <div className="personnel-dir-card-row">
                              <span className="personnel-dir-card-label">Position</span>
                              <span className="personnel-dir-card-value" title={p.position || "—"}>
                                {p.position || "—"}
                              </span>
                            </div>
                            <div className="personnel-dir-card-row">
                              <span className="personnel-dir-card-label">Division</span>
                              <span className="personnel-dir-card-value" title={p.division || "—"}>
                                {p.division || "—"}
                              </span>
                            </div>
                            <div className="personnel-dir-card-footer">
                              <span className={`personnel-dir-status-badge personnel-dir-status-${p.status}`}>
                                {statusLabel(p.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                        aria-label="Rows per page"
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
                  <nav className="personnel-dir-pagination" aria-label="Table pagination">
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
      )}

      {/* View details modal – same structure as Account Approvals */}
      {detailsUser &&
        createPortal(
          <div
            className="personnel-dir-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personnel-dir-details-title"
            aria-describedby="personnel-dir-details-desc"
          >
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${detailsModalClosing ? "exit" : ""}`}
              onClick={handleCloseDetails}
              onKeyDown={(e) => e.key === "Enter" && handleCloseDetails()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal modal-content-animation ${detailsModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-details-title" className="personnel-dir-modal-title">
                      Personnel details
                    </h2>
                    <p id="personnel-dir-details-desc" className="personnel-dir-modal-subtitle">
                      {detailsUser.name}
                      {detailsUser.email ? ` · ${detailsUser.email}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="personnel-dir-modal-close"
                    onClick={handleCloseDetails}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="personnel-dir-modal-body">
                  <div className="personnel-dir-details-avatar-section">
                    <div className="personnel-dir-avatar personnel-dir-avatar-lg" aria-hidden="true">
                      {detailsUser.avatar_url || detailsUser.profile_avatar_url ? (
                        <img src={normalizeLogoUrl(detailsUser.avatar_url || detailsUser.profile_avatar_url) || (detailsUser.avatar_url || detailsUser.profile_avatar_url)} alt="" />
                      ) : (
                        <span className="personnel-dir-avatar-initials">{getInitials(detailsUser.name)}</span>
                      )}
                    </div>
                  </div>
                  <dl className="personnel-dir-details-grid">
                    <div className="personnel-dir-details-row">
                      <dt>Name</dt>
                      <dd>{detailsUser.name || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Email</dt>
                      <dd>{detailsUser.email || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Status</dt>
                      <dd>
                        <span className={`personnel-dir-status-badge personnel-dir-status-${detailsUser.status}`}>
                          {statusLabel(detailsUser.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Employee ID</dt>
                      <dd>{detailsUser.employee_id || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Position</dt>
                      <dd>{detailsUser.position || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Division</dt>
                      <dd>{detailsUser.division || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>School</dt>
                      <dd>{detailsUser.school_name || "—"}</dd>
                    </div>
                  </dl>

                  {/* Status information & remarks – professional, government-style block */}
                  {(detailsUser.status === "active" || detailsUser.status === "rejected" || detailsUser.status === "inactive") && (
                    <div className={`personnel-dir-details-remarks-block personnel-dir-details-remarks-${detailsUser.status}`}>
                      <h3 className="personnel-dir-details-remarks-title">Status information</h3>
                      {detailsUser.status === "active" && (
                        <>
                          {detailsUser.approved_at && (
                            <div className="personnel-dir-details-remarks-row">
                              <span className="personnel-dir-details-remarks-label">Approved on</span>
                              <span className="personnel-dir-details-remarks-value">{formatDateTime(detailsUser.approved_at)}</span>
                            </div>
                          )}
                          <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                            <span className="personnel-dir-details-remarks-label">Remarks</span>
                            <span className="personnel-dir-details-remarks-value">
                              {detailsUser.approved_remarks || "No remarks on file."}
                            </span>
                          </div>
                        </>
                      )}
                      {detailsUser.status === "rejected" && (
                        <>
                          {detailsUser.rejected_at && (
                            <div className="personnel-dir-details-remarks-row">
                              <span className="personnel-dir-details-remarks-label">Rejected on</span>
                              <span className="personnel-dir-details-remarks-value">{formatDateTime(detailsUser.rejected_at)}</span>
                            </div>
                          )}
                          <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                            <span className="personnel-dir-details-remarks-label">Remarks</span>
                            <span className="personnel-dir-details-remarks-value">
                              {detailsUser.rejection_remarks || "No remarks on file."}
                            </span>
                          </div>
                        </>
                      )}
                      {detailsUser.status === "inactive" && (
                        <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                          <span className="personnel-dir-details-remarks-label">Deactivation remarks</span>
                          <span className="personnel-dir-details-remarks-value">
                            {detailsUser.approved_remarks || "No remarks on file."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailsUser.role === "administrative_officer" && (
                    <section className="school-head-accounts-assignments-section personnel-dir-school-heads-section">
                      <h3 className="school-head-accounts-assignments-title">Assigned School Head(s)</h3>
                      {detailsSchoolHeads.loading ? (
                        <div className="school-head-accounts-assignments-loading">
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Loading…</span>
                        </div>
                      ) : detailsSchoolHeads.error ? (
                        <p className="school-head-accounts-assignments-error">
                          {detailsSchoolHeads.error}
                        </p>
                      ) : detailsSchoolHeads.items.length === 0 ? (
                        <p className="school-head-accounts-assignments-empty">
                          No School Head is currently assigned to this Administrative Officer.
                        </p>
                      ) : (
                        <ul className="school-head-accounts-assignments-list">
                          {detailsSchoolHeads.items.map((sh) => (
                            <li key={sh.id} className="school-head-accounts-assignments-item personnel-dir-school-head-item">
                              <div className="school-head-accounts-name-cell">
                                <div className="school-head-accounts-avatar" aria-hidden="true">
                                  <div className="school-head-accounts-avatar-placeholder">
                                    {getInitials(sh.name)}
                                  </div>
                                </div>
                                <div className="school-head-accounts-assignments-text">
                                  <div className="school-head-accounts-assignments-name" title={sh.name}>
                                    {sh.name}
                                  </div>
                                  <div className="school-head-accounts-assignments-meta">
                                    <span title={sh.school_name || "—"}>{sh.school_name || "—"}</span>
                                    {sh.position && (
                                      <>
                                        <span aria-hidden="true"> · </span>
                                        <span title={sh.position}>{sh.position}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}

                  <dl className="personnel-dir-details-grid personnel-dir-details-grid-footer">
                    <div className="personnel-dir-details-row">
                      <dt>Last updated</dt>
                      <dd>{formatDateTime(detailsUser.updated_at || detailsUser.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                <footer className="personnel-dir-modal-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDetails}>
                    Close
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Deactivate modal */}
      {deactivateUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="personnel-dir-deactivate-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${deactivateModalClosing ? "exit" : ""}`}
              onClick={() => !deactivateSubmitting && handleCloseDeactivate()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal modal-content-animation ${deactivateModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-deactivate-title" className="personnel-dir-modal-title">Deactivate account</h2>
                    <p className="personnel-dir-modal-subtitle">{deactivateUser.name}{deactivateUser.email ? ` · ${deactivateUser.email}` : ""}</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseDeactivate} disabled={deactivateSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <label htmlFor="personnel-dir-deactivate-remarks" className="personnel-dir-remarks-label">Remarks <span className="personnel-dir-remarks-optional">(optional)</span></label>
                  <textarea
                    id="personnel-dir-deactivate-remarks"
                    className="personnel-dir-remarks-textarea"
                    placeholder="Enter remarks for the record."
                    value={deactivateRemarks}
                    onChange={(e) => setDeactivateRemarks(e.target.value)}
                    rows={4}
                    disabled={deactivateSubmitting}
                  />
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDeactivate} disabled={deactivateSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-deactivate-modal" onClick={handleDeactivateConfirmOpen} disabled={deactivateSubmitting} aria-busy={deactivateSubmitting}>
                    {deactivateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deactivating…</span></> : <><FaUserTimes aria-hidden="true" /><span>Deactivate</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Deactivate confirmation overlay */}
      {deactivateUser && showDeactivateConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="personnel-dir-confirm-deactivate-title" aria-describedby="personnel-dir-confirm-deactivate-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleDeactivateConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleDeactivateConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-confirm-deactivate-title" className="personnel-dir-modal-title">Confirm deactivation</h2>
                    <p id="personnel-dir-confirm-deactivate-desc" className="personnel-dir-modal-subtitle">Deactivate this account?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to deactivate <strong>{deactivateUser.name}</strong>&apos;s account. The user will be logged out immediately and will not be able to sign in until reactivated. This action cannot be undone from this screen.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleDeactivateConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-deactivate-modal" onClick={handleDeactivateSubmit} disabled={deactivateSubmitting} aria-busy={deactivateSubmitting}>
                    {deactivateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deactivating…</span></> : <><FaUserTimes aria-hidden="true" /><span>Confirm deactivation</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Activate modal (inactive → active) */}
      {activateUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="personnel-dir-activate-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${activateModalClosing ? "exit" : ""}`}
              onClick={() => !activateSubmitting && handleCloseActivate()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal modal-content-animation ${activateModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-activate-title" className="personnel-dir-modal-title">Activate account</h2>
                    <p className="personnel-dir-modal-subtitle">{activateUser.name}{activateUser.email ? ` · ${activateUser.email}` : ""}</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseActivate} disabled={activateSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <label htmlFor="personnel-dir-activate-remarks" className="personnel-dir-remarks-label">Remarks <span className="personnel-dir-remarks-optional">(optional)</span></label>
                  <textarea
                    id="personnel-dir-activate-remarks"
                    className="personnel-dir-remarks-textarea"
                    placeholder="Enter remarks for the record."
                    value={activateRemarks}
                    onChange={(e) => setActivateRemarks(e.target.value)}
                    rows={4}
                    disabled={activateSubmitting}
                  />
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseActivate} disabled={activateSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-approve-modal" onClick={handleActivateConfirmOpen} disabled={activateSubmitting} aria-busy={activateSubmitting}>
                    {activateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Activating…</span></> : <><FaUserCheck aria-hidden="true" /><span>Activate</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Activate confirmation overlay */}
      {activateUser && showActivateConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="personnel-dir-confirm-activate-title" aria-describedby="personnel-dir-confirm-activate-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleActivateConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleActivateConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-confirm-activate-title" className="personnel-dir-modal-title">Confirm activation</h2>
                    <p id="personnel-dir-confirm-activate-desc" className="personnel-dir-modal-subtitle">Activate this account?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to activate <strong>{activateUser.name}</strong>&apos;s account. The user will be able to sign in again. This action cannot be undone from this screen.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleActivateConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-approve-modal" onClick={handleActivateSubmit} disabled={activateSubmitting} aria-busy={activateSubmitting}>
                    {activateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Activating…</span></> : <><FaUserCheck aria-hidden="true" /><span>Confirm activation</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Approve modal (rejected → active) */}
      {approveUser &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-action-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personnel-dir-approve-title"
            aria-describedby="personnel-dir-approve-desc"
          >
            <div
              className={`account-approvals-details-backdrop modal-backdrop-animation ${approveModalClosing ? "exit" : ""}`}
              onClick={() => !approveSubmitting && handleCloseApprove()}
              onKeyDown={(e) => e.key === "Enter" && !approveSubmitting && handleCloseApprove()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap">
              <div className={`account-approvals-details-modal account-approvals-action-modal modal-content-animation ${approveModalClosing ? "exit" : ""}`}>
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="personnel-dir-approve-title" className="account-approvals-details-title">
                      Approve account
                    </h2>
                    <p id="personnel-dir-approve-desc" className="account-approvals-details-subtitle">
                      {approveUser.name}
                      {approveUser.email ? ` · ${approveUser.email}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-approvals-details-close"
                    onClick={handleCloseApprove}
                    disabled={approveSubmitting}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="account-approvals-details-body">
                  <label htmlFor="personnel-dir-approve-remarks" className="account-approvals-remarks-label">
                    Approval remarks <span className="account-approvals-remarks-optional">(optional)</span>
                  </label>
                  <textarea
                    id="personnel-dir-approve-remarks"
                    className="account-approvals-remarks-textarea"
                    placeholder="Enter remarks for the personnel record. This will be visible in the user&apos;s profile."
                    value={approveRemarks}
                    onChange={(e) => setApproveRemarks(e.target.value)}
                    rows={4}
                    disabled={approveSubmitting}
                    aria-describedby="personnel-dir-approve-remarks-hint"
                  />
                  <p id="personnel-dir-approve-remarks-hint" className="account-approvals-remarks-hint">
                    Remarks are stored on the personnel record and displayed in the user&apos;s profile after approval.
                  </p>
                  {approveUser?.role === "administrative_officer" && (
                    <div className="account-approvals-approve-default-tasks">
                      <label className="account-approvals-checkbox-label">
                        <input
                          type="checkbox"
                          checked={approveAssignDefaultTasks}
                          onChange={(e) => setApproveAssignDefaultTasks(e.target.checked)}
                          disabled={approveSubmitting}
                          className="account-approvals-checkbox"
                        />
                        <span>Assign standard tasks from Task list</span>
                      </label>
                      <p className="account-approvals-checkbox-hint">
                        Automatically assign all current tasks from the central Task list with computed due dates so the user&apos;s task timeline is ready on first sign-in.
                      </p>
                    </div>
                  )}
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleCloseApprove}
                    disabled={approveSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-approve-modal"
                    onClick={handleApproveConfirmOpen}
                    disabled={approveSubmitting}
                    aria-busy={approveSubmitting}
                  >
                    {approveSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Approving…</span>
                      </>
                    ) : (
                      <>
                        <FaUserCheck aria-hidden="true" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Approve confirmation overlay */}
      {approveUser && showApproveConfirm &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-action-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="personnel-dir-confirm-approve-title"
            aria-describedby="personnel-dir-confirm-approve-desc"
          >
            <div
              className="account-approvals-details-backdrop modal-backdrop-animation"
              onClick={handleApproveConfirmCancel}
              onKeyDown={(e) => e.key === "Enter" && handleApproveConfirmCancel()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap account-approvals-confirm-wrap">
              <div className="account-approvals-details-modal account-approvals-confirm-modal modal-content-animation">
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="personnel-dir-confirm-approve-title" className="account-approvals-details-title">
                      Confirm approval
                    </h2>
                    <p id="personnel-dir-confirm-approve-desc" className="account-approvals-details-subtitle">
                      Approve this account?
                    </p>
                  </div>
                </div>
                <div className="account-approvals-details-body account-approvals-confirm-body">
                  <p className="account-approvals-confirm-text">
                    You are about to approve <strong>{approveUser.name}</strong>&apos;s account. This will grant the user access to the system.
                  </p>
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleApproveConfirmCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-approve-modal"
                    onClick={handleApproveSubmit}
                    disabled={approveSubmitting}
                    aria-busy={approveSubmitting}
                  >
                    {approveSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Approving…</span>
                      </>
                    ) : (
                      <>
                        <FaUserCheck aria-hidden="true" />
                        <span>Confirm approval</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete confirmation modal */}
      {deleteUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="personnel-dir-delete-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${deleteModalClosing ? "exit" : ""}`}
              onClick={() => !deleteSubmitting && handleCloseDelete()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal personnel-dir-confirm-modal modal-content-animation ${deleteModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header personnel-dir-reject-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-delete-title" className="personnel-dir-modal-title">Delete personnel account</h2>
                    <p className="personnel-dir-modal-subtitle">Permanent removal from the system. This action cannot be undone.</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseDelete} disabled={deleteSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <div className="personnel-dir-confirm-info">
                    <div className="personnel-dir-confirm-info-row">
                      <span className="personnel-dir-confirm-info-label">Name</span>
                      <span className="personnel-dir-confirm-info-value">{deleteUser.name}</span>
                    </div>
                    <div className="personnel-dir-confirm-info-row">
                      <span className="personnel-dir-confirm-info-label">Email</span>
                      <span className="personnel-dir-confirm-info-value">{deleteUser.email}</span>
                    </div>
                  </div>
                  <p className="personnel-dir-confirm-text">
                    This personnel account will be permanently removed from the system. All associated data will be deleted.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDelete} disabled={deleteSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-delete-modal" onClick={handleDeleteConfirmOpen} disabled={deleteSubmitting} aria-busy={deleteSubmitting}>
                    {deleteSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deleting…</span></> : <><FaTrash aria-hidden="true" /><span>Delete</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete confirmation overlay */}
      {deleteUser && showDeleteConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="personnel-dir-confirm-delete-title" aria-describedby="personnel-dir-confirm-delete-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleDeleteConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header personnel-dir-reject-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="personnel-dir-confirm-delete-title" className="personnel-dir-modal-title">Confirm deletion</h2>
                    <p id="personnel-dir-confirm-delete-desc" className="personnel-dir-modal-subtitle">Delete this personnel record?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to permanently delete <strong>{deleteUser.name}</strong>&apos;s account from the system. All associated data will be removed. This action cannot be undone.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleDeleteConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-delete-modal" onClick={handleDeleteSubmit} disabled={deleteSubmitting} aria-busy={deleteSubmitting}>
                    {deleteSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deleting…</span></> : <><FaTrash aria-hidden="true" /><span>Confirm deletion</span></>}
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
