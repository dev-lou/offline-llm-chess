import { useEffect, useRef } from "react";
import type { Move } from "chess.js";

export interface MoveHistoryEntry {
  move: Move;
  ply: number;
  spellNote?: string; // e.g. "♗ Holy Beam → f7: 25dmg"
}

interface Props {
  entries: MoveHistoryEntry[];
}

export function MoveHistory({ entries }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  const rows: { num: number; white?: MoveHistoryEntry; black?: MoveHistoryEntry; whiteIdx?: number; blackIdx?: number }[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: entries[i],
      black: entries[i + 1],
      whiteIdx: i,
      blackIdx: i + 1 < entries.length ? i + 1 : undefined,
    });
  }
  const lastIdx = entries.length - 1;

  return (
    <div className="scroll-fade" style={{ position: "relative" }}>
      <div
        ref={scrollRef}
        style={{
          height: 300,
          overflowY: "auto",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      >
        {rows.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: 16 }}>
            // no moves yet
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map((r, rowIdx) => (
                <tr
                  key={r.num}
                  style={{
                    borderBottom: "1px solid rgba(245,200,66,0.05)",
                    background: rowIdx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      width: 32,
                      padding: "4px 6px 4px 0",
                      color: "var(--accent-cyan)",
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                    }}
                  >
                    {r.num}.
                  </td>
                  <td
                    style={{
                      padding: "4px 8px 4px 0",
                      color: "var(--text-primary)",
                      background: r.whiteIdx === lastIdx ? "rgba(0,240,255,0.15)" : undefined,
                    }}
                  >
                    {r.white?.move.san}
                    {r.white?.spellNote && (
                      <span style={{ marginLeft: 4, color: "var(--accent-purple)", fontStyle: "italic", fontSize: 12 }}>
                        ✨ {r.white.spellNote}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 0",
                      color: "rgba(0,240,255,0.6)",
                      background: r.blackIdx === lastIdx ? "rgba(255,0,85,0.15)" : undefined,
                    }}
                  >
                    {r.black?.move.san ?? ""}
                    {r.black?.spellNote && (
                      <span style={{ marginLeft: 4, color: "var(--accent-magenta)", fontStyle: "italic", fontSize: 12 }}>
                        ✨ {r.black.spellNote}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
