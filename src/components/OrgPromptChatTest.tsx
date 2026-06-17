import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orgsApi } from "@/lib/hub/api";
import type { ChatTestResponse } from "@/lib/hub/types";
import { useState, type FormEvent } from "react";

type OrgPromptChatTestProps = {
  token: string;
  orgId: string;
  systemPrompt: string;
};

export function OrgPromptChatTest({ token, orgId, systemPrompt }: OrgPromptChatTestProps) {
  const [userMessage, setUserMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatTestResponse | null>(null);

  const promptTrimmed = systemPrompt.trim();
  const canTest = promptTrimmed.length > 0 && userMessage.trim().length > 0 && !testing;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canTest) return;

    setError(null);
    setTesting(true);
    try {
      const response = await orgsApi.testChat(token, orgId, {
        userMessage: userMessage.trim(),
        systemPrompt: promptTrimmed,
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
        <p className="text-sm font-medium text-foreground">Test prompt</p>
        <p className="text-xs text-muted-foreground mt-1">
          Send a sample DM question using the draft prompt above (unsaved or saved draft).
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
            disabled={!promptTrimmed}
          />
        </div>

        <Button type="submit" variant="outline" size="sm" disabled={!canTest}>
          {testing ? "Testing…" : "Send test"}
        </Button>

        {!promptTrimmed && (
          <p className="text-xs text-muted-foreground">Enter a system prompt above to enable testing.</p>
        )}
      </form>

      {result && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Bot reply</span>
            <Badge variant={result.isKnownAnswer ? "outline" : "secondary"}>
              {result.isKnownAnswer ? "In scope" : "Out of scope"}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-foreground">{result.reply || "—"}</p>
        </div>
      )}
    </div>
  );
}
