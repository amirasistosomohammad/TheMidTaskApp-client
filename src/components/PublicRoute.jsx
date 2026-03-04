import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../utils/authRouting";

export default function PublicRoute({ children }) {
  const { isAuthenticated, user, bootstrapped } = useAuth();

  if (!bootstrapped) return null;

  if (isAuthenticated) {
    return <Navigate to={getHomePathForUser(user)} replace />;
  }

  return children;
}

