import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaClipboard,
  FaSync,
  FaSpinner,
  FaSearch,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import "./PersonnelDirectory.css";
import "./ActivityLogs.css";

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

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

function humanizeAction(action) {
  if (!action) return "—";
  return String(action)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function actionTone(action) {
  const a = (action || "").toLowerCase();
  if (a.includes("rejected") || a.includes("reject") || a.includes("failed")) return "danger";
  if (a.includes("approved") || a.includes("approve") || a.includes("completed")) return "success";
  if (a.includes("deactivated") || a.includes("deleted")) return "muted";
  if (a.includes("backup")) return "accent";
  return "primary";
}

function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const val = String(v).trim();
    if (val === "") return;
    sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default function ActivityLogs() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  const hasLoadedRef = useRef(false);
  const [detailsLog, setDetailsLog] = useState(null);
  const [detailsModalClosing, setDetailsModalClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const totalPages = Math.max(1, Number(pagination?.last_page) || 1);
  const pageIndex = Math.max(1, Math.min(Number(pagination?.current_page) || currentPage, totalPages));
  const pageSize = Number(pagination?.per_page) || perPage;
  const totalItems = Number(pagination?.total) || 0;
  const startItem = totalItems === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalItems);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const fetchLogs = useCallback(async ({ page, per_page, action, date_from, date_to, search } = {}) => {
    const query = buildQuery({
      page,
      per_page,
      action,
      date_from,
      date_to,
      search,
    });
    const res = await apiRequest(`/admin/activity-logs${query}`, { auth: true });
    setLogs(Array.isArray(res?.logs) ? res.logs : []);
    setPagination(res?.pagination || { current_page: page || 1, per_page: per_page || 15, total: 0, last_page: 1 });
    setAvailableActions(Array.isArray(res?.actions) ? res.actions : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    fetchLogs({
      page: currentPage,
      per_page: perPage,
      action: actionFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: searchQuery || undefined,
    })
      .catch((err) => {
        if (cancelled) return;
        showToast.error(err?.message || "Failed to load activity logs.");
        setLogs([]);
        setPagination({ current_page: currentPage, per_page: perPage, total: 0, last_page: 1 });
        if (isInitial) setAvailableActions([]);
      })
      .finally(() => {
        if (cancelled) return;
        hasLoadedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, perPage, actionFilter, dateFrom, dateTo, searchQuery, refreshKey, fetchLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [perPage, actionFilter, dateFrom, dateTo, searchQuery]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const hasActiveFilters = !!(searchDraft.trim() || actionFilter || dateFrom || dateTo);

  const actionOptions = useMemo(() => {
    const base = Array.isArray(availableActions) ? availableActions : [];
    return base.filter(Boolean).map(String);
  }, [availableActions]);

  const closeDetails = useCallback(() => {
    setDetailsModalClosing(true);
    setTimeout(() => {
      setDetailsModalClosing(false);
      setDetailsLog(null);
    }, 200);
  }, []);

  return (
    <div className="activity-logs-page page-transition-enter">
      <header className="activity-logs-header">
        <div className="activity-logs-header-inner">
          <div className="activity-logs-header-text">
            <span className="activity-logs-title-icon" aria-hidden="true">
              <FaClipboard />
            </span>
            <div>
              <h1 className="activity-logs-title">Activity logs</h1>
              <p className="activity-logs-subtitle">
                Review system activity for auditing. Filter by action, date range, or search by description and user.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="activity-logs-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh activity logs"
            title="Refresh"
          >
            {refreshing ? <FaSpinner className="spinner" aria-hidden="true" /> : <FaSync aria-hidden="true" />}
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <div className="activity-logs-card">
        <div className="activity-logs-filter-panel" role="search" aria-label="Filter activity logs">
          <div className="activity-logs-filter-row">
            <label htmlFor="activity-logs-search" className="activity-logs-filter-label">
              Search
            </label>
            <div className="activity-logs-search-wrap">
              <span className="activity-logs-search-icon-wrap">
                <FaSearch className="activity-logs-search-icon" aria-hidden="true" />
              </span>
              <div className="activity-logs-search-input-wrap">
                <input
                  id="activity-logs-search"
                  type="search"
                  className="activity-logs-search-input"
                  placeholder="Description, user name, email…"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  aria-label="Search activity logs"
                />
                {searchDraft && (
                  <button
                    type="button"
                    className="activity-logs-search-clear"
                    onClick={() => setSearchDraft("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <label htmlFor="activity-logs-action" className="activity-logs-filter-label">
              Action
            </label>
            <select
              id="activity-logs-action"
              className="activity-logs-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by action"
              disabled={loading}
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <label htmlFor="activity-logs-from" className="activity-logs-filter-label">
              From
            </label>
            <input
              id="activity-logs-from"
              type="date"
              className="activity-logs-date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter from date"
            />

            <label htmlFor="activity-logs-to" className="activity-logs-filter-label">
              To
            </label>
            <input
              id="activity-logs-to"
              type="date"
              className="activity-logs-date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
            />

            {hasActiveFilters && (
              <button
                type="button"
                className="activity-logs-clear-btn"
                onClick={() => {
                  setSearchDraft("");
                  setActionFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="activity-logs-loading">
            <FaSpinner className="spinner" aria-hidden="true" />
            <span>Loading activity logs…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="personnel-dir-empty-state">
            <FaClipboard className="personnel-dir-empty-icon" aria-hidden="true" />
            <p className="personnel-dir-empty-title">No activity logs found</p>
            <p className="personnel-dir-empty-text">
              {hasActiveFilters
                ? "No logs match your current filters. Try clearing filters or adjusting the date range."
                : "No logs are available yet. Activity will appear as users sign in and actions are performed in the system."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="personnel-dir-empty-btn"
                onClick={() => {
                  setSearchDraft("");
                  setActionFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="activity-logs-table-container">
            <div className="activity-logs-table-wrap">
              <table className="activity-logs-table" role="grid" aria-label="Activity logs table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col" className="activity-logs-col-actions">
                      Details
                    </th>
                    <th scope="col">Date & time</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Description</th>
                    <th scope="col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const actorName = log?.actor?.name || (log?.actor ? "User" : "System");
                    const actorEmail = log?.actor?.email || "";
                    const action = log?.action || "";
                    const tone = actionTone(action);
                    return (
                      <tr key={log.id || idx}>
                        <td data-label="#">{(pageIndex - 1) * pageSize + idx + 1}</td>
                        <td data-label="Details" className="activity-logs-col-actions">
                          <button
                            type="button"
                            className="btn activity-logs-btn-details"
                            onClick={() => setDetailsLog(log)}
                            aria-label="View log details"
                            title="View details"
                          >
                            <FaEye aria-hidden="true" />
                          </button>
                        </td>
                        <td data-label="Date & time">{formatDateTime(log?.created_at)}</td>
                        <td data-label="Actor">
                          <div className="activity-logs-actor">
                            <div className="activity-logs-actor-name" title={actorName}>
                              {actorName}
                            </div>
                            {actorEmail && (
                              <div className="activity-logs-actor-email" title={actorEmail}>
                                {actorEmail}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Action">
                          <span className={`activity-logs-action-badge activity-logs-action-${tone}`} title={action}>
                            {humanizeAction(action)}
                          </span>
                        </td>
                        <td data-label="Description" className="activity-logs-desc">
                          {log?.description || "—"}
                        </td>
                        <td data-label="IP">{log?.ip_address || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className="personnel-dir-perpage-text">per page</span>
                </label>
                <span className="personnel-dir-range">
                  Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong>
                </span>
              </div>

              <nav className="personnel-dir-pagination" aria-label="Activity logs pagination">
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
        )}
      </div>

      {detailsLog &&
        createPortal(
          <div className="personnel-dir-overlay" role="dialog" aria-modal="true" aria-labelledby="activity-log-details-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${detailsModalClosing ? "exit" : ""}`}
              onClick={closeDetails}
              onKeyDown={(e) => e.key === "Enter" && closeDetails()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal modal-content-animation ${detailsModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="activity-log-details-title" className="personnel-dir-modal-title">
                      Activity log details
                    </h2>
                    <p className="personnel-dir-modal-subtitle">
                      {formatDateTime(detailsLog?.created_at)} · {detailsLog?.ip_address || "IP —"}
                    </p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={closeDetails} aria-label="Close">
                    ×
                  </button>
                </header>

                <div className="personnel-dir-modal-body">
                  <div className="activity-logs-details-grid">
                    <div className="activity-logs-details-row">
                      <div className="activity-logs-details-label">Actor</div>
                      <div className="activity-logs-details-value">
                        {detailsLog?.actor?.name || "System"}
                        {detailsLog?.actor?.email ? (
                          <span className="activity-logs-details-subvalue"> · {detailsLog.actor.email}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="activity-logs-details-row">
                      <div className="activity-logs-details-label">Action</div>
                      <div className="activity-logs-details-value">{detailsLog?.action || "—"}</div>
                    </div>
                    <div className="activity-logs-details-row">
                      <div className="activity-logs-details-label">Description</div>
                      <div className="activity-logs-details-value">{detailsLog?.description || "—"}</div>
                    </div>
                  </div>
                </div>

                <footer className="personnel-dir-modal-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={closeDetails}>
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

