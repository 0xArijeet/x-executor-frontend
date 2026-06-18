import { useAuth } from "@/lib/auth/AuthContext";
import { Navigate } from "react-router-dom";

/** Redirect to the user's org dashboard (omnibot: one org per account from JWT). */
export function OrgsListPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!user?.orgId) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/orgs/${user.orgId}`} replace />;
}
