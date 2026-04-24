import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ id: string }> };

// Round-robin scheduling: returns rounds, each round is an array of [p1idx, p2idx] pairs
function roundRobinPairs(n: number): [number, number][][] {
  const teams = Array.from({ length: n }, (_, i) => i);
  const rounds: [number, number][][] = [];
  const totalRounds = n % 2 === 0 ? n - 1 : n;
  const padded = n % 2 !== 0 ? [...teams, -1] : teams; // -1 = bye
  const size = padded.length;

  for (let r = 0; r < totalRounds; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < size / 2; i++) {
      const a = padded[i];
      const b = padded[size - 1 - i];
      if (a !== -1 && b !== -1) round.push([a, b]);
    }
    rounds.push(round);
    // Rotate all except first: move last to position 1
    const last = padded[size - 1];
    for (let i = size - 1; i > 1; i--) padded[i] = padded[i - 1];
    padded[1] = last;
  }

  return rounds;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildKnockoutMatches(tournamentId: string, participants: string[]) {
  const n = participants.length;
  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds);

  // Create placeholder matches for all rounds
  const created: { id: string; round: number; matchNumber: number }[] = [];
  let matchNumber = 1;
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let m = 0; m < matchesInRound; m++) {
      const match = await prisma.tournamentMatch.create({
        data: { tournamentId, round, matchNumber: matchNumber++, player1Id: null, player2Id: null, status: "SCHEDULED" },
        select: { id: true, round: true, matchNumber: true },
      });
      created.push(match);
    }
  }

  const byRound: Record<number, typeof created> = {};
  for (const m of created) {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  }

  // Link matches to next round
  for (let round = 1; round < totalRounds; round++) {
    for (let i = 0; i < byRound[round].length; i++) {
      const parentIdx = Math.floor(i / 2);
      await prisma.tournamentMatch.update({
        where: { id: byRound[round][i].id },
        data: { nextMatchId: byRound[round + 1][parentIdx].id },
      });
    }
  }

  // Fill round 1
  const r1 = byRound[1];
  for (let i = 0; i < r1.length; i++) {
    const p1 = participants[i * 2] ?? null;
    const p2 = participants[i * 2 + 1] ?? null;
    if (p1 && !p2) {
      await prisma.tournamentMatch.update({
        where: { id: r1[i].id },
        data: { player1Id: p1, status: "WALKOVER", winnerId: p1, completedAt: new Date() },
      });
      const nextId = (await prisma.tournamentMatch.findUnique({ where: { id: r1[i].id }, select: { nextMatchId: true } }))?.nextMatchId;
      if (nextId) {
        const nextM = await prisma.tournamentMatch.findUnique({ where: { id: nextId } });
        if (nextM) {
          await prisma.tournamentMatch.update({ where: { id: nextId }, data: nextM.player1Id ? { player2Id: p1 } : { player1Id: p1 } });
        }
      }
    } else {
      await prisma.tournamentMatch.update({ where: { id: r1[i].id }, data: { player1Id: p1, player2Id: p2 } });
    }
  }
}

export async function POST(_req: Request, { params }: Ctx) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: { orderBy: { seed: "asc" } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.status !== "REGISTRATION_OPEN")
    return NextResponse.json({ error: "Tournament must be in REGISTRATION_OPEN status" }, { status: 400 });
  if (tournament.participants.length < 2)
    return NextResponse.json({ error: "Need at least 2 participants" }, { status: 400 });

  const participants = shuffle(tournament.participants.map(p => p.userId));
  const homeAndAway = tournament.homeAndAway;

  await prisma.tournamentMatch.deleteMany({ where: { tournamentId: id } });

  if (tournament.type === "KNOCKOUT") {
    await buildKnockoutMatches(id, participants);

  } else if (tournament.type === "LEAGUE") {
    const rounds = roundRobinPairs(participants.length);
    let matchNumber = 1;
    const matchData: {
      tournamentId: string; round: number; matchNumber: number;
      player1Id: string; player2Id: string; gameweek: number; leg: number | null;
    }[] = [];

    for (let r = 0; r < rounds.length; r++) {
      const gameweek = r + 1;
      for (const [ai, bi] of rounds[r]) {
        matchData.push({ tournamentId: id, round: r + 1, matchNumber: matchNumber++, player1Id: participants[ai], player2Id: participants[bi], gameweek, leg: homeAndAway ? 1 : null });
      }
    }

    if (homeAndAway) {
      for (let r = 0; r < rounds.length; r++) {
        const gameweek = rounds.length + r + 1;
        for (const [ai, bi] of rounds[r]) {
          matchData.push({ tournamentId: id, round: rounds.length + r + 1, matchNumber: matchNumber++, player1Id: participants[bi], player2Id: participants[ai], gameweek, leg: 2 });
        }
      }
    }

    await prisma.tournamentMatch.createMany({ data: matchData });

  } else if (tournament.type === "CHAMPIONS_LEAGUE") {
    const groupCount = tournament.groupCount ?? 4;
    const groupsAdvance = tournament.groupsAdvance ?? 2;

    // Create groups
    await prisma.tournamentGroup.deleteMany({ where: { tournamentId: id } });
    const groupNames = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
    const groups = await prisma.$transaction(
      groupNames.map((name, i) =>
        prisma.tournamentGroup.create({ data: { tournamentId: id, name: `Group ${name}`, order: i } })
      )
    );

    // Assign participants to groups (round-robin fill)
    for (let i = 0; i < participants.length; i++) {
      const groupIdx = i % groupCount;
      await prisma.tournamentParticipant.update({
        where: { tournamentId_userId: { tournamentId: id, userId: participants[i] } },
        data: { groupId: groups[groupIdx].id },
      });
    }

    // Create round-robin fixtures within each group
    let matchNumber = 1;
    for (let gi = 0; gi < groups.length; gi++) {
      const groupParticipants = participants.filter((_, idx) => idx % groupCount === gi);
      if (groupParticipants.length < 2) continue;
      const rounds = roundRobinPairs(groupParticipants.length);

      for (let r = 0; r < rounds.length; r++) {
        const gameweek = r + 1;
        for (const [ai, bi] of rounds[r]) {
          await prisma.tournamentMatch.create({
            data: {
              tournamentId: id,
              round: r + 1,
              matchNumber: matchNumber++,
              player1Id: groupParticipants[ai],
              player2Id: groupParticipants[bi],
              groupId: groups[gi].id,
              gameweek,
              leg: homeAndAway ? 1 : null,
            },
          });
        }
      }

      if (homeAndAway) {
        for (let r = 0; r < rounds.length; r++) {
          const gameweek = rounds.length + r + 1;
          for (const [ai, bi] of rounds[r]) {
            await prisma.tournamentMatch.create({
              data: {
                tournamentId: id,
                round: rounds.length + r + 1,
                matchNumber: matchNumber++,
                player1Id: groupParticipants[bi],
                player2Id: groupParticipants[ai],
                groupId: groups[gi].id,
                gameweek,
                leg: 2,
              },
            });
          }
        }
      }
    }

    void groupsAdvance; // used in advance-phase route
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      currentGameweek: 1,
      phase: tournament.type === "CHAMPIONS_LEAGUE" ? "GROUP" : null,
    },
  });
  emitTournamentUpdate(id, updated.slug);
  return NextResponse.json({ success: true });
}
