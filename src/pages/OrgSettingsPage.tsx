import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthContext";
import { orgsApi } from "@/lib/hub/api";
import type { Member, Organization } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

export function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [unknownReply, setUnknownReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;
    setLoading(true);
    Promise.all([orgsApi.get(token, orgId), orgsApi.members(token, orgId)])
      .then(([o, m]) => {
        setOrg(o);
        setSystemPrompt(o.systemPrompt ?? "");
        setUnknownReply(o.unknownReply ?? "");
        setMembers(m);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, orgId]);

  async function onSavePrompt(e: FormEvent) {
    e.preventDefault();
    if (!token || !orgId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await orgsApi.updatePrompt(token, orgId, { systemPrompt, unknownReply });
      setOrg(updated);
      setSuccess("Prompts saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">{org?.name}</p>
      </div>

      <ErrorAlert error={error} />
      {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization prompts</CardTitle>
          <CardDescription>System prompt and fallback reply for automation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSavePrompt} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System prompt</Label>
              <Textarea
                id="systemPrompt"
                rows={6}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant for..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unknownReply">Unknown reply</Label>
              <Textarea
                id="unknownReply"
                rows={3}
                value={unknownReply}
                onChange={e => setUnknownReply(e.target.value)}
                placeholder="I don't know how to answer that."
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save prompts"}
            </Button>
          </form>
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
