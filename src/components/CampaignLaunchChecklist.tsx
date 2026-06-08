import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Connection } from "@/lib/hub/types";

export function CampaignLaunchChecklist({ connections }: { connections: Connection[] }) {
  const withAuthToken = connections.filter(c => c.hasAuthToken);
  const ready = withAuthToken.length > 0;

  return (
    <Card className={ready ? "border-green-600/30" : "border-amber-500/40"}>
      <CardContent className="py-4 space-y-2 text-sm">
        <p className="font-medium text-foreground">Before launching a campaign</p>
        <ul className="space-y-1 text-muted-foreground">
          <li className="flex flex-wrap items-center gap-2">
            {connections.length > 0 ? (
              <Badge variant="outline">✓ {connections.length} connected account(s)</Badge>
            ) : (
              <Badge variant="destructive">No X accounts connected</Badge>
            )}
          </li>
          <li className="flex flex-wrap items-center gap-2">
            {ready ? (
              <Badge variant="outline">✓ {withAuthToken.length} account(s) with auth token</Badge>
            ) : (
              <Badge variant="destructive">No auth tokens — set on Connections page</Badge>
            )}
          </li>
        </ul>
        {!ready && (
          <p className="text-xs text-muted-foreground pt-1">
            Campaign DMs send from connected accounts that have an auth token saved. Connect X accounts and set auth
            tokens before creating a campaign.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
