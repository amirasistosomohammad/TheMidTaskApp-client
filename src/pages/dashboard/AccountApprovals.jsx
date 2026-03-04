import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaUserCheck, FaUserTimes, FaSpinner, FaInbox, FaSync, FaStamp, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaEye, FaSearch } from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import "./AccountApprovals.css";

function roleLabel(role) {
  if (!role) return "—";
  switch (role) {
    case "administrative_officer":
      return "Administrative Officer";
    case "school_head":
      return "School Head";
    case "central_admin":
      return "Central Administrative Officer";
    default:
      return role.replace(/_/g, " ");
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
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

export default function AccountApprovals() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsUser, setDetailsUser] = useState(null); // user for View details modal
  const [detailsModalClosing, setDetailsModalClosing] = useState(false);
  const [approveModalUser, setApproveModalUser] = useState(null);
  const [approveModalClosing, setApproveModalClosing] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approveAssignDefaultTasks, setApproveAssignDefaultTasks] = useState(true);
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [rejectModalUser, setRejectModalUser] = useState(null);
  const [rejectModalClosing, setRejectModalClosing] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side search: filter by name, email, employee ID, position (case-insensitive)
  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const empId = (u.employee_id || "").toLowerCase();
      const position = (u.position || "").toLowerCase();
      const division = (u.division || "").toLowerCase();
      const school = (u.school_name || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        position.includes(q) ||
        division.includes(q) ||
        school.includes(q)
      );
    });
  }, [users, searchQuery]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (pageIndex - 1) * perPage + 1;
  const endItem = Math.min(pageIndex * perPage, totalItems);
  const paginatedUsers = filteredUsers.slice((pageIndex - 1) * perPage, pageIndex * perPage);

  // Clamp page when perPage, data, or search changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const fetchPending = useCallback(async () => {
    try {
      const data = await apiRequest("/admin/pending-users", { auth: true });
      setUsers(Array.isArray(data?.users) ? data.users : []);
      window.dispatchEvent(
        new CustomEvent("account-approvals-updated", { detail: { count: (data?.users || []).length } })
      );
    } catch (err) {
      showToast.error(err?.message || "Failed to load pending accounts.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = (user) => {
    setApproveRemarks("");
    setApproveAssignDefaultTasks(true);
    setApproveModalUser(user);
  };

  const handleApproveSubmit = async () => {
    if (!approveModalUser) return;
    setShowApproveConfirm(false);
    setApproveSubmitting(true);
    try {
      await apiRequest(`/admin/users/${approveModalUser.id}/approve`, {
        method: "POST",
        auth: true,
        body: {
          remarks: approveRemarks.trim() || undefined,
          assign_default_tasks: approveModalUser.role === "administrative_officer" ? approveAssignDefaultTasks : undefined,
        },
      });
      showToast.success(`Account approved: ${approveModalUser.name}`);
      handleCloseApproveModal();
      await fetchPending();
    } catch (err) {
      showToast.error(err?.message || "Failed to approve account.");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleApproveConfirmOpen = () => setShowApproveConfirm(true);
  const handleApproveConfirmCancel = () => setShowApproveConfirm(false);

  const handleCloseApproveModal = useCallback(() => {
    setApproveModalClosing(true);
    setShowApproveConfirm(false);
    setTimeout(() => {
      setApproveModalClosing(false);
      setApproveModalUser(null);
      setApproveRemarks("");
      setApproveAssignDefaultTasks(true);
    }, 200);
  }, []);

  const handleReject = (user) => {
    setRejectRemarks("");
    setRejectModalUser(user);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalUser) return;
    setShowRejectConfirm(false);
    setRejectSubmitting(true);
    try {
      await apiRequest(`/admin/users/${rejectModalUser.id}/reject`, {
        method: "POST",
        auth: true,
        body: { remarks: rejectRemarks.trim() || undefined },
      });
      showToast.success(`Account rejected: ${rejectModalUser.name}`);
      handleCloseRejectModal();
      await fetchPending();
    } catch (err) {
      showToast.error(err?.message || "Failed to reject account.");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleRejectConfirmOpen = () => setShowRejectConfirm(true);
  const handleRejectConfirmCancel = () => setShowRejectConfirm(false);

  const handleCloseRejectModal = useCallback(() => {
    setRejectModalClosing(true);
    setShowRejectConfirm(false);
    setTimeout(() => {
      setRejectModalClosing(false);
      setRejectModalUser(null);
      setRejectRemarks("");
    }, 200);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsModalClosing(true);
    setTimeout(() => {
      setDetailsModalClosing(false);
      setDetailsUser(null);
    }, 200);
  }, []);

  useEffect(() => {
    if (!detailsUser) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseDetails();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailsUser, handleCloseDetails]);

  useEffect(() => {
    if (!approveModalUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (approveSubmitting) return;
      if (showApproveConfirm) setShowApproveConfirm(false);
      else handleCloseApproveModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [approveModalUser, approveSubmitting, showApproveConfirm, handleCloseApproveModal]);

  useEffect(() => {
    if (!rejectModalUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (rejectSubmitting) return;
      if (showRejectConfirm) setShowRejectConfirm(false);
      else handleCloseRejectModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [rejectModalUser, rejectSubmitting, showRejectConfirm, handleCloseRejectModal]);

  return (
    <div className="account-approvals-page page-transition-enter">
      {/* Page header - original */}
      <div className="account-approvals-header">
        <div className="account-approvals-header-inner">
          <div className="account-approvals-header-text">
            <span className="account-approvals-title-icon" aria-hidden="true">
              <FaStamp />
            </span>
            <div>
              <h1 className="account-approvals-title">Account approvals</h1>
              <p className="account-approvals-subtitle">
                Approve or reject pending user registrations.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-resend account-approvals-refresh-btn"
            onClick={() => { setLoading(true); fetchPending(); }}
            disabled={loading}
            aria-label="Refresh list"
            title="Refresh list"
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

      {loading ? (
        <div className="account-approvals-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading pending accounts…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="account-approvals-empty">
          <FaInbox className="account-approvals-empty-icon" aria-hidden="true" />
          <p className="account-approvals-empty-title">No pending approvals</p>
          <p className="account-approvals-empty-desc">
            There are no accounts awaiting approval at this time.
          </p>
        </div>
      ) : (
        <div className="account-approvals-card">
          {/* Search filter panel */}
          <div className="account-approvals-filter-panel">
            <div className="account-approvals-filter-row">
              <label htmlFor="account-approvals-search" className="account-approvals-search-label">
                Search
              </label>
              <div className="account-approvals-search-wrap">
                <span className="account-approvals-search-icon-wrap">
                  <FaSearch className="account-approvals-search-icon" aria-hidden="true" />
                </span>
                <div className="account-approvals-search-input-wrap">
                  <input
                    id="account-approvals-search"
                    type="search"
                    className="account-approvals-search-input"
                    placeholder="Name, email, employee ID, position…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search pending personnel"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="account-approvals-search-clear"
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
                <span className="account-approvals-results-text">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* No matches – empty state inside card (TasDoneNa-style) */}
          {filteredUsers.length === 0 ? (
            <div className="account-approvals-empty-state">
              <div className="account-approvals-empty-state-icon" aria-hidden="true">
                <FaInbox />
              </div>
              <p className="account-approvals-empty-state-title">No matches found</p>
              <p className="account-approvals-empty-state-text">
                No pending personnel match your search. Try different keywords or clear the filter.
              </p>
              <button
                type="button"
                className="account-approvals-empty-state-btn"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
          <div className="account-approvals-table-container">
            <div className="account-approvals-table-wrap">
          <table className="account-approvals-table" role="grid">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col" className="account-approvals-col-actions">Actions</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Employee ID</th>
                <th scope="col">Position</th>
                <th scope="col">Date submitted</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, index) => (
                <tr key={user.id}>
                  <td data-label="#">{(pageIndex - 1) * perPage + index + 1}</td>
                  <td data-label="Actions" className="account-approvals-col-actions">
                    <div className="account-approvals-actions">
                      <button
                        type="button"
                        className="btn account-approvals-btn-details"
                        onClick={() => setDetailsUser(user)}
                        aria-label={`View details for ${user.name}`}
                        title="View details"
                      >
                        <FaEye aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn account-approvals-btn-approve"
                        onClick={() => handleApprove(user)}
                        disabled={!!approveModalUser || !!rejectModalUser}
                        aria-label={`Approve ${user.name}`}
                        title="Approve"
                      >
                        <FaUserCheck aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn account-approvals-btn-reject"
                        onClick={() => handleReject(user)}
                        disabled={!!approveModalUser || !!rejectModalUser}
                        aria-label={`Reject ${user.name}`}
                        title="Reject"
                      >
                        <FaUserTimes aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                  <td data-label="Name">
                    <span className="account-approvals-name">{user.name}</span>
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Employee ID">{user.employee_id || "—"}</td>
                  <td data-label="Position">{user.position || "—"}</td>
                  <td data-label="Date submitted">{formatDateTime(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>

            <footer className="account-approvals-table-footer">
              <div className="account-approvals-footer-left">
                <label className="account-approvals-perpage-label">
                  <span className="account-approvals-perpage-text">Show</span>
                  <select
                    className="account-approvals-perpage-select"
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
                  <span className="account-approvals-perpage-text">per page</span>
                </label>
                <span className="account-approvals-range">
                  Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong>
                </span>
              </div>
              <nav
                className="account-approvals-pagination"
                aria-label="Table pagination"
              >
                <div className="account-approvals-pagination-inner">
                  <button
              type="button"
              className="account-approvals-page-btn"
              onClick={() => goToPage(1)}
              disabled={pageIndex <= 1}
              aria-label="First page"
            >
              <FaAngleDoubleLeft aria-hidden="true" />
              <span className="account-approvals-page-btn-text">First</span>
            </button>
            <button
              type="button"
              className="account-approvals-page-btn"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex <= 1}
              aria-label="Previous page"
            >
              <FaChevronLeft aria-hidden="true" />
              <span className="account-approvals-page-btn-text">Previous</span>
            </button>

            <div className="account-approvals-page-numbers">
              {(() => {
                const pages = [];
                const showEllipsisStart = totalPages > 5 && pageIndex > 3;
                const showEllipsisEnd = totalPages > 5 && pageIndex < totalPages - 2;
                let start = 1;
                let end = totalPages;
                if (totalPages > 5) {
                  if (pageIndex <= 3) {
                    end = Math.min(4, totalPages);
                  } else if (pageIndex >= totalPages - 2) {
                    start = Math.max(1, totalPages - 3);
                  } else {
                    start = pageIndex - 1;
                    end = pageIndex + 1;
                  }
                }
                if (showEllipsisStart) pages.push(1, "e1");
                for (let i = start; i <= end; i++) pages.push(i);
                if (showEllipsisEnd) pages.push("e2", totalPages);
                return pages.map((p) =>
                  p === "e1" || p === "e2" ? (
                    <span key={p} className="account-approvals-page-ellipsis" aria-hidden="true">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`account-approvals-page-btn account-approvals-page-num ${p === pageIndex ? "active" : ""}`}
                      onClick={() => goToPage(p)}
                      disabled={p === pageIndex}
                      aria-label={`Page ${p}`}
                      aria-current={p === pageIndex ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
            </div>

            <button
              type="button"
              className="account-approvals-page-btn"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= totalPages}
              aria-label="Next page"
            >
              <span className="account-approvals-page-btn-text">Next</span>
              <FaChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              className="account-approvals-page-btn"
              onClick={() => goToPage(totalPages)}
              disabled={pageIndex >= totalPages}
              aria-label="Last page"
            >
              <span className="account-approvals-page-btn-text">Last</span>
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

      {detailsUser &&
        createPortal(
          <div
            className="account-approvals-details-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-approvals-details-title"
            aria-describedby="account-approvals-details-desc"
          >
            <div
              className={`account-approvals-details-backdrop modal-backdrop-animation ${detailsModalClosing ? "exit" : ""}`}
              onClick={handleCloseDetails}
              onKeyDown={(e) => e.key === "Enter" && handleCloseDetails()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap">
              <div className={`account-approvals-details-modal modal-content-animation ${detailsModalClosing ? "exit" : ""}`}>
                <div className="account-approvals-details-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="account-approvals-details-title" className="account-approvals-details-title">
                      Registration details
                    </h2>
                    <p id="account-approvals-details-desc" className="account-approvals-details-subtitle">
                      {detailsUser.name}
                      {detailsUser.email ? ` · ${detailsUser.email}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-approvals-details-close"
                    onClick={handleCloseDetails}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="account-approvals-details-body">
                  <dl className="account-approvals-details-grid">
                    <div className="account-approvals-details-row">
                      <dt>Name</dt>
                      <dd>{detailsUser.name || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Email</dt>
                      <dd>{detailsUser.email || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Role</dt>
                      <dd>{roleLabel(detailsUser.role)}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Employee ID</dt>
                      <dd>{detailsUser.employee_id || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Position</dt>
                      <dd>{detailsUser.position || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Division</dt>
                      <dd>{detailsUser.division || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>School</dt>
                      <dd>{detailsUser.school_name || "—"}</dd>
                    </div>
                    <div className="account-approvals-details-row">
                      <dt>Date submitted</dt>
                      <dd>{formatDateTime(detailsUser.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="account-approvals-details-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleCloseDetails}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {approveModalUser &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-action-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-approvals-approve-title"
            aria-describedby="account-approvals-approve-desc"
          >
            <div
              className={`account-approvals-details-backdrop modal-backdrop-animation ${approveModalClosing ? "exit" : ""}`}
              onClick={() => !approveSubmitting && handleCloseApproveModal()}
              onKeyDown={(e) => e.key === "Enter" && !approveSubmitting && handleCloseApproveModal()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap">
              <div className={`account-approvals-details-modal account-approvals-action-modal modal-content-animation ${approveModalClosing ? "exit" : ""}`}>
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="account-approvals-approve-title" className="account-approvals-details-title">
                      Approve account
                    </h2>
                    <p id="account-approvals-approve-desc" className="account-approvals-details-subtitle">
                      {approveModalUser.name}
                      {approveModalUser.email ? ` · ${approveModalUser.email}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-approvals-details-close"
                    onClick={handleCloseApproveModal}
                    disabled={approveSubmitting}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="account-approvals-details-body">
                  <label htmlFor="account-approvals-approve-remarks" className="account-approvals-remarks-label">
                    Approval remarks <span className="account-approvals-remarks-optional">(optional)</span>
                  </label>
                  <textarea
                    id="account-approvals-approve-remarks"
                    className="account-approvals-remarks-textarea"
                    placeholder="Enter remarks for the personnel record. This will be visible in the user's profile."
                    value={approveRemarks}
                    onChange={(e) => setApproveRemarks(e.target.value)}
                    rows={4}
                    disabled={approveSubmitting}
                    aria-describedby="account-approvals-approve-remarks-hint"
                  />
                  <p id="account-approvals-approve-remarks-hint" className="account-approvals-remarks-hint">
                    Remarks are stored on the personnel record and displayed in the user's profile after approval.
                  </p>
                  {approveModalUser?.role === "administrative_officer" && (
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
                    onClick={handleCloseApproveModal}
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

      {rejectModalUser &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-action-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-approvals-reject-title"
            aria-describedby="account-approvals-reject-desc"
          >
            <div
              className={`account-approvals-details-backdrop modal-backdrop-animation ${rejectModalClosing ? "exit" : ""}`}
              onClick={() => !rejectSubmitting && handleCloseRejectModal()}
              onKeyDown={(e) => e.key === "Enter" && !rejectSubmitting && handleCloseRejectModal()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap">
              <div className={`account-approvals-details-modal account-approvals-action-modal modal-content-animation ${rejectModalClosing ? "exit" : ""}`}>
                <div className="account-approvals-details-header account-approvals-action-header account-approvals-reject-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="account-approvals-reject-title" className="account-approvals-details-title">
                      Reject account
                    </h2>
                    <p id="account-approvals-reject-desc" className="account-approvals-details-subtitle">
                      {rejectModalUser.name}
                      {rejectModalUser.email ? ` · ${rejectModalUser.email}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-approvals-details-close"
                    onClick={handleCloseRejectModal}
                    disabled={rejectSubmitting}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="account-approvals-details-body">
                  <label htmlFor="account-approvals-reject-remarks" className="account-approvals-remarks-label">
                    Rejection remarks <span className="account-approvals-remarks-optional">(optional)</span>
                  </label>
                  <textarea
                    id="account-approvals-reject-remarks"
                    className="account-approvals-remarks-textarea"
                    placeholder="Enter reason for rejection for the applicant record. This will be shown when the user attempts to sign in."
                    value={rejectRemarks}
                    onChange={(e) => setRejectRemarks(e.target.value)}
                    rows={4}
                    disabled={rejectSubmitting}
                    aria-describedby="account-approvals-reject-remarks-hint"
                  />
                  <p id="account-approvals-reject-remarks-hint" className="account-approvals-remarks-hint">
                    Remarks are stored on the applicant record and displayed at sign-in after rejection.
                  </p>
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleCloseRejectModal}
                    disabled={rejectSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-reject-modal"
                    onClick={handleRejectConfirmOpen}
                    disabled={rejectSubmitting}
                    aria-busy={rejectSubmitting}
                  >
                    {rejectSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Rejecting…</span>
                      </>
                    ) : (
                      <>
                        <FaUserTimes aria-hidden="true" />
                        <span>Reject</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {approveModalUser && showApproveConfirm &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-confirm-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="account-approvals-confirm-approve-title"
            aria-describedby="account-approvals-confirm-approve-desc"
          >
            <div
              className="account-approvals-details-backdrop modal-backdrop-animation"
              onClick={handleApproveConfirmCancel}
              onKeyDown={(e) => e.key === "Enter" && handleApproveConfirmCancel()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="account-approvals-details-wrap account-approvals-confirm-wrap">
              <div className="account-approvals-details-modal account-approvals-confirm-modal modal-content-animation">
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="account-approvals-confirm-approve-title" className="account-approvals-details-title">
                      Confirm approval
                    </h2>
                    <p id="account-approvals-confirm-approve-desc" className="account-approvals-details-subtitle">
                      Approve this account?
                    </p>
                  </div>
                </div>
                <div className="account-approvals-details-body account-approvals-confirm-body">
                  <p className="account-approvals-confirm-text">
                    You are about to approve <strong>{approveModalUser.name}</strong>’s account. This will grant the user access to the system. This action cannot be undone from this screen.
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

      {rejectModalUser && showRejectConfirm &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-confirm-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="account-approvals-confirm-reject-title"
            aria-describedby="account-approvals-confirm-reject-desc"
          >
            <div
              className="account-approvals-details-backdrop modal-backdrop-animation"
              onClick={handleRejectConfirmCancel}
              onKeyDown={(e) => e.key === "Enter" && handleRejectConfirmCancel()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="account-approvals-details-wrap account-approvals-confirm-wrap">
              <div className="account-approvals-details-modal account-approvals-confirm-modal modal-content-animation">
                <div className="account-approvals-details-header account-approvals-action-header account-approvals-reject-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="account-approvals-confirm-reject-title" className="account-approvals-details-title">
                      Confirm rejection
                    </h2>
                    <p id="account-approvals-confirm-reject-desc" className="account-approvals-details-subtitle">
                      Reject this account?
                    </p>
                  </div>
                </div>
                <div className="account-approvals-details-body account-approvals-confirm-body">
                  <p className="account-approvals-confirm-text">
                    You are about to reject <strong>{rejectModalUser.name}</strong>’s account. The user will not be able to sign in. This action cannot be undone from this screen.
                  </p>
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleRejectConfirmCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-reject-modal"
                    onClick={handleRejectSubmit}
                    disabled={rejectSubmitting}
                    aria-busy={rejectSubmitting}
                  >
                    {rejectSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Rejecting…</span>
                      </>
                    ) : (
                      <>
                        <FaUserTimes aria-hidden="true" />
                        <span>Confirm rejection</span>
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
