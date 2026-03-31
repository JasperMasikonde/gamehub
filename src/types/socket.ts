export type ToastType = "success" | "error" | "info" | "warning" | "deal";

export interface ToastPayload {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  linkUrl?: string;
  linkLabel?: string;
}

export interface NewMessagePayload {
  messageId: string;
  senderId: string;
  senderUsername: string;
  content: string;
}
