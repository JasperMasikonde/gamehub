import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendSupportReply } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  toEmail: z.string().email(),
  toName: z.string().min(1),
  replyMessage: z.string().min(1),
  originalMessage: z.string().optional(),
  agentName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await sendSupportReply(parsed.data);

  return NextResponse.json({ ok: true });
}
