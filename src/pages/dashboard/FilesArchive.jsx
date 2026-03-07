import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaClipboardList,
  FaDownload,
  FaFileAlt,
  FaHistory,
  FaSearch,
  FaSpinner,
  FaUserCheck,
  FaUserEdit,
} from "react-icons/fa";
import { apiRequest, getAuthToken } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import PersonnelAccountStatus from "../../components/PersonnelAccountStatus";
import "./AdminOfficerDashboard.css";
import "./MyTasks.css";
import "./TaskList.css";
import "./PersonnelDirectory.css";

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

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

const TAB_ALL = "all";
const TAB_ASSIGNED = "assigned";
const TAB_PERSONAL = "personal";

const API_BASE = import.meta.env.VITE_LARAVEL_API || "/api";

export default function FilesArchive() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState(TAB_ALL);
  const [query, setQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiRequest("/my-submitted-files", { auth: true })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.files) ? res.files : [];
        setFiles(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load files archive.");
        setFiles([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { all, assigned, personal } = useMemo(() => {
    const allFiles = [...files];
    const assignedFiles = [];
    const personalFiles = [];

    for (const f of allFiles) {
      const isPersonal = f?.task?.is_personal ?? false;
      if (isPersonal) {
        personalFiles.push(f);
      } else {
        assignedFiles.push(f);
      }
    }

    const byUploadedDesc = (a, b) => {
      const ad = a?.uploaded_at || "";
      const bd = b?.uploaded_at || "";
      if (ad === bd) return (b.id || 0) - (a.id || 0);
      return ad < bd ? 1 : -1;
    };

    allFiles.sort(byUploadedDesc);
    assignedFiles.sort(byUploadedDesc);
    personalFiles.sort(byUploadedDesc);

    return {
      all: allFiles,
      assigned: assignedFiles,
      personal: personalFiles,
    };
  }, [files]);

  const filtered = useMemo(() => {
    const source =
      tab === TAB_ASSIGNED ? assigned : tab === TAB_PERSONAL ? personal : all;

    if (!query.trim()) return source;

    const q = query.trim().toLowerCase();
    return source.filter((f) => {
      const fileName = f?.original_name?.toLowerCase() || "";
      const taskName = f?.task?.name?.toLowerCase() || "";
      const mov = f?.task?.mov_description?.toLowerCase() || "";
      const period = f?.user_task?.period_covered?.toLowerCase() || "";
      return (
        fileName.includes(q) ||
        taskName.includes(q) ||
        mov.includes(q) ||
        period.includes(q)
      );
    });
  }, [tab, all, assigned, personal, query]);

  const allCount = all.length;
  const assignedCount = assigned.length;
  const personalCount = personal.length;

  const handleDownloadFile = async (file) => {
    if (!file?.id) return;
    const endpoint = `${API_BASE}/submission-files/${file.id}/download`;

    setDownloadingId(file.id);
    try {
      const token = getAuthToken();
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let message = "Failed to download file.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.original_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);

      showToast.success("File downloaded successfully.");
    } catch (err) {
      showToast.error(err?.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="ao-dashboard-page page-transition-enter">
      <PersonnelAccountStatus />

      <header className="ao-dashboard-header">
        <div className="ao-dashboard-header-inner">
          <div className="ao-dashboard-header-text">
            <span className="ao-dashboard-title-icon" aria-hidden="true">
              <FaHistory />
            </span>
            <div>
              <h1 className="ao-dashboard-title">Files archive</h1>
              <p className="ao-dashboard-subtitle">
                View and search all files you have submitted across assigned and
                personal tasks, in one organized archive.
              </p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="ao-dashboard-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading files…</span>
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
              aria-label={`Total files: ${allCount}`}
            >
              <div className="ao-dashboard-kpi-icon-wrap" aria-hidden="true">
                <FaFileAlt className="ao-dashboard-kpi-icon" />
              </div>
              <div className="ao-dashboard-kpi-body">
                <p className="ao-dashboard-kpi-label">Total files</p>
                <p className="ao-dashboard-kpi-value">{allCount}</p>
                <p className="ao-dashboard-kpi-hint">
                  All uploaded documents across your task reports.
                </p>
              </div>
            </article>
          </div>

          <div className="personnel-dir-card files-archive-search-card">
            <div className="personnel-dir-filter-panel">
              <div className="personnel-dir-filter-row">
                <label
                  htmlFor="files-archive-search"
                  className="personnel-dir-search-label"
                >
                  Search
                </label>
                <div className="personnel-dir-search-wrap">
                  <span className="personnel-dir-search-icon-wrap">
                    <FaSearch
                      className="personnel-dir-search-icon"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="personnel-dir-search-input-wrap">
                    <input
                      id="files-archive-search"
                      type="search"
                      className="personnel-dir-search-input"
                      placeholder="Search by file name, task name, MOV, or period covered"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search files"
                    />
                    {query && (
                      <button
                        type="button"
                        className="personnel-dir-search-clear"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {query && (
                  <span className="personnel-dir-results-text">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="ao-tabs-wrap">
            <nav
              className="ao-tabs"
              role="tablist"
              aria-label="File archive type"
            >
              <button
                type="button"
                role="tab"
                id="files-archive-tab-all"
                aria-selected={tab === TAB_ALL}
                aria-controls="files-archive-panel-all"
                className={`ao-tab ${tab === TAB_ALL ? "ao-tab-active" : ""}`}
                onClick={() => setTab(TAB_ALL)}
              >
                <FaClipboardList className="ao-tab-icon" aria-hidden="true" />
                <span>All files</span>
                <span
                  className="ao-tab-count"
                  aria-label={`${allCount} files`}
                >
                  {allCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="files-archive-tab-assigned"
                aria-selected={tab === TAB_ASSIGNED}
                aria-controls="files-archive-panel-assigned"
                className={`ao-tab ${tab === TAB_ASSIGNED ? "ao-tab-active" : ""}`}
                onClick={() => setTab(TAB_ASSIGNED)}
              >
                <FaUserCheck className="ao-tab-icon" aria-hidden="true" />
                <span>Assigned tasks</span>
                <span
                  className="ao-tab-count"
                  aria-label={`${assignedCount} files from assigned tasks`}
                >
                  {assignedCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="files-archive-tab-personal"
                aria-selected={tab === TAB_PERSONAL}
                aria-controls="files-archive-panel-personal"
                className={`ao-tab ${tab === TAB_PERSONAL ? "ao-tab-active" : ""}`}
                onClick={() => setTab(TAB_PERSONAL)}
              >
                <FaUserEdit className="ao-tab-icon" aria-hidden="true" />
                <span>Personal tasks</span>
                <span
                  className="ao-tab-count"
                  aria-label={`${personalCount} files from personal tasks`}
                >
                  {personalCount}
                </span>
              </button>
            </nav>

            <div
              id="files-archive-panel-all"
              role="tabpanel"
              aria-labelledby="files-archive-tab-all"
              hidden={tab !== TAB_ALL}
              className="ao-tab-panel"
            >
              <FilesArchiveList
                files={filtered}
                emptyLabel="No files found in your archive yet."
                downloadingId={downloadingId}
                onDownload={handleDownloadFile}
              />
            </div>
            <div
              id="files-archive-panel-assigned"
              role="tabpanel"
              aria-labelledby="files-archive-tab-assigned"
              hidden={tab !== TAB_ASSIGNED}
              className="ao-tab-panel"
            >
              <FilesArchiveList
                files={filtered}
                emptyLabel="No files found from assigned tasks."
                downloadingId={downloadingId}
                onDownload={handleDownloadFile}
              />
            </div>
            <div
              id="files-archive-panel-personal"
              role="tabpanel"
              aria-labelledby="files-archive-tab-personal"
              hidden={tab !== TAB_PERSONAL}
              className="ao-tab-panel"
            >
              <FilesArchiveList
                files={filtered}
                emptyLabel="No files found from personal tasks."
                downloadingId={downloadingId}
                onDownload={handleDownloadFile}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilesArchiveList({ files, emptyLabel, downloadingId, onDownload }) {
  if (!files || files.length === 0) {
    return <p className="ao-dashboard-empty">{emptyLabel}</p>;
  }

  return (
    <div className="ao-dashboard-task-list">
      {files.map((file) => (
        <article
          key={file.id}
          className="ao-dashboard-task-card ao-dashboard-task-card-link"
        >
          <div className="ao-dashboard-task-card-body">
            <div className="ao-dashboard-task-card-header">
              <h3 className="ao-dashboard-task-card-title">
                {file.original_name || "File"}
              </h3>
              <span className="ao-dashboard-task-card-due">
                {formatDateTime(file.uploaded_at)}
              </span>
            </div>
            <div className="ao-dashboard-task-card-meta">
              <span className="ao-dashboard-task-card-frequency">
                {file.task?.name || "Task"}
              </span>
              <span className="ao-dashboard-task-card-action">
                <FaFileAlt
                  className="ao-dashboard-task-card-action-icon"
                  aria-hidden="true"
                />
                {file.submission_type === "input" ? "Input report" : "Upload"}
              </span>
            </div>
            <p className="ao-dashboard-task-card-mov">
              <span className="ao-dashboard-task-card-mov-label">
                MOV / period:
              </span>{" "}
              {file.task?.mov_description || file.user_task?.period_covered || "—"}
            </p>
            <p className="ao-dashboard-task-card-mov">
              <span className="ao-dashboard-task-card-mov-label">
                File size:
              </span>{" "}
              {formatSize(file.size)}
            </p>
          </div>
          <div className="ao-dashboard-task-card-footer">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="task-detail-primary-btn files-archive-action-btn"
            >
              View file
            </a>
            <button
              type="button"
              className="task-detail-secondary-btn files-archive-action-btn"
              onClick={() => onDownload(file)}
              disabled={downloadingId === file.id}
            >
              {downloadingId === file.id ? (
                <>
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Downloading…</span>
                </>
              ) : (
                <>
                  <FaDownload aria-hidden="true" />
                  <span>Download</span>
                </>
              )}
            </button>
            {file.user_task_id && (
              <Link
                to={`/dashboard/my-tasks/${file.user_task_id}`}
                className="task-detail-secondary-btn files-archive-action-btn"
              >
                View task
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

