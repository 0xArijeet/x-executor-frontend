import { orgsApi } from "@/lib/hub/api";
import type { OrgRole } from "@/lib/hub/types";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function isAdminRole(role: OrgRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function RequireOrgRole({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [role, setRole] = useState<OrgRole | undefined>();
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!token || !orgId) return;
    orgsApi
      .list(token)
      .then(orgs => {
        const match = orgs.find(o => o.id === orgId);
        if (!match) {
          setDenied(true);
          return;
        }
        setRole(match.role);
        if (adminOnly && !isAdminRole(match.role)) {
          setDenied(true);
        }
      })
      .catch(() => setDenied(true))
      .finally(() => setLoading(false));
  }, [token, orgId, adminOnly]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">
          {adminOnly
            ? "You need owner or admin role for this page."
            : "You are not a member of this organization."}
        </p>
        <Link to="/orgs" className="mt-4 inline-block text-primary underline">
          Back to organizations
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export function useOrgRole(orgId: string | undefined): OrgRole | undefined {
  const { token } = useAuth();
  const [role, setRole] = useState<OrgRole | undefined>();

  useEffect(() => {
    if (!token || !orgId) return;
    orgsApi.list(token).then(orgs => {
      setRole(orgs.find(o => o.id === orgId)?.role);
    });
  }, [token, orgId]);

  return role;
}

export function isAdmin(role: OrgRole | undefined): boolean {
  return isAdminRole(role);
}
