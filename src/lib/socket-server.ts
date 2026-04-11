import type { Server } from "socket.io";
import type { ToastPayload, NewMessagePayload } from "@/types/socket";

export type { ToastPayload, ToastType } from "@/types/socket";

declare global {
  // eslint-disable-next-line no-var
  var socketIO: Server | undefined;
}

function getIO(): Server | null {
  return (global as Record<string, unknown>).socketIO as Server | null ?? null;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Emit a toast to a specific user (by their userId). */
export function emitToast(
  userId: string,
  payload: Omit<ToastPayload, "id">
): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit("toast", { id: makeId(), ...payload });
}

/** Broadcast a toast to every connected client. */
export function broadcastToast(payload: Omit<ToastPayload, "id">): void {
  const io = getIO();
  if (!io) return;
  io.emit("toast", { id: makeId(), ...payload });
}

/** Send a toast to every admin currently connected. */
export function emitToAdmins(payload: Omit<ToastPayload, "id">): void {
  const io = getIO();
  if (!io) return;
  io.to("admins").emit("toast", { id: makeId(), ...payload });
}

/** Notify a user's connected socket(s) about a new incoming message. */
export function emitNewMessage(
  recipientId: string,
  payload: NewMessagePayload
): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${recipientId}`).emit("new_message", payload);
}

/** Tell both parties in a transaction that its status has changed — they should refresh. */
export function emitTransactionUpdate(
  buyerId: string,
  sellerId: string,
  transactionId: string
): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${buyerId}`).to(`user:${sellerId}`).emit("transaction_update", { transactionId });
}

/** Broadcast a new challenge message to everyone in the challenge room. */
export function emitChallengeMessage(
  challengeId: string,
  payload: { id: string; senderId: string; senderUsername: string; content: string; createdAt: string }
): void {
  const io = getIO();
  if (!io) return;
  io.to(`challenge:${challengeId}`).emit("challenge_message", payload);
}

/** Tell both parties in a challenge that its status has changed. */
export function emitChallengeUpdate(
  hostId: string,
  challengerId: string | null,
  challengeId: string
): void {
  const io = getIO();
  if (!io) return;
  const rooms = [`user:${hostId}`];
  if (challengerId) rooms.push(`user:${challengerId}`);
  io.to(rooms).emit("challenge_update", { challengeId });
}

/** Tell both parties in an escrow request that its status has changed — they should refresh. */
export function emitEscrowRequestUpdate(
  initiatorId: string,
  counterpartyId: string,
  requestId: string
): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${initiatorId}`).to(`user:${counterpartyId}`).emit("escrow_request_update", { requestId });
}

/** Broadcast a tournament update to everyone watching that tournament + the global list. */
export function emitTournamentUpdate(tournamentId: string, slug: string): void {
  const io = getIO();
  if (!io) return;
  io.to(`tournament:${slug}`).emit("tournament_update", { tournamentId, slug });
  io.emit("tournaments_list_update");
}

/** Broadcast any admin action to trigger a refresh on relevant admin pages. */
export function broadcastAdminRefresh(resource: string): void {
  const io = getIO();
  if (!io) return;
  io.to("admins").emit("admin_refresh", { resource });
}

/** Emit an order update to a specific user. */
export function emitOrderUpdate(userId: string, orderId: string): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit("order_update", { orderId });
}

/** Tell a user's connected browser(s) that their email has just been verified — triggers a session refresh. */
export function emitEmailVerified(userId: string): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit("email_verified");
}

/** Tell a user's connected browser(s) that their role was updated — triggers a session refresh. */
export function emitRoleUpdated(userId: string): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit("role_updated");
}
