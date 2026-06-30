import { AppShell, PublicShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { RequireOrgRole } from "@/lib/auth/RequireOrgRole";
import { CampaignCreatePage } from "@/pages/CampaignCreatePage";
import { CampaignProgressPage } from "@/pages/CampaignProgressPage";
import { CampaignsListPage } from "@/pages/CampaignsListPage";
import { ChatDetailPage } from "@/pages/ChatDetailPage";
import { ChatsListPage } from "@/pages/ChatsListPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { LeadListCreatePage } from "@/pages/LeadListCreatePage";
import { LeadListDetailPage } from "@/pages/LeadListDetailPage";
import { LeadsListPage } from "@/pages/LeadsListPage";
import { LoginPage } from "@/pages/LoginPage";
import { OAuthSuccessPage } from "@/pages/OAuthSuccessPage";
import { OrgDashboardPage } from "@/pages/OrgDashboardPage";
import { OrgInvitesPage } from "@/pages/OrgInvitesPage";
import { OrgSettingsPage } from "@/pages/OrgSettingsPage";
import { OrgsListPage } from "@/pages/OrgsListPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ContentProfilePage } from "@/pages/content/ContentProfilePage";
import { ContentTrendsPage } from "@/pages/content/ContentTrendsPage";
import { ContentComposePage } from "@/pages/content/ContentComposePage";
import { ContentDraftsPage } from "@/pages/content/ContentDraftsPage";
import { ContentTweetsPage } from "@/pages/content/ContentTweetsPage";
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
    path: "/onboarding",
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
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
        path: "orgs/:orgId/chats",
        element: (
          <RequireOrgRole>
            <ChatsListPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/chats/:conversationId",
        element: (
          <RequireOrgRole>
            <ChatDetailPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/campaigns",
        element: (
          <RequireOrgRole adminOnly>
            <CampaignsListPage />
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
        path: "orgs/:orgId/leads",
        element: (
          <RequireOrgRole adminOnly>
            <LeadsListPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/leads/new",
        element: (
          <RequireOrgRole adminOnly>
            <LeadListCreatePage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/leads/:listId",
        element: (
          <RequireOrgRole adminOnly>
            <LeadListDetailPage />
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
      {
        path: "orgs/:orgId/content/profile",
        element: (
          <RequireOrgRole>
            <ContentProfilePage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/content/trends",
        element: (
          <RequireOrgRole>
            <ContentTrendsPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/content/compose",
        element: (
          <RequireOrgRole>
            <ContentComposePage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/content/drafts",
        element: (
          <RequireOrgRole>
            <ContentDraftsPage />
          </RequireOrgRole>
        ),
      },
      {
        path: "orgs/:orgId/content/tweets",
        element: (
          <RequireOrgRole>
            <ContentTweetsPage />
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
