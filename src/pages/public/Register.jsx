import { Link } from "react-router-dom";

export default function Register() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow rounded-4 p-4" style={{ maxWidth: "400px" }}>
        <h2 className="h5 fw-bold mb-3">Create an account</h2>
        <p className="text-secondary small mb-4">
          Registration will be available after backend integration.
        </p>
        <Link to="/login" className="btn btn-primary rounded-3 w-100 py-2">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
