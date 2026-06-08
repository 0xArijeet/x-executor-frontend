import { Badge } from "@/components/ui/badge";
import type { Connection } from "@/lib/hub/types";

export function ConnectionStatusBadges({ connection }: { connection: Connection }) {
  return (
    <div className="flex flex-wrap gap-2">
      {connection.subscribed ? (
        <Badge variant="secondary">Subscribed</Badge>
      ) : (
        <Badge variant="outline">Not subscribed</Badge>
      )}
      {connection.hasAuthToken ? (
        <Badge variant="secondary">Auth token</Badge>
      ) : (
        <Badge variant="destructive">Auth token required</Badge>
      )}
      {connection.hasXchatPin ? (
        <Badge variant="secondary">XChat PIN</Badge>
      ) : (
        <Badge variant="destructive">XChat PIN required</Badge>
      )}
    </div>
  );
}
