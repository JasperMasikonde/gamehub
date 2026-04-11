import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils/format";
import { MessageSquare, User, Plus } from "lucide-react";
import { AdminComposeButton } from "@/components/messages/AdminComposeButton";

async function getAdminConversations(adminId: string) {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: adminId }, { recipientId: adminId }] },
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
    const isOutgoing = msg.senderId === adminId;
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

export default async function AdminMessagesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const conversations = await getAdminConversations(session.user.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-text-muted mt-1">Conversations with users</p>
        </div>
        <AdminComposeButton />
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-text-muted border border-bg-border rounded-xl bg-bg-elevated">
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm mt-1">Use &quot;New Message&quot; to contact a user.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {conversations.map(({ partner, latestMessage, unreadCount }) => (
            <Link
              key={partner.id}
              href={`/admin/messages/${partner.id}`}
              className="flex items-center gap-4 px-4 py-3 rounded-xl border border-bg-border bg-bg-elevated hover:bg-bg-surface hover:border-neon-blue/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-bg-surface border border-bg-border flex items-center justify-center shrink-0 overflow-hidden">
                {partner.avatarUrl ? (
                  <img src={partner.avatarUrl} alt={partner.username} className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold group-hover:text-neon-blue transition-colors truncate">
                    {partner.displayName ?? partner.username}
                  </span>
                  <span className="text-xs text-text-muted shrink-0 ml-2">
                    {formatRelativeTime(latestMessage.createdAt.toString())}
                  </span>
                </div>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {latestMessage.senderId === session.user.id ? "You: " : ""}
                  {latestMessage.content}
                </p>
              </div>

              {unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-neon-blue text-bg-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
