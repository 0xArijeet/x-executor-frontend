import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { xSettingsApi } from "@/lib/hub/api";
import type { ChatTestResponse } from "@/lib/hub/types";
import { useState, type FormEvent } from "react";

type OrgPromptChatTestProps = {
  token: string;
  replyConfigured: boolean;
  llmModel: string;
  hasLocalChanges?: boolean;
};

export function OrgPromptChatTest({
  token,
  replyConfigured,
  llmModel,
  hasLocalChanges = false,
}: OrgPromptChatTestProps) {
  const [userMessage, setUserMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatTestResponse | null>(null);

  const canTest =
    replyConfigured && !hasLocalChanges && userMessage.trim().length > 0 && !testing;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canTest) return;

    setError(null);
    setTesting(true);
    try {
      const response = await xSettingsApi.testChat(token, {
        userMessage: userMessage.trim(),
        llmModel,
      });
      setResult(response);
    } catch (err) {
      setError(errorMessage(err));
      setResult(null);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Test outreach agent</p>
        <p className="text-xs text-muted-foreground mt-1">
          Send a sample DM using the saved reference doc, goals, and outreach settings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <ErrorAlert error={error} />

        <div className="space-y-2">
          <Label htmlFor="chatTestMessage">Test message</Label>
          <Textarea
            id="chatTestMessage"
            rows={2}
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            placeholder="What chains do you support?"
            disabled={!replyConfigured || hasLocalChanges}
          />
        </div>

        <Button type="submit" variant="outline" size="sm" disabled={!canTest}>
          {testing ? "Testing…" : "Send test"}
        </Button>

        {!replyConfigured && (
          <p className="text-xs text-muted-foreground">
            Add a reference doc and/or goal details, then save a draft to enable testing.
          </p>
        )}
        {replyConfigured && hasLocalChanges && (
          <p className="text-xs text-muted-foreground">
            Save your draft first — tests use the saved draft on the server.
          </p>
        )}
      </form>

      {result && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Agent decision</span>
            <Badge variant={result.action === "reply" ? "outline" : "secondary"}>
              {result.action === "reply" ? "Reply" : "Skip (silent)"}
            </Badge>
            {result.notifyTeam && <Badge variant="destructive">Notify team</Badge>}
          </div>

          {result.action === "reply" ? (
            <p className="whitespace-pre-wrap text-foreground">{result.message || "—"}</p>
          ) : (
            <div className="space-y-1 text-muted-foreground">
              <p>No user-facing DM would be sent.</p>
              {result.handoffSummary && (
                <p>
                  <span className="font-medium text-foreground">Handoff summary:</span>{" "}
                  {result.handoffSummary}
                </p>
              )}
              {result.handoffTo && (
                <p>
                  <span className="font-medium text-foreground">Route to:</span> @{result.handoffTo}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
