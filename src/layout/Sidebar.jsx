import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaList,
  FaPlus,
  FaUserPlus,
  FaUserCheck,
  FaUsers,
  FaClipboardList,
  FaCalendarAlt,
  FaUpload,
  FaCheckCircle,
  FaHistory,
  FaDesktop,
  FaClipboard,
  FaCog,
  FaUserTie,
  FaUser,
  FaFileExcel,
  FaPenFancy,
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../utils/authRouting";

/**
* Application sidebar (MidTask).
* Role-based menus: Personnel, School Head, Central Administrative Officer.
* Placeholder links show "In development" with smooth transition (corporate / government style).
*/
const Sidebar = ({ onCloseSidebar, pendingApprovalsCount }) => {
  const { user } = useAuth();
  const role = user?.role;
  const isCentralAdmin = role === "central_admin";
  const isSchoolHead = role === "school_head";
  const isAdminOfficer = role === "administrative_officer";
  const countLoaded = pendingApprovalsCount != null;
  const pendingCount = countLoaded ? pendingApprovalsCount : 0;

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && onCloseSidebar) onCloseSidebar();
  };

  const roleLabel = () => {
    switch (role) {
      case "central_admin":
        return "Central Administrative Officer";
      case "school_head":
        return "School Head";
      case "administrative_officer":
      default:
	    return "Personnel";
    }
  };

  const navLink = (to, icon, label) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
      onClick={handleLinkClick}
      title={label}
    >
      {icon}
      <span className="sb-sidebar-nav-link-label">{label}</span>
    </NavLink>
  );

  const navLinkWithBadge = (to, icon, label, badgeCount) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        "nav-link sb-sidebar-link-with-badge d-flex align-items-center flex-nowrap" +
        (isActive ? " active" : "")
      }
      onClick={handleLinkClick}
      title={label}
    >
      {icon}
      <span className="sb-sidebar-nav-link-label sb-sidebar-nav-link-text">{label}</span>
      <span className="badge rounded-pill sb-sidebar-badge-approvals ms-auto" aria-label={`${badgeCount} pending`}>
        {!countLoaded && isCentralAdmin ? "…" : badgeCount > 99 ? "99+" : badgeCount}
      </span>
    </NavLink>
  );

  return (
    <nav className="sb-sidenav sb-sidenav-midtask">
      <div className="sb-sidenav-menu">
        <div className="nav">
          <div className="sb-sidenav-menu-heading">Main</div>
          <NavLink
            to={getHomePathForUser(user)}
            end
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            onClick={handleLinkClick}
          >
            <FaTachometerAlt className="sb-nav-link-icon" />
            <span className="sb-sidebar-nav-link-label">Dashboard</span>
          </NavLink>

          {/* Administrative Officer: structured workspace */}
          {isAdminOfficer && (
            <>
              <div className="sb-sidenav-menu-heading">Schedule</div>
              {navLink("/dashboard/timeline", <FaCalendarAlt className="sb-nav-link-icon" />, "Task schedule")}
              {navLink("/dashboard/calendar", <FaCalendarAlt className="sb-nav-link-icon" />, "Calendar")}

              <div className="sb-sidenav-menu-heading">Submissions & records</div>
              {navLink("/dashboard/submissions", <FaUpload className="sb-nav-link-icon" />, "Submissions")}
              {navLink("/dashboard/files-archive", <FaHistory className="sb-nav-link-icon" />, "Files archive")}
              {navLink("/dashboard/reports", <FaFileExcel className="sb-nav-link-icon" />, "Reports")}

              <div className="sb-sidenav-menu-heading">Personal tasks</div>
              {navLink(
                "/dashboard/personal-tasks/create",
                <FaPlus className="sb-nav-link-icon" />,
                "Create personal task"
              )}

              <div className="sb-sidenav-menu-heading">Account</div>
              {navLink("/profile", <FaUser className="sb-nav-link-icon" />, "Profile")}
            </>
          )}

          {/* School Head: categorized like Personnel – professional / corporate */}
          {isSchoolHead && (
            <>
              <div className="sb-sidenav-menu-heading">Validations</div>
              {navLink("/school-head/validations", <FaCheckCircle className="sb-nav-link-icon" />, "Validations")}

              <div className="sb-sidenav-menu-heading">Reports</div>
              {navLink("/school-head/validation-report", <FaClipboardList className="sb-nav-link-icon" />, "Validation report")}
              {navLink("/school-head/reports", <FaFileExcel className="sb-nav-link-icon" />, "Reports")}

              <div className="sb-sidenav-menu-heading">History & records</div>
              {navLink("/school-head/task-history", <FaHistory className="sb-nav-link-icon" />, "Task history")}

              <div className="sb-sidenav-menu-heading">Account</div>
              {navLink("/profile", <FaUser className="sb-nav-link-icon" />, "Profile")}
              {navLink("/school-head/signature", <FaPenFancy className="sb-nav-link-icon" />, "Digital signature")}
            </>
          )}

          {/* Central Admin: User management */}
          {isCentralAdmin && (
            <>
              <div className="sb-sidenav-menu-heading">User management</div>
              {navLinkWithBadge(
                "/central-admin/account-approvals",
                <FaUserCheck className="sb-nav-link-icon" />,
                "Account approvals",
                pendingCount
              )}
              {navLink("/central-admin/personnel", <FaUsers className="sb-nav-link-icon" />, "Personnel directory")}
              {navLink("/central-admin/school-heads", <FaUserTie className="sb-nav-link-icon" />, "School Head accounts")}
            </>
          )}

          {/* Central Admin: Tasks */}
          {isCentralAdmin && (
            <>
              <div className="sb-sidenav-menu-heading">Tasks</div>
              {navLink("/central-admin/tasks", <FaList className="sb-nav-link-icon" />, "Task list")}
              {navLink("/central-admin/tasks/assign", <FaUserPlus className="sb-nav-link-icon" />, "Assign task")}
              {navLink("/central-admin/tasks/create", <FaPlus className="sb-nav-link-icon" />, "Create task")}
            </>
          )}

          {/* Central Admin: System */}
          {isCentralAdmin && (
            <>
              <div className="sb-sidenav-menu-heading">System</div>
              {navLink("/central-admin/monitor", <FaDesktop className="sb-nav-link-icon" />, "Monitor officers")}
              {navLink("/central-admin/activity-logs", <FaClipboard className="sb-nav-link-icon" />, "Activity logs")}
              {navLink("/central-admin/settings", <FaCog className="sb-nav-link-icon" />, "Settings")}
            </>
          )}
        </div>
      </div>
      <div className="sb-sidenav-footer">
        <div className="small">Logged in as:</div>
        <div className="user-name">{user?.name || "User"}</div>
        {user?.role && <div className="small text-muted">{roleLabel()}</div>}
      </div>
    </nav>
  );
};

export default Sidebar;
