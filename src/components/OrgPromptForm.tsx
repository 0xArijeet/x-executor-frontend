import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { OrgPromptChatTest } from "@/components/OrgPromptChatTest";
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
import {
  DEFAULT_CONVERSATION_GOAL,
  GOAL_TYPE_OPTIONS,
  directnessLabel,
  goalsEqual,
  hasPublishedReplyConfig,
  isGoalDraftValid,
} from "@/lib/conversation-goal";
import { xSettingsApi } from "@/lib/hub/api";
import type { ConversationGoal, LlmModelOption, Organization } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

export const DEFAULT_LLM_MODEL = "google/gemini-3.5-flash";

type OrgPromptFormProps = {
  token: string;
  publishedGoal?: ConversationGoal;
  initialDraftGoal?: ConversationGoal;
  legacyPublishedPrompt?: string;
  publishedModel?: string;
  initialDraftModel?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  onUpdated?: (org: Organization) => void;
  compact?: boolean;
};

function cloneGoal(goal: ConversationGoal): ConversationGoal {
  return { ...goal, details: goal.details };
}

export function OrgPromptForm({
  token,
  publishedGoal,
  initialDraftGoal = DEFAULT_CONVERSATION_GOAL,
  legacyPublishedPrompt = "",
  publishedModel = DEFAULT_LLM_MODEL,
  initialDraftModel = DEFAULT_LLM_MODEL,
  hasUnpublishedDraft = false,
  promptPublishedAt,
  onUpdated,
  compact = false,
}: OrgPromptFormProps) {
  const [draftGoal, setDraftGoal] = useState<ConversationGoal>(() => cloneGoal(initialDraftGoal));
  const [savedGoal, setSavedGoal] = useState<ConversationGoal>(() => cloneGoal(initialDraftGoal));
  const [publishedGoalState, setPublishedGoalState] = useState<ConversationGoal | undefined>(
    publishedGoal,
  );
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
    const nextDraft = cloneGoal(initialDraftGoal);
    setDraftGoal(nextDraft);
    setSavedGoal(cloneGoal(initialDraftGoal));
    setPublishedGoalState(publishedGoal);
    setDraftModel(initialDraftModel);
    setSavedDraftModel(initialDraftModel);
    setPublishedModelState(publishedModel);
    setServerUnpublished(hasUnpublishedDraft);
    setPublishedAt(promptPublishedAt);
  }, [
    initialDraftGoal.type,
    initialDraftGoal.details,
    initialDraftGoal.directness,
    publishedGoal?.type,
    publishedGoal?.details,
    publishedGoal?.directness,
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
    const nextDraft =
      org.draftConversationGoal ?? org.conversationGoal ?? DEFAULT_CONVERSATION_GOAL;
    const nextDraftModel = org.draftLlmModel ?? org.llmModel ?? DEFAULT_LLM_MODEL;
    setDraftGoal(cloneGoal(nextDraft));
    setSavedGoal(cloneGoal(nextDraft));
    setPublishedGoalState(org.conversationGoal);
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

  const hasLocalChanges = !goalsEqual(draftGoal, savedGoal) || draftModel !== savedDraftModel;
  const isPublished = hasPublishedReplyConfig({
    conversationGoal: publishedGoalState,
    systemPrompt: legacyPublishedPrompt,
  });
  const canPublish =
    !hasLocalChanges &&
    serverUnpublished &&
    !saving &&
    !publishing &&
    isGoalDraftValid(savedGoal);
  const canDiscard =
    !hasLocalChanges && serverUnpublished && !saving && !publishing && !discarding;
  const busy = saving || publishing || discarding;
  const legacyOnly =
    legacyPublishedPrompt.trim().length > 0 && !publishedGoalState?.details?.trim();

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!isGoalDraftValid(draftGoal)) {
      setError("Goal details are required.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await xSettingsApi.updateGoal(token, {
        goalType: draftGoal.type,
        goalDetails: draftGoal.details,
        directness: draftGoal.directness,
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
      setSuccess("Conversation goal and model published to production.");
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

  const detailsRows = compact ? 4 : 5;

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

      {legacyOnly && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          A legacy system prompt is still active in production. Configure a conversation goal below
          and publish to replace it.
        </p>
      )}

      <form onSubmit={onSaveDraft} className="flex flex-col gap-4">
        <ErrorAlert error={error} />
        <ErrorAlert error={modelsError} />
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

        <div className="space-y-2">
          <Label>Goal type</Label>
          <div className="flex flex-wrap gap-2">
            {GOAL_TYPE_OPTIONS.map(option => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={draftGoal.type === option.value ? "default" : "outline"}
                disabled={busy}
                onClick={() => setDraftGoal(current => ({ ...current, type: option.value }))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goalDetails">Goal details</Label>
          <Textarea
            id="goalDetails"
            rows={detailsRows}
            value={draftGoal.details}
            onChange={e => setDraftGoal(current => ({ ...current, details: e.target.value }))}
            placeholder="Steer conversations toward joining our Discord. Mention the community vibe and invite link when it feels natural."
          />
          <p className="text-xs text-muted-foreground">
            Describe what success looks like. The bot uses this with your goal type to steer DM
            replies.
          </p>
        </div>

        <div className="space-y-2 max-w-xl">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="directness">Directness</Label>
            <span className="text-xs text-muted-foreground">
              {directnessLabel(draftGoal.directness)} ({draftGoal.directness})
            </span>
          </div>
          <input
            id="directness"
            type="range"
            min={0}
            max={100}
            step={1}
            value={draftGoal.directness}
            disabled={busy}
            onChange={e =>
              setDraftGoal(current => ({ ...current, directness: Number(e.target.value) }))
            }
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span>Balanced</span>
            <span>Direct</span>
          </div>
        </div>

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

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} className="w-fit">
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button type="button" disabled={!canPublish} onClick={onPublish}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
          <Button type="button" variant="outline" disabled={!canDiscard} onClick={onDiscard}>
            {discarding ? "Reverting…" : "Discard draft"}
          </Button>
        </div>

        {hasLocalChanges && (
          <p className="text-xs text-muted-foreground">
            Save draft before publishing, discarding, or testing.
          </p>
        )}
      </form>

      <OrgPromptChatTest
        token={token}
        goalConfigured={isGoalDraftValid(savedGoal) || legacyPublishedPrompt.trim().length > 0}
        llmModel={draftModel}
        hasLocalChanges={hasLocalChanges}
      />
    </div>
  );
}
