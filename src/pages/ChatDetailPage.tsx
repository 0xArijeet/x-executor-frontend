import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { chatsApi } from "@/lib/hub/api";
import type { ChatMessage } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const inbound = message.direction === "inbound";

  return (
    <div className={cn("flex", inbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          inbound ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-2 text-[11px]",
            inbound ? "text-muted-foreground" : "text-primary-foreground/80",
          )}
        >
          <span>{formatWhen(message.processedAt)}</span>
          {!inbound && message.isKnownAnswer !== null && (
            <Badge
              variant={message.isKnownAnswer ? "secondary" : "outline"}
              className="h-5 px-1.5 text-[10px]"
            >
              {message.isKnownAnswer ? "Known answer" : "Unknown"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatDetailPage() {
  const { orgId, conversationId: encodedConversationId } = useParams<{
    orgId: string;
    conversationId: string;
  }>();
  const conversationId = encodedConversationId
    ? decodeURIComponent(encodedConversationId)
    : undefined;
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [initialJumpDone, setInitialJumpDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !conversationId) return;
    setLoading(true);
    setError(null);
    chatsApi
      .getMessages(token, conversationId, page, limit)
      .then(result => {
        if (!initialJumpDone && result.total > limit) {
          setInitialJumpDone(true);
          setPage(Math.ceil(result.total / limit));
          return;
        }
        setMessages(result.data);
        setTotal(result.total);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, conversationId, page, limit, initialJumpDone]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Conversation</h1>
        <p className="text-muted-foreground font-mono text-xs mt-1 break-all">{conversationId}</p>
      </div>

      <ErrorAlert error={error} />

      {loading ? (
        <p className="text-muted-foreground">Loading messages…</p>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No messages found for this conversation.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              {messages.map((message, index) => (
                <MessageBubble key={`${message.processedAt}-${index}`} message={message} />
              ))}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} message{total === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {orgId && (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to={`/orgs/${orgId}/chats`} className="text-primary underline">
            All chats
          </Link>
          {" · "}
          <Link to={`/orgs/${orgId}`} className="text-primary underline">
            Connections
          </Link>
        </p>
      )}
    </div>
  );
}
