import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversationView } from "@/components/messages/ConversationView";
import { RefreshUnreadOnMount } from "@/components/messages/RefreshUnreadOnMount";

async function getData(myId: string, otherUserId: string) {
  const [messages, otherUser] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
    }),
  ]);

  // Mark incoming messages as read on load
  await prisma.message.updateMany({
    where: { senderId: otherUserId, recipientId: myId, isRead: false },
    data: { isRead: true },
  });

  return { messages, otherUser };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { userId: otherUserId } = await params;

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true },
  });
  if (!otherUser) redirect("/messages");

  const { messages, otherUser: otherUserData } = await getData(session.user.id, otherUserId);

  return (
    <>
    <RefreshUnreadOnMount />
    <ConversationView
      initialMessages={messages}
      otherUser={otherUserData!}
      myId={session.user.id}
    />
    </>
  );
}
