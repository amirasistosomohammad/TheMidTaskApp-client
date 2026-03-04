import React from "react";
import { useAuth } from "../hooks/useAuth";
import { FaClock, FaUserCheck } from "react-icons/fa";
import "./PersonnelAccountStatus.css";

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

/**
 * Shows account approval status and remarks for personnel (administrative_officer, school_head).
 * Pending: shows pending message. Approved: shows date and optional approval remarks.
 * Rejected users cannot log in; rejection reason is shown at login.
 */
export default function PersonnelAccountStatus() {
  const { user } = useAuth();
  const status = user?.status;
  const role = user?.role;

  const isPersonnel = role === "administrative_officer" || role === "school_head";
  if (!isPersonnel || !user) return null;

  // Only show the banner while the account is still pending approval.
  // For approved accounts, the status section is hidden to reduce visual noise.
  if (status === "pending_approval") {
    return (
      <div className="personnel-status-card personnel-status-pending">
        <div className="personnel-status-card-inner">
          <span className="personnel-status-icon" aria-hidden="true">
            <FaClock />
          </span>
          <div className="personnel-status-text">
            <h2 className="personnel-status-title">Account status: Pending</h2>
            <p className="personnel-status-desc">
              Your account is awaiting approval by the Central Administrative Officer. You will be notified once your account has been reviewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
