import { useState } from "react";
import { PostCoachBadge } from "./PostCoachBadge";
import type { ContentDraft } from "@/lib/content-engine/types";

interface DraftCardProps {
  draft: ContentDraft;
  onEdit: (draft: ContentDraft) => void;
  onDelete: (draftId: string) => void;
  deleting?: boolean;
}

export function DraftCard({ draft, onEdit, onDelete, deleting }: DraftCardProps) {
  const [showVersions, setShowVersions] = useState(false);
  const sortedVersions = [...(draft.versions ?? [])].reverse();

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm leading-snug line-clamp-3 whitespace-pre-line">{draft.text}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {draft.score > 0 && <PostCoachBadge score={draft.score} size="sm" />}
        {draft.topic && (
          <span className="rounded-full bg-muted px-2 py-0.5">{draft.topic}</span>
        )}
        {draft.angleType && draft.angleType !== "default" && (
          <span className="rounded-full border border-border px-2 py-0.5 capitalize">
            {draft.angleType}
          </span>
        )}
        {sortedVersions.length > 1 && (
          <button
            type="button"
            onClick={() => setShowVersions((v) => !v)}
            className="opacity-60 hover:opacity-100 underline underline-offset-2"
          >
            {sortedVersions.length} versions {showVersions ? "▲" : "▼"}
          </button>
        )}
        <span className="opacity-60 ml-auto">
          {new Date(draft.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {showVersions && sortedVersions.length > 1 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Version history
          </p>
          {sortedVersions.map((v, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-muted/20 px-3 py-2 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                {v.score > 0 && <PostCoachBadge score={v.score} size="sm" />}
                <span className="text-xs text-muted-foreground">
                  {new Date(v.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {i === 0 && (
                  <span className="ml-auto text-xs font-medium text-primary">Current</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(draft)}
          className="rounded border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm("Delete this draft?")) onDelete(draft._id);
          }}
          className="rounded border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
