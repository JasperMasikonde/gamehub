import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Resend inbound email webhook
// Configure in Resend dashboard: Domains → your domain → Inbound → add route
// Route: support@eshabiki.com → POST https://eshabiki.com/api/webhooks/inbound-email
// Optionally set RESEND_WEBHOOK_SECRET and uncomment the signature check below.
//
// Resend sends a JSON body with this shape:
// {
//   "type": "inbound.email",
//   "data": {
//     "from": "Name <email@example.com>",
//     "to": ["support@eshabiki.com"],
//     "subject": "...",
//     "text": "...",
//     "html": "...",
//     "spamScore": 0,
//     "messageId": "..."
//   }
// }

function parseFrom(from: string): { email: string; name: string | null } {
  // Formats: "Name <email>" or just "email"
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim() };
  }
  return { name: null, email: from.trim() };
}

export async function POST(req: Request) {
  // Optional webhook secret verification
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const svix = req.headers.get("svix-signature") ?? req.headers.get("webhook-signature");
    if (!svix || svix !== secret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Support both Resend envelope and direct field formats
  let from: string | undefined;
  let subject: string | undefined;
  let text: string | undefined;
  let html: string | undefined;

  if (payload.type === "inbound.email" && payload.data && typeof payload.data === "object") {
    const d = payload.data as Record<string, unknown>;
    from = d.from as string;
    subject = d.subject as string;
    text = d.text as string;
    html = d.html as string;
  } else {
    // Flat format (some providers post fields directly)
    from = payload.from as string;
    subject = payload.subject as string;
    text = payload.text as string;
    html = payload.html as string;
  }

  if (!from || !subject) {
    return NextResponse.json({ error: "Missing from or subject" }, { status: 400 });
  }

  const { email: fromEmail, name: fromName } = parseFrom(from);

  await prisma.supportEmail.create({
    data: {
      fromEmail,
      fromName,
      subject,
      bodyText: text ?? null,
      bodyHtml: html ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
