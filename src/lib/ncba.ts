/**
 * NCBA Bank C2B API client
 * Docs: NCBA Till STK Push & Dynamic QR Code API (2024)
 * BASE_URL: https://c2bapis.ncbagroup.com
 */

const BASE_URL = "https://c2bapis.ncbagroup.com";

// ── Token cache ──────────────────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const username = process.env.NCBA_USERNAME;
  const password = process.env.NCBA_PASSWORD;
  if (!username || !password) throw new Error("NCBA credentials not configured");

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(`${BASE_URL}/payments/api/v1/auth/token`, {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NCBA token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const expiresIn = Number(data.expires_in ?? 3600);

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  };

  return cachedToken.token;
}

// ── Phone normalisation ───────────────────────────────────────────────────────
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("07") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  throw new Error("Invalid Kenyan phone number. Use 07XXXXXXXX format.");
}

// ── STK Push initiate ────────────────────────────────────────────────────────
// Success response: { TransactionID, StatusCode, StatusDescription, ReferenceID }
// Failure response: { TransactionID: null, StatusCode: "1", StatusDescription: "reason" }
export interface STKResponse {
  TransactionID?: string | null;
  StatusCode?: string;
  StatusDescription?: string;
  ReferenceID?: string | null;
  [key: string]: unknown;
}

export async function initiateSTKPush(
  phone: string,
  amount: number,
  accountRef: string
): Promise<STKResponse> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/payments/api/v1/stk-push/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      TelephoneNo: normalisePhone(phone),
      Amount: String(Math.round(amount)),
      PayBillNo: process.env.NCBA_PAYBILL_NO,
      AccountNo: process.env.NCBA_ACC_NUMBER ?? accountRef,
      Network: "Safaricom",
      TransactionType: "CustomerPayBillOnline",
    }),
  });

  const data: STKResponse = await res.json();
  if (!res.ok) throw new Error(data.StatusDescription ?? `STK push failed: ${res.status}`);
  return data;
}

// ── STK Push query ───────────────────────────────────────────────────────────
// Docs: POST /payments/api/v1/stk-push/query
// Request:  { TransactionID }
// Response: { status: "SUCCESS" | "FAILED", description: string }
export interface STKQueryResponse {
  status?: "SUCCESS" | "FAILED" | string;
  description?: string;
  [key: string]: unknown;
}

export async function querySTKPush(ncbaTransactionId: string): Promise<STKQueryResponse> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/payments/api/v1/stk-push/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ TransactionID: ncbaTransactionId }),
  });

  const data = await res.json();
  return data;
}

// ── QR Code ──────────────────────────────────────────────────────────────────
// Docs: POST /payments/api/v1/qr/generate
// Request:  { till: "<tillNo>" | "<tillNo>#narration", amount?: number }
// Response: { StatusDescription, Base64QrCode: "data:image/png;base64,...", StatusCode }
export interface QRResponse {
  Base64QrCode?: string; // full data URI, already includes "data:image/png;base64," prefix
  StatusCode?: string;
  StatusDescription?: string;
  [key: string]: unknown;
}

export async function generateQR(
  till: string,
  amount?: number,
  narration?: string
): Promise<QRResponse> {
  const token = await getToken();

  const tillParam = narration ? `${till}#${narration}` : till;

  const res = await fetch(`${BASE_URL}/payments/api/v1/qr/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      till: tillParam,
      ...(amount != null ? { amount: Math.round(amount) } : {}),
    }),
  });

  const data: QRResponse = await res.json();
  if (!res.ok || data.StatusCode === "2") {
    throw new Error(data.StatusDescription ?? `QR generation failed: ${res.status}`);
  }
  return data;
}
