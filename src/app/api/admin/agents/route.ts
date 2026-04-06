import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptString } from "@/lib/crypto";
import { randomUUID } from "crypto";
import { z } from "zod";

export async function GET() {
  await requireSuperAdmin();

  const agents = await prisma.user.findMany({
    where: { isAgent: true },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      adminPermissions: true,
      agentHostUrl: true,
      agentStatus: true,
      createdAt: true,
      // never return agentApiKey or agentToken
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(agents);
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  hostUrl: z.string().url(),
  hostApiKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  await requireSuperAdmin();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { name, hostUrl, hostApiKey } = parsed.data;

  // Build a stable slug from the name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);

  const suffix = randomUUID().slice(0, 6);
  const username = `agent_${slug}_${suffix}`;
  const email = `${username}@agents.internal`;

  // Check uniqueness (extremely unlikely to collide but guard anyway)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Username collision, please retry" }, { status: 409 });
  }

  const agentToken = randomUUID();
  const encryptedKey = encryptString(hostApiKey);

  const agent = await prisma.user.create({
    data: {
      username,
      email,
      displayName: name,
      role: "ADMIN",
      isAgent: true,
      agentHostUrl: hostUrl,
      agentApiKey: encryptedKey,
      agentStatus: "STOPPED",
      agentToken,
      adminPermissions: [],
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      adminPermissions: true,
      agentHostUrl: true,
      agentStatus: true,
      createdAt: true,
    },
  });

  // Return the raw token only once — caller must copy it
  return NextResponse.json({ ...agent, agentToken }, { status: 201 });
}
