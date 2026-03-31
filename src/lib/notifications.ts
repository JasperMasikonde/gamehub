import { prisma } from "@/lib/prisma";

interface NotificationPayload {
  title: string;
  body: string;
  linkUrl?: string;
}

export async function createNotification(
  userId: string,
  type: string,
  payload: NotificationPayload
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title: payload.title,
      body: payload.body,
      linkUrl: payload.linkUrl,
    },
  });
}
