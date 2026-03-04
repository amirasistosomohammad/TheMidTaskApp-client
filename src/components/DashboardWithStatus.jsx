import React from "react";
import PersonnelAccountStatus from "./PersonnelAccountStatus";
import InDevelopmentPlaceholder from "./InDevelopmentPlaceholder";

/**
 * Wraps placeholder content with the personnel account status card (Pending / Approved + remarks).
 * Used for dashboard and school-head landing pages.
 */
export default function DashboardWithStatus({ title, description }) {
  return (
    <div className="dashboard-with-status">
      <PersonnelAccountStatus />
      <InDevelopmentPlaceholder title={title} description={description} />
    </div>
  );
}
