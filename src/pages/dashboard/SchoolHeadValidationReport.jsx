import React, { useEffect, useState, useCallback } from "react";
import {
  FaClipboardCheck,
  FaSpinner,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaListAlt,
  FaInbox,
} from "react-icons/fa";
import { apiRequest } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import "./Timeline.css";
import "./SchoolHeadValidationReport.css";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return ymd;
  }
}

export default function SchoolHeadValidationReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, approved: 0, rejected: 0 });
  const [tab, setTab] = useState("all");

  const fetchReport = useCallback(async () => {
    if (user?.role !== "school_head") {
      setLoading(false);
      setItems([]);
      setCounts({ all: 0, approved: 0, rejected: 0 });
      return;
    }
    setLoading(true);
    try {
      const params = tab === "all" ? {} : { status: tab };
      const query = new URLSearchParams(params).toString();
      const url = query ? `/school-head/validations/report?${query}` : "/school-head/validations/report";
      const res = await apiRequest(url, { auth: true });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setCounts({
        all: res?.counts?.all ?? 0,
        approved: res?.counts?.approved ?? 0,
        rejected: res?.counts?.rejected ?? 0,
      });
    } catch (err) {
      showToast.error(err?.message || "Failed to load validation report.");
      setItems([]);
      setCounts({ all: 0, approved: 0, rejected: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.role, tab]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="timeline-page page-transition-enter">
      <header className="timeline-header" aria-label="Validation report page header">
        <div className="timeline-header-inner">
          <div className="timeline-header-text">
            <span className="timeline-title-icon" aria-hidden="true">
              <FaClipboardCheck />
            </span>
            <div>
              <h1 className="timeline-title">Validation report</h1>
              <p className="timeline-subtitle">
                View a list of submissions you have validated, including your decision (approve/reject), remarks, and date and time of validation.
              </p>
            </div>
          </div>
          <div className="timeline-header-actions">
            <button
              type="button"
              className="timeline-refresh-btn"
              onClick={() => fetchReport()}
              disabled={loading}
              aria-label="Refresh validation report"
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

      <section className="timeline-tabs-card" aria-label="Report view selector">
        <div className="timeline-tabs-card-header">
          <div>
            <h2 className="timeline-tabs-title">Report view</h2>
            <p className="timeline-tabs-subtitle">
              Filter by decision. Counts show all validations you have performed.
            </p>
          </div>
        </div>
        <div className="timeline-tabbar" role="tablist" aria-label="Decision views">
          <button
            type="button"
            role="tab"
            id="vr-tab-all"
            aria-selected={tab === "all"}
            aria-controls="vr-panel"
            className={`timeline-tab-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            <FaListAlt className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">All</span>
            <span className="timeline-tab-badge" aria-label={`${counts.all} validations`}>
              {counts.all}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="vr-tab-approved"
            aria-selected={tab === "approved"}
            aria-controls="vr-panel"
            className={`timeline-tab-btn ${tab === "approved" ? "active" : ""}`}
            onClick={() => setTab("approved")}
          >
            <FaCheckCircle className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">Approved</span>
            <span className="timeline-tab-badge" aria-label={`${counts.approved} approved`}>
              {counts.approved}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="vr-tab-rejected"
            aria-selected={tab === "rejected"}
            aria-controls="vr-panel"
            className={`timeline-tab-btn ${tab === "rejected" ? "active" : ""}`}
            onClick={() => setTab("rejected")}
          >
            <FaTimesCircle className="timeline-tab-btn-icon" aria-hidden="true" />
            <span className="timeline-tab-btn-label">Rejected</span>
            <span className="timeline-tab-badge" aria-label={`${counts.rejected} rejected`}>
              {counts.rejected}
            </span>
          </button>
        </div>
      </section>

      <div id="vr-panel" role="tabpanel" aria-labelledby={`vr-tab-${tab}`}>
        {loading ? (
          <div className="timeline-loading">
            <FaSpinner className="spinner" aria-hidden="true" />
            <span>Loading validation report…</span>
          </div>
        ) : isEmpty ? (
          <div className="timeline-empty">
            <FaInbox className="timeline-empty-icon" aria-hidden="true" />
            <p className="timeline-empty-title">No validations yet</p>
            <p className="timeline-empty-desc">
              {tab === "all"
                ? "You have not validated any submissions yet. Validated items will appear here once you approve or reject submissions on the Validations page."
                : tab === "approved"
                  ? "You have not approved any submissions yet."
                  : "You have not rejected any submissions yet."}
            </p>
          </div>
        ) : (
          <section className="vr-report-card" aria-label="Validation report list">
            <div className="vr-list">
              {items.map((row) => (
                <article
                  key={row.id}
                  className={`vr-item ${row.status === "approved" ? "vr-item-approved" : "vr-item-rejected"}`}
                >
                  <div className="vr-item-main">
                    <div className="vr-item-header">
                      <h3 className="vr-item-title">{row.task?.name ?? "Task"}</h3>
                      <span
                        className={`vr-item-badge ${row.status === "approved" ? "vr-item-badge-approved" : "vr-item-badge-rejected"}`}
                        aria-label={`Decision: ${row.status === "approved" ? "Approved" : "Rejected"}`}
                      >
                        {row.status === "approved" ? (
                          <>
                            <FaCheckCircle className="vr-item-badge-icon" aria-hidden="true" />
                            Approved
                          </>
                        ) : (
                          <>
                            <FaTimesCircle className="vr-item-badge-icon" aria-hidden="true" />
                            Rejected
                          </>
                        )}
                      </span>
                    </div>
                    <dl className="vr-item-meta">
                      <div className="vr-item-meta-row">
                        <dt>Personnel</dt>
                        <dd>{row.personnel?.name ?? "—"}</dd>
                      </div>
                      <div className="vr-item-meta-row">
                        <dt>Due date</dt>
                        <dd>{row.due_date ? formatDate(row.due_date) : "—"}</dd>
                      </div>
                      <div className="vr-item-meta-row">
                        <dt>Validated at</dt>
                        <dd>{formatDateTime(row.validated_at)}</dd>
                      </div>
                    </dl>
                    {(row.feedback != null && row.feedback !== "") && (
                      <div className="vr-item-remarks">
                        <span className="vr-item-remarks-label">Remarks</span>
                        <p className="vr-item-remarks-text">{row.feedback}</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
