import { Badge } from "@/components/ui/badge";
import { formatCompactCount } from "@/lib/campaign-utils";

type CampaignTargetProfileProps = {
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetIsVerified?: boolean;
  targetIsBlueVerified?: boolean;
  targetIsIdentityVerified?: boolean;
  targetFollowersCount?: number;
  size?: "sm" | "md";
  prefix?: string;
};

export function CampaignTargetProfile({
  targetUsername,
  targetDisplayName,
  targetProfilePictureUrl,
  targetIsVerified,
  targetIsBlueVerified,
  targetIsIdentityVerified,
  targetFollowersCount,
  size = "md",
  prefix = "Followers of",
}: CampaignTargetProfileProps) {
  if (!targetUsername) {
    return null;
  }

  const avatarClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const titleClass = size === "sm" ? "text-sm font-medium" : "text-base font-medium";
  const hasVerifiedBadge =
    targetIsBlueVerified || targetIsVerified || targetIsIdentityVerified;

  return (
    <div className="flex items-center gap-3">
      {targetProfilePictureUrl ? (
        <img
          src={targetProfilePictureUrl}
          alt=""
          className={`${avatarClass} rounded-full object-cover bg-muted shrink-0`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`${avatarClass} flex items-center justify-center rounded-full bg-muted font-medium uppercase shrink-0`}
        >
          {targetUsername.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {targetDisplayName && (
            <p className={`${titleClass} truncate`}>{targetDisplayName}</p>
          )}
          {hasVerifiedBadge && (
            <div className="flex flex-wrap items-center gap-1">
              {targetIsBlueVerified && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Blue verified
                </Badge>
              )}
              {targetIsVerified && !targetIsBlueVerified && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Verified
                </Badge>
              )}
              {targetIsIdentityVerified && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  ID verified
                </Badge>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {prefix} @{targetUsername}
          {targetFollowersCount !== undefined
            ? ` · ${formatCompactCount(targetFollowersCount)} followers`
            : ""}
        </p>
      </div>
    </div>
  );
}
