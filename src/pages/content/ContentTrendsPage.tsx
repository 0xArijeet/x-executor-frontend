import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { trendsApi, draftsApi } from "@/lib/content-engine/api";
import { useContentProfile } from "@/lib/content-engine/useContentProfile";
import { IndustryTrendCard, ProductTrendCard } from "@/components/content/TrendCard";
import { DraftCard } from "@/components/content/DraftCard";
import type { TrendTopic, ProductTrendTopic, AngleType, ContentDraft } from "@/lib/content-engine/types";
import { ErrorAlert } from "@/components/ErrorAlert";

type Tab = "industry" | "custom" | "product" | "drafts";

interface TabData<T> {
  topics: T[];
  cached: boolean;
  fetchedAt?: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface DraftsTabData {
  drafts: ContentDraft[];
  total: number;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

function emptyTab<T>(): TabData<T> {
  return { topics: [], cached: false, loaded: false, loading: false, error: null };
}

function emptyDraftsTab(): DraftsTabData {
  return { drafts: [], total: 0, loaded: false, loading: false, error: null };
}

function CacheLabel({ cached, fetchedAt }: { cached: boolean; fetchedAt?: string }) {
  if (!fetchedAt) return null;
  const date = new Date(fetchedAt);
  return (
    <span className="text-xs text-muted-foreground">
      {cached ? "Cached · " : ""}
      {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/20" />
      ))}
    </div>
  );
}

export function ContentTrendsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useContentProfile(orgId!);

  const [activeTab, setActiveTab] = useState<Tab>("industry");
  const [industry, setIndustry] = useState<TabData<TrendTopic>>(emptyTab());
  const [custom, setCustom] = useState<TabData<TrendTopic>>(emptyTab());
  const [product, setProduct] = useState<TabData<ProductTrendTopic>>(emptyTab());
  const [draftsTab, setDraftsTab] = useState<DraftsTabData>(emptyDraftsTab());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadIndustry = useCallback(async (refresh = false) => {
    if (!orgId) return;
    setIndustry((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await trendsApi.getIndustry(orgId, refresh);
      setIndustry({ topics: data.topics, cached: data.cached, fetchedAt: data.fetchedAt, loaded: true, loading: false, error: null });
    } catch (e) {
      setIndustry((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [orgId]);

  const loadCustom = useCallback(async (refresh = false) => {
    if (!orgId) return;
    setCustom((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await trendsApi.getCustom(orgId, refresh);
      setCustom({ topics: data.topics, cached: data.cached, fetchedAt: data.fetchedAt, loaded: true, loading: false, error: null });
    } catch (e) {
      setCustom((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [orgId]);

  const loadProduct = useCallback(async (refresh = false) => {
    if (!orgId) return;
    setProduct((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await trendsApi.getProduct(orgId, refresh);
      setProduct({ topics: data.topics, cached: data.cached, fetchedAt: data.fetchedAt, loaded: true, loading: false, error: null });
    } catch (e) {
      setProduct((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [orgId]);

  const loadDrafts = useCallback(async () => {
    if (!orgId) return;
    setDraftsTab((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await draftsApi.list(orgId, 1, 50);
      setDraftsTab({ drafts: data.drafts, total: data.total, loaded: true, loading: false, error: null });
    } catch (e) {
      setDraftsTab((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [orgId]);

  useEffect(() => {
    if (!industry.loaded && !industry.loading) loadIndustry();
  }, [industry.loaded, industry.loading, loadIndustry]);

  useEffect(() => {
    if (activeTab === "custom" && !custom.loaded && !custom.loading) loadCustom();
  }, [activeTab, custom.loaded, custom.loading, loadCustom]);

  useEffect(() => {
    if (activeTab === "product" && !product.loaded && !product.loading) loadProduct();
  }, [activeTab, product.loaded, product.loading, loadProduct]);

  useEffect(() => {
    if (activeTab === "drafts" && !draftsTab.loaded && !draftsTab.loading) loadDrafts();
  }, [activeTab, draftsTab.loaded, draftsTab.loading, loadDrafts]);

  function handleSelectAngle(angle: string, angleType: AngleType, title: string) {
    const params = new URLSearchParams({ topic: title, angle, angleType });
    navigate(`/orgs/${orgId}/content/compose?${params.toString()}`);
  }

  function handleEditDraft(draft: ContentDraft) {
    const params = new URLSearchParams({
      draftId: draft._id,
      draftText: draft.text,
      topic: draft.topic ?? "",
      angle: draft.angle ?? "",
      angleType: draft.angleType ?? "default",
    });
    navigate(`/orgs/${orgId}/content/compose?${params.toString()}`);
  }

  async function handleDeleteDraft(draftId: string) {
    if (!orgId) return;
    setDeletingId(draftId);
    try {
      await draftsApi.delete(orgId, draftId);
      setDraftsTab((s) => ({
        ...s,
        drafts: s.drafts.filter((d) => d._id !== draftId),
        total: s.total - 1,
      }));
    } catch (e) {
      setDraftsTab((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setDeletingId(null);
    }
  }

  if (!profileLoading && !profile?.onboardingComplete) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Set up your content profile first.</p>
        <Link
          to={`/orgs/${orgId}/content/profile`}
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "industry", label: "Industry" },
    { id: "custom", label: "Your Topics" },
    { id: "product", label: "Product" },
    { id: "drafts", label: `Drafts${draftsTab.total > 0 ? ` (${draftsTab.total})` : ""}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Content</h1>
        <Link
          to={`/orgs/${orgId}/content/compose`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Compose
        </Link>
      </div>

      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Industry */}
      {activeTab === "industry" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CacheLabel cached={industry.cached} fetchedAt={industry.fetchedAt} />
            <button type="button" disabled={industry.loading} onClick={() => loadIndustry(true)} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              {industry.loading ? "Fetching from Grok…" : "↻ Refresh"}
            </button>
          </div>
          {industry.error && <ErrorAlert error={industry.error} />}
          {industry.loading ? <TabSkeleton /> : (
            <div className="space-y-3">
              {industry.topics.map((t) => (
                <IndustryTrendCard key={t.id} topic={t} onSelectAngle={handleSelectAngle} />
              ))}
              {industry.topics.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No trends loaded yet. Click refresh to fetch from Grok.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Your Topics */}
      {activeTab === "custom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CacheLabel cached={custom.cached} fetchedAt={custom.fetchedAt} />
            <button type="button" disabled={custom.loading} onClick={() => loadCustom(true)} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              {custom.loading ? "Fetching from Grok…" : "↻ Refresh"}
            </button>
          </div>
          {custom.error && <ErrorAlert error={custom.error} />}
          {!profile?.selectedTopics?.length && !custom.loading && (
            <p className="text-sm text-muted-foreground">
              No topics selected.{" "}
              <Link to={`/orgs/${orgId}/content/profile`} className="text-primary underline underline-offset-2">Add topics in Profile</Link>.
            </p>
          )}
          {custom.loading ? <TabSkeleton /> : (
            <div className="space-y-3">
              {custom.topics.map((t) => (
                <IndustryTrendCard key={t.id} topic={t} onSelectAngle={handleSelectAngle} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product */}
      {activeTab === "product" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CacheLabel cached={product.cached} fetchedAt={product.fetchedAt} />
            <button type="button" disabled={product.loading} onClick={() => loadProduct(true)} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              {product.loading ? "Fetching from Grok…" : "↻ Refresh"}
            </button>
          </div>
          {product.error && <ErrorAlert error={product.error} />}
          {!profile?.companyDetails && !product.loading && (
            <p className="text-sm text-muted-foreground">
              Add company details in{" "}
              <Link to={`/orgs/${orgId}/content/profile`} className="text-primary underline underline-offset-2">Profile</Link>{" "}
              to see product-specific trends.
            </p>
          )}
          {product.loading ? <TabSkeleton /> : (
            <div className="space-y-3">
              {product.topics.map((t) => (
                <ProductTrendCard key={t.id} topic={t} onSelectAngle={handleSelectAngle} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drafts */}
      {activeTab === "drafts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{draftsTab.total} draft{draftsTab.total !== 1 ? "s" : ""}</p>
            <button type="button" onClick={loadDrafts} disabled={draftsTab.loading} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              ↻ Reload
            </button>
          </div>
          {draftsTab.error && <ErrorAlert error={draftsTab.error} />}
          {draftsTab.loading ? <TabSkeleton /> : draftsTab.drafts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No drafts yet.{" "}
              <Link to={`/orgs/${orgId}/content/compose`} className="text-primary underline underline-offset-2">Start composing</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {draftsTab.drafts.map((d) => (
                <DraftCard
                  key={d._id}
                  draft={d}
                  onEdit={handleEditDraft}
                  onDelete={handleDeleteDraft}
                  deleting={deletingId === d._id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
