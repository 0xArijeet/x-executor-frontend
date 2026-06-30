import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  const [isClosed, setIsClosed] = useState(false);
  const [recipientName, setRecipientName] = useState<string | null | undefined>(undefined);
  const [recipientProfilePictureUrl, setRecipientProfilePictureUrl] = useState<string | null | undefined>(undefined);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Close/reopen state
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!token || !conversationId) return;
    setLoading(true);
    setError(null);
    chatsApi
      .getMessages(token, conversationId, page, limit)
      .then((result) => {
        if (!initialJumpDone && result.total > limit) {
          setInitialJumpDone(true);
          setPage(Math.ceil(result.total / limit));
          return;
        }
        setMessages(result.data);
        setTotal(result.total);
        setIsClosed(result.isClosed);
        setRecipientName(result.recipientName);
        setRecipientProfilePictureUrl(result.recipientProfilePictureUrl);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, conversationId, page, limit, initialJumpDone]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function handleSendReply() {
    if (!token || !conversationId || !replyText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await chatsApi.replyToConversation(token, conversationId, replyText.trim());
      setReplyText("");
      // Refetch to show the new outbound message.
      const result = await chatsApi.getMessages(token, conversationId, 1, limit);
      setMessages(result.data);
      setTotal(result.total);
      setIsClosed(result.isClosed);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleToggleClose() {
    if (!token || !conversationId) return;
    setToggling(true);
    setError(null);
    try {
      if (isClosed) {
        await chatsApi.reopenConversation(token, conversationId);
      } else {
        await chatsApi.closeConversation(token, conversationId);
      }
      setIsClosed(!isClosed);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  const displayName = recipientName ?? `User ${messages[0]?.recipientId ?? ""}`;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          {recipientProfilePictureUrl !== undefined && (
            recipientProfilePictureUrl ? (
              <img
                src={recipientProfilePictureUrl}
                alt={displayName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )
          )}
          <div>
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            <p className="text-muted-foreground font-mono text-xs mt-1 break-all">{conversationId}</p>
          </div>
        </div>
      </div>

      <ErrorAlert error={error} />

      {/* Closed banner */}
      {isClosed && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          This conversation is closed. The bot will not auto-reply to new messages.
        </div>
      )}

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
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ErrorAlert error={sendError} />

      {/* Reply compose box */}
      {!loading && (
        <div className="mt-6 space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Reply as bot</h2>
            <Button
              variant={isClosed ? "outline" : "secondary"}
              size="sm"
              onClick={handleToggleClose}
              disabled={toggling}
            >
              {toggling
                ? "…"
                : isClosed
                  ? "Reopen conversation"
                  : "Close conversation"}
            </Button>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Type your reply…"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
            {sendError && (
              <p className="text-xs text-destructive">{sendError}</p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
              >
                {sending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </div>
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
