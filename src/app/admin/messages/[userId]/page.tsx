import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversationView } from "@/components/messages/ConversationView";

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

  await prisma.message.updateMany({
    where: { senderId: otherUserId, recipientId: myId, isRead: false },
    data: { isRead: true },
  });

  return { messages, otherUser };
}

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { userId: otherUserId } = await params;
  const exists = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!exists) redirect("/admin/messages");

  const { messages, otherUser } = await getData(session.user.id, otherUserId);

  return (
    // -m-6 removes the layout padding; heightOffset matches the admin top bar (44px desktop, 64px mobile nav)
    <div className="-m-6 -mt-4 md:-mt-0">
      <ConversationView
        initialMessages={messages}
        otherUser={otherUser!}
        myId={session.user.id}
        backHref="/admin/messages"
        heightOffset={44}
      />
    </div>
  );
}
