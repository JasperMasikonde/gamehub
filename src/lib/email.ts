import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Eshabiki <support@eshabiki.com>";

async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = process.env.RESEND_FROM ?? FROM;
  const { error } = await getResend().emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
}

export async function sendSupportReply({
  toEmail,
  toName,
  replyMessage,
  originalMessage,
  agentName,
}: {
  toEmail: string;
  toName: string;
  replyMessage: string;
  originalMessage?: string;
  agentName: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">Eshabiki</h1>
              <p style="margin:4px 0 0;color:#a0a0b0;font-size:13px;">support@eshabiki.com</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${toName}</strong>,</p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Thank you for reaching out to Eshabiki support. We've received your message and wanted to get back to you.
              </p>
              <div style="background-color:#f9fafb;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:4px;margin:24px 0;">
                <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;white-space:pre-wrap;">${replyMessage}</p>
              </div>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                If you have any follow-up questions, simply reply to this email and we'll be happy to help.
              </p>
              <p style="margin:0;color:#374151;font-size:15px;">
                Warm regards,<br/>
                <strong>${agentName}</strong><br/>
                <span style="color:#6b7280;font-size:13px;">Eshabiki Support Team</span>
              </p>
            </td>
          </tr>

          ${
            originalMessage
              ? `<tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your original message</p>
              <div style="background-color:#f3f4f6;padding:14px 16px;border-radius:4px;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;white-space:pre-wrap;">${originalMessage}</p>
              </div>
            </td>
          </tr>`
              : ""
          }

          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} Eshabiki &middot;
                <a href="https://eshabiki.com" style="color:#4f46e5;text-decoration:none;">eshabiki.com</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                You're receiving this because you contacted us via our support form.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Re: Your Eshabiki Support Request",
    html,
  });
}

// ---------------------------------------------------------------------------
// Shared layout helper
// ---------------------------------------------------------------------------
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://eshabiki.com";
const YEAR = new Date().getFullYear();

function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#0a0a0a;padding:28px 40px;text-align:center;">
            <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-1px;">Esha<span style="color:#00ff87;">biki</span></span>
          </td>
        </tr>
        <tr><td style="padding:40px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${YEAR} Eshabiki &middot; <a href="${BASE_URL}" style="color:#00ff87;text-decoration:none;">eshabiki.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 28px;background-color:#00ff87;color:#0a0a0a;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">${label}</a>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>`;
}

function footer(note: string): string {
  return `<p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">${note}</p>`;
}

// ---------------------------------------------------------------------------
// Welcome / registration confirmation
// ---------------------------------------------------------------------------
export async function sendWelcomeEmail({
  toEmail,
  toName,
}: {
  toEmail: string;
  toName: string;
}) {
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Welcome to Eshabiki — Kenya's eFootball account marketplace. Your account is ready.
    </p>
    <ul style="color:#374151;font-size:14px;line-height:2;padding-left:20px;margin:0 0 16px;">
      <li>Browse and buy accounts with escrow-protected payments</li>
      <li>List your own accounts and get paid via M-Pesa</li>
      <li>Compete in wager challenges and tournaments</li>
    </ul>
    ${btn("Go to Marketplace", `${BASE_URL}/listings`)}
    ${footer("You received this because you just created an Eshabiki account.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Welcome to Eshabiki!",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Escrow funded — tell seller to deliver
// ---------------------------------------------------------------------------
export async function sendEscrowFundedEmail({
  toEmail,
  toName,
  transactionId,
  listingTitle,
  deliveryDeadline,
}: {
  toEmail: string;
  toName: string;
  transactionId: string;
  listingTitle: string;
  deliveryDeadline: Date;
}) {
  const link = `${BASE_URL}/dashboard/escrow/${transactionId}`;
  const deadline = deliveryDeadline.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Great news — a buyer has paid for your listing <strong>${listingTitle}</strong>. The funds are held in escrow and will be released to you once you deliver the account credentials.
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #00ff87;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0;color:#374151;font-size:14px;">Delivery deadline: <strong>${deadline}</strong></p>
    </div>
    <p style="color:#374151;font-size:14px;margin:0;">
      Log in, open the escrow transaction, and upload the account credentials. Failure to deliver by the deadline may result in automatic cancellation.
    </p>
    ${btn("Deliver Credentials", link)}
    ${footer("You received this because you have a pending sale on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Payment received — please deliver the account",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Credentials delivered — tell buyer to confirm
// ---------------------------------------------------------------------------
export async function sendCredentialsDeliveredEmail({
  toEmail,
  toName,
  transactionId,
  listingTitle,
  confirmationDeadline,
}: {
  toEmail: string;
  toName: string;
  transactionId: string;
  listingTitle: string;
  confirmationDeadline: Date;
}) {
  const link = `${BASE_URL}/dashboard/escrow/${transactionId}`;
  const deadline = confirmationDeadline.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      The seller has delivered the credentials for <strong>${listingTitle}</strong>. Please log in, review the account, and confirm receipt.
    </p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0;color:#374151;font-size:14px;">Confirm by: <strong>${deadline}</strong></p>
      <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">If you don't confirm or raise a dispute by this date, the funds will be automatically released to the seller.</p>
    </div>
    ${btn("View Credentials", link)}
    ${footer("You received this because you have a purchase awaiting confirmation on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Account credentials delivered — please confirm",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Transaction completed — notify seller of fund release
// ---------------------------------------------------------------------------
export async function sendTransactionCompletedEmail({
  toEmail,
  toName,
  transactionId,
  listingTitle,
}: {
  toEmail: string;
  toName: string;
  transactionId: string;
  listingTitle: string;
}) {
  const link = `${BASE_URL}/dashboard/escrow/${transactionId}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Your sale of <strong>${listingTitle}</strong> is complete. The buyer has confirmed receipt and the funds have been released to your M-Pesa.
    </p>
    <p style="color:#374151;font-size:14px;margin:0;">
      Please allow 1–3 business days for M-Pesa processing if you haven't received the transfer yet.
    </p>
    ${btn("View Transaction", link)}
    ${footer("You received this because a sale was completed on your Eshabiki account.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Funds released — sale complete!",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Dispute raised — notify seller
// ---------------------------------------------------------------------------
export async function sendDisputeRaisedEmail({
  toEmail,
  toName,
  transactionId,
  listingTitle,
}: {
  toEmail: string;
  toName: string;
  transactionId: string;
  listingTitle: string;
}) {
  const link = `${BASE_URL}/dashboard/escrow/${transactionId}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      The buyer has raised a dispute on the transaction for <strong>${listingTitle}</strong>. An Eshabiki administrator will review the case and contact both parties if needed.
    </p>
    <p style="color:#374151;font-size:14px;margin:0;">
      Please log in and provide any supporting evidence in the dispute thread. The funds remain in escrow until a decision is made.
    </p>
    ${btn("View Dispute", link)}
    ${footer("You received this because a dispute was raised on your Eshabiki transaction.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Dispute raised on your transaction",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Dispute resolved — refund to buyer
// ---------------------------------------------------------------------------
export async function sendRefundEmail({
  toEmail,
  toName,
  transactionId,
  listingTitle,
}: {
  toEmail: string;
  toName: string;
  transactionId: string;
  listingTitle: string;
}) {
  const link = `${BASE_URL}/dashboard/escrow/${transactionId}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      The dispute for <strong>${listingTitle}</strong> has been resolved in your favour. A refund will be sent to your M-Pesa number within 1–3 business days.
    </p>
    ${btn("View Transaction", link)}
    ${footer("You received this because a dispute was resolved on your Eshabiki transaction.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Refund approved — dispute resolved",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Shop order confirmation
// ---------------------------------------------------------------------------
export async function sendOrderConfirmationEmail({
  toEmail,
  toName,
  orderId,
  total,
  itemCount,
}: {
  toEmail: string;
  toName: string;
  orderId: string;
  total: number;
  itemCount: number;
}) {
  const link = `${BASE_URL}/shop/orders/${orderId}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Your order has been placed. Here's a summary:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;margin:0 0 16px;">
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Order ID</td>
        <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">#${orderId.slice(-12).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Items</td>
        <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">${itemCount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Total</td>
        <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;">KES ${total.toLocaleString()}</td>
      </tr>
    </table>
    <p style="color:#374151;font-size:14px;margin:0 0 8px;">
      To complete your purchase, please pay via M-Pesa on the order page.
    </p>
    ${btn("Pay Now", link)}
    ${footer("You received this because you placed an order on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: `Order confirmed — #${orderId.slice(-12).toUpperCase()}`,
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------
export async function sendVerificationEmail({
  toEmail,
  toName,
  token,
}: {
  toEmail: string;
  toName: string;
  token: string;
}) {
  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Thanks for joining Eshabiki! Please verify your email address to unlock all features — creating listings, buying accounts, and joining challenges.
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #00ff87;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0;color:#374151;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can ignore this email.</p>
    </div>
    ${btn("Verify Email Address", verifyUrl)}
    ${footer("You received this because you signed up for Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Verify your Eshabiki email address",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Listing approved
// ---------------------------------------------------------------------------
export async function sendListingApprovedEmail({
  toEmail,
  toName,
  listingTitle,
  listingId,
}: {
  toEmail: string;
  toName: string;
  listingTitle: string;
  listingId: string;
}) {
  const listingUrl = `${BASE_URL}/listings/${listingId}`;
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Great news! Your listing has been reviewed and is now <strong style="color:#00ff87;">live on the marketplace</strong>.
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #00ff87;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0;color:#374151;font-size:14px;font-weight:600;">${listingTitle}</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Buyers can now find and purchase your account. You'll receive a notification the moment someone places an order.
    </p>
    ${btn("View Your Listing", listingUrl)}
    ${footer("You received this because you submitted a listing on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Your listing is now live on Eshabiki!",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Admin event notifications
// ---------------------------------------------------------------------------
export async function sendAdminNotification({
  toEmail,
  subject,
  eventTitle,
  eventBody,
  linkUrl,
  linkLabel,
}: {
  toEmail: string;
  subject: string;
  eventTitle: string;
  eventBody: string;
  linkUrl?: string;
  linkLabel?: string;
}) {
  const actionBtn = linkUrl
    ? btn(linkLabel ?? "View →", `${BASE_URL}${linkUrl}`)
    : "";
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:700;">Admin Notification</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">${eventTitle}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${eventBody}</p>
    </div>
    ${actionBtn}
    ${footer("You received this because you configured admin notifications on Eshabiki.")}
  `;
  await sendMail({ to: toEmail, subject, html: emailLayout(body) });
}

// ---------------------------------------------------------------------------
// Challenge removed by admin
// ---------------------------------------------------------------------------
export async function sendChallengeRemovedEmail({
  toEmail,
  toName,
  challengeId,
  reason,
}: {
  toEmail: string;
  toName: string;
  challengeId: string;
  reason: string;
}) {
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      A challenge you were involved in has been removed by an administrator.
    </p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">Reason for removal</p>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${reason}</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
      If you believe this was a mistake, please contact our support team.
    </p>
    ${btn("Contact Support", `${BASE_URL}/support`)}
    ${footer("You received this because you participated in a challenge on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Your challenge has been removed",
    html: emailLayout(body),
  });
}

// ---------------------------------------------------------------------------
// Listing removed / rejected
// ---------------------------------------------------------------------------
export async function sendListingRemovedEmail({
  toEmail,
  toName,
  listingTitle,
  reason,
}: {
  toEmail: string;
  toName: string;
  listingTitle: string;
  reason?: string;
}) {
  const body = `
    ${greeting(toName)}
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Unfortunately, your listing could not be approved and has been removed from the marketplace.
    </p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">${listingTitle}</p>
      ${reason ? `<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;"><strong>Reason:</strong> ${reason}</p>` : ""}
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Please review our listing guidelines and feel free to submit a new listing that meets our requirements.
      If you believe this was a mistake, contact our support team.
    </p>
    ${btn("Create a New Listing", `${BASE_URL}/listings/create`)}
    ${footer("You received this because you submitted a listing on Eshabiki.")}
  `;
  await sendMail({
    to: `"${toName}" <${toEmail}>`,
    subject: "Update on your Eshabiki listing",
    html: emailLayout(body),
  });
}
