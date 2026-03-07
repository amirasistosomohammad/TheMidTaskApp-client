import React from "react";
import { useAuth } from "../hooks/useAuth";
import { FaClock } from "react-icons/fa";
import "./PersonnelPendingGate.css";

/**
 * For personnel (administrative_officer): when account is pending_approval,
 * shows status header + message panel (same layout as Calendar pending).
 */
export default function PersonnelPendingGate({ message, children }) {
  const { user } = useAuth();
  const isPersonnel = user?.role === "administrative_officer";
  const isPending = user?.status === "pending_approval";

  if (!isPersonnel || !isPending) {
    return children;
  }

  return (
    <div className="personnel-pending-gate-page">
      <header className="personnel-pending-gate-status-header" role="status">
        <span className="personnel-pending-gate-status-icon" aria-hidden="true">
          <FaClock />
        </span>
        <div className="personnel-pending-gate-status-text">
          <h2 className="personnel-pending-gate-status-title">Account status: Pending</h2>
          <p className="personnel-pending-gate-status-desc">
            Your account is awaiting approval by the Central Administrative Officer. You will be notified once your account has been reviewed.
          </p>
        </div>
      </header>
      <div className="personnel-pending-gate-note" role="status">
        <p className="personnel-pending-gate-message">{message}</p>
      </div>
    </div>
  );
}
