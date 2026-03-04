import React from "react";

/**
 * Dashboard footer – matches app theme (blue/grey).
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="container-fluid px-4">
        <div className="app-footer-inner">
          <span className="app-footer-copyright">© {currentYear} MID-TASK APP. All rights reserved.</span>
          <span className="app-footer-version">v1.0.0 · Task Management System</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
