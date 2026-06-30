import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { campaignsApi, leadsApi } from "@/lib/hub/api";
import type { LeadListSourceType, TargetProfileResponse, TweetPreviewResponse } from "@/lib/hub/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type SourceOption = {
  value: LeadListSourceType;
  label: string;
  description: string;
  needsUsername: boolean;
};

const SOURCE_OPTIONS: SourceOption[] = [
  {
    value: "followers",
    label: "Followers",
    description: "People who follow a given @username",
    needsUsername: true,
  },
  {
    value: "following",
    label: "Following",
    description: "People a given @username follows",
    needsUsername: true,
  },
  {
    value: "retweeters",
    label: "Retweeters",
    description: "People who retweeted a specific tweet",
    needsUsername: false,
  },
];

function parseTweetId(value: string): string | null {
  const trimmed = value.trim();
  // bare numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;
  // x.com/…/status/ID  or  twitter.com/…/status/ID
  const match = trimmed.match(/\/status\/(\d+)/);
  return match?.[1] ?? null;
}

export function LeadListCreatePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<LeadListSourceType>("followers");
  const [username, setUsername] = useState("");
  const [tweetInput, setTweetInput] = useState("");

  const [targetProfile, setTargetProfile] = useState<TargetProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [tweetPreview, setTweetPreview] = useState<TweetPreviewResponse | null>(null);
  const [tweetPreviewLoading, setTweetPreviewLoading] = useState(false);
  const tweetPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedOption = SOURCE_OPTIONS.find(o => o.value === sourceType)!;
  const needsUsername = selectedOption.needsUsername;
  const tweetId = needsUsername ? null : parseTweetId(tweetInput);

  // Fetch target profile when username changes (for followers/following)
  useEffect(() => {
    if (!needsUsername || !token) return;
    const normalized = username.trim().replace(/^@/, "").toLowerCase();
    if (!normalized) {
      setTargetProfile(null);
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    const timeout = setTimeout(() => {
      campaignsApi
        .fetchTargetProfile(token, normalized)
        .then(profile => {
          setTargetProfile(profile);
          setProfileError(null);
        })
        .catch(err => {
          setTargetProfile(null);
          setProfileError(errorMessage(err));
        })
        .finally(() => setProfileLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [username, needsUsername, token]);

  // Reset profile when source type changes
  useEffect(() => {
    setTargetProfile(null);
    setProfileError(null);
    setUsername("");
    setTweetInput("");
    setTweetPreview(null);
  }, [sourceType]);

  // Fetch tweet preview when tweetId changes
  useEffect(() => {
    if (!tweetId || !token) {
      setTweetPreview(null);
      return;
    }
    if (tweetPreviewTimer.current) clearTimeout(tweetPreviewTimer.current);
    setTweetPreviewLoading(true);
    tweetPreviewTimer.current = setTimeout(() => {
      leadsApi.getTweetPreview(token, tweetId)
        .then(p => { setTweetPreview(p); setTweetPreviewLoading(false); })
        .catch(() => { setTweetPreview(null); setTweetPreviewLoading(false); });
    }, 400);
  }, [tweetId, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !orgId) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (needsUsername) {
      const normalized = username.trim().replace(/^@/, "").toLowerCase();
      if (!normalized) return;
    } else {
      if (!tweetId) return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const normalized = username.trim().replace(/^@/, "").toLowerCase();
      const list = await leadsApi.createList(token, {
        name: trimmedName,
        sourceType,
        ...(needsUsername
          ? {
              targetUsername: normalized,
              targetDisplayName: targetProfile?.displayName,
              targetProfilePictureUrl: targetProfile?.profilePictureUrl,
            }
          : {
              targetTweetId: tweetId!,
              targetTweetPreview: tweetPreview?.text?.slice(0, 200),
            }),
      });
      navigate(`/orgs/${orgId}/leads/${list.id}`);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    (needsUsername
      ? username.trim().length > 0 && !profileLoading
      : tweetId !== null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New lead list</h1>
        <p className="text-muted-foreground">
          Import Twitter users into a named list for outreach.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">List name</CardTitle>
            <CardDescription>A label to identify this list.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="list-name">Name</Label>
              <Input
                id="list-name"
                placeholder="e.g. SaaS founders — May 2025"
                maxLength={100}
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Source type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import source</CardTitle>
            <CardDescription>Where should leads be imported from?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOURCE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setSourceType(option.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    sourceType === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {needsUsername ? "Target account" : "Target tweet"}
            </CardTitle>
            <CardDescription>
              {needsUsername
                ? "Enter the @username whose " + (sourceType === "followers" ? "followers" : "following") + " you want to import."
                : "Paste the tweet URL or enter its numeric ID."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {needsUsername ? (
              <>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="target-username">Username</Label>
                  <Input
                    id="target-username"
                    placeholder="@username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                {profileLoading && (
                  <p className="text-sm text-muted-foreground">Looking up account…</p>
                )}
                {profileError && !profileLoading && (
                  <p className="text-sm text-destructive">{profileError}</p>
                )}
                {targetProfile && !profileLoading && (
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3 max-w-sm">
                    {targetProfile.profilePictureUrl && (
                      <img
                        src={targetProfile.profilePictureUrl}
                        alt=""
                        className="h-9 w-9 rounded-full bg-muted object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {targetProfile.displayName ?? targetProfile.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">@{targetProfile.userName}</p>
                      {targetProfile.followersCount !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {targetProfile.followersCount.toLocaleString()} followers
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="tweet-input">Tweet URL or ID</Label>
                  <Input
                    id="tweet-input"
                    placeholder="https://x.com/user/status/123… or 123456789"
                    value={tweetInput}
                    onChange={e => setTweetInput(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                {tweetInput.trim() && !tweetId && (
                  <p className="text-sm text-destructive">
                    Could not parse a tweet ID from that input.
                  </p>
                )}
                {tweetPreviewLoading && (
                  <p className="text-sm text-muted-foreground">Loading tweet…</p>
                )}
                {tweetPreview && !tweetPreviewLoading && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 max-w-sm">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      @{tweetPreview.authorUsername}
                    </p>
                    <p className="text-sm line-clamp-4">{tweetPreview.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tweetPreview.retweetCount != null && `${tweetPreview.retweetCount.toLocaleString()} retweets`}
                      {tweetPreview.likeCount != null && ` · ${tweetPreview.likeCount.toLocaleString()} likes`}
                    </p>
                  </div>
                )}
                {tweetId && !tweetPreview && !tweetPreviewLoading && (
                  <p className="text-sm text-muted-foreground">Tweet ID: {tweetId}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ErrorAlert error={submitError} />

        <div className="flex gap-3">
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : "Create list"}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to={`/orgs/${orgId}/leads`}>Cancel</Link>
          </Button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to={`/orgs/${orgId}/leads`} className="text-primary underline">
          All lead lists
        </Link>
      </p>
    </div>
  );
}
