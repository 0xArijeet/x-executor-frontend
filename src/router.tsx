import { AppShell, PublicShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { RequireOrgRole } from "@/lib/auth/RequireOrgRole";
import { CampaignCreatePage } from "@/pages/CampaignCreatePage";
import { CampaignProgressPage } from "@/pages/CampaignProgressPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { LoginPage } from "@/pages/LoginPage";
import { OAuthSuccessPage } from "@/pages/OAuthSuccessPage";
import { OrgDashboardPage } from "@/pages/OrgDashboardPage";
import { OrgInvitesPage } from "@/pages/OrgInvitesPage";
import { OrgSettingsPage } from "@/pages/OrgSettingsPage";
import { OrgsListPage } from "@/pages/OrgsListPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <PublicShell />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/register",
    element: <PublicShell />,
    children: [{ index: true, element: <RegisterPage /> }],
  },
  {
    path: "/connect/:token",
    element: <PublicShell />,
    children: [{ index: true, element: <ConnectPage /> }],
  },
  {
    path: "/oauth/success",
    element: <PublicShell />,
    children: [{ index: true, element: <OAuthSuccessPage /> }],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/orgs" replace /> },
      { path: "orgs", element: <OrgsListPage /> },
      {
        path: "orgs/:orgId",
        element: (
          <RequireOrgRole>
            <OrgDashboardPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/campaigns/new",
        element: (
          <RequireOrgRole adminOnly>
            <CampaignCreatePage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/campaigns/:campaignId",
        element: (
          <RequireOrgRole>
            <CampaignProgressPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/invites",
        element: (
          <RequireOrgRole adminOnly>
            <OrgInvitesPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/settings",
        element: (
          <RequireOrgRole adminOnly>
            <OrgSettingsPage />
          </RequireOrgRole>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
