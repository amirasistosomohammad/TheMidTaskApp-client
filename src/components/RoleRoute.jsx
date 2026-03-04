import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../utils/authRouting";

export default function RoleRoute({ allowRoles, children }) {
  const { isAuthenticated, user, bootstrapped } = useAuth();

  if (!bootstrapped) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.status === "rejected") {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowRoles) && allowRoles.length > 0) {
    if (!allowRoles.includes(user?.role)) {
      return <Navigate to={getHomePathForUser(user)} replace />;
    }
  }

  return children;
}

