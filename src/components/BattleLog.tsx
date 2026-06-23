import { useEffect, useRef } from "react";
import type { BattleLogEntry } from "@/hooks/useSpells";

const TYPE_ICONS: Record<string, string> = {
  spell: "✨",
  death: "☠️",
  info: "📜",
  damage: "💥",
  block: "🛡️",
};

export function BattleLog({ entries }: { entries: BattleLogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <div className="scroll-fade" style={{ position: "relative" }}>
      <div
        style={{
          height: 300,
          overflowY: "auto",
          fontFamily: "var(--font-display)",
          fontSize: 15,
        }}
      >
        {entries.length === 0 ? (
          <p style={{ color: "var(--text-dim)" }}>// battlefield is quiet…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {entries.map((e) => {
              const icon = TYPE_ICONS[e.type] ?? "📜";
              let textColor = "var(--text-primary)";
              if (e.type === "spell") textColor = "var(--accent-purple)";
              else if (e.type === "death") textColor = "var(--accent-magenta)";
              else if (e.type === "info") textColor = "var(--accent-green)";

              const sideColor = e.color === "w"
                ? "var(--accent-cyan)"
                : e.color === "b"
                  ? "var(--accent-magenta)"
                  : "var(--text-dim)";

              return (
                <p key={e.id} style={{ lineHeight: 1.4 }}>
                  <span style={{ color: "var(--text-dim)", fontSize: 12 }}>[{e.ply}]</span>{" "}
                  <span style={{ fontSize: 12 }}>{icon}</span>{" "}
                  <span style={{ color: sideColor, fontWeight: "bold", fontSize: 12 }}>
                    {e.color === "w" ? "W" : e.color === "b" ? "B" : ""}
                  </span>{" "}
                  <span style={{ color: textColor }}>{e.text}</span>
                </p>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
