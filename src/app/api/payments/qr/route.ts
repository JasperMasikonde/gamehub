import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateQR } from "@/lib/ncba";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, narration } = await req.json();

  const till = process.env.NCBA_TILL_NO;
  if (!till) return NextResponse.json({ error: "Till number not configured" }, { status: 500 });

  try {
    const result = await generateQR(till, amount ? Number(amount) : undefined, narration);
    return NextResponse.json({ qrCode: result.QRCode });
  } catch (err) {
    console.error("[payments/qr]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "QR generation failed" },
      { status: 502 }
    );
  }
}
