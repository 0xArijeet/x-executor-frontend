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
import { campaignsApi } from "@/lib/hub/api";
import type { Connection } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

const DMS_PER_HOUR_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

type CampaignCreateFormProps = {
  token: string;
  orgId: string;
  connections: Connection[];
  onCreated: (campaignId: string) => void;
};

export function CampaignCreateForm({ token, orgId, connections, onCreated }: CampaignCreateFormProps) {
  const [name, setName] = useState("");
  const [targetsRaw, setTargetsRaw] = useState("");
  const [messageText, setMessageText] = useState("");
  const [dmsPerHour, setDmsPerHour] = useState<string>("15");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedTargets = parseTargetUsernames(targetsRaw);
  const eligibleConnections = connections.filter(c => c.hasAuthToken);
  const authTokenCount = eligibleConnections.length;
  const hasAuthToken = authTokenCount > 0;
  const selectedRate = Number.parseInt(dmsPerHour, 10);
  const selectedAccountCount = selectedConnectionIds.length;
  const canSubmit =
    name.trim().length > 0 &&
    parsedTargets.length > 0 &&
    messageText.trim().length > 0 &&
    hasAuthToken &&
    selectedAccountCount > 0 &&
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
      const result = await campaignsApi.create(token, orgId, {
        name: name.trim(),
        targetUsernames: parsedTargets,
        messageText: messageText.trim(),
        dmsPerHour: selectedRate,
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

      <div className="space-y-2">
        <Label htmlFor="dmsPerHour">Send rate (per account)</Label>
        <Select value={dmsPerHour} onValueChange={setDmsPerHour}>
          <SelectTrigger id="dmsPerHour" className="max-w-xs">
            <SelectValue placeholder="Select DMs per hour" />
          </SelectTrigger>
          <SelectContent>
            {DMS_PER_HOUR_OPTIONS.map(option => (
              <SelectItem key={option} value={String(option)}>
                {option} DMs / hour per account
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Estimated org throughput:{" "}
          <span className="text-foreground">
            {selectedRate * selectedAccountCount} DMs / hour
          </span>{" "}
          across {selectedAccountCount} account(s).
        </p>
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "Creating…" : "Launch campaign"}
      </Button>
    </form>
  );
}
