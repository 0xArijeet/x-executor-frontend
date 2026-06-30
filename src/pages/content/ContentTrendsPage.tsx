import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { trendsApi, draftsApi } from "@/lib/content-engine/api";
import { useContentProfile } from "@/lib/content-engine/useContentProfile";
import { IndustryTrendCard, ProductTrendCard } from "@/components/content/TrendCard";
import { DraftCard } from "@/components/content/DraftCard";
import type { TrendTopic, ProductTrendTopic, AngleType, ContentDraft } from "@/lib/content-engine/types";
import { ErrorAlert } from "@/components/ErrorAlert";

type Tab = "industry" | "custom" | "product" | "drafts" | "profile";

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

function ProfileField({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {multiline ? (
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm font-medium">{value}</p>
      )}
    </div>
  );
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

  function handleSelectAngle(
    angle: string,
    angleType: AngleType,
    title: string,
    trendTab: "industry" | "custom" | "product",
    meta?: { sentiment?: string; trendSummary?: string; dataPoints?: { fact: string; source?: string }[]; categories?: string[] },
  ) {
    const params = new URLSearchParams({ topic: title, angle, angleType, trendTab });
    if (meta?.sentiment) params.set("sentiment", meta.sentiment);
    if (meta?.trendSummary) params.set("trendSummary", meta.trendSummary);
    if (meta?.dataPoints?.length) params.set("dataPoints", JSON.stringify(meta.dataPoints));
    if (meta?.categories?.length) params.set("categories", JSON.stringify(meta.categories));
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

  function handleUseVersion(draft: ContentDraft, versionText: string) {
    const params = new URLSearchParams({
      draftId: draft._id,
      draftText: versionText,
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
    { id: "profile", label: "Profile" },
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
                <IndustryTrendCard key={t.id} topic={t} onSelectAngle={(angle, angleType, title, meta) => handleSelectAngle(angle, angleType, title, "industry", meta)} />
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
                <IndustryTrendCard key={t.id} topic={t} onSelectAngle={(angle, angleType, title, meta) => handleSelectAngle(angle, angleType, title, "custom", meta)} />
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
                <ProductTrendCard key={t.id} topic={t} onSelectAngle={(angle, angleType, title, meta) => handleSelectAngle(angle, angleType, title, "product", meta)} />
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
                  onUseVersion={(text) => handleUseVersion(d, text)}
                  onDelete={handleDeleteDraft}
                  deleting={deletingId === d._id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Your content identity and voice settings</p>
            <Link
              to={`/orgs/${orgId}/content/profile`}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Edit Profile
            </Link>
          </div>

          {profileLoading ? (
            <TabSkeleton />
          ) : !profile ? (
            <p className="text-sm text-muted-foreground">No profile set up yet.</p>
          ) : (
            <div className="space-y-6">
              {/* Identity */}
              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <ProfileField label="Name" value={profile.name} />
                  <ProfileField label="Role" value={profile.role} />
                  <ProfileField label="Country" value={profile.country} />
                  <ProfileField label="Company" value={profile.company} />
                </div>
                <ProfileField label="What the company does" value={profile.companyDetails} multiline />
                <ProfileField label="Background" value={profile.background} multiline />
              </section>

              {/* Voice samples */}
              {profile.toneTweets?.length > 0 && (
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Voice samples ({profile.toneTweets.length})
                  </p>
                  <div className="space-y-2">
                    {profile.toneTweets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs whitespace-pre-wrap"
                      >
                        {t.text}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Selected topics */}
              {profile.selectedTopics?.length > 0 && (
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Topic interests ({profile.selectedTopics.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.selectedTopics.map((t) => (
                      <span key={t} className="rounded-full border border-border px-3 py-1 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
