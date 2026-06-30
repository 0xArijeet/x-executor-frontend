import { useState } from "react";
import { PostCoachBadge } from "./PostCoachBadge";
import { cn } from "@/lib/utils";
import type { ContentDraft } from "@/lib/content-engine/types";

interface DraftCardProps {
  draft: ContentDraft;
  onEdit: (draft: ContentDraft) => void;
  onDelete: (draftId: string) => void;
  onUseVersion?: (versionText: string, versionNum: number) => void;
  deleting?: boolean;
}

export function DraftCard({ draft, onEdit, onDelete, onUseVersion, deleting }: DraftCardProps) {
  const [showVersions, setShowVersions] = useState(false);
  const sortedVersions = [...(draft.versions ?? [])].reverse();

  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {/* Current draft text */}
      <div className="p-4">
        <p className="text-sm leading-relaxed whitespace-pre-line">{draft.text}</p>
      </div>

      {/* Metadata row */}
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {draft.score > 0 && <PostCoachBadge score={draft.score} size="sm" />}
        {draft.topic && (
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">
            {draft.topic}
          </span>
        )}
        {draft.categories?.map((cat) => (
          <span key={cat} className="rounded-full border border-border px-2 py-0.5">
            {cat}
          </span>
        ))}
        {draft.angleType && draft.angleType !== "default" && (
          <span className="rounded-full border border-border px-2 py-0.5 capitalize">
            {draft.angleType}
          </span>
        )}
        {sortedVersions.length > 1 && (
          <button
            type="button"
            onClick={() => setShowVersions((v) => !v)}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-muted transition-colors"
          >
            v1 → v{sortedVersions.length} {showVersions ? "▲" : "▼"}
          </button>
        )}
        <span className="ml-auto opacity-60">
          {new Date(draft.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Version history */}
      {showVersions && sortedVersions.length > 1 && (
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Version history
          </p>
          <div className="space-y-2">
            {sortedVersions.map((v, i) => {
              const vNum = sortedVersions.length - i;
              const isCurrent = i === 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border overflow-hidden",
                    isCurrent ? "border-primary/40" : "border-border",
                  )}
                >
                  {/* Version header */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2",
                      isCurrent ? "bg-primary/8" : "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/15 text-muted-foreground",
                      )}
                    >
                      v{vNum}{isCurrent ? " · Current" : ""}
                    </span>
                    {v.score > 0 && <PostCoachBadge score={v.score} size="sm" />}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(v.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Tweet text — full, not clamped */}
                  <div className="px-3 py-2.5 bg-background">
                    <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/80">
                      {v.text}
                    </p>
                  </div>

                  {/* Action row for older versions */}
                  {!isCurrent && onUseVersion && (
                    <div className="px-3 py-2 border-t border-border bg-muted/10 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onUseVersion(v.text, vNum)}
                        className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Use this version
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend context */}
      {(draft.sentiment || draft.dataPoints?.length) && (
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {draft.sentiment && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  draft.sentiment === "bullish"
                    ? "bg-green-100 text-green-700"
                    : draft.sentiment === "bearish"
                      ? "bg-red-100 text-red-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {draft.sentiment}
              </span>
            )}
            {draft.trendSummary && (
              <p className="text-xs text-muted-foreground flex-1">{draft.trendSummary}</p>
            )}
          </div>
          {draft.dataPoints?.length ? (
            <ul className="space-y-1">
              {draft.dataPoints.map((dp, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-primary mt-0.5">·</span>
                  {dp.fact}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(draft)}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm("Delete this draft?")) onDelete(draft._id);
          }}
          className="rounded border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
