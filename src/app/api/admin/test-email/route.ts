import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST() {
  await requireAdmin();

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  // Report config (no password)
  const config = {
    host: SMTP_HOST ?? "(not set)",
    port: SMTP_PORT ?? "(not set)",
    user: SMTP_USER ?? "(not set)",
    passwordSet: !!SMTP_PASSWORD,
  };

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    return NextResponse.json({ ok: false, config, error: "SMTP env vars missing" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"Eshabiki" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: "Eshabiki SMTP test",
      text: "SMTP is working correctly. This is a test email from your admin panel.",
    });
    return NextResponse.json({ ok: true, config, message: `Test email sent to ${SMTP_USER}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, config, error: message }, { status: 500 });
  }
}
