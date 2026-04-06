import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const agent = await prisma.user.findUnique({
    where: { id },
    select: { isAgent: true, agentHostUrl: true, agentApiKey: true, agentStatus: true },
  });

  if (!agent?.isAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  if (!agent.agentHostUrl || !agent.agentApiKey) {
    return NextResponse.json({ error: "Agent has no host configured" }, { status: 400 });
  }
  if (agent.agentStatus === "STOPPED" || agent.agentStatus === "STOPPING") {
    return NextResponse.json({ error: "Agent is already stopped" }, { status: 409 });
  }

  await prisma.user.update({ where: { id }, data: { agentStatus: "STOPPING" } });

  try {
    const apiKey = decryptString(agent.agentApiKey);
    const res = await fetch(`${agent.agentHostUrl}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      await prisma.user.update({ where: { id }, data: { agentStatus: "ERROR" } });
      return NextResponse.json({ error: `Remote host returned ${res.status}` }, { status: 502 });
    }

    await prisma.user.update({ where: { id }, data: { agentStatus: "STOPPED" } });
    return NextResponse.json({ agentStatus: "STOPPED" });
  } catch {
    await prisma.user.update({ where: { id }, data: { agentStatus: "ERROR" } });
    return NextResponse.json({ error: "Could not reach agent host" }, { status: 502 });
  }
}
