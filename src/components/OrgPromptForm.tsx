import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orgsApi } from "@/lib/hub/api";
import type { Organization } from "@/lib/hub/types";
import { OrgPromptChatTest } from "@/components/OrgPromptChatTest";
import { useEffect, useState, type FormEvent } from "react";

type OrgPromptFormProps = {
  token: string;
  orgId: string;
  publishedPrompt?: string;
  initialDraft?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  onUpdated?: (org: Organization) => void;
  compact?: boolean;
};

export function OrgPromptForm({
  token,
  orgId,
  publishedPrompt = "",
  initialDraft = "",
  hasUnpublishedDraft = false,
  promptPublishedAt,
  onUpdated,
  compact = false,
}: OrgPromptFormProps) {
  const [draftText, setDraftText] = useState(initialDraft);
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [published, setPublished] = useState(publishedPrompt);
  const [serverUnpublished, setServerUnpublished] = useState(hasUnpublishedDraft);
  const [publishedAt, setPublishedAt] = useState(promptPublishedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(initialDraft);
    setSavedDraft(initialDraft);
    setPublished(publishedPrompt);
    setServerUnpublished(hasUnpublishedDraft);
    setPublishedAt(promptPublishedAt);
  }, [initialDraft, publishedPrompt, hasUnpublishedDraft, promptPublishedAt]);

  function applyOrgUpdate(org: Organization) {
    const nextDraft = org.draftSystemPrompt ?? org.systemPrompt ?? "";
    setDraftText(nextDraft);
    setSavedDraft(nextDraft);
    setPublished(org.systemPrompt ?? "");
    setServerUnpublished(org.hasUnpublishedDraft ?? false);
    setPublishedAt(org.promptPublishedAt);
    onUpdated?.(org);
  }

  const hasLocalChanges = draftText.trim() !== savedDraft.trim();
  const isPublished = published.trim().length > 0;
  const canPublish = !hasLocalChanges && serverUnpublished && !saving && !publishing;
  const canDiscard =
    !hasLocalChanges &&
    serverUnpublished &&
    !saving &&
    !publishing &&
    !discarding;
  const busy = saving || publishing || discarding;

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await orgsApi.updatePrompt(token, orgId, { systemPrompt: draftText });
      applyOrgUpdate(updated);
      setSuccess("Draft saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setError(null);
    setSuccess(null);
    setPublishing(true);
    try {
      const updated = await orgsApi.publishPrompt(token, orgId);
      applyOrgUpdate(updated);
      setSuccess("Prompt published to production.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  async function onDiscard() {
    setError(null);
    setSuccess(null);
    setDiscarding(true);
    try {
      const updated = await orgsApi.discardDraft(token, orgId);
      applyOrgUpdate(updated);
      setSuccess("Draft reverted to published version.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDiscarding(false);
    }
  }

  const promptRows = compact ? 4 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {isPublished ? (
          <Badge variant="outline">Live in production</Badge>
        ) : (
          <Badge variant="destructive">Not published</Badge>
        )}
        {serverUnpublished && !hasLocalChanges && (
          <Badge variant="secondary">Unpublished draft</Badge>
        )}
        {hasLocalChanges && <Badge variant="secondary">Unsaved changes</Badge>}
      </div>

      {publishedAt && (
        <p className="text-xs text-muted-foreground">
          Last published: {new Date(publishedAt).toLocaleString()}
        </p>
      )}

      <form onSubmit={onSaveDraft} className="flex flex-col gap-4">
        <ErrorAlert error={error} />
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System prompt (draft)</Label>
          <Textarea
            id="systemPrompt"
            rows={promptRows}
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            placeholder="You are a helpful assistant for this brand. Answer DMs using only the facts below..."
          />
          <p className="text-xs text-muted-foreground">
            Edits stay in draft until you publish. Only the published prompt is used for live inbound
            DM replies. Include out-of-scope instructions in the prompt itself.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} className="w-fit">
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button type="button" disabled={!canPublish} onClick={onPublish}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canDiscard}
            onClick={onDiscard}
          >
            {discarding ? "Reverting…" : "Discard draft"}
          </Button>
        </div>

        {hasLocalChanges && (
          <p className="text-xs text-muted-foreground">
            Save draft before publishing or discarding.
          </p>
        )}
      </form>

      <OrgPromptChatTest token={token} orgId={orgId} systemPrompt={draftText} />
    </div>
  );
}
