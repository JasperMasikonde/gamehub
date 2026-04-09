import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export async function generateVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ type: "email-verify", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifyEmailToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      payload.type !== "email-verify" ||
      !payload.sub ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
