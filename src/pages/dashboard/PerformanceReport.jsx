import React, { useState, useEffect, useCallback } from "react";
import { FaFileExcel, FaSpinner, FaUser, FaCalendarAlt } from "react-icons/fa";
import { apiRequest, apiDownload } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import PersonnelPendingGate from "../../components/PersonnelPendingGate";
import "./Timeline.css";
import "./PerformanceReport.css";

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatDateForInput(start), to: formatDateForInput(end) };
}

export default function PerformanceReport() {
  const { user } = useAuth();
  const isSchoolHead = user?.role === "school_head";
  const isAO = user?.role === "administrative_officer";

  const [period, setPeriod] = useState(() => defaultPeriod());
  const [aoId, setAoId] = useState("");
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchOfficers = useCallback(async () => {
    if (!isSchoolHead) return;
    setLoadingOfficers(true);
    try {
      const res = await apiRequest("/school-head/supervised-officers", { auth: true });
      setOfficers(Array.isArray(res?.officers) ? res.officers : []);
      if (res?.officers?.length && !aoId) {
        setAoId(String(res.officers[0].id));
      }
    } catch (err) {
      showToast.error(err?.message || "Failed to load personnel list.");
      setOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  }, [isSchoolHead, aoId]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  const validate = () => {
    const e = {};
    if (!period.from) e.date_from = "Start date is required.";
    if (!period.to) e.date_to = "End date is required.";
    if (period.from && period.to && period.from > period.to) {
      e.date_to = "End date must be on or after start date.";
    }
    if (isSchoolHead && !aoId) e.ao_id = "Please select a personnel to generate the report for.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setGenerating(true);
    setErrors({});
    try {
      const params = new URLSearchParams({
        date_from: period.from,
        date_to: period.to,
      });
      if (isSchoolHead && aoId) params.set("ao_id", aoId);
      const path = `/reports/performance-report?${params.toString()}`;
      await apiDownload(path, undefined);
      showToast.success("Report downloaded successfully.");
    } catch (err) {
      showToast.error(err?.message || "Failed to generate report.");
      if (err?.data?.message) setErrors({ submit: err.data.message, path_checked: err.data.path_checked });
    } finally {
      setGenerating(false);
    }
  };

  if (!isAO && !isSchoolHead) {
    return (
      <div className="timeline-page page-transition-enter">
        <header className="timeline-header">
          <div className="timeline-header-inner">
            <h1 className="timeline-title">Performance report</h1>
            <p className="timeline-subtitle">You do not have access to this page.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <PersonnelPendingGate message="Your performance report will be available once your account has been approved.">
      <div className="timeline-page page-transition-enter perf-report-page">
      <header className="timeline-header" aria-label="Performance report page header">
        <div className="timeline-header-inner">
          <div className="timeline-header-text">
            <span className="timeline-title-icon" aria-hidden="true">
              <FaFileExcel />
            </span>
            <div>
              <h1 className="timeline-title">Performance report</h1>
              <p className="timeline-subtitle">
                {isAO
                  ? "Generate your MIDTAS performance report (Excel) for the selected period. Timeliness, quality, and compliance are derived from your task and validation data."
                  : "Generate a MIDTAS performance report (Excel) for a personnel under your supervision. Select the personnel and period, then download the report."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="perf-report-card" aria-label="Report options">
        <div className="perf-report-card-inner">
          <h2 className="perf-report-section-title">Report options</h2>

          {isSchoolHead && (
            <div className="perf-report-field">
              <label htmlFor="perf-report-ao" className="perf-report-label">
                <FaUser className="perf-report-label-icon" aria-hidden="true" />
                Personnel (Administrative Officer)
              </label>
              <select
                id="perf-report-ao"
                className={`perf-report-select ${errors.ao_id ? "is-invalid" : ""}`}
                value={aoId}
                onChange={(e) => setAoId(e.target.value)}
                disabled={loadingOfficers}
                aria-describedby={errors.ao_id ? "perf-ao-error" : undefined}
                aria-invalid={!!errors.ao_id}
              >
                <option value="">Select personnel…</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.school_name ? ` — ${o.school_name}` : ""}
                  </option>
                ))}
              </select>
              {errors.ao_id && (
                <p id="perf-ao-error" className="perf-report-error" role="alert">
                  {errors.ao_id}
                </p>
              )}
            </div>
          )}

          <div className="perf-report-dates">
            <div className="perf-report-field">
              <label htmlFor="perf-report-date-from" className="perf-report-label">
                <FaCalendarAlt className="perf-report-label-icon" aria-hidden="true" />
                Period start
              </label>
              <input
                id="perf-report-date-from"
                type="date"
                className={`perf-report-input ${errors.date_from ? "is-invalid" : ""}`}
                value={period.from}
                onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
                aria-describedby={errors.date_from ? "perf-from-error" : undefined}
                aria-invalid={!!errors.date_from}
              />
              {errors.date_from && (
                <p id="perf-from-error" className="perf-report-error" role="alert">
                  {errors.date_from}
                </p>
              )}
            </div>
            <div className="perf-report-field">
              <label htmlFor="perf-report-date-to" className="perf-report-label">
                <FaCalendarAlt className="perf-report-label-icon" aria-hidden="true" />
                Period end
              </label>
              <input
                id="perf-report-date-to"
                type="date"
                className={`perf-report-input ${errors.date_to ? "is-invalid" : ""}`}
                value={period.to}
                onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
                aria-describedby={errors.date_to ? "perf-to-error" : undefined}
                aria-invalid={!!errors.date_to}
              />
              {errors.date_to && (
                <p id="perf-to-error" className="perf-report-error" role="alert">
                  {errors.date_to}
                </p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="perf-report-error perf-report-error-global" role="alert">
              <p>{errors.submit}</p>
              {errors.path_checked && (
                <p className="perf-report-path-hint">
                  Place the file in: <code>{errors.path_checked}</code>
                </p>
              )}
            </div>
          )}

          <div className="perf-report-actions">
            <button
              type="button"
              className="perf-report-generate-btn"
              onClick={handleGenerate}
              disabled={generating || (isSchoolHead && loadingOfficers)}
              aria-busy={generating}
              aria-label={generating ? "Generating report…" : "Generate and download report"}
            >
              {generating ? (
                <>
                  <FaSpinner className="spinner" aria-hidden="true" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <FaFileExcel className="perf-report-generate-icon" aria-hidden="true" />
                  <span>Generate report (Excel)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="perf-report-info" aria-label="Report description">
        <p className="perf-report-info-text">
          The report uses the official MIDTAS template and fills it with data from the system: personnel name and school, period covered, task completion counts, and derived scores for <strong>Timeliness</strong>, <strong>Quality &amp; Accuracy</strong>, and <strong>Compliance</strong> based on your submitted tasks and validations. Ensure the template file is stored on the server at <code>storage/app/reports/Sample Performance Report MIDTASK.xlsx</code>.
        </p>
      </section>
    </div>
    </PersonnelPendingGate>
  );
}
