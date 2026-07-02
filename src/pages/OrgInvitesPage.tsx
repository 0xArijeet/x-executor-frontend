import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { invitesApi } from "@/lib/hub/api";
import type { Invite } from "@/lib/hub/types";
import { Copy } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

export function OrgInvitesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickInvite, setQuickInvite] = useState<Invite | null>(null);
  const [quickCreating, setQuickCreating] = useState(false);
  const [quickCopied, setQuickCopied] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    invitesApi
      .list(token)
      .then(setInvites)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, orgId]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const expiresRaw = form.get("expiresInHours") as string;
    const maxUsesRaw = form.get("maxUses") as string;
    setError(null);
    setCreating(true);
    try {
      await invitesApi.create(token, {
        ...(expiresRaw ? { expiresInHours: Number(expiresRaw) } : {}),
        ...(maxUsesRaw ? { maxUses: Number(maxUsesRaw) } : {}),
      });
      formEl.reset();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!token) return;
    if (!confirm("Revoke this invite?")) return;
    setError(null);
    try {
      await invitesApi.revoke(token, inviteId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function copyUrl(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function createQuickInvite() {
    if (!token) return;
    setQuickCreating(true);
    setQuickInvite(null);
    setError(null);
    try {
      const inv = await invitesApi.create(token, { expiresInHours: 0.5, maxUses: 1 });
      setQuickInvite(inv);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setQuickCreating(false);
    }
  }

  async function copyQuickUrl() {
    if (!quickInvite?.connectUrl) return;
    await navigator.clipboard.writeText(quickInvite.connectUrl);
    setQuickCopied(true);
    setTimeout(() => setQuickCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Invites</h1>
        <p className="text-muted-foreground">
          Share OAuth links so X users can authorize without a dashboard login.
        </p>
      </div>

      <ErrorAlert error={error} />

      {/* Quick single-use connect link for the extension flow */}
      <Card className="mb-6 border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg">Add X Account</CardTitle>
          <CardDescription>
            Generate a 30-minute single-use link. Send it to the person whose X account you want to connect.
            They open the link, the Omnibot extension picks their account, and the connection is established.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickInvite?.connectUrl ? (
            <>
              <p className="text-xs font-mono break-all text-muted-foreground border border-border rounded p-2 bg-muted/40">
                {quickInvite.connectUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={copyQuickUrl}>
                  <Copy className="mr-1 h-3 w-3" />
                  {quickCopied ? "Copied!" : "Copy link"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuickInvite(null)}>
                  Done
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Link expires in 30 minutes and can only be used once.</p>
            </>
          ) : (
            <Button onClick={createQuickInvite} disabled={quickCreating}>
              {quickCreating ? "Generating…" : "Generate connect link"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Create invite</CardTitle>
          <CardDescription>Defaults: 168 hours expiry, unlimited uses.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiresInHours">Expires (hours)</Label>
              <Input id="expiresInHours" name="expiresInHours" type="number" min={1} placeholder="168" className="w-28" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max uses</Label>
              <Input id="maxUses" name="maxUses" type="number" min={1} placeholder="∞" className="w-28" />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No active invites.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invites.map(inv => (
            <Card key={inv.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base font-mono text-sm">{inv.inviteToken.slice(0, 12)}…</CardTitle>
                  <div className="flex gap-2">
                    {inv.expired && <Badge variant="destructive">Expired</Badge>}
                    {inv.maxUses != null && (
                      <Badge variant="outline">
                        {inv.useCount ?? 0}/{inv.maxUses} uses
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Expires {new Date(inv.expiresAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inv.connectUrl && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Extension connect link</p>
                    <p className="text-xs text-muted-foreground break-all font-mono">{inv.connectUrl}</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyUrl(inv.connectUrl!, `connect-${inv.id}`)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {copiedId === `connect-${inv.id}` ? "Copied!" : "Copy connect link"}
                    </Button>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">OAuth link (no extension)</p>
                  <p className="text-xs text-muted-foreground break-all font-mono">{inv.inviteUrl}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyUrl(inv.inviteUrl, inv.id)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {copiedId === inv.id ? "Copied!" : "Copy OAuth link"}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={inv.inviteUrl} target="_blank" rel="noopener noreferrer">
                      Open OAuth link
                    </a>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRevoke(inv.id)}>
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
