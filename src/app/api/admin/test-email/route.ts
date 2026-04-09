import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { Resend } from "resend";

export async function POST() {
  await requireAdmin();

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Eshabiki <support@eshabiki.com>";

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: "support@eshabiki.com",
      subject: "Eshabiki email test",
      text: "Email is working correctly via Resend.",
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id: data?.id, message: "Test email sent to support@eshabiki.com" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
