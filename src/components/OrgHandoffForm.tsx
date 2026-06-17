import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orgsApi } from "@/lib/hub/api";
import type { Organization } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

export const DEFAULT_HANDOFF_MESSAGE =
  "A member of our team has been notified and will reply to you shortly.";

type OrgHandoffFormProps = {
  token: string;
  orgId: string;
  handoffEnabled?: boolean;
  handoffConfig?: string;
  handoffMessage?: string;
  onUpdated?: (org: Organization) => void;
};

export function OrgHandoffForm({
  token,
  orgId,
  handoffEnabled = false,
  handoffConfig = "",
  handoffMessage = "",
  onUpdated,
}: OrgHandoffFormProps) {
  const [enabled, setEnabled] = useState(handoffEnabled);
  const [config, setConfig] = useState(handoffConfig);
  const [message, setMessage] = useState(handoffMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(handoffEnabled);
    setConfig(handoffConfig);
    setMessage(handoffMessage);
  }, [handoffEnabled, handoffConfig, handoffMessage]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await orgsApi.updateHandoff(token, orgId, {
        handoffEnabled: enabled,
        handoffConfig: config.trim() || undefined,
        handoffMessage: message.trim() || undefined,
      });
      setEnabled(updated.handoffEnabled ?? false);
      setConfig(updated.handoffConfig ?? "");
      setMessage(updated.handoffMessage ?? "");
      onUpdated?.(updated);
      setSuccess("Handoff settings saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ErrorAlert error={error} />
      {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

      <div className="flex items-center gap-3">
        <input
          id="handoffEnabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="handoffEnabled" className="cursor-pointer">
          Enable bot-to-agent handoff
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="handoffConfig">Notify instructions</Label>
        <Textarea
          id="handoffConfig"
          rows={4}
          value={config}
          onChange={e => setConfig(e.target.value)}
          placeholder="Notify @john for investments, @jane for support..."
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Free-text rules for when to hand off and which @handle to notify. The LLM uses these
          instructions to classify inbound DMs.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="handoffMessage">Reply to user (optional)</Label>
        <Input
          id="handoffMessage"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={DEFAULT_HANDOFF_MESSAGE}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Message sent to the user when a handoff is triggered or while the conversation is locked
          (24 hours). Leave blank to use the default.
        </p>
      </div>

      <Button type="submit" disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save handoff settings"}
      </Button>
    </form>
  );
}
