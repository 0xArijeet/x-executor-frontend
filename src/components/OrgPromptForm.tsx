import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { xSettingsApi } from "@/lib/hub/api";
import type { LlmModelOption, Organization } from "@/lib/hub/types";
import { OrgPromptChatTest } from "@/components/OrgPromptChatTest";
import { useEffect, useState, type FormEvent } from "react";

export const DEFAULT_LLM_MODEL = "google/gemini-3.5-flash";

type OrgPromptFormProps = {
  token: string;
  publishedPrompt?: string;
  initialDraft?: string;
  publishedModel?: string;
  initialDraftModel?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  onUpdated?: (org: Organization) => void;
  compact?: boolean;
};

export function OrgPromptForm({
  token,
  publishedPrompt = "",
  initialDraft = "",
  publishedModel = DEFAULT_LLM_MODEL,
  initialDraftModel = DEFAULT_LLM_MODEL,
  hasUnpublishedDraft = false,
  promptPublishedAt,
  onUpdated,
  compact = false,
}: OrgPromptFormProps) {
  const [draftText, setDraftText] = useState(initialDraft);
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [published, setPublished] = useState(publishedPrompt);
  const [draftModel, setDraftModel] = useState(initialDraftModel);
  const [savedDraftModel, setSavedDraftModel] = useState(initialDraftModel);
  const [publishedModelState, setPublishedModelState] = useState(publishedModel);
  const [serverUnpublished, setServerUnpublished] = useState(hasUnpublishedDraft);
  const [publishedAt, setPublishedAt] = useState(promptPublishedAt);
  const [models, setModels] = useState<LlmModelOption[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(initialDraft);
    setSavedDraft(initialDraft);
    setPublished(publishedPrompt);
    setDraftModel(initialDraftModel);
    setSavedDraftModel(initialDraftModel);
    setPublishedModelState(publishedModel);
    setServerUnpublished(hasUnpublishedDraft);
    setPublishedAt(promptPublishedAt);
  }, [
    initialDraft,
    publishedPrompt,
    initialDraftModel,
    publishedModel,
    hasUnpublishedDraft,
    promptPublishedAt,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoadingModels(true);
    setModelsError(null);
    xSettingsApi
      .listLlmModels(token)
      .then(result => {
        if (!cancelled) {
          setModels(result);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setModelsError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingModels(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function applyOrgUpdate(org: Organization) {
    const nextDraft = org.draftSystemPrompt ?? org.systemPrompt ?? "";
    const nextDraftModel = org.draftLlmModel ?? org.llmModel ?? DEFAULT_LLM_MODEL;
    setDraftText(nextDraft);
    setSavedDraft(nextDraft);
    setPublished(org.systemPrompt ?? "");
    setDraftModel(nextDraftModel);
    setSavedDraftModel(nextDraftModel);
    setPublishedModelState(org.llmModel ?? DEFAULT_LLM_MODEL);
    setServerUnpublished(org.hasUnpublishedDraft ?? false);
    setPublishedAt(org.promptPublishedAt);
    onUpdated?.(org);
  }

  const modelOptions =
    models.length > 0
      ? models
      : [{ id: draftModel, name: draftModel }, { id: DEFAULT_LLM_MODEL, name: "Gemini 3.5 Flash" }];

  const selectedModelLabel =
    modelOptions.find(option => option.id === draftModel)?.name ?? draftModel;

  const hasLocalChanges =
    draftText.trim() !== savedDraft.trim() || draftModel !== savedDraftModel;
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
      const updated = await xSettingsApi.updatePrompt(token, {
        systemPrompt: draftText,
        llmModel: draftModel,
      });
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
      const updated = await xSettingsApi.publishPrompt(token);
      applyOrgUpdate(updated);
      setSuccess("Prompt and model published to production.");
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
      const updated = await xSettingsApi.discardDraft(token);
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
        <ErrorAlert error={modelsError} />
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

        <div className="space-y-2">
          <Label htmlFor="llmModel">LLM model (draft)</Label>
          <Select value={draftModel} onValueChange={setDraftModel} disabled={loadingModels || busy}>
            <SelectTrigger id="llmModel" className="max-w-xl">
              <SelectValue placeholder={loadingModels ? "Loading models…" : "Select model"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {modelOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Live model: <span className="text-foreground">{publishedModelState}</span>. Selected
            draft: <span className="text-foreground">{selectedModelLabel}</span>. Models are loaded
            from OpenRouter.
          </p>
        </div>

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
            Edits stay in draft until you publish. Only the published prompt and model are used for
            live inbound DM replies.
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

      <OrgPromptChatTest
        token={token}
        systemPrompt={draftText}
        llmModel={draftModel}
      />
    </div>
  );
}
