import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "mail.privateemail.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

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

  await transporter.sendMail({
    from: `"Eshabiki Support" <${process.env.SMTP_USER}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: "Re: Your Eshabiki Support Request",
    html,
  });
}
