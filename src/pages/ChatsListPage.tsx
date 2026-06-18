import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { chatsApi } from "@/lib/hub/api";
import type { ChatConversationSummary } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

function recipientLabel(conversation: ChatConversationSummary): string {
  if (conversation.recipientUsername) {
    return `@${conversation.recipientUsername}`;
  }
  return `User ${conversation.recipientId}`;
}

export function ChatsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    chatsApi
      .listConversations(token, page, limit)
      .then(result => {
        setConversations(result.data);
        setTotal(result.total);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chats</h1>
        <p className="text-muted-foreground">
          DM conversations handled through this platform across all connected X accounts.
        </p>
      </div>

      <ErrorAlert error={error} />

      {loading ? (
        <p className="text-muted-foreground">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-2">
            <p>No conversations yet.</p>
            <p className="text-sm">
              Messages appear here after inbound DMs are processed and replied to by the bot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map(conversation => (
            <Card key={conversation.conversationId}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{recipientLabel(conversation)}</CardTitle>
                    <CardDescription>
                      via @{conversation.xUsername} · {conversation.messageCount} message
                      {conversation.messageCount === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {conversation.lastMessage.direction === "inbound" ? "They wrote" : "Bot replied"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {conversation.lastMessage.text}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{formatWhen(conversation.lastMessage.processedAt)}</span>
                  {orgId && (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/orgs/${orgId}/chats/${encodeURIComponent(conversation.conversationId)}`}
                      >
                        View thread
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} conversation{total === 1 ? "" : "s"}
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
          <Link to={`/orgs/${orgId}`} className="text-primary underline">
            Back to connections
          </Link>
        </p>
      )}
    </div>
  );
}
