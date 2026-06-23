import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { ConnectionAdminPanel } from "@/components/ConnectionAdminPanel";
import { ConnectionAvatar } from "@/components/ConnectionAvatar";
import { ConnectionStatusBadges } from "@/components/ConnectionStatusBadges";
import { OrgPromptForm } from "@/components/OrgPromptForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin, useOrgRole } from "@/lib/auth/RequireOrgRole";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPublishedReplyConfig, resolveDraftGoals, resolveDraftBotName, resolveDraftEscalationContact, resolveDraftOutreachStyle, resolveDraftTeamMembers, resolvePublishedGoals } from "@/lib/conversation-goal";
import { connectionsApi, xSettingsApi } from "@/lib/hub/api";
import type { Connection, Organization } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export function OrgDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const role = useOrgRole(orgId);
  const admin = isAdmin(role);

  const [org, setOrg] = useState<Organization | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([xSettingsApi.get(token), connectionsApi.list(token)])
      .then(([o, c]) => {
        setOrg(o);
        setConnections(c);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, orgId]);

  async function handleRevoke(connectionId: string, username: string) {
    if (!token) return;
    if (!confirm(`Revoke connection for @${username}?`)) return;
    setError(null);
    try {
      await connectionsApi.revoke(token, connectionId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  const automationMissing = !hasPublishedReplyConfig(org);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{org?.name ?? "Organization"}</h1>
          <p className="text-muted-foreground">
            X connections and DM automation readiness.{" "}
            {role === "member" && "Members can view connections; admins manage invites and secrets."}
          </p>
        </div>
        {admin && orgId && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/orgs/${orgId}/campaigns`}>View campaigns</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={`/orgs/${orgId}/campaigns/new`}>New campaign</Link>
            </Button>
          </div>
        )}
      </div>

      <ErrorAlert error={error} />

      {admin && automationMissing && (
        <Card className="mb-6 border-amber-500/40">
          <CardContent className="py-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Reply settings not published.</strong> Save a draft
            with a system prompt and/or goals, test it, then publish before automated DM replies
            will run.
          </CardContent>
        </Card>
      )}

      {admin && token && orgId && org && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Reply settings</CardTitle>
                <CardDescription>
                  System prompt knowledge plus conversation goals for inbound DM replies.
                </CardDescription>
              </div>
              {automationMissing && <Badge variant="destructive">Required for replies</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <OrgPromptForm
              token={token}
              publishedGoals={resolvePublishedGoals(org)}
              initialDraftGoals={resolveDraftGoals(org)}
              publishedSystemPrompt={org.systemPrompt}
              initialDraftSystemPrompt={org.draftSystemPrompt ?? org.systemPrompt ?? ""}
              publishedModel={org.llmModel}
              initialDraftModel={org.draftLlmModel ?? org.llmModel}
              publishedBotName={org.botName}
              initialDraftBotName={resolveDraftBotName(org)}
              publishedOutreachStyle={org.outreachStyle}
              initialDraftOutreachStyle={resolveDraftOutreachStyle(org)}
              publishedTeamMembers={org.teamMembers}
              initialDraftTeamMembers={resolveDraftTeamMembers(org)}
              publishedEscalationContact={org.escalationContact}
              initialDraftEscalationContact={resolveDraftEscalationContact(org)}
              hasUnpublishedDraft={org.hasUnpublishedDraft}
              promptPublishedAt={org.promptPublishedAt}
              onUpdated={setOrg}
              compact
            />
            <p className="mt-4 text-xs text-muted-foreground">
              <Link to={`/orgs/${orgId}/settings`} className="text-primary underline">
                Organization settings
              </Link>{" "}
              also includes handoff settings.
            </p>
          </CardContent>
        </Card>
      )}

      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-2">
            <p>No X accounts linked yet.</p>
            {admin && (
              <p className="text-sm">
                Create an invite under <strong className="text-foreground">Invites</strong>, share{" "}
                <strong className="text-foreground">Open connect page</strong>, and have the user authorize on X.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map(conn => (
            <Card key={conn.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ConnectionAvatar
                      userName={conn.xUsername}
                      displayName={conn.displayName}
                      profilePictureUrl={conn.profilePictureUrl}
                    />
                    <div>
                      <CardTitle className="text-lg">
                        {conn.displayName ?? `@${conn.xUsername}`}
                      </CardTitle>
                      <CardDescription>
                        @{conn.xUsername}
                        {conn.connectedAt
                          ? ` · Connected ${new Date(conn.connectedAt).toLocaleString()}`
                          : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <ConnectionStatusBadges connection={conn} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {conn.webhookUrl && (
                  <p>
                    <span className="text-muted-foreground">Webhook: </span>
                    <span className="font-mono text-xs break-all">{conn.webhookUrl}</span>
                  </p>
                )}
                {admin && token && orgId && (
                  <>
                    <ConnectionAdminPanel
                      token={token}
                      connectionId={conn.id}
                      onUpdated={load}
                      onError={setError}
                    />
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(conn.id, conn.xUsername)}>
                      Revoke connection
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
