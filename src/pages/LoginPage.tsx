import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { HubApiError, validateHubApiUrl } from "@/lib/hub/client";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const apiConfigError = validateHubApiUrl();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const justPurchased = searchParams.get("purchased") === "1";

  if (user) return <Navigate to="/orgs" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/orgs";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof HubApiError && err.status === 402) {
        navigate("/purchase-plan", { state: { email, password } });
        return;
      }
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Access your organization and X connections.</CardDescription>
      </CardHeader>
      <CardContent>
        {justPurchased && !apiConfigError && !error && (
          <p className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
            Payment received. Log in below to access your account.
          </p>
        )}
        <ErrorAlert error={apiConfigError ?? error} />
        {apiConfigError && (
          <p className="mb-4 text-sm text-muted-foreground">
            Dashboard login cannot reach Hub until <code className="text-xs">PUBLIC_HUB_API_URL</code> is set on
            Vercel and the app is redeployed.
          </p>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <Button type="submit" disabled={submitting || Boolean(apiConfigError)}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="text-primary underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
