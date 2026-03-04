import React from "react";
import { FaTools } from "react-icons/fa";

/**
 * Corporate / government-style "In development" placeholder for sidebar menu pages.
 * Displays a smooth transition and professional message for the client.
 */
export default function InDevelopmentPlaceholder({ title = "In development", description }) {
  return (
    <div className="in-development-placeholder page-transition-enter">
      <div className="in-development-card">
        <div className="in-development-icon-wrap">
          <FaTools className="in-development-icon" aria-hidden="true" />
        </div>
        <h2 className="in-development-title">{title}</h2>
        <p className="in-development-desc">
          {description ||
            "This section is currently under development. It will be available in a future release."}
        </p>
        <p className="in-development-note">
          Thank you for your patience. MID-TASK APP is being enhanced to better serve your needs.
        </p>
      </div>
    </div>
  );
}
