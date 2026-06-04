import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { orgsApi } from "@/lib/hub/api";
import type { OrganizationWithRole } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

export function OrgsListPage() {
  const { token } = useAuth();
  const [orgs, setOrgs] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    orgsApi
      .list(token)
      .then(setOrgs)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const slug = (form.get("slug") as string)?.trim();
    setError(null);
    setCreating(true);
    try {
      await orgsApi.create(token, {
        name: form.get("name") as string,
        ...(slug ? { slug } : {}),
      });
      formEl.reset();
      setShowCreate(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-muted-foreground">Manage X connections and invites per org.</p>
        </div>
        <Button onClick={() => setShowCreate(v => !v)}>{showCreate ? "Cancel" : "New organization"}</Button>
      </div>

      <ErrorAlert error={error} />

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="flex flex-col gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (optional)</Label>
                <Input id="slug" name="slug" placeholder="acme-corp" />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No organizations yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orgs.map(org => (
            <Link key={org.id} to={`/orgs/${org.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Badge variant="secondary">{org.role}</Badge>
                  </div>
                  {org.slug && <CardDescription>{org.slug}</CardDescription>}
                  {(org.role === "owner" || org.role === "admin") && !org.systemPrompt?.trim() && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Set a system prompt to enable DM replies</p>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
