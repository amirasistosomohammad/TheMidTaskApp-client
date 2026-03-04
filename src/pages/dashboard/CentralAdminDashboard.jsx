import { useAuth } from "../../hooks/useAuth";

export default function CentralAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="card shadow-sm rounded-4">
          <div className="card-body">
            <h1 className="h4 fw-bold mb-1">Central Administrative Officer</h1>
            <p className="text-secondary mb-0">
              Welcome, <span className="fw-semibold">{user?.name ?? "User"}</span>. This is the
              Central Admin dashboard shell (Phase 1.6).
            </p>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-4">
        <div className="card rounded-4 h-100">
          <div className="card-body">
            <div className="fw-semibold mb-1">Pending registrations</div>
            <div className="text-secondary small">Coming in Phase 7.</div>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-4">
        <div className="card rounded-4 h-100">
          <div className="card-body">
            <div className="fw-semibold mb-1">Task management</div>
            <div className="text-secondary small">Coming in Phase 7.</div>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-4">
        <div className="card rounded-4 h-100">
          <div className="card-body">
            <div className="fw-semibold mb-1">Monitor officers</div>
            <div className="text-secondary small">Coming in Phase 7.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

