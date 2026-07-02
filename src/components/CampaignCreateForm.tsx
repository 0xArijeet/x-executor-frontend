import { CampaignScheduleSection } from "@/components/CampaignScheduleSection";
import { CampaignTargetProfile } from "@/components/CampaignTargetProfile";
import { ConnectionAvatar } from "@/components/ConnectionAvatar";
import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
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
import { parseTargetUsernames } from "@/lib/campaign-utils";
import {
  createDefaultCampaignSchedule,
  detectBrowserTimezone,
  validateCampaignSchedule,
  type CampaignScheduleDay,
} from "@/lib/campaign-schedule";
import { campaignsApi, leadsApi } from "@/lib/hub/api";
import type { Connection, LeadList, TargetProfileResponse } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

const DMS_PER_HOUR_DEFAULT = 15;

type CampaignCreateFormProps = {
  token: string;
  connections: Connection[];
  onCreated: (campaignId: string) => void;
};

export function CampaignCreateForm({ token, connections, onCreated }: CampaignCreateFormProps) {
  const [name, setName] = useState("");
  const [audienceType, setAudienceType] = useState<"manual" | "followers" | "lead_list">("manual");
  const [targetsRaw, setTargetsRaw] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [targetProfile, setTargetProfile] = useState<TargetProfileResponse | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [leadListId, setLeadListId] = useState("");
  const [canDmOnly, setCanDmOnly] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [dmsPerHour, setDmsPerHour] = useState(DMS_PER_HOUR_DEFAULT);
  const [dailyLimitPerAccount, setDailyLimitPerAccount] = useState(400);
  const [timezone, setTimezone] = useState(detectBrowserTimezone);
  const [schedule, setSchedule] = useState<CampaignScheduleDay[]>(createDefaultCampaignSchedule);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedTargets = parseTargetUsernames(targetsRaw);
  const normalizedTargetUsername = targetUsername.trim().replace(/^@/, "").toLowerCase();
  const scheduleError = validateCampaignSchedule(schedule);
  const eligibleConnections = connections.filter(c => c.hasAuthToken);
  const authTokenCount = eligibleConnections.length;
  const hasAuthToken = authTokenCount > 0;
  const selectedRate = dmsPerHour;
  const selectedAccountCount = selectedConnectionIds.length;
  const audienceReady =
    audienceType === "manual"
      ? parsedTargets.length > 0
      : audienceType === "followers"
        ? normalizedTargetUsername.length > 0
        : leadListId.length > 0;
  const canSubmit =
    name.trim().length > 0 &&
    audienceReady &&
    messageText.trim().length > 0 &&
    hasAuthToken &&
    selectedAccountCount > 0 &&
    !scheduleError &&
    !submitting &&
    Number.isFinite(selectedRate);

  useEffect(() => {
    setSelectedConnectionIds(eligibleConnections.map(connection => connection.id));
  }, [connections]);

  useEffect(() => {
    setTargetProfile(null);
    setProfileError(null);
  }, [normalizedTargetUsername]);

  useEffect(() => {
    if (audienceType !== "lead_list") return;
    leadsApi.list(token).then(lists => {
      setLeadLists(lists);
      if (lists.length > 0 && !leadListId) setLeadListId(lists[0]?.id ?? "");
    }).catch(() => {});
  }, [audienceType, token]);

  function toggleConnection(connectionId: string, checked: boolean) {
    setSelectedConnectionIds(current => {
      if (checked) {
        return current.includes(connectionId) ? current : [...current, connectionId];
      }
      return current.filter(id => id !== connectionId);
    });
  }

  function selectAllAccounts() {
    setSelectedConnectionIds(eligibleConnections.map(connection => connection.id));
  }

  function clearAllAccounts() {
    setSelectedConnectionIds([]);
  }

  async function onFetchTargetProfile() {
    if (!normalizedTargetUsername) {
      setProfileError("Enter a target username first.");
      return;
    }

    setProfileError(null);
    setFetchingProfile(true);
    try {
      const profile = await campaignsApi.fetchTargetProfile(token, normalizedTargetUsername);
      setTargetProfile(profile);
    } catch (err) {
      setTargetProfile(null);
      setProfileError(errorMessage(err));
    } finally {
      setFetchingProfile(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await campaignsApi.create(token, {
        name: name.trim(),
        audienceType,
        ...(audienceType === "manual"
          ? { targetUsernames: parsedTargets }
          : audienceType === "followers"
            ? {
                targetUsername: normalizedTargetUsername,
                ...(targetProfile
                  ? {
                      targetDisplayName: targetProfile.displayName,
                      targetProfilePictureUrl: targetProfile.profilePictureUrl,
                      targetIsVerified: targetProfile.isVerified,
                      targetIsBlueVerified: targetProfile.isBlueVerified,
                      targetIsIdentityVerified: targetProfile.isIdentityVerified,
                      targetFollowersCount: targetProfile.followersCount,
                    }
                  : {}),
              }
            : { leadListId, canDmOnly }),
        messageText: messageText.trim(),
        dmsPerHour: selectedRate,
        dailyLimitPerAccount,
        timezone,
        schedule,
        connectionIds: selectedConnectionIds,
      });
      onCreated(result.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ErrorAlert error={error} />

      <div className="space-y-2">
        <Label htmlFor="campaignName">Campaign name</Label>
        <Input
          id="campaignName"
          placeholder="Q1 outreach"
          maxLength={100}
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audienceType">Audience</Label>
        <Select
          value={audienceType}
          onValueChange={value => setAudienceType(value as "manual" | "followers" | "lead_list")}
        >
          <SelectTrigger id="audienceType" className="max-w-xs">
            <SelectValue placeholder="Select audience type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual username list</SelectItem>
            <SelectItem value="followers">Followers of an account</SelectItem>
            <SelectItem value="lead_list">Lead list</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {audienceType === "manual"
            ? "Provide usernames directly — campaign starts immediately."
            : audienceType === "followers"
              ? "Sync followers from a target account — DM-able prospects are included and the campaign starts automatically."
              : "Import recipients from a saved lead list."}
        </p>
      </div>

      {audienceType === "lead_list" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="leadListId">Lead list</Label>
            {leadLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lead lists found. Create one first.</p>
            ) : (
              <Select value={leadListId} onValueChange={setLeadListId}>
                <SelectTrigger id="leadListId" className="max-w-xs">
                  <SelectValue placeholder="Select a lead list" />
                </SelectTrigger>
                <SelectContent>
                  {leadLists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                      {" "}
                      <span className="text-muted-foreground text-xs">
                        ({list.syncedCount.toLocaleString()} leads)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {leadListId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={canDmOnly}
                onChange={e => setCanDmOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Only include leads who can DM ({
                leadLists.find(l => l.id === leadListId)?.reachableCount.toLocaleString() ?? "?"
              } reachable)
            </label>
          )}
        </div>
      )}

      {audienceType === "manual" ? (
        <div className="space-y-2">
          <Label htmlFor="targets">Target usernames</Label>
          <Textarea
            id="targets"
            placeholder={"alice\n@bob\ncharlie"}
            rows={6}
            value={targetsRaw}
            onChange={e => setTargetsRaw(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            One username per line or comma-separated. @ prefixes are optional.{" "}
            {parsedTargets.length > 0 && (
              <span className="text-foreground">{parsedTargets.length} unique target(s)</span>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="targetUsername">Target account</Label>
            <div className="flex flex-wrap items-center gap-2 max-w-xl">
              <Input
                id="targetUsername"
                placeholder="elonmusk"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                className="flex-1 min-w-[12rem]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!normalizedTargetUsername || fetchingProfile || submitting}
                onClick={onFetchTargetProfile}
              >
                {fetchingProfile ? "Fetching…" : "Fetch profile"}
              </Button>
            </div>
            {profileError && (
              <p className="text-sm text-destructive">{profileError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Fetch the target profile before syncing followers. Followers sync asynchronously
              (up to ~800) after you create the campaign.
            </p>
          </div>

          {targetProfile && (
            <div className="rounded-lg border border-border p-3 max-w-xl">
              <CampaignTargetProfile
                targetUsername={targetProfile.userName}
                targetDisplayName={targetProfile.displayName}
                targetProfilePictureUrl={targetProfile.profilePictureUrl}
                targetIsVerified={targetProfile.isVerified}
                targetIsBlueVerified={targetProfile.isBlueVerified}
                targetIsIdentityVerified={targetProfile.isIdentityVerified}
                targetFollowersCount={targetProfile.followersCount}
                prefix="Target"
                size="md"
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Hi {{first_name}} — we're reaching out from Acme."
          rows={4}
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Insert variable:</span>
          {(["{{username}}", "{{name}}", "{{first_name}}"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setMessageText(t => t + v)}
              className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Sender accounts</Label>
          {hasAuthToken && (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className="text-primary underline"
                onClick={selectAllAccounts}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-primary underline"
                onClick={clearAllAccounts}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        {!hasAuthToken ? (
          <p className="text-xs text-muted-foreground">
            Connect at least one account with an auth token before launching.
          </p>
        ) : (
          <div className="space-y-2 rounded-lg border border-border p-3">
            {eligibleConnections.map(connection => {
              const checked = selectedConnectionIds.includes(connection.id);
              return (
                <label
                  key={connection.id}
                  htmlFor={`connection-${connection.id}`}
                  className="flex cursor-pointer items-center gap-3 text-sm"
                >
                  <input
                    id={`connection-${connection.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={e => toggleConnection(connection.id, e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <ConnectionAvatar
                    userName={connection.xUsername}
                    displayName={connection.displayName}
                    profilePictureUrl={connection.profilePictureUrl}
                    size="sm"
                  />
                  <span>
                    {connection.displayName ? (
                      <>
                        {connection.displayName}{" "}
                        <span className="text-muted-foreground">@{connection.xUsername}</span>
                      </>
                    ) : (
                      `@${connection.xUsername}`
                    )}
                    {!connection.hasXchatPin && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (no XChat PIN)
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {hasAuthToken
            ? `${selectedAccountCount} of ${authTokenCount} eligible account(s) selected. Messages are distributed across the selected accounts.`
            : "Only accounts with an auth token can send campaign DMs."}
        </p>
      </div>

      <CampaignScheduleSection
        dmsPerHour={dmsPerHour}
        dailyLimitPerAccount={dailyLimitPerAccount}
        timezone={timezone}
        schedule={schedule}
        onDmsPerHourChange={setDmsPerHour}
        onDailyLimitChange={setDailyLimitPerAccount}
        onTimezoneChange={setTimezone}
        onScheduleChange={setSchedule}
      />

      {scheduleError && (
        <p className="text-sm text-destructive">{scheduleError}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Estimated org throughput:{" "}
        <span className="text-foreground">
          {selectedRate * selectedAccountCount} DMs / hour
        </span>{" "}
        across {selectedAccountCount} account(s), within your schedule windows.
      </p>

      <Button type="submit" disabled={!canSubmit}>
        {submitting
          ? "Creating…"
          : audienceType === "followers"
            ? "Sync & start campaign"
            : "Launch campaign"}
      </Button>
      {audienceType !== "followers" && (
        <p className="text-xs text-muted-foreground">
          Variables like <code className="font-mono">{"{{username}}"}</code>, <code className="font-mono">{"{{name}}"}</code>,{" "}
          <code className="font-mono">{"{{first_name}}"}</code> are substituted per recipient at send time.
        </p>
      )}
    </form>
  );
}
