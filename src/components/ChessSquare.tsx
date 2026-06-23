import type { Color, PieceSymbol } from "chess.js";
import { PixelPiece } from "./PixelPiece";
import { cn } from "@/lib/utils";

interface Props {
  fileIdx: number;
  rankIdx: number;
  light: boolean;
  piece: { type: PieceSymbol; color: Color } | null;
  selected: boolean;
  legalTarget: boolean;
  legalCapture: boolean;
  lastMove: boolean;
  inCheck: boolean;
  spellTarget: boolean;
  wounded: boolean;
  stunned: boolean;
  hpPct: number | null;
  showFileLabel: boolean;
  showRankLabel: boolean;
  fileLabel: string;
  rankLabel: string;
  disabled: boolean;
  animDelay?: number;
  onClick: () => void;
}

export function ChessSquare({
  light,
  piece,
  selected,
  legalTarget,
  legalCapture,
  lastMove,
  inCheck,
  spellTarget,
  wounded,
  stunned,
  hpPct,
  disabled,
  animDelay = 0,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !piece}
      className={cn(
        "relative aspect-square w-full select-none",
        light ? "square-light" : "square-dark",
        lastMove && !selected && "sq-last-move",
        inCheck && "sq-in-check",
        spellTarget && "sq-spell-target",
        disabled ? "cursor-default" : "cursor-pointer",
      )}
      style={{ transition: "all 150ms ease-out" }}
    >
      {/* Selected Aura (Blackhole / Pulse) */}
      {selected && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="selection-aura" />
        </span>
      )}

      {/* Legal Move Track Node */}
      {legalTarget && !legalCapture && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="legal-move-node"
            style={{ animationDelay: `${animDelay}s` }}
          />
        </span>
      )}
      {/* Piece rendering — pixel art SVG sprite */}
      {piece && (
        <span className="absolute inset-0 flex items-center justify-center">
          <PixelPiece
            type={piece.type}
            color={piece.color}
            size={piece.type === "k" ? "85%" : "75%"}
            wounded={wounded}
            stunned={stunned}
          />
        </span>
      )}

      {/* HP mini bar */}
      {piece && hpPct !== null && hpPct < 1 && (
        <span className="pointer-events-none absolute left-0 right-0 top-0 h-[3px]" style={{ background: "rgba(0,0,0,0.6)" }}>
          <span
            className={cn(
              "block h-full",
              hpPct > 0.5 ? "bar-hp" : hpPct > 0.25 ? "bar-hp" : "bar-hp bar-critical",
            )}
            style={{ width: `${Math.max(0, hpPct * 100)}%` }}
          />
        </span>
      )}

      {/* Legal capture ring */}
      {legalCapture && (
        <span
          className="pointer-events-none absolute inset-0 sq-legal-capture"
          style={{ animationDelay: `${animDelay}s` }}
        />
      )}
    </button>
  );
}
