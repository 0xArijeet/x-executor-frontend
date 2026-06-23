import { CampaignScheduleSection } from "@/components/CampaignScheduleSection";
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
import { campaignsApi } from "@/lib/hub/api";
import type { Connection } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

const DMS_PER_HOUR_DEFAULT = 15;

type CampaignCreateFormProps = {
  token: string;
  connections: Connection[];
  onCreated: (campaignId: string) => void;
};

export function CampaignCreateForm({ token, connections, onCreated }: CampaignCreateFormProps) {
  const [name, setName] = useState("");
  const [audienceType, setAudienceType] = useState<"manual" | "followers">("manual");
  const [targetsRaw, setTargetsRaw] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [messageText, setMessageText] = useState("");
  const [dmsPerHour, setDmsPerHour] = useState(DMS_PER_HOUR_DEFAULT);
  const [dailyLimitPerAccount, setDailyLimitPerAccount] = useState(2000);
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
  const canSubmit =
    name.trim().length > 0 &&
    (audienceType === "manual"
      ? parsedTargets.length > 0
      : normalizedTargetUsername.length > 0) &&
    messageText.trim().length > 0 &&
    hasAuthToken &&
    selectedAccountCount > 0 &&
    !scheduleError &&
    !submitting &&
    Number.isFinite(selectedRate);

  useEffect(() => {
    setSelectedConnectionIds(eligibleConnections.map(connection => connection.id));
  }, [connections]);

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
          : { targetUsername: normalizedTargetUsername }),
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
          onValueChange={value => setAudienceType(value as "manual" | "followers")}
        >
          <SelectTrigger id="audienceType" className="max-w-xs">
            <SelectValue placeholder="Select audience type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual username list</SelectItem>
            <SelectItem value="followers">Followers of an account</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {audienceType === "manual"
            ? "Provide usernames directly — campaign starts immediately."
            : "Sync followers from a target account — DM-able prospects are included and the campaign starts automatically."}
        </p>
      </div>

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
        <div className="space-y-2">
          <Label htmlFor="targetUsername">Target account</Label>
          <Input
            id="targetUsername"
            placeholder="elonmusk"
            value={targetUsername}
            onChange={e => setTargetUsername(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Followers are synced asynchronously (up to ~800). You will choose who to message before
            starting.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Hi — we're reaching out from Acme."
          rows={4}
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
        />
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
                  <span>
                    @{connection.xUsername}
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
    </form>
  );
}
