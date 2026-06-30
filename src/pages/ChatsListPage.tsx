import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { chatsApi, handoffsApi } from "@/lib/hub/api";
import type { ChatConversationSummary, HandoffSummary } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type InboxTab = "all" | "handoffs" | "closed";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

function conversationDisplayName(conversation: ChatConversationSummary): string {
  return conversation.recipientName ?? conversation.recipientUsername ?? `User ${conversation.recipientId}`;
}

function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initial = name.charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium`}
    >
      {initial}
    </div>
  );
}

function ConversationCard({
  conversation,
  orgId,
}: {
  conversation: ChatConversationSummary;
  orgId: string;
}) {
  return (
    <Card key={conversation.conversationId}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar
            src={conversation.recipientProfilePictureUrl}
            name={conversationDisplayName(conversation)}
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {conversationDisplayName(conversation)}
            </CardTitle>
            <CardDescription>
              via @{conversation.xUsername} · {conversation.messageCount} message
              {conversation.messageCount === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {conversation.isClosed && (
              <Badge variant="secondary">Closed</Badge>
            )}
            <Badge variant="outline">
              {conversation.lastMessage.direction === "inbound" ? "They wrote" : "Bot replied"}
            </Badge>
          </div>
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
  );
}

function HandoffCard({
  handoff,
  orgId,
}: {
  handoff: HandoffSummary;
  orgId: string;
}) {
  const displayName =
    handoff.recipientName ??
    handoff.recipientUsername ??
    `User ${handoff.recipientId}`;
  return (
    <Card key={handoff._id}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar
            src={handoff.recipientProfilePictureUrl}
            name={displayName}
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{displayName}</CardTitle>
            <CardDescription className="truncate text-xs">
              {handoff.category}
              {handoff.recipientUsername && ` · @${handoff.recipientUsername}`}
            </CardDescription>
          </div>
          <Badge className="shrink-0">{handoff.triggerReason}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {handoff.userMessage}
        </p>
        <p className="text-xs text-muted-foreground">
          {handoff.contextSummary}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatWhen(handoff.createdAt)}</span>
          {orgId && (
            <Button asChild variant="outline" size="sm">
              <Link
                to={`/orgs/${orgId}/chats/${encodeURIComponent(handoff.conversationId)}`}
              >
                View thread & reply
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChatsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [tab, setTab] = useState<InboxTab>("all");

  // Conversations state (all + closed tabs)
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [convTotal, setConvTotal] = useState(0);
  const [convPage, setConvPage] = useState(1);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);

  // Handoffs state
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [handoffTotal, setHandoffTotal] = useState(0);
  const [handoffPage, setHandoffPage] = useState(1);
  const [handoffLoading, setHandoffLoading] = useState(true);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  const limit = 20;

  // Fetch conversations for all/closed tabs.
  useEffect(() => {
    if (!token || tab === "handoffs") return;
    setConvLoading(true);
    setConvError(null);
    const closedFilter = tab === "closed" ? true : undefined;
    chatsApi
      .listConversations(token, convPage, limit, closedFilter)
      .then((result) => {
        setConversations(result.data);
        setConvTotal(result.total);
      })
      .catch((err) => setConvError(errorMessage(err)))
      .finally(() => setConvLoading(false));
  }, [token, tab, convPage, limit]);

  // Fetch handoffs for handoffs tab.
  useEffect(() => {
    if (!token || tab !== "handoffs") return;
    setHandoffLoading(true);
    setHandoffError(null);
    handoffsApi
      .list(token, handoffPage, limit, "open")
      .then((result) => {
        setHandoffs(result.data);
        setHandoffTotal(result.total);
      })
      .catch((err) => setHandoffError(errorMessage(err)))
      .finally(() => setHandoffLoading(false));
  }, [token, tab, handoffPage, limit]);

  const convTotalPages = Math.max(1, Math.ceil(convTotal / limit));
  const handoffTotalPages = Math.max(1, Math.ceil(handoffTotal / limit));

  const tabs: { key: InboxTab; label: string }[] = [
    { key: "all", label: "All Chats" },
    { key: "handoffs", label: "Handoffs" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-muted-foreground">
          DM conversations handled through this platform across all connected X accounts.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setConvPage(1);
              setHandoffPage(1);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Handoffs tab */}
      {tab === "handoffs" && (
        <>
          <ErrorAlert error={handoffError} />

          {handoffLoading ? (
            <p className="text-muted-foreground">Loading handoffs…</p>
          ) : handoffs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No handoffs yet.</p>
                <p className="text-sm mt-1">
                  When the bot decides to hand off a conversation, it appears here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {handoffs.map((h) => (
                <HandoffCard key={h._id} handoff={h} orgId={orgId!} />
              ))}

              {handoffTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {handoffPage} of {handoffTotalPages} · {handoffTotal} handoff
                    {handoffTotal === 1 ? "" : "s"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={handoffPage <= 1}
                      onClick={() => setHandoffPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={handoffPage >= handoffTotalPages}
                      onClick={() => setHandoffPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* All Chats / Closed tab */}
      {(tab === "all" || tab === "closed") && (
        <>
          <ErrorAlert error={convError} />

          {convLoading ? (
            <p className="text-muted-foreground">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground space-y-2">
                <p>
                  {tab === "closed"
                    ? "No closed conversations."
                    : "No conversations yet."}
                </p>
                <p className="text-sm">
                  {tab === "closed"
                    ? "Closed conversations will appear here."
                    : "Messages appear here after inbound DMs are processed and replied to by the bot."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conversations.map((c) => (
                <ConversationCard key={c.conversationId} conversation={c} orgId={orgId!} />
              ))}

              {convTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {convPage} of {convTotalPages} · {convTotal} conversation
                    {convTotal === 1 ? "" : "s"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={convPage <= 1}
                      onClick={() => setConvPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={convPage >= convTotalPages}
                      onClick={() => setConvPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {orgId && tab === "all" && (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to={`/orgs/${orgId}`} className="text-primary underline">
            Back to connections
          </Link>
        </p>
      )}
    </div>
  );
}
