import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseTargetUsernames } from "@/lib/campaign-utils";
import { campaignsApi } from "@/lib/hub/api";
import type { Connection } from "@/lib/hub/types";
import { useState, type FormEvent } from "react";

type CampaignCreateFormProps = {
  token: string;
  orgId: string;
  connections: Connection[];
  onCreated: (campaignId: string) => void;
};

export function CampaignCreateForm({ token, orgId, connections, onCreated }: CampaignCreateFormProps) {
  const [targetsRaw, setTargetsRaw] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedTargets = parseTargetUsernames(targetsRaw);
  const hasAuthToken = connections.some(c => c.hasAuthToken);
  const canSubmit = parsedTargets.length > 0 && messageText.trim().length > 0 && hasAuthToken && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await campaignsApi.create(token, orgId, {
        targetUsernames: parsedTargets,
        messageText: messageText.trim(),
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

      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "Creating…" : "Launch campaign"}
      </Button>
    </form>
  );
}
