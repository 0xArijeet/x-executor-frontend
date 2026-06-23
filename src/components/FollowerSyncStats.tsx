type FollowerSyncStatsProps = {
  syncedSoFar: number;
  reachableCount: number;
  isSyncing?: boolean;
  compact?: boolean;
};

function StatBlock({
  label,
  value,
  compact,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${compact ? "text-lg" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

export function FollowerSyncStats({
  syncedSoFar,
  reachableCount,
  isSyncing = false,
  compact = false,
}: FollowerSyncStatsProps) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:max-w-sm" : "grid-cols-2 sm:grid-cols-2 sm:max-w-md"}`}>
      <StatBlock
        label={isSyncing ? "Followers synced so far" : "Followers synced"}
        value={syncedSoFar}
        compact={compact}
      />
      <StatBlock
        label={isSyncing ? "Can reach out to so far" : "Can reach out to"}
        value={reachableCount}
        compact={compact}
      />
    </div>
  );
}
