import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate, emitWalletUpdate, emitToast } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";
import { createNotification } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string; matchId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tournamentId, matchId } = await params;
  const { player1Score, player2Score, winnerId } = await req.json();

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== tournamentId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { player1Score, player2Score, winnerId, status: "COMPLETED", completedAt: new Date() },
  });

  // KNOCKOUT: advance winner to next match
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (tournament?.type === "KNOCKOUT" && match.nextMatchId && winnerId) {
    const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
    if (nextMatch) {
      const slot = nextMatch.player1Id ? { player2Id: winnerId } : { player1Id: winnerId };
      await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: slot });
    }
  }

  // Check if tournament is complete
  const remaining = await prisma.tournamentMatch.count({
    where: { tournamentId, status: { not: "COMPLETED" }, player1Id: { not: null }, player2Id: { not: null } },
  });
  if (remaining === 0) {
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "COMPLETED" } });

    // Credit tournament winner's wallet if there is a prize pool
    if (tournament && Number(tournament.prizePool) > 0 && winnerId) {
      const prize = Number(tournament.prizePool);
      const walletTx = await creditWallet({
        userId: winnerId,
        amount: prize,
        type: "TOURNAMENT_WIN",
        description: `Tournament "${tournament.name}" — winner prize`,
      });
      emitWalletUpdate(winnerId, Number(walletTx.balanceAfter));
      await createNotification(winnerId, "TOURNAMENT_WIN", {
        title: "Tournament complete — prize credited! 🏆",
        body: `You won the "${tournament.name}" tournament! KES ${prize.toFixed(2)} has been added to your wallet.`,
        linkUrl: `/dashboard/wallet`,
      });
      emitToast(winnerId, {
        type: "success",
        title: "Tournament winner! 🏆",
        message: `KES ${prize.toFixed(2)} prize credited to your wallet.`,
        linkUrl: `/dashboard/wallet`,
        linkLabel: "View wallet →",
        duration: 0,
      });
    }
  }

  const updated = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (tournament) emitTournamentUpdate(tournamentId, tournament.slug);
  return NextResponse.json({ match: updated });
}
