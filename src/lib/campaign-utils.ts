export function parseTargetUsernames(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map(u => u.trim().replace(/^@/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function formatRelativeEta(expectedEndAt: string | undefined): string | null {
  if (!expectedEndAt) return null;
  const ms = new Date(expectedEndAt).getTime() - Date.now();
  if (ms <= 0) return "Any moment now";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `~${minutes} min remaining`;
  const hours = Math.ceil(minutes / 60);
  return `~${hours} hr remaining`;
}

export function isCampaignActive(status: string): boolean {
  return status === "pending" || status === "running";
}
