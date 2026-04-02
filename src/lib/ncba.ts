/**
 * NCBA Bank C2B API client
 * Docs: NCBA C2B API (STK Push + QR Code)
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
    headers: {
      Authorization: `Basic ${credentials}`,
    },
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
// Accepts: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("07") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  throw new Error("Invalid Kenyan phone number. Use 07XXXXXXXX format.");
}

// ── STK Push ─────────────────────────────────────────────────────────────────
export interface STKResponse {
  TransactionID?: string;
  ResponseCode?: string;
  ResponseDesc?: string;
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
      AccountNo: accountRef.slice(0, 20), // NCBA max 20 chars
      Network: "Safaricom",
      TransactionType: "CustomerPayBillOnline",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.ResponseDesc ?? `STK push failed: ${res.status}`);
  return data;
}

// ── STK Query ────────────────────────────────────────────────────────────────
export interface STKQueryResponse {
  ResultCode?: string;
  ResultDesc?: string;
  TransactionID?: string;
  Amount?: string;
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
    body: JSON.stringify({
      TransactionID: ncbaTransactionId,
      PayBillNo: process.env.NCBA_PAYBILL_NO,
      Network: "Safaricom",
    }),
  });

  const data = await res.json();
  return data;
}

// ── QR Code ──────────────────────────────────────────────────────────────────
export interface QRResponse {
  QRCode?: string; // base64 PNG
  [key: string]: unknown;
}

export async function generateQR(
  till: string,
  amount?: number,
  narration?: string
): Promise<QRResponse> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/payments/api/v1/qr/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      MerchantName: "Eshabiki",
      RefNo: narration ?? "Eshabiki Payment",
      Amount: amount != null ? String(Math.round(amount)) : undefined,
      TrxCode: "BG", // Buy Goods
      CPI: till,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.ResponseDesc ?? `QR generation failed: ${res.status}`);
  return data;
}
