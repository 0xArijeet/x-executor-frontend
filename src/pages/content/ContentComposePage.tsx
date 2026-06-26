import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { composeApi, draftsApi } from "@/lib/content-engine/api";
import { useContentProfile } from "@/lib/content-engine/useContentProfile";
import { PostCoachPanel } from "@/components/content/PostCoachPanel";
import { PostCoachBadge } from "@/components/content/PostCoachBadge";
import type { AngleType, CoachResult, DraftVersion } from "@/lib/content-engine/types";
import { ErrorAlert } from "@/components/ErrorAlert";

const ANGLE_TYPES: AngleType[] = ["product", "authentic", "founder", "default"];

function CharCount({ text }: { text: string }) {
  const len = text.length;
  return (
    <span className={`text-xs ${len > 280 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {len}/280
    </span>
  );
}

export function ContentComposePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useContentProfile(orgId!);

  // If opened from "Edit draft", these are pre-filled
  const initialDraftId = searchParams.get("draftId");

  const [topic, setTopic] = useState(searchParams.get("topic") ?? "");
  const [angle, setAngle] = useState(searchParams.get("angle") ?? "");
  const [angleType, setAngleType] = useState<AngleType>(
    (searchParams.get("angleType") as AngleType) ?? "default",
  );
  const [userIdea, setUserIdea] = useState("");
  const [tweetText, setTweetText] = useState(searchParams.get("draftText") ?? "");
  // Session-local version history (most recent first). When editing an existing draft,
  // the backend's stored versions are shown separately via the draft.versions array.
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [coach, setCoach] = useState<CoachResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  // Pre-seeded when editing an existing draft — PATCHes instead of POSTing new
  const [savedDraftId, setSavedDraftId] = useState<string | null>(initialDraftId);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scoreText = useCallback(async (text: string) => {
    if (!text.trim()) { setCoach(null); return; }
    setScoring(true);
    try {
      const result = await composeApi.score(text);
      setCoach(result);
    } catch {
      // silently ignore live scoring failures
    } finally {
      setScoring(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => scoreText(tweetText), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tweetText, scoreText]);

  async function handleGenerate() {
    if (!orgId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await composeApi.generate(orgId, { topic, angle, angleType, userIdea: userIdea || undefined });
      if (tweetText) {
        setVersions((v) => [{ text: tweetText, score: coach?.score ?? 0, createdAt: new Date().toISOString() }, ...v]);
      }
      setTweetText(res.text);
      setCoach({ score: res.score, verdict: res.verdict, summary: res.summary, checks: res.checks, stats: res.stats, wordCount: res.wordCount, charCount: res.charCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRewrite() {
    if (!orgId || !tweetText) return;
    setRewriting(true);
    setError(null);
    try {
      const res = await composeApi.rewrite(orgId, tweetText, rewriteInstruction);
      // Push current text as a version before replacing
      setVersions((v) => [{ text: tweetText, score: coach?.score ?? 0, createdAt: new Date().toISOString() }, ...v]);
      setTweetText(res.text);
      setCoach({ score: res.score, verdict: res.verdict, summary: res.summary, checks: res.checks, stats: res.stats, wordCount: res.wordCount, charCount: res.charCount });
      setRewriteInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRewriting(false);
    }
  }

  async function handleSaveDraft() {
    if (!orgId || !tweetText) return;
    setSaving(true);
    setError(null);
    try {
      if (savedDraftId) {
        // Update existing draft — backend pushes new version entry with score
        const draft = await draftsApi.update(orgId, savedDraftId, {
          text: tweetText,
          score: coach?.score,
          verdict: coach?.verdict,
        });
        setSavedDraftId(draft._id);
        setSuccessMsg("Draft updated.");
      } else {
        // Create new draft
        const draft = await draftsApi.save(orgId, {
          text: tweetText,
          score: coach?.score,
          verdict: coach?.verdict,
          topic,
          angle,
          angleType,
        });
        setSavedDraftId(draft._id);
        setSuccessMsg("Draft saved.");
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handlePostToX() {
    if (!orgId) return;
    // Must save first if no draft id yet
    if (!savedDraftId) {
      await handleSaveDraft();
      return;
    }
    const connectionId = prompt("Enter your X Connection ID to post:");
    if (!connectionId) return;
    setPosting(true);
    setError(null);
    try {
      await draftsApi.postToX(orgId, savedDraftId, connectionId);
      setSuccessMsg("Posted to X!");
      setTimeout(() => {
        setSuccessMsg(null);
        navigate(`/orgs/${orgId}/content/tweets`);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
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

  const isEditingExisting = !!initialDraftId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Compose</h1>
          {isEditingExisting && (
            <p className="text-xs text-muted-foreground mt-0.5">Editing draft — save updates existing, versions tracked</p>
          )}
        </div>
        <Link to={`/orgs/${orgId}/content/trends`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </div>

      {error && <ErrorAlert error={error} />}
      {successMsg && (
        <div className="rounded-md border border-green-500 bg-green-50 px-4 py-2 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Composer */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Topic</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's the topic or trend?"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Angle</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                rows={2}
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="What angle do you want to take?"
              />
            </div>
            <div className="flex gap-2">
              {ANGLE_TYPES.map((at) => (
                <button
                  key={at}
                  type="button"
                  onClick={() => setAngleType(at)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    angleType === at
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {at}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Your own idea (optional)</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                placeholder="Seed idea or specific point to make"
              />
            </div>
            <button
              type="button"
              disabled={generating || !topic}
              onClick={handleGenerate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>

          {/* Tweet editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Tweet</label>
              <div className="flex items-center gap-2">
                {coach && <PostCoachBadge score={coach.score} size="sm" />}
                <CharCount text={tweetText} />
              </div>
            </div>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
              rows={8}
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              placeholder="Your tweet will appear here. You can also write directly."
            />
          </div>

          {/* Rewrite */}
          {tweetText && (
            <div className="space-y-2 rounded-lg border border-border p-4">
              <p className="text-xs font-medium">Rewrite</p>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={rewriteInstruction}
                onChange={(e) => setRewriteInstruction(e.target.value)}
                placeholder="e.g. 'Make it punchier' or 'Add a data point'"
                onKeyDown={(e) => e.key === "Enter" && handleRewrite()}
              />
              <button
                type="button"
                disabled={rewriting || !rewriteInstruction}
                onClick={handleRewrite}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {rewriting ? "Rewriting…" : "Rewrite"}
              </button>
            </div>
          )}

          {/* Session version history */}
          {versions.length > 0 && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-muted-foreground">
                Session versions ({versions.length})
              </summary>
              <div className="space-y-2 p-4 pt-2">
                {versions.map((v, i) => (
                  <div key={i} className="space-y-1 rounded-md border border-border bg-muted/20 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v.score > 0 && <PostCoachBadge score={v.score} size="sm" />}
                      <span>{new Date(v.createdAt).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={() => setTweetText(v.text)}
                        className="ml-auto text-primary hover:underline text-xs"
                      >
                        Restore
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{v.text}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Actions */}
          {tweetText && (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraft}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {saving ? "Saving…" : isEditingExisting ? "Update draft" : savedDraftId ? "Save again" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={posting || saving}
                onClick={handlePostToX}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post to X"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Post Coach */}
        <div className="space-y-4">
          <PostCoachPanel result={coach} loading={scoring} />
        </div>
      </div>
    </div>
  );
}
