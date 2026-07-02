import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { orgMembersApi, orgSeatsApi } from "@/lib/hub/api";
import type { OrgTeamMember, SeatsBillingSummary, TeamInvite } from "@/lib/hub/types";
import { useEffect, useState, type FormEvent } from "react";

function statusBadgeVariant(status: TeamInvite["status"]) {
  switch (status) {
    case "pending":
      return "outline" as const;
    case "accepted":
      return "secondary" as const;
    default:
      return "destructive" as const;
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "USD",
  }).format(amount);
}

export function TeamPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState<OrgTeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [billing, setBilling] = useState<SeatsBillingSummary | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatingSeats, setUpdatingSeats] = useState(false);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([orgMembersApi.listMembers(token), orgMembersApi.listInvites(token)])
      .then(([memberList, inviteList]) => {
        setMembers(memberList);
        setInvites(inviteList);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));

    setBillingError(null);
    orgSeatsApi
      .getBillingSummary(token)
      .then(setBilling)
      .catch(err => setBillingError(errorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const email = (form.get("email") as string)?.trim();
    if (!email) return;
    setError(null);
    setInviting(true);
    try {
      await orgMembersApi.createInvite(token, { email });
      formEl.reset();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  async function onUpdateSeats(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    const seatCount = Number(form.get("seatCount"));
    if (!Number.isInteger(seatCount) || seatCount < 1) return;
    setError(null);
    setPendingPaymentUrl(null);
    setUpdatingSeats(true);
    try {
      const result =
        !billing || billing.purchasedSeats === 0
          ? await orgSeatsApi.buy(token, seatCount)
          : await orgSeatsApi.add(token, seatCount);
      if (result.invoiceStatus && result.invoiceStatus !== "paid" && result.hostedInvoiceUrl) {
        setPendingPaymentUrl(result.hostedInvoiceUrl);
      }
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdatingSeats(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!token) return;
    if (!confirm("Revoke this invite?")) return;
    setError(null);
    setBusyId(inviteId);
    try {
      await orgMembersApi.revokeInvite(token, inviteId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!token) return;
    if (!confirm("Remove this member from the organization?")) return;
    setError(null);
    setBusyId(userId);
    try {
      await orgMembersApi.removeMember(token, userId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const pendingInvites = invites.filter(inv => inv.status === "pending");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground">
          Buy seats for your organization, then invite teammates to fill them.
        </p>
      </div>

      <ErrorAlert error={error} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Billing</CardTitle>
          <CardDescription>
            Order summary for your subscription, including per-seat charges. Seat
            purchases are prorated immediately for the remaining days in the current
            billing cycle, whether it's your first seat or an increase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {billingError ? (
            <p className="text-sm text-destructive">{billingError}</p>
          ) : !billing ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Purchased seats</p>
                <p className="text-xl font-semibold">{billing.purchasedSeats}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current cycle total</p>
                <p className="text-xl font-semibold">
                  {formatMoney(billing.currentPeriodTotal, billing.currency)}
                </p>
                <p className="text-xs text-muted-foreground">Plan + seats, as billed now</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upcoming bill</p>
                <p className="text-xl font-semibold">
                  {formatMoney(billing.upcomingTotal, billing.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(billing.currentPeriodEnd * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={onUpdateSeats} className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="seatCount">Total seats</Label>
              <Input
                id="seatCount"
                name="seatCount"
                type="number"
                min={1}
                defaultValue={billing?.purchasedSeats || 1}
                key={billing?.purchasedSeats}
                className="w-28"
              />
            </div>
            <Button type="submit" disabled={updatingSeats}>
              {updatingSeats ? "Updating…" : "Update seats"}
            </Button>
          </form>

          {pendingPaymentUrl && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="mb-2">
                We couldn't automatically charge the card on file for the updated seat
                count. Complete payment to keep this seat count active:
              </p>
              <Button size="sm" asChild>
                <a href={pendingPaymentUrl} target="_blank" rel="noopener noreferrer">
                  Pay now
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Invite a teammate</CardTitle>
          <CardDescription>
            Invites fill already-purchased seats. Buy more seats above if you're at
            capacity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onInvite} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="teammate@company.com" className="w-64" />
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3">Pending invites</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : pendingInvites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No pending invites.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingInvites.map(inv => (
              <Card key={inv.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(inv.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === inv.id}
                      onClick={() => handleRevoke(inv.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Members</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No members yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <Card key={member.userId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">{member.email}</p>
                    {member.joinedAt && (
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{member.role}</Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === member.userId}
                      onClick={() => handleRemove(member.userId)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
