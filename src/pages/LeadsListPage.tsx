import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { leadsApi } from "@/lib/hub/api";
import type { LeadList, LeadListSourceType, LeadListStatus } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const SOURCE_LABELS: Record<LeadListSourceType, string> = {
  followers: "Followers",
  following: "Following",
  retweeters: "Retweeters",
};

const STATUS_VARIANT: Record<LeadListStatus, "default" | "secondary" | "outline" | "destructive"> =
  {
    syncing: "default",
    paused: "secondary",
    stopped: "outline",
    completed: "outline",
    failed: "destructive",
  };

function LeadListStatusBadge({ status }: { status: LeadListStatus }) {
  const labels: Record<LeadListStatus, string> = {
    syncing: "Syncing…",
    paused: "Paused",
    stopped: "Stopped",
    completed: "Completed",
    failed: "Failed",
  };
  return (
    <Badge variant={STATUS_VARIANT[status]} className={status === "syncing" ? "animate-pulse" : ""}>
      {labels[status]}
    </Badge>
  );
}

function reachablePct(list: LeadList): string {
  if (list.syncedCount === 0) return "";
  const pct = Math.round((list.reachableCount / list.syncedCount) * 100);
  return ` (${pct}%)`;
}

export function LeadsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(silent = false) {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    leadsApi
      .list(token)
      .then(setLists)
      .catch(err => setError(errorMessage(err)))
      .finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => {
    load();
  }, [token]);

  const hasSyncing = lists.some(l => l.status === "syncing");

  useEffect(() => {
    if (!token || !hasSyncing) return;
    const id = setInterval(() => load(true), 10_000);
    return () => clearInterval(id);
  }, [token, hasSyncing]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-muted-foreground">
            Import Twitter users from followers, following, or tweet engagements.
          </p>
        </div>
        {orgId && (
          <Button asChild size="sm">
            <Link to={`/orgs/${orgId}/leads/new`}>New list</Link>
          </Button>
        )}
      </div>

      <ErrorAlert error={error} />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-2">
            <p>No lead lists yet.</p>
            <p className="text-sm">
              Create a list to import followers, following, or tweet engagements as leads.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map(list => (
            <Card key={list.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      <Link
                        to={`/orgs/${orgId}/leads/${list.id}`}
                        className="hover:underline"
                      >
                        {list.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(list.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{SOURCE_LABELS[list.sourceType]}</Badge>
                    <LeadListStatusBadge status={list.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">
                  {list.syncedCount} synced · {list.reachableCount} reachable
                  {reachablePct(list)}
                  {list.targetUsername ? ` · @${list.targetUsername}` : ""}
                  {list.targetTweetId ? ` · tweet ${list.targetTweetId}` : ""}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/orgs/${orgId}/leads/${list.id}`}>View leads</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to={`/orgs/${orgId}`} className="text-primary underline">
          Back to connections
        </Link>
      </p>
    </div>
  );
}
