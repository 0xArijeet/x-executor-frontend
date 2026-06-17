import { OrgPromptForm } from "@/components/OrgPromptForm";
import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { orgsApi } from "@/lib/hub/api";
import type { Member, Organization } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;
    setLoading(true);
    Promise.all([orgsApi.get(token, orgId), orgsApi.members(token, orgId)])
      .then(([o, m]) => {
        setOrg(o);
        setMembers(m);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, orgId]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">{org?.name}</p>
      </div>

      <ErrorAlert error={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization prompts</CardTitle>
          <CardDescription>Draft, test, and publish the system prompt for DM automation.</CardDescription>
        </CardHeader>
        <CardContent>
          {token && orgId && (
            <OrgPromptForm
              token={token}
              orgId={orgId}
              publishedPrompt={org?.systemPrompt ?? ""}
              initialDraft={org?.draftSystemPrompt ?? org?.systemPrompt ?? ""}
              hasUnpublishedDraft={org?.hasUnpublishedDraft}
              promptPublishedAt={org?.promptPublishedAt}
              onUpdated={setOrg}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.userId} className="border-b border-border/50">
                      <td className="py-2 pr-4">{m.email ?? m.userId}</td>
                      <td className="py-2 pr-4 capitalize">{m.role}</td>
                      <td className="py-2">
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
