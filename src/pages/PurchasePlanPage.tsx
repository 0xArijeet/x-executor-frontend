import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { billingApi } from "@/lib/hub/api";
import type { NoahXPlan } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

type PurchaseState = { email?: string; password?: string } | null;

export function PurchasePlanPage() {
  const location = useLocation();
  const state = location.state as PurchaseState;
  const [plan, setPlan] = useState<NoahXPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    billingApi
      .getNoahXPlan()
      .then(setPlan)
      .catch((err) => setPlanError(errorMessage(err)));
  }, []);

  if (!state?.email || !state?.password) {
    return <Navigate to="/login" replace />;
  }

  async function onPurchase() {
    if (!plan) return;
    setError(null);
    setSubmitting(true);
    try {
      const origin = window.location.origin;
      const { url } = await billingApi.createCheckoutSessionForLogin(
        state!.email!,
        state!.password!,
        plan.planId,
        `${origin}/login?purchased=1`,
        `${origin}/login`,
      );
      window.location.href = url;
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active plan required</CardTitle>
        <CardDescription>
          Your account doesn&apos;t have an active plan with NoahX access. Purchase a plan to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorAlert error={planError ?? error} />
        {plan && (
          <p className="mb-4 text-sm text-muted-foreground">
            {plan.title} — ${plan.price}/mo
          </p>
        )}
        <Button onClick={onPurchase} disabled={submitting || !plan} className="w-full">
          {submitting ? "Redirecting to checkout…" : plan ? "Purchase plan" : "Loading plan…"}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You&apos;ll be redirected to Stripe to complete payment, then need to log in again.{" "}
          <Link to="/login" className="text-primary underline">
            Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
