import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { draftsApi } from "@/lib/content-engine/api";
import { useContentProfile } from "@/lib/content-engine/useContentProfile";
import { DraftCard } from "@/components/content/DraftCard";
import type { ContentDraft } from "@/lib/content-engine/types";
import { ErrorAlert } from "@/components/ErrorAlert";

const PAGE_SIZE = 20;

export function ContentDraftsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { profile } = useContentProfile(orgId!);

  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    draftsApi
      .list(orgId, 1, PAGE_SIZE)
      .then((res) => {
        setDrafts(res.drafts);
        setTotal(res.total);
        setPage(1);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [orgId]);

  async function loadMore() {
    if (!orgId) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await draftsApi.list(orgId, nextPage, PAGE_SIZE);
      setDrafts((prev) => [...prev, ...res.drafts]);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete(draftId: string) {
    if (!orgId) return;
    setDeletingId(draftId);
    try {
      await draftsApi.delete(orgId, draftId);
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
      setTotal((t) => t - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(draft: ContentDraft) {
    const params = new URLSearchParams({
      draftId: draft._id,
      draftText: draft.text,
      topic: draft.topic ?? "",
      angle: draft.angle ?? "",
      angleType: draft.angleType ?? "default",
    });
    navigate(`/orgs/${orgId}/content/compose?${params.toString()}`);
  }

  if (profile && !profile.onboardingComplete) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Set up your content profile first.</p>
        <Link to={`/orgs/${orgId}/content/profile`} className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Drafts</h1>
          {!loading && <p className="text-sm text-muted-foreground">{total} draft{total !== 1 ? "s" : ""}</p>}
        </div>
        <Link
          to={`/orgs/${orgId}/content/compose`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New
        </Link>
      </div>

      {error && <ErrorAlert error={error} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-muted/20" />)}
        </div>
      ) : drafts.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No drafts yet.</p>
          <Link
            to={`/orgs/${orgId}/content/trends`}
            className="text-sm text-primary underline underline-offset-2"
          >
            Go to Trends to find something to write about
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <DraftCard
              key={d._id}
              draft={d}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleting={deletingId === d._id}
            />
          ))}
          {drafts.length < total && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="w-full rounded-lg border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : `Load more (${total - drafts.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
