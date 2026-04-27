/**
 * Standalone share-card designs rendered with inline styles only.
 * CSS custom properties (var(--...)) do NOT resolve inside html-to-image
 * captures, so every colour is hardcoded here.
 */

export interface FixtureMatch {
  id: string;
  player1Name: string;
  player2Name: string;
  player1Score: number | null;
  player2Score: number | null;
  status: string;
  scheduledAt: string | null;
}

export interface StandingRow {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  pts: number;
}

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#08080f",
  surface:   "#0f0f1a",
  card:      "#14142a",
  border:    "#1e1e3a",
  green:     "#00ff87",
  greenDim:  "#00ff8722",
  blue:      "#00d4ff",
  blueDim:   "#00d4ff18",
  yellow:    "#f59e0b",
  yellowDim: "#f59e0b18",
  red:       "#ff3b5c",
  textPri:   "#f0f0fa",
  textSec:   "#a0a0c0",
  textMuted: "#5a5a7a",
  white:     "#ffffff",
} as const;

function formatMatchTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function CardHeader({ title, subtitle, gameweek }: { title: string; subtitle: string; gameweek?: string | null }) {
  return (
    <div style={{ padding: "28px 32px 20px", borderBottom: `1px solid ${C.border}` }}>
      {/* Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.green}, ${C.blue})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: C.bg, fontFamily: "sans-serif",
          flexShrink: 0,
        }}>E</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.textPri, letterSpacing: 1, fontFamily: "sans-serif" }}>
            ESHABIKI
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "sans-serif", letterSpacing: 0.5 }}>
            eshabiki.com
          </div>
        </div>
        {gameweek && (
          <div style={{
            marginLeft: "auto",
            background: C.blueDim,
            border: `1px solid ${C.blue}44`,
            borderRadius: 20, padding: "4px 12px",
            fontSize: 11, fontWeight: 700, color: C.blue,
            fontFamily: "sans-serif", letterSpacing: 0.5,
          }}>
            {gameweek}
          </div>
        )}
      </div>

      {/* Tournament name */}
      <div style={{ fontSize: 22, fontWeight: 900, color: C.textPri, fontFamily: "sans-serif", lineHeight: 1.2 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: C.textSec, marginTop: 4, fontFamily: "sans-serif" }}>
        {subtitle}
      </div>
    </div>
  );
}

function CardFooter() {
  const date = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{
      padding: "14px 32px",
      borderTop: `1px solid ${C.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "sans-serif" }}>
        Generated {date}
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "sans-serif", letterSpacing: 0.5 }}>
        eshabiki.com
      </div>
    </div>
  );
}

// ── Fixtures card ─────────────────────────────────────────────────────────────

export function FixturesCard({
  tournamentName,
  game,
  gameweek,
  matches,
  cardRef,
}: {
  tournamentName: string;
  game: string;
  gameweek: number | null;
  matches: FixtureMatch[];
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        width: 520,
        background: C.bg,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <CardHeader
        title={tournamentName}
        subtitle={`${game} · Fixtures`}
        gameweek={gameweek ? `Matchday ${gameweek}` : null}
      />

      {/* Matches */}
      <div style={{ padding: "12px 24px" }}>
        {matches.map((m, i) => {
          const isDone = m.status === "COMPLETED" || m.status === "WALKOVER";
          const isPending = !isDone;
          const time = formatMatchTime(m.scheduledAt);

          return (
            <div
              key={m.id}
              style={{
                display: "flex", alignItems: "center",
                padding: "14px 16px",
                marginBottom: i < matches.length - 1 ? 8 : 0,
                background: isDone ? `${C.green}0a` : C.surface,
                borderRadius: 12,
                border: `1px solid ${isDone ? C.green + "30" : C.border}`,
                gap: 12,
              }}
            >
              {/* Player 1 */}
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>{m.player1Name}</div>
              </div>

              {/* Score / VS */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                minWidth: 90, justifyContent: "center",
              }}>
                {isDone ? (
                  <>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: C.greenDim, border: `1px solid ${C.green}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 900, color: C.green,
                    }}>{m.player1Score ?? 0}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>–</div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: C.greenDim, border: `1px solid ${C.green}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 900, color: C.green,
                    }}>{m.player2Score ?? 0}</div>
                  </>
                ) : (
                  <div style={{
                    padding: "4px 12px", borderRadius: 8,
                    background: C.blueDim, border: `1px solid ${C.blue}40`,
                    fontSize: 11, fontWeight: 800, color: C.blue, letterSpacing: 0.5,
                  }}>
                    {time ? time.split(",")[1]?.trim() ?? "VS" : "VS"}
                  </div>
                )}
              </div>

              {/* Player 2 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>{m.player2Name}</div>
              </div>
            </div>
          );
        })}

        {/* Scheduled times for pending matches */}
        {matches.some(m => m.scheduledAt && m.status !== "COMPLETED") && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, background: C.blueDim, border: `1px solid ${C.blue}25` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 6 }}>SCHEDULED TIMES</div>
            {matches.filter(m => m.scheduledAt && m.status !== "COMPLETED").map(m => (
              <div key={m.id} style={{ fontSize: 11, color: C.textSec, marginBottom: 3 }}>
                <span style={{ color: C.textPri, fontWeight: 600 }}>{m.player1Name}</span>
                <span style={{ color: C.textMuted }}> vs </span>
                <span style={{ color: C.textPri, fontWeight: 600 }}>{m.player2Name}</span>
                <span style={{ color: C.blue }}> · {formatMatchTime(m.scheduledAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CardFooter />
    </div>
  );
}

// ── Standings card ────────────────────────────────────────────────────────────

export function StandingsCard({
  tournamentName,
  game,
  gameweek,
  rows,
  cardRef,
}: {
  tournamentName: string;
  game: string;
  gameweek: number | null;
  rows: StandingRow[];
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const cols = ["#", "Player", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"];

  return (
    <div
      ref={cardRef}
      style={{
        width: 560,
        background: C.bg,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <CardHeader
        title={tournamentName}
        subtitle={`${game} · League Table`}
        gameweek={gameweek ? `After Matchday ${gameweek}` : "Current Standings"}
      />

      {/* Table */}
      <div style={{ padding: "16px 24px" }}>
        {/* Header row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 32px 32px 32px 32px 32px 32px 32px 40px",
          gap: 0, padding: "8px 12px",
          borderRadius: "8px 8px 0 0",
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
        }}>
          {cols.map((c, i) => (
            <div key={c} style={{
              fontSize: 10, fontWeight: 700, color: i === cols.length - 1 ? C.green : C.textMuted,
              textAlign: i > 1 ? "center" : "left",
              letterSpacing: 0.5,
            }}>{c}</div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map((row, i) => {
          const isTop = i === 0;
          const isBottom = i >= rows.length - 2;
          const gd = row.gf - row.ga;
          return (
            <div
              key={row.name}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 32px 32px 32px 32px 32px 32px 32px 40px",
                gap: 0, padding: "10px 12px",
                background: isTop ? `${C.green}0d` : i % 2 === 0 ? C.surface : C.card,
                borderBottom: `1px solid ${C.border}`,
                alignItems: "center",
              }}
            >
              {/* Pos */}
              <div style={{ fontSize: 13, fontWeight: 700, color: isTop ? C.green : C.textMuted }}>{i + 1}</div>
              {/* Name */}
              <div style={{
                fontSize: 13, fontWeight: isTop ? 700 : 500,
                color: isTop ? C.textPri : C.textSec,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{row.name}</div>
              {/* P */}
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>{row.played}</div>
              {/* W */}
              <div style={{ fontSize: 12, color: row.wins > 0 ? C.green : C.textMuted, textAlign: "center", fontWeight: row.wins > 0 ? 700 : 400 }}>{row.wins}</div>
              {/* D */}
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>{row.draws}</div>
              {/* L */}
              <div style={{ fontSize: 12, color: row.losses > 0 ? C.red : C.textMuted, textAlign: "center" }}>{row.losses}</div>
              {/* GF */}
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>{row.gf}</div>
              {/* GA */}
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>{row.ga}</div>
              {/* GD */}
              <div style={{ fontSize: 12, color: gd > 0 ? C.green : gd < 0 ? C.red : C.textMuted, textAlign: "center", fontWeight: gd !== 0 ? 700 : 400 }}>
                {gd > 0 ? `+${gd}` : gd}
              </div>
              {/* Pts */}
              <div style={{
                fontSize: 14, fontWeight: 900, textAlign: "center",
                color: isTop ? C.green : C.blue,
              }}>{row.pts}</div>
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 10, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: C.green }} />
            <span style={{ fontSize: 10, color: C.textMuted }}>Leader</span>
          </div>
        </div>
      </div>

      <CardFooter />
    </div>
  );
}
