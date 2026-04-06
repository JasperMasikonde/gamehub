import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { generateSignedUploadUrl, getPublicUrl } from "@/lib/gcs";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, contentType, folder = "listings" } = body as {
    filename?: string;
    contentType: string;
    folder?: string;
  };

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  if (!process.env.GCS_BUCKET_NAME) {
    return NextResponse.json({ error: "GCS_BUCKET_NAME is not configured" }, { status: 503 });
  }

  const ext = filename?.split(".").pop() ?? contentType.split("/")[1] ?? "jpg";
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "");
  const gcsKey = `${safeFolder}/${session.user.id}/${randomBytes(8).toString("hex")}.${ext}`;

  let uploadUrl: string;
  try {
    uploadUrl = await generateSignedUploadUrl(gcsKey, contentType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[uploads] Failed to generate signed URL:", message);
    return NextResponse.json({ error: `GCS error: ${message}` }, { status: 503 });
  }

  const publicUrl = getPublicUrl(gcsKey);
  return NextResponse.json({ uploadUrl, gcsKey, publicUrl });
}
