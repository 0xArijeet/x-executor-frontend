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
  DEFAULT_CONVERSATION_GOALS,
  GOAL_TYPE_OPTIONS,
  directnessLabel,
  goalsConfigEqual,
  hasPublishedReplyConfig,
  hasSavedReplyConfig,
  isReplyConfigDraftValid,
  resolveDraftGoals,
  resolvePublishedGoals,
  toggleGoalType,
} from "@/lib/conversation-goal";
import { xSettingsApi } from "@/lib/hub/api";
import type { ConversationGoalsConfig, LlmModelOption, Organization } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

export const DEFAULT_LLM_MODEL = "google/gemini-3.5-flash";

type OrgPromptFormProps = {
  token: string;
  publishedGoals?: ConversationGoalsConfig;
  initialDraftGoals?: ConversationGoalsConfig;
  publishedSystemPrompt?: string;
  initialDraftSystemPrompt?: string;
  publishedModel?: string;
  initialDraftModel?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  onUpdated?: (org: Organization) => void;
  compact?: boolean;
};

function cloneGoalsConfig(config: ConversationGoalsConfig): ConversationGoalsConfig {
  return {
    types: [...config.types],
    details: config.details,
    directness: config.directness,
  };
}

export function OrgPromptForm({
  token,
  publishedGoals,
  initialDraftGoals = DEFAULT_CONVERSATION_GOALS,
  publishedSystemPrompt = "",
  initialDraftSystemPrompt = "",
  publishedModel = DEFAULT_LLM_MODEL,
  initialDraftModel = DEFAULT_LLM_MODEL,
  hasUnpublishedDraft = false,
  promptPublishedAt,
  onUpdated,
  compact = false,
}: OrgPromptFormProps) {
  const [draftGoals, setDraftGoals] = useState<ConversationGoalsConfig>(() =>
    cloneGoalsConfig(initialDraftGoals),
  );
  const [savedGoals, setSavedGoals] = useState<ConversationGoalsConfig>(() =>
    cloneGoalsConfig(initialDraftGoals),
  );
  const [publishedGoalsState, setPublishedGoalsState] = useState<
    ConversationGoalsConfig | undefined
  >(publishedGoals);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(initialDraftSystemPrompt);
  const [savedSystemPrompt, setSavedSystemPrompt] = useState(initialDraftSystemPrompt);
  const [publishedSystemPromptState, setPublishedSystemPromptState] =
    useState(publishedSystemPrompt);
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
    setDraftGoals(cloneGoalsConfig(initialDraftGoals));
    setSavedGoals(cloneGoalsConfig(initialDraftGoals));
    setPublishedGoalsState(publishedGoals);
    setDraftSystemPrompt(initialDraftSystemPrompt);
    setSavedSystemPrompt(initialDraftSystemPrompt);
    setPublishedSystemPromptState(publishedSystemPrompt);
    setDraftModel(initialDraftModel);
    setSavedDraftModel(initialDraftModel);
    setPublishedModelState(publishedModel);
    setServerUnpublished(hasUnpublishedDraft);
    setPublishedAt(promptPublishedAt);
  }, [
    initialDraftGoals.types.join(","),
    initialDraftGoals.details,
    initialDraftGoals.directness,
    publishedGoals?.types.join(","),
    publishedGoals?.details,
    publishedGoals?.directness,
    initialDraftSystemPrompt,
    publishedSystemPrompt,
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
    const nextDraftGoals = resolveDraftGoals(org);
    const nextDraftPrompt = org.draftSystemPrompt ?? org.systemPrompt ?? "";
    const nextDraftModel = org.draftLlmModel ?? org.llmModel ?? DEFAULT_LLM_MODEL;
    setDraftGoals(cloneGoalsConfig(nextDraftGoals));
    setSavedGoals(cloneGoalsConfig(nextDraftGoals));
    setPublishedGoalsState(resolvePublishedGoals(org));
    setDraftSystemPrompt(nextDraftPrompt);
    setSavedSystemPrompt(nextDraftPrompt);
    setPublishedSystemPromptState(org.systemPrompt ?? "");
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
    !goalsConfigEqual(draftGoals, savedGoals) ||
    draftSystemPrompt.trim() !== savedSystemPrompt.trim() ||
    draftModel !== savedDraftModel;
  const isPublished = hasPublishedReplyConfig({
    conversationGoals: publishedGoalsState,
    systemPrompt: publishedSystemPromptState,
  });
  const canPublish =
    !hasLocalChanges &&
    serverUnpublished &&
    !saving &&
    !publishing &&
    isReplyConfigDraftValid(savedSystemPrompt, savedGoals);
  const canDiscard =
    !hasLocalChanges && serverUnpublished && !saving && !publishing && !discarding;
  const busy = saving || publishing || discarding;
  const showGoalDetails = draftGoals.types.length > 0;

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!isReplyConfigDraftValid(draftSystemPrompt, draftGoals)) {
      setError("Add a system prompt and/or select goal types with details.");
      return;
    }
    if (draftGoals.types.length > 0 && !draftGoals.details.trim()) {
      setError("Goal details are required when goal types are selected.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await xSettingsApi.updateGoal(token, {
        goalTypes: draftGoals.types,
        goalDetails: draftGoals.details,
        directness: draftGoals.directness,
        systemPrompt: draftSystemPrompt,
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
      setSuccess("Reply settings and model published to production.");
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

  const promptRows = compact ? 4 : 5;
  const detailsRows = compact ? 3 : 4;

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
          <Label htmlFor="systemPrompt">System prompt (draft)</Label>
          <Textarea
            id="systemPrompt"
            rows={promptRows}
            value={draftSystemPrompt}
            onChange={e => setDraftSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant for this brand. Answer DMs using only the facts below..."
          />
          <p className="text-xs text-muted-foreground">
            Knowledge and instructions the bot can use for factual answers. Works together with
            conversation goals below.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Goal types</Label>
          <div className="flex flex-wrap gap-2">
            {GOAL_TYPE_OPTIONS.map(option => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={draftGoals.types.includes(option.value) ? "default" : "outline"}
                disabled={busy}
                onClick={() =>
                  setDraftGoals(current => ({
                    ...current,
                    types: toggleGoalType(current.types, option.value),
                  }))
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Select one or more outcomes to steer toward.</p>
        </div>

        {showGoalDetails && (
          <>
            <div className="space-y-2">
              <Label htmlFor="goalDetails">Goal details</Label>
              <Textarea
                id="goalDetails"
                rows={detailsRows}
                value={draftGoals.details}
                onChange={e =>
                  setDraftGoals(current => ({ ...current, details: e.target.value }))
                }
                placeholder="Steer conversations toward joining our Discord. Mention the community vibe and invite link when it feels natural."
              />
              <p className="text-xs text-muted-foreground">
                Shared approach for all selected goals. The bot uses this with your goal types to
                steer DM replies.
              </p>
            </div>

            <div className="space-y-2 max-w-xl">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="directness">Directness</Label>
                <span className="text-xs text-muted-foreground">
                  {directnessLabel(draftGoals.directness)} ({draftGoals.directness})
                </span>
              </div>
              <input
                id="directness"
                type="range"
                min={0}
                max={100}
                step={1}
                value={draftGoals.directness}
                disabled={busy}
                onChange={e =>
                  setDraftGoals(current => ({
                    ...current,
                    directness: Number(e.target.value),
                  }))
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtle</span>
                <span>Balanced</span>
                <span>Direct</span>
              </div>
            </div>
          </>
        )}

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
        replyConfigured={hasSavedReplyConfig(savedSystemPrompt, savedGoals)}
        llmModel={draftModel}
        hasLocalChanges={hasLocalChanges}
      />
    </div>
  );
}
