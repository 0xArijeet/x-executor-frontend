import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/lib/hub/types";
import { cn } from "@/lib/utils";

const labels: Record<CampaignStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const variants: Record<CampaignStatus, "secondary" | "default" | "outline" | "destructive"> = {
  pending: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
};

export function CampaignStatusBadge({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={variants[status]}
      className={cn(status === "completed" && "border-green-600/40 text-green-700 dark:text-green-400", className)}
    >
      {labels[status]}
    </Badge>
  );
}
