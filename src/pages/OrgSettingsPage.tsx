import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { OrgPromptForm } from "@/components/OrgPromptForm";
import { OrgHandoffForm } from "@/components/OrgHandoffForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { xSettingsApi } from "@/lib/hub/api";
import type { Organization } from "@/lib/hub/types";
import { useEffect, useState } from "react";

export function OrgSettingsPage() {
  const { token } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    xSettingsApi
      .get(token)
      .then(setOrg)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">{org?.name ?? "X automation"}</p>
      </div>

      <ErrorAlert error={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization prompts</CardTitle>
          <CardDescription>
            Draft, test, and publish the system prompt and LLM model for DM automation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token && (
            <OrgPromptForm
              token={token}
              publishedPrompt={org?.systemPrompt ?? ""}
              initialDraft={org?.draftSystemPrompt ?? org?.systemPrompt ?? ""}
              publishedModel={org?.llmModel}
              initialDraftModel={org?.draftLlmModel ?? org?.llmModel}
              hasUnpublishedDraft={org?.hasUnpublishedDraft}
              promptPublishedAt={org?.promptPublishedAt}
              onUpdated={setOrg}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bot-to-agent handoff</CardTitle>
          <CardDescription>
            Classify inbound DMs with the LLM and notify a team member on X when a human should take
            over. changes take effect immediately after save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token && (
            <OrgHandoffForm
              token={token}
              handoffEnabled={org?.handoffEnabled}
              handoffConfig={org?.handoffConfig}
              handoffMessage={org?.handoffMessage}
              onUpdated={setOrg}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
