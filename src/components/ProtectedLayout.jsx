import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../utils/authRouting";

function roleLabel(role) {
  switch (role) {
    case "central_admin":
      return "Central Administrative Officer";
    case "school_head":
      return "School Head";
    case "administrative_officer":
    default:
      return "Administrative Officer";
  }
}

export default function ProtectedLayout() {
  const { user, logout, loading } = useAuth();

  const home = getHomePathForUser(user);

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#0B558F" }}>
        <div className="container">
          <NavLink className="navbar-brand fw-semibold" to={home}>
            MID-TASK APP
          </NavLink>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#midtaskNav"
            aria-controls="midtaskNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="midtaskNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {user?.role === "administrative_officer" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/dashboard">
                    Dashboard
                  </NavLink>
                </li>
              )}

              {user?.role === "school_head" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/school-head">
                    Dashboard
                  </NavLink>
                </li>
              )}

              {user?.role === "central_admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/central-admin">
                    Dashboard
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="d-flex align-items-center gap-3">
              <div className="text-white small text-end d-none d-md-block">
                <div className="fw-semibold">{user?.name ?? "User"}</div>
                <div style={{ opacity: 0.9 }}>{roleLabel(user?.role)}</div>
              </div>

              <button className="btn btn-outline-light btn-sm" onClick={logout} disabled={loading}>
                {loading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}

