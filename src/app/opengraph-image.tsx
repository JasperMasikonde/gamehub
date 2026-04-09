import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Eshabiki — eFootball Account Marketplace Kenya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Green glow accent */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "300px",
            background: "radial-gradient(ellipse, rgba(0,255,135,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo text */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: "900",
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: "16px",
            display: "flex",
          }}
        >
          Esha
          <span style={{ color: "#00ff87" }}>biki</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: "1.4",
            marginBottom: "48px",
            display: "flex",
          }}
        >
          Kenya&apos;s eFootball Account Marketplace
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["Escrow Protected", "M-Pesa Payments", "Instant Delivery"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,255,135,0.1)",
                  border: "1px solid rgba(0,255,135,0.3)",
                  borderRadius: "999px",
                  padding: "10px 24px",
                  fontSize: "18px",
                  color: "#00ff87",
                  display: "flex",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "18px",
            color: "#4b5563",
            display: "flex",
          }}
        >
          eshabiki.com
        </div>
      </div>
    ),
    { ...size }
  );
}
