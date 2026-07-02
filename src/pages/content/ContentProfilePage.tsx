import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { profileApi, trendsApi } from "@/lib/content-engine/api";
import type { ContentProfile, TrendTopicGroup, ToneTweet } from "@/lib/content-engine/types";
import { ErrorAlert } from "@/components/ErrorAlert";

export function ContentProfilePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Partial<ContentProfile>>({});
  const [topicGroups, setTopicGroups] = useState<TrendTopicGroup[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [toneTweets, setToneTweets] = useState<ToneTweet[]>([]);
  const [newTweetText, setNewTweetText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingTweet, setAddingTweet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([profileApi.get(orgId), trendsApi.topicOptions()])
      .then(([p, opts]) => {
        const safeProfile = p ?? {};
        setProfile(safeProfile);
        setToneTweets(safeProfile.toneTweets ?? []);
        setSelectedTopics(safeProfile.selectedTopics ?? []);
        setTopicGroups(opts?.groups ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleSave(goToTrends = false) {
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.upsert(orgId, {
        ...profile,
        onboardingComplete: goToTrends ? true : profile.onboardingComplete,
      });
      await trendsApi.saveSelectedTopics(orgId, selectedTopics);
      if (goToTrends) navigate(`/orgs/${orgId}/content/trends`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToneTweet() {
    if (!orgId || !newTweetText.trim()) return;
    setAddingTweet(true);
    try {
      const updated = await profileApi.addToneTweet(orgId, newTweetText.trim());
      setToneTweets(updated.toneTweets);
      setNewTweetText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddingTweet(false);
    }
  }

  async function handleRemoveToneTweet(id: string) {
    if (!orgId) return;
    try {
      const updated = await profileApi.removeToneTweet(orgId, id);
      setToneTweets(updated.toneTweets);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  function field(key: keyof ContentProfile) {
    return (profile[key] as string | undefined) ?? "";
  }

  function setField(key: keyof ContentProfile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Content Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your identity, voice, and topic interests power the AI-generated content.
        </p>
      </div>

      {error && <ErrorAlert error={error} />}

      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Identity
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={field("name")}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Role</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={field("role")}
              onChange={(e) => setField("role", e.target.value)}
              placeholder="e.g. Founder, CMO"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Country</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={field("country")}
              onChange={(e) => setField("country", e.target.value)}
              placeholder="e.g. United States"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Company</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={field("company")}
              onChange={(e) => setField("company", e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">What does your company do?</label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={2}
            value={field("companyDetails")}
            onChange={(e) => setField("companyDetails", e.target.value)}
            placeholder="Brief description of your product / service"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Your background</label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={3}
            value={field("background")}
            onChange={(e) => setField("background", e.target.value)}
            placeholder="Expertise, experience, unique perspectives you bring"
          />
        </div>
      </section>

      {/* Tone tweets */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Voice samples
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Paste 3-5 of your best tweets so the AI learns your voice.
          </p>
        </div>
        <div className="space-y-2">
          {toneTweets.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
            >
              <p className="flex-1 text-xs whitespace-pre-wrap">{t.text}</p>
              <button
                type="button"
                onClick={() => handleRemoveToneTweet(t.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={3}
            value={newTweetText}
            onChange={(e) => setNewTweetText(e.target.value)}
            placeholder="Paste a tweet you wrote…"
          />
          <button
            type="button"
            disabled={!newTweetText.trim() || addingTweet}
            onClick={handleAddToneTweet}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {addingTweet ? "Adding…" : "Add sample"}
          </button>
        </div>
      </section>

      {/* Topic interests */}
      {topicGroups.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Topic interests
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pick topics you want trend alerts for. Used for "Your Topics" tab.
            </p>
          </div>
          <div className="space-y-5">
            {topicGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-xs font-medium text-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.topics.map((topic) => {
                    const active = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedTopics.length} topic{selectedTopics.length !== 1 ? "s" : ""} selected
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-10">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(false)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & go to Trends →"}
        </button>
      </div>
    </div>
  );
}
