import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { generateQR } from "@/lib/ncba";

export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, narration } = await req.json();

  const till = process.env.NCBA_TILL_NO;
  if (!till) return NextResponse.json({ error: "Till number not configured" }, { status: 500 });

  try {
    const result = await generateQR(till, amount ? Number(amount) : undefined, narration);
    // Base64QrCode is already a full data URI ("data:image/png;base64,...")
    return NextResponse.json({ qrCode: result.Base64QrCode });
  } catch (err) {
    console.error("[payments/qr]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "QR generation failed" },
      { status: 502 }
    );
  }
}
