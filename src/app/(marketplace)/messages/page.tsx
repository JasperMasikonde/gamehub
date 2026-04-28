import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils/format";
import { MessageSquare, Swords, Edit } from "lucide-react";
import { RefreshUnreadOnMount } from "@/components/messages/RefreshUnreadOnMount";

async function getConversations(userId: string) {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const convMap = new Map<
    string,
    {
      partner: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
      latestMessage: { content: string; createdAt: Date; senderId: string };
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const isOutgoing = msg.senderId === userId;
    const partnerId = isOutgoing ? msg.recipientId : msg.senderId;
    const partner = isOutgoing ? msg.recipient : msg.sender;

    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partner,
        latestMessage: { content: msg.content, createdAt: msg.createdAt, senderId: msg.senderId },
        unreadCount: 0,
      });
    }
    if (!isOutgoing && !msg.isRead) {
      convMap.get(partnerId)!.unreadCount++;
    }
  }

  return Array.from(convMap.values()).sort(
    (a, b) =>
      new Date(b.latestMessage.createdAt).getTime() -
      new Date(a.latestMessage.createdAt).getTime()
  );
}

const AVATAR_COLORS = [
  "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
  "bg-neon-blue/20 text-neon-blue border-neon-blue/30",
  "bg-neon-green/20 text-neon-green border-neon-green/30",
  "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
  "bg-neon-red/20 text-neon-red border-neon-red/30",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const conversations = await getConversations(session.user.id);
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[calc(100dvh-64px)]">
      <RefreshUnreadOnMount />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-primary border-b border-border px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-xs text-neon-blue font-medium mt-0.5">
                {totalUnread} unread
              </p>
            )}
          </div>
          <button className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-neon-blue/40 transition-colors">
            <Edit size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      {conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 py-20">
          <div className="w-16 h-16 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
            <MessageSquare size={28} className="text-text-muted/40" />
          </div>
          <p className="font-semibold text-text-primary">No messages yet</p>
          <p className="text-sm text-text-muted">Messages from admins and other users will appear here.</p>
        </div>
      ) : (
        <div className="flex-1">
          {conversations.map(({ partner, latestMessage, unreadCount }, idx) => {
            const challengeMatch = latestMessage.content.match(/^\[challenge:([^\]]+)\]/);
            const challengeId = challengeMatch?.[1] ?? null;
            const displayContent = challengeMatch
              ? latestMessage.content.replace(/^\[challenge:[^\]]+\]\s*/, "")
              : latestMessage.content;
            const href = challengeId ? `/challenges/${challengeId}` : `/messages/${partner.id}`;
            const name = partner.displayName ?? partner.username;
            const isUnread = unreadCount > 0;
            const isOutgoing = latestMessage.senderId === session.user.id;

            return (
              <Link
                key={`${partner.id}-${challengeId ?? "dm"}`}
                href={href}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-bg-elevated/60 active:bg-bg-elevated transition-colors relative"
              >
                {/* Divider (skip first) */}
                {idx > 0 && (
                  <div className="absolute top-0 left-[72px] right-0 h-px bg-border/50" />
                )}

                {/* Avatar */}
                <div className="relative shrink-0">
                  {challengeId ? (
                    <div className="w-12 h-12 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center">
                      <Swords size={20} className="text-neon-purple" />
                    </div>
                  ) : partner.avatarUrl ? (
                    <img
                      src={partner.avatarUrl}
                      alt={name}
                      className="w-12 h-12 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-base font-bold select-none ${avatarColor(name)}`}>
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-neon-blue border-2 border-bg-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${isUnread ? "font-bold text-text-primary" : "font-medium text-text-primary"}`}>
                      {challengeId ? (
                        <><span className="text-neon-purple text-xs font-semibold mr-1">Challenge</span>{name}</>
                      ) : name}
                    </span>
                    <span className={`text-[11px] shrink-0 tabular-nums ${isUnread ? "text-neon-blue font-semibold" : "text-text-muted"}`}>
                      {formatRelativeTime(latestMessage.createdAt.toString())}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs truncate flex-1 ${isUnread ? "text-text-primary" : "text-text-muted"}`}>
                      {isOutgoing && <span className="text-text-muted">You: </span>}
                      {displayContent}
                    </p>
                    {unreadCount > 1 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-neon-blue text-bg-primary text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
