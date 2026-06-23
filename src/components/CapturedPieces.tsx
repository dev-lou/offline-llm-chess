import type { Move } from "chess.js";
import { PixelPieceMini } from "./PixelPiece";
import { groupPieces, summarizeCaptures } from "@/lib/chessUtils";

interface Props {
  history: Move[];
}

export function CapturedPieces({ history }: Props) {
  const summary = summarizeCaptures(history);
  const whiteAdv = summary.whiteAdvantage;

  const row = (label: string, pieces: typeof summary.byWhite, color: "w" | "b", advantage: number) => {
    const groups = groupPieces(pieces);
    return (
      <div
        className="flex items-center gap-3 py-2 px-1 border-b border-[rgba(0,240,255,0.1)] last:border-0"
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: 8,
            color: color === "b" ? "var(--accent-cyan)" : "var(--accent-magenta)",
            width: 40,
            flexShrink: 0,
            textShadow: `0 0 5px ${color === "b" ? "var(--accent-cyan)" : "var(--accent-magenta)"}`,
          }}
        >
          {label}
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-0.5">
          {groups.length === 0 ? (
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-dim)" }}>—</span>
          ) : (
            groups.map(({ piece, count }) => (
              <span key={piece} className="flex items-center" style={{ opacity: 0.6 }}>
                {[...Array(count)].map((_, i) => (
                  <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                    <PixelPieceMini type={piece} color={color} />
                  </div>
                ))}
              </span>
            ))
          )}
        </div>
        {advantage > 0 && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: color === "b" ? "var(--accent-cyan)" : "var(--accent-magenta)",
              background: "rgba(0,0,0,0.5)",
              border: `1px solid ${color === "b" ? "var(--accent-cyan)" : "var(--accent-magenta)"}`,
              padding: "2px 6px",
              boxShadow: `0 0 8px ${color === "b" ? "rgba(0,240,255,0.3)" : "rgba(255,0,85,0.3)"}`,
            }}
          >
            +{advantage}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {row("WHITE", summary.byWhite, "b", whiteAdv > 0 ? whiteAdv : 0)}
      {row("BLACK", summary.byBlack, "w", whiteAdv < 0 ? -whiteAdv : 0)}
    </div>
  );
}
