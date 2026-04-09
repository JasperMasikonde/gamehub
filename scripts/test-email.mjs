import nodemailer from "nodemailer";
import { readFileSync } from "fs";

// Load .env manually
const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

console.log("SMTP_HOST:", SMTP_HOST);
console.log("SMTP_PORT:", SMTP_PORT);
console.log("SMTP_USER:", SMTP_USER);
console.log("SMTP_PASSWORD:", SMTP_PASSWORD ? "***set***" : "MISSING");

const transporter = nodemailer.createTransport({
  host: SMTP_HOST ?? "mail.privateemail.com",
  port: Number(SMTP_PORT ?? 465),
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
});

console.log("\nVerifying SMTP connection...");
try {
  await transporter.verify();
  console.log("✅ SMTP connection successful!\n");

  console.log("Sending test email...");
  await transporter.sendMail({
    from: `"Eshabiki Test" <${SMTP_USER}>`,
    to: SMTP_USER,
    subject: "Eshabiki SMTP test",
    text: "If you received this, email is working correctly.",
  });
  console.log(`✅ Test email sent to ${SMTP_USER}`);
} catch (err) {
  console.error("❌ SMTP error:", err.message);
  console.error("\nCommon causes:");
  console.error("  - Wrong password");
  console.error("  - SMTP_HOST or SMTP_PORT incorrect");
  console.error("  - Namecheap firewall blocking port 465 (try 587)");
}
