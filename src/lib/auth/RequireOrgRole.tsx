import type { OrgRole } from "@/lib/hub/types";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

function isAdminRole(role: OrgRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Omnibot is single-tenant: org comes from JWT; all account holders are treated as owner. */
export function RequireOrgRole({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { orgId } = useParams<{ orgId: string }>();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user?.orgId) {
    return <Navigate to="/orgs" replace />;
  }

  if (orgId && orgId !== user.orgId) {
    return <Navigate to={`/orgs/${user.orgId}`} replace />;
  }

  if (adminOnly && !isAdminRole("owner")) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">You need owner or admin role for this page.</p>
        <Link to={`/orgs/${user.orgId}`} className="mt-4 inline-block text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export function useOrgRole(_orgId: string | undefined): OrgRole | undefined {
  const { user } = useAuth();
  return user ? "owner" : undefined;
}

export function isAdmin(role: OrgRole | undefined): boolean {
  return isAdminRole(role);
}
