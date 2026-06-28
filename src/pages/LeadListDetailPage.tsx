import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthContext";
import { leadsApi } from "@/lib/hub/api";
import type { ImportLeadsInput, Lead, LeadList, LeadListSourceType, LeadListStatus, TweetPreviewResponse } from "@/lib/hub/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

const SOURCE_LABELS: Record<LeadListSourceType, string> = {
  followers: "Followers",
  following: "Following",
  retweeters: "Retweeters",
};

function StatusBadge({ status }: { status: LeadListStatus }) {
  const map: Record<LeadListStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; pulse: boolean }> = {
    syncing:   { label: "Syncing…",  variant: "default",     pulse: true },
    paused:    { label: "Paused",    variant: "secondary",   pulse: false },
    stopped:   { label: "Stopped",   variant: "outline",     pulse: false },
    completed: { label: "Completed", variant: "outline",     pulse: false },
    failed:    { label: "Failed",    variant: "destructive", pulse: false },
  };
  const { label, variant, pulse } = map[status];
  return (
    <Badge variant={variant} className={pulse ? "animate-pulse" : ""}>
      {label}
    </Badge>
  );
}

function LeadAvatar({ userName, profilePicture }: { userName: string; profilePicture?: string }) {
  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt=""
        className="h-8 w-8 rounded-full bg-muted object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
      {userName.slice(0, 1)}
    </div>
  );
}

const PAGE_SIZE = 25;

export function LeadListDetailPage() {
  const { orgId, listId } = useParams<{ orgId: string; listId: string }>();
  const { token } = useAuth();

  const [list, setList] = useState<LeadList | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsRefreshing, setLeadsRefreshing] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState<LeadListSourceType>("followers");
  const [importTarget, setImportTarget] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importTweetPreview, setImportTweetPreview] = useState<TweetPreviewResponse | null>(null);
  const tweetPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleImportTargetChange(value: string) {
    setImportTarget(value);
    setImportTweetPreview(null);
    if (importSource === "retweeters" && value.trim() && token) {
      if (tweetPreviewTimer.current) clearTimeout(tweetPreviewTimer.current);
      tweetPreviewTimer.current = setTimeout(() => {
        leadsApi.getTweetPreview(token, value.trim())
          .then(p => setImportTweetPreview(p))
          .catch(() => setImportTweetPreview(null));
      }, 600);
    }
  }

  function loadList(silent = false) {
    if (!token || !listId) return;
    if (!silent) setListLoading(true);
    leadsApi
      .get(token, listId)
      .then(result => {
        setList(result);
        setListError(null);
      })
      .catch(err => setListError(errorMessage(err)))
      .finally(() => { if (!silent) setListLoading(false); });
  }

  const loadLeads = useCallback(
    (options?: { silent?: boolean }) => {
      if (!token || !listId) return;
      if (options?.silent) {
        setLeadsRefreshing(true);
      } else {
        setLeadsLoading(true);
      }
      setLeadsError(null);
      leadsApi
        .listLeads(token, listId, {
          page,
          limit: PAGE_SIZE,
          canDm: reachableOnly ? true : undefined,
          q: search.trim() || undefined,
        })
        .then(result => {
          setLeads(result.data);
          setTotal(result.total);
        })
        .catch(err => setLeadsError(errorMessage(err)))
        .finally(() => {
          setLeadsLoading(false);
          setLeadsRefreshing(false);
        });
    },
    [token, listId, page, reachableOnly, search],
  );

  useEffect(() => { loadList(); }, [token, listId]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Poll while syncing
  useEffect(() => {
    if (list?.status !== "syncing") return;
    const id = setInterval(() => {
      loadList(true);
      loadLeads({ silent: true });
    }, 5_000);
    return () => clearInterval(id);
  }, [list?.status, token, listId]);

  async function handleControl(action: "pause" | "resume" | "stop") {
    if (!token || !listId) return;
    if (action === "stop") {
      if (!confirm("Stop this sync? It cannot be resumed after stopping.")) return;
    }
    setControlError(null);
    setControlling(true);
    try {
      const updated =
        action === "pause"
          ? await leadsApi.pause(token, listId)
          : action === "resume"
            ? await leadsApi.resume(token, listId)
            : await leadsApi.stop(token, listId);
      setList(updated);
    } catch (err) {
      setControlError(errorMessage(err));
    } finally {
      setControlling(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !listId) return;
    setImportError(null);
    setImporting(true);
    try {
      const isUserSource = importSource === "followers" || importSource === "following";
      const input: ImportLeadsInput = {
        sourceType: importSource,
        ...(isUserSource
          ? { targetUsername: importTarget.trim().replace(/^@/, "") }
          : { targetTweetId: importTarget.trim() }),
      };
      const updated = await leadsApi.importMore(token, listId, input);
      setList(updated);
      setShowImport(false);
      setImportTarget("");
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  if (listLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!list) return <ErrorAlert error={listError ?? "Lead list not found"} />;

  const reachablePct =
    list.syncedCount > 0
      ? Math.round((list.reachableCount / list.syncedCount) * 100)
      : 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isSyncing = list.status === "syncing";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{list.name}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">{list.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{SOURCE_LABELS[list.sourceType]}</Badge>
          <StatusBadge status={list.status} />
          {list.status !== "syncing" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setShowImport(v => !v); setImportError(null); }}
            >
              {showImport ? "Cancel" : "+ Add leads"}
            </Button>
          )}
        </div>
      </div>

      <ErrorAlert error={listError} />
      <ErrorAlert error={controlError} />

      {/* Progress */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sync progress</CardTitle>
          <CardDescription>
            {list.targetUsername ? `@${list.targetUsername}` : list.targetTweetId ? `Tweet ${list.targetTweetId}` : ""}
            {isSyncing ? " · live" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Synced</p>
              <p className="text-xl font-semibold tabular-nums">
                {list.syncedCount.toLocaleString()}
                {list.totalCount != null && list.totalCount >= list.syncedCount && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}/ {list.totalCount.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Reachable (can DM)</p>
              <p className="text-xl font-semibold tabular-nums">{list.reachableCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Reachable %</p>
              <p className="text-xl font-semibold tabular-nums">{reachablePct}%</p>
            </div>
          </div>

          {list.totalCount != null && list.totalCount > 0 && list.totalCount >= list.syncedCount && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sync progress</span>
                <span>{Math.round((list.syncedCount / list.totalCount) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((list.syncedCount / list.totalCount) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {list.syncedCount > 0 && list.totalCount == null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${reachablePct}%` }}
              />
            </div>
          )}

          {list.syncError && (
            <p className="text-sm text-destructive">Sync error: {list.syncError}</p>
          )}
        </CardContent>
      </Card>

      {/* Import more leads */}
      {showImport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Add more leads</CardTitle>
            <CardDescription>
              Import from any source — new leads are merged into this list (no duplicates).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Source</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["followers", "following", "retweeters"] as LeadListSourceType[]).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => { setImportSource(src); setImportTarget(""); setImportTweetPreview(null); }}
                      className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${
                        importSource === src
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {SOURCE_LABELS[src]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {(importSource === "followers" || importSource === "following") ? (
                  <Input
                    placeholder="@username"
                    value={importTarget}
                    onChange={e => handleImportTargetChange(e.target.value)}
                    required
                  />
                ) : (
                  <>
                    <Input
                      placeholder="Tweet ID or URL (e.g. https://x.com/user/status/123)"
                      value={importTarget}
                      onChange={e => handleImportTargetChange(e.target.value)}
                      required
                    />
                    {importTweetPreview && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          @{importTweetPreview.authorUsername}
                        </p>
                        <p className="line-clamp-3">{importTweetPreview.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {importTweetPreview.retweetCount != null && `${importTweetPreview.retweetCount.toLocaleString()} retweets`}
                          {importTweetPreview.likeCount != null && ` · ${importTweetPreview.likeCount.toLocaleString()} likes`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <ErrorAlert error={importError} />

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={importing || !importTarget.trim()}>
                  {importing ? "Starting…" : "Start import"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={importing}
                  onClick={() => { setShowImport(false); setImportError(null); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {(list.status === "syncing" || list.status === "paused") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Sync controls</CardTitle>
            <CardDescription>
              Pause to temporarily halt importing, resume to continue, or stop permanently.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {list.status === "syncing" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("pause")}
              >
                {controlling ? "Working…" : "Pause"}
              </Button>
            )}
            {list.status === "paused" && (
              <Button
                type="button"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("resume")}
              >
                {controlling ? "Working…" : "Resume"}
              </Button>
            )}
            {(list.status === "syncing" || list.status === "paused") && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("stop")}
              >
                {controlling ? "Working…" : "Stop"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leads table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Leads</CardTitle>
              <CardDescription>
                {total.toLocaleString()} {reachableOnly ? "reachable" : "total"}
                {isSyncing && leadsRefreshing ? " · updating…" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by name or @username"
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value); }}
              className="max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reachableOnly}
                onChange={e => { setPage(1); setReachableOnly(e.target.checked); }}
              />
              Reachable only (can DM)
            </label>
          </div>

          <ErrorAlert error={leadsError} />

          {leadsLoading ? (
            <p className="text-sm text-muted-foreground">Loading leads…</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isSyncing
                ? "Waiting for the first leads — they will appear as sync progresses."
                : "No leads match your filters."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 w-10" aria-label="Avatar" />
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2 text-right">Followers</th>
                    <th className="px-3 py-2 text-right">Following</th>
                    <th className="px-3 py-2">Can DM</th>
                    <th className="px-3 py-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <LeadAvatar userName={lead.userName} profilePicture={lead.profilePicture} />
                      </td>
                      <td className="px-3 py-2 font-mono">@{lead.userName}</td>
                      <td className="px-3 py-2">{lead.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {lead.followers?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {lead.following?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {lead.canDm ? (
                          <Badge variant="outline">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {lead.location ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total.toLocaleString()} leads
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || leadsLoading}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || leadsLoading}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to={`/orgs/${orgId}/leads`} className="text-primary underline">
          All lead lists
        </Link>
        {" · "}
        <Link to={`/orgs/${orgId}`} className="text-primary underline">
          Connections
        </Link>
      </p>
    </div>
  );
}
