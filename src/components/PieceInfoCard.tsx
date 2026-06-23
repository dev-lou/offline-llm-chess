import type { PieceState } from "@/lib/pieceStats";
import { PIECE_BASE } from "@/lib/pieceStats";
import { PixelPiece } from "./PixelPiece";

interface Props {
  piece: PieceState | null;
  square: string | null;
  isHumanTurn: boolean;
  spellArmed: boolean;
  onCastSpell: () => void;
  onCancelSpell: () => void;
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="bar-container" style={{ flex: 1 }}>
      <div
        className={className}
        style={{ width: `${pct}%`, height: "100%", transition: "width 300ms ease-out" }}
      />
    </div>
  );
}

export function PieceInfoCard({ piece, square, isHumanTurn, spellArmed, onCastSpell, onCancelSpell }: Props) {
  if (!piece || !square) {
    return (
      <div
        className="panel-glow p-3"
        style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-dim)" }}
      >
        Select a piece to inspect.
      </div>
    );
  }
  const base = PIECE_BASE[piece.type];
  const canCast =
    isHumanTurn && piece.color === "w" && piece.mp >= base.spell.cost && !piece.wounded && piece.stunnedTurns === 0;
  const hpPct = piece.maxHp > 0 ? piece.hp / piece.maxHp : 0;
  const isWounded = piece.wounded;

  return (
    <div className={`panel-glow char-sheet p-3 ${isWounded ? "char-sheet-wounded" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Piece sprite */}
        <div
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(245,200,66,0.15)",
          }}
        >
          <PixelPiece
            type={piece.type}
            color={piece.color}
            size={36}
            wounded={isWounded}
            stunned={piece.stunnedTurns > 0}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, color: "var(--text-primary)" }}>
              {piece.color === "w" ? "WHITE" : "BLACK"} {base.className.toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-dim)" }}>
              @{square}
            </span>
          </div>
          {/* Passive */}
          <p style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
            {base.passive}
          </p>

          {/* HP Bar */}
          <div className="flex items-center gap-2 mt-2" style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>
            <span style={{ color: "#ff6b6b", width: 24 }}>❤️</span>
            <Bar
              value={piece.hp}
              max={piece.maxHp}
              className={`bar-hp${hpPct < 0.3 ? " bar-critical" : ""}`}
            />
            <span style={{ color: "var(--text-primary)", width: 50, textAlign: "right", fontSize: 16, fontFamily: "var(--font-display)" }}>
              {piece.hp}/{piece.maxHp}
            </span>
          </div>

          {/* MP Bar */}
          <div className="flex items-center gap-2 mt-1" style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>
            <span style={{ color: "#48cae4", width: 24 }}>💙</span>
            <Bar value={piece.mp} max={base.maxMp} className="bar-mp" />
            <span style={{ color: "var(--text-primary)", width: 50, textAlign: "right", fontSize: 16, fontFamily: "var(--font-display)" }}>
              {piece.mp}/{base.maxMp}
            </span>
          </div>

          {/* Status badges */}
          {(piece.wounded || piece.stunnedTurns > 0) && (
            <div className="flex gap-2 mt-2" style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>
              {piece.wounded && <span style={{ color: "var(--accent-magenta)", textShadow: "0 0 5px var(--accent-magenta)" }}>[WOUNDED]</span>}
              {piece.stunnedTurns > 0 && <span style={{ color: "var(--accent-yellow)", textShadow: "0 0 5px var(--accent-yellow)" }}>[STUNNED]</span>}
            </div>
          )}
        </div>
      </div>

      {/* Spell Section */}
      <div className="spell-section mt-3" style={{ border: "1px solid rgba(181,0,255,0.3)", background: "rgba(181,0,255,0.05)" }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--accent-purple)", textShadow: "0 0 5px var(--accent-purple)" }}>
              {base.spell.name.toUpperCase()}
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "rgba(181,0,255,0.7)", marginTop: 2 }}>
              {base.spell.description}
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--accent-cyan)", flexShrink: 0 }}>
            {base.spell.cost} MP
          </span>
        </div>
        {spellArmed ? (
          <button
            type="button"
            onClick={onCancelSpell}
            className="btn-pixel btn-pixel-cancel w-full mt-2"
          >
            CANCEL TARGETING
          </button>
        ) : (
          <button
            type="button"
            onClick={onCastSpell}
            disabled={!canCast}
            className={`btn-pixel btn-pixel-arcane w-full mt-2 ${canCast ? "spell-available" : ""}`}
            style={{ opacity: canCast ? 1 : 0.4 }}
          >
            EXECUTE()
          </button>
        )}
      </div>
    </div>
  );
}
