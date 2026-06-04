import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdmin, useOrgRole } from "@/lib/auth/RequireOrgRole";
import { useAuth } from "@/lib/auth/AuthContext";
import { connectionsApi, orgsApi } from "@/lib/hub/api";
import type { Connection, Organization } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function OrgDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const role = useOrgRole(orgId);
  const admin = isAdmin(role);

  const [org, setOrg] = useState<Organization | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authTokenInputs, setAuthTokenInputs] = useState<Record<string, string>>({});

  function load() {
    if (!token || !orgId) return;
    setLoading(true);
    Promise.all([orgsApi.get(token, orgId), connectionsApi.list(token, orgId)])
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
    if (!token || !orgId) return;
    if (!confirm(`Revoke connection for @${username}?`)) return;
    setError(null);
    try {
      await connectionsApi.revoke(token, orgId, connectionId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSetAuthToken(connectionId: string) {
    if (!token || !orgId) return;
    const authToken = authTokenInputs[connectionId]?.trim();
    if (!authToken) return;
    setError(null);
    try {
      await connectionsApi.setAuthToken(token, orgId, connectionId, authToken);
      setAuthTokenInputs(prev => ({ ...prev, [connectionId]: "" }));
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{org?.name ?? "Organization"}</h1>
        <p className="text-muted-foreground">X account connections for this organization.</p>
      </div>

      <ErrorAlert error={error} />

      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No connections yet. Create an invite and share the connect link.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map(conn => (
            <Card key={conn.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">@{conn.xUsername}</CardTitle>
                  <div className="flex gap-2">
                    {conn.hasAuthToken && <Badge variant="secondary">Auth token set</Badge>}
                    <Badge variant="outline">{conn.scopes?.length ?? 0} scopes</Badge>
                  </div>
                </div>
                <CardDescription>
                  Connected {conn.connectedAt ? new Date(conn.connectedAt).toLocaleString() : "—"}
                  {conn.tokenExpiresAt && (
                    <> · Token expires {new Date(conn.tokenExpiresAt).toLocaleString()}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {conn.webhookUrl && (
                  <p>
                    <span className="text-muted-foreground">Webhook: </span>
                    <a href={conn.webhookUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                      {conn.webhookUrl}
                    </a>
                  </p>
                )}
                {admin && (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <Label htmlFor={`token-${conn.id}`}>Automation auth token</Label>
                        <Input
                          id={`token-${conn.id}`}
                          type="password"
                          placeholder="Set secret for downstream automation"
                          value={authTokenInputs[conn.id] ?? ""}
                          onChange={e =>
                            setAuthTokenInputs(prev => ({ ...prev, [conn.id]: e.target.value }))
                          }
                        />
                      </div>
                      <Button size="sm" onClick={() => handleSetAuthToken(conn.id)}>
                        Save token
                      </Button>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(conn.id, conn.xUsername)}>
                      Revoke connection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
