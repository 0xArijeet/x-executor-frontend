import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { OrgPromptChatTest } from "@/components/OrgPromptChatTest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DEFAULT_BOT_NAME,
  DEFAULT_CONVERSATION_GOALS,
  DEFAULT_ESCALATION_CONTACT,
  DEFAULT_OUTREACH_STYLE,
  GOAL_OPTIONS,
  OUTREACH_STYLE_OPTIONS,
  buildGoalText,
  buildGoalsConfigFromTemplate,
  hasPublishedReplyConfig,
  hasSavedReplyConfig,
  isReplyConfigDraftValid,
  normalizeTeamMembersForSave,
  resolveDraftBotName,
  resolveDraftEscalationContact,
  resolveDraftGoals,
  resolveDraftOutreachStyle,
  resolveDraftTeamMembers,
  resolveGoalOptionIdFromDetails,
  resolvePublishedGoals,
  teamMembersEqual,
  type GoalOptionId,
} from "@/lib/conversation-goal";
import { xSettingsApi } from "@/lib/hub/api";
import type {
  ConversationGoalsConfig,
  LlmModelOption,
  Organization,
  OutreachStyle,
  TeamMember,
} from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

export const DEFAULT_LLM_MODEL = "anthropic/claude-haiku-4-5";

type OrgPromptFormProps = {
  token: string;
  publishedGoals?: ConversationGoalsConfig;
  initialDraftGoals?: ConversationGoalsConfig;
  publishedSystemPrompt?: string;
  initialDraftSystemPrompt?: string;
  publishedModel?: string;
  initialDraftModel?: string;
  publishedBotName?: string;
  initialDraftBotName?: string;
  publishedOutreachStyle?: OutreachStyle;
  initialDraftOutreachStyle?: OutreachStyle;
  publishedTeamMembers?: TeamMember[];
  initialDraftTeamMembers?: TeamMember[];
  publishedEscalationContact?: string;
  initialDraftEscalationContact?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  onUpdated?: (org: Organization) => void;
  compact?: boolean;
};

function cloneTeamMembers(members: TeamMember[]): TeamMember[] {
  return members.map(member => ({ ...member }));
}

function goalIdFromGoals(goals: ConversationGoalsConfig): GoalOptionId | null {
  return resolveGoalOptionIdFromDetails(goals.details);
}

export function OrgPromptForm({
  token,
  publishedGoals,
  initialDraftGoals = DEFAULT_CONVERSATION_GOALS,
  publishedSystemPrompt = "",
  initialDraftSystemPrompt = "",
  publishedModel = DEFAULT_LLM_MODEL,
  initialDraftModel = DEFAULT_LLM_MODEL,
  publishedBotName = DEFAULT_BOT_NAME,
  initialDraftBotName = DEFAULT_BOT_NAME,
  publishedOutreachStyle = DEFAULT_OUTREACH_STYLE,
  initialDraftOutreachStyle = DEFAULT_OUTREACH_STYLE,
  publishedTeamMembers = [],
  initialDraftTeamMembers = [],
  publishedEscalationContact = DEFAULT_ESCALATION_CONTACT,
  initialDraftEscalationContact = DEFAULT_ESCALATION_CONTACT,
  hasUnpublishedDraft = false,
  promptPublishedAt,
  onUpdated,
  compact = false,
}: OrgPromptFormProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<GoalOptionId | null>(() =>
    goalIdFromGoals(initialDraftGoals),
  );
  const [savedSelectedGoalId, setSavedSelectedGoalId] = useState<GoalOptionId | null>(() =>
    goalIdFromGoals(initialDraftGoals),
  );
  const [goalTemplateText, setGoalTemplateText] = useState(initialDraftGoals.details);
  const [savedGoalTemplateText, setSavedGoalTemplateText] = useState(initialDraftGoals.details);
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
  const [draftBotName, setDraftBotName] = useState(initialDraftBotName);
  const [savedBotName, setSavedBotName] = useState(initialDraftBotName);
  const [publishedBotNameState, setPublishedBotNameState] = useState(publishedBotName);
  const [draftOutreachStyle, setDraftOutreachStyle] =
    useState<OutreachStyle>(initialDraftOutreachStyle);
  const [savedOutreachStyle, setSavedOutreachStyle] =
    useState<OutreachStyle>(initialDraftOutreachStyle);
  const [publishedOutreachStyleState, setPublishedOutreachStyleState] =
    useState<OutreachStyle>(publishedOutreachStyle);
  const [draftTeamMembers, setDraftTeamMembers] = useState<TeamMember[]>(() =>
    cloneTeamMembers(initialDraftTeamMembers),
  );
  const [savedTeamMembers, setSavedTeamMembers] = useState<TeamMember[]>(() =>
    cloneTeamMembers(initialDraftTeamMembers),
  );
  const [publishedTeamMembersState, setPublishedTeamMembersState] = useState<TeamMember[]>(
    publishedTeamMembers,
  );
  const [draftEscalationContact, setDraftEscalationContact] = useState(
    initialDraftEscalationContact,
  );
  const [savedEscalationContact, setSavedEscalationContact] = useState(
    initialDraftEscalationContact,
  );
  const [publishedEscalationContactState, setPublishedEscalationContactState] = useState(
    publishedEscalationContact,
  );
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
    const nextGoalId = goalIdFromGoals(initialDraftGoals);
    setSelectedGoalId(nextGoalId);
    setSavedSelectedGoalId(nextGoalId);
    setGoalTemplateText(initialDraftGoals.details);
    setSavedGoalTemplateText(initialDraftGoals.details);
    setPublishedGoalsState(publishedGoals);
    setDraftSystemPrompt(initialDraftSystemPrompt);
    setSavedSystemPrompt(initialDraftSystemPrompt);
    setPublishedSystemPromptState(publishedSystemPrompt);
    setDraftModel(initialDraftModel);
    setSavedDraftModel(initialDraftModel);
    setPublishedModelState(publishedModel);
    setDraftBotName(initialDraftBotName);
    setSavedBotName(initialDraftBotName);
    setPublishedBotNameState(publishedBotName);
    setDraftOutreachStyle(initialDraftOutreachStyle);
    setSavedOutreachStyle(initialDraftOutreachStyle);
    setPublishedOutreachStyleState(publishedOutreachStyle);
    setDraftTeamMembers(cloneTeamMembers(initialDraftTeamMembers));
    setSavedTeamMembers(cloneTeamMembers(initialDraftTeamMembers));
    setPublishedTeamMembersState(publishedTeamMembers);
    setDraftEscalationContact(initialDraftEscalationContact);
    setSavedEscalationContact(initialDraftEscalationContact);
    setPublishedEscalationContactState(publishedEscalationContact);
    setServerUnpublished(hasUnpublishedDraft);
    setPublishedAt(promptPublishedAt);
  }, [
    initialDraftGoals.types.join(","),
    initialDraftGoals.details,
    publishedGoals?.types.join(","),
    publishedGoals?.details,
    initialDraftSystemPrompt,
    publishedSystemPrompt,
    initialDraftModel,
    publishedModel,
    initialDraftBotName,
    publishedBotName,
    initialDraftOutreachStyle,
    publishedOutreachStyle,
    initialDraftTeamMembers.map(member => member.username).join(","),
    publishedTeamMembers.map(member => member.username).join(","),
    initialDraftEscalationContact,
    publishedEscalationContact,
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
    const nextGoalId = goalIdFromGoals(nextDraftGoals);
    const nextDraftPrompt = org.draftSystemPrompt ?? org.systemPrompt ?? "";
    const nextDraftModel = org.draftLlmModel ?? org.llmModel ?? DEFAULT_LLM_MODEL;
    const nextDraftBotName = resolveDraftBotName(org);
    const nextDraftOutreachStyle = resolveDraftOutreachStyle(org);
    const nextDraftTeamMembers = resolveDraftTeamMembers(org);
    const nextDraftEscalationContact = resolveDraftEscalationContact(org);

    setSelectedGoalId(nextGoalId);
    setSavedSelectedGoalId(nextGoalId);
    setGoalTemplateText(nextDraftGoals.details);
    setSavedGoalTemplateText(nextDraftGoals.details);
    setPublishedGoalsState(resolvePublishedGoals(org));
    setDraftSystemPrompt(nextDraftPrompt);
    setSavedSystemPrompt(nextDraftPrompt);
    setPublishedSystemPromptState(org.systemPrompt ?? "");
    setDraftModel(nextDraftModel);
    setSavedDraftModel(nextDraftModel);
    setPublishedModelState(org.llmModel ?? DEFAULT_LLM_MODEL);
    setDraftBotName(nextDraftBotName);
    setSavedBotName(nextDraftBotName);
    setPublishedBotNameState(org.botName ?? DEFAULT_BOT_NAME);
    setDraftOutreachStyle(nextDraftOutreachStyle);
    setSavedOutreachStyle(nextDraftOutreachStyle);
    setPublishedOutreachStyleState(org.outreachStyle ?? DEFAULT_OUTREACH_STYLE);
    setDraftTeamMembers(cloneTeamMembers(nextDraftTeamMembers));
    setSavedTeamMembers(cloneTeamMembers(nextDraftTeamMembers));
    setPublishedTeamMembersState(org.teamMembers ?? []);
    setDraftEscalationContact(nextDraftEscalationContact);
    setSavedEscalationContact(nextDraftEscalationContact);
    setPublishedEscalationContactState(org.escalationContact ?? DEFAULT_ESCALATION_CONTACT);
    setServerUnpublished(org.hasUnpublishedDraft ?? false);
    setPublishedAt(org.promptPublishedAt);
    onUpdated?.(org);
  }

  const modelOptions =
    models.length > 0
      ? models
      : [{ id: draftModel, name: draftModel }, { id: DEFAULT_LLM_MODEL, name: "Claude Haiku 4.5" }];

  const selectedModelLabel =
    modelOptions.find(option => option.id === draftModel)?.name ?? draftModel;

  const hasLocalChanges =
    selectedGoalId !== savedSelectedGoalId ||
    goalTemplateText.trim() !== savedGoalTemplateText.trim() ||
    draftSystemPrompt.trim() !== savedSystemPrompt.trim() ||
    draftModel !== savedDraftModel ||
    draftBotName.trim() !== savedBotName.trim() ||
    draftOutreachStyle !== savedOutreachStyle ||
    !teamMembersEqual(
      normalizeTeamMembersForSave(draftTeamMembers),
      normalizeTeamMembersForSave(savedTeamMembers),
    ) ||
    draftEscalationContact.trim() !== savedEscalationContact.trim();
  const isPublished = hasPublishedReplyConfig({
    conversationGoals: publishedGoalsState,
    systemPrompt: publishedSystemPromptState,
  });
  const canPublish =
    !hasLocalChanges &&
    serverUnpublished &&
    !saving &&
    !publishing &&
    isReplyConfigDraftValid(savedSystemPrompt, savedGoalTemplateText);
  const canDiscard =
    !hasLocalChanges && serverUnpublished && !saving && !publishing && !discarding;
  const busy = saving || publishing || discarding;

  function updateTeamMember(index: number, patch: Partial<TeamMember>) {
    setDraftTeamMembers(current =>
      current.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  }

  function addTeamMember() {
    setDraftTeamMembers(current => [...current, { username: "" }]);
  }

  function removeTeamMember(index: number) {
    setDraftTeamMembers(current => current.filter((_, i) => i !== index));
  }

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!isReplyConfigDraftValid(draftSystemPrompt, goalTemplateText)) {
      setError("Add a reference doc and/or enter a conversation goal.");
      return;
    }
    if (selectedGoalId && !goalTemplateText.trim()) {
      setError("Goal template is required when a goal is selected.");
      return;
    }

    const goalsPayload = buildGoalsConfigFromTemplate(goalTemplateText);

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await xSettingsApi.updateGoal(token, {
        goalTypes: goalsPayload.types,
        goalDetails: goalsPayload.details,
        outreachStyle: draftOutreachStyle,
        botName: draftBotName.trim() || DEFAULT_BOT_NAME,
        teamMembers: normalizeTeamMembersForSave(draftTeamMembers),
        escalationContact: draftEscalationContact.trim() || DEFAULT_ESCALATION_CONTACT,
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
  const goalTemplateRows = compact ? 3 : 4;

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

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Outreach agent</p>
          <p className="text-xs text-muted-foreground">
            Configure how the bot replies in inbound DMs — identity, tone, goals, and team routing.
          </p>
        </div>

        <div className="space-y-2 max-w-xl">
          <Label htmlFor="botName">Bot name</Label>
          <Input
            id="botName"
            value={draftBotName}
            onChange={e => setDraftBotName(e.target.value)}
            placeholder={DEFAULT_BOT_NAME}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            Live name: <span className="text-foreground">{publishedBotNameState}</span>
          </p>
        </div>

        <div className="space-y-2 max-w-xl">
          <Label htmlFor="outreachStyle">Outreach style</Label>
          <Select
            value={draftOutreachStyle}
            onValueChange={value => setDraftOutreachStyle(value as OutreachStyle)}
            disabled={busy}
          >
            <SelectTrigger id="outreachStyle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTREACH_STYLE_OPTIONS.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Subtle keeps influence invisible; Assertive pushes toward the goal every message. Live
            style: <span className="text-foreground capitalize">{publishedOutreachStyleState}</span>
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Conversation goal</p>
          <p className="text-xs text-muted-foreground">
            Pick what the agent should work toward in conversations.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Goal</Label>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map(option => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={selectedGoalId === option.id ? "default" : "outline"}
                disabled={busy}
                onClick={() => {
                  setSelectedGoalId(option.id);
                  setGoalTemplateText(buildGoalText(option));
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {(selectedGoalId !== null || goalTemplateText.trim().length > 0) && (
          <div className="space-y-2">
            <Label htmlFor="goalTemplate">Goal template</Label>
            <Textarea
              id="goalTemplate"
              rows={goalTemplateRows}
              value={goalTemplateText}
              onChange={e => setGoalTemplateText(e.target.value)}
              placeholder="Describe what the agent should work toward in conversations."
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Starts from the preset above — edit freely to match your product and tone.
            </p>
          </div>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1">
            <Label>Team members</Label>
            <p className="text-xs text-muted-foreground">
              Used for silent handoffs when the agent skips a reply and notifies the team.
            </p>
          </div>
          {draftTeamMembers.map((member, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-4">
              <Input
                value={member.username}
                onChange={e => updateTeamMember(index, { username: e.target.value })}
                placeholder="username"
                disabled={busy}
              />
              <Input
                value={member.role ?? ""}
                onChange={e => updateTeamMember(index, { role: e.target.value })}
                placeholder="Role"
                disabled={busy}
              />
              <Input
                value={member.topics ?? ""}
                onChange={e => updateTeamMember(index, { topics: e.target.value })}
                placeholder="Topics"
                disabled={busy}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => removeTeamMember(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={addTeamMember}>
            Add team member
          </Button>
          {publishedTeamMembersState.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Live team:{" "}
              {publishedTeamMembersState.map(member => `@${member.username}`).join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2 max-w-xl">
          <Label htmlFor="escalationContact">Default escalation contact</Label>
          <Input
            id="escalationContact"
            value={draftEscalationContact}
            onChange={e => setDraftEscalationContact(e.target.value)}
            placeholder={DEFAULT_ESCALATION_CONTACT}
            disabled={busy}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <Label htmlFor="systemPrompt">Reference doc (draft)</Label>
          <Textarea
            id="systemPrompt"
            rows={promptRows}
            value={draftSystemPrompt}
            onChange={e => setDraftSystemPrompt(e.target.value)}
            placeholder="Product facts, links, FAQs, team info — everything the agent can answer from."
          />
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
            draft: <span className="text-foreground">{selectedModelLabel}</span>.
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
        replyConfigured={hasSavedReplyConfig(savedSystemPrompt, savedGoalTemplateText)}
        llmModel={draftModel}
        hasLocalChanges={hasLocalChanges}
      />
    </div>
  );
}
