import type * as React from "react";
import type { Color, PieceSymbol } from "chess.js";

interface Props {
  type: PieceSymbol;
  color: Color;
  size?: number | string;
  wounded?: boolean;
  stunned?: boolean;
  className?: string;
}

export function PixelPiece({ type, color, size = "80%", wounded, stunned, className = "" }: Props) {
  const isWhite = color === "w";
  // The CSS classes apply the intense neon drop-shadows
  const glowClass = isWhite ? "piece-white" : "piece-black";
  const woundedClass = wounded ? "pixel-piece-wounded" : "";
  
  // Neon colors matching the CSS theme
  const neonColor = isWhite ? "#00f0ff" : "#ff0055";

  return (
    <div
      className={`pixel-piece ${glowClass} ${woundedClass} ${className}`}
      style={{ width: size, height: size, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        viewBox="0 0 16 16"
        width="100%"
        height="100%"
        style={{ imageRendering: "pixelated" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {PIECE_SPRITES[type](neonColor)}
      </svg>
      {stunned && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            fontSize: size * 0.3,
            lineHeight: 1,
            animation: "cyber-pulse-yellow 1s infinite",
            filter: "drop-shadow(0 0 5px #ffea00)",
          }}
        >
          ⚡
        </span>
      )}
      {wounded && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: -4,
            fontSize: size * 0.25,
            lineHeight: 1,
            filter: "drop-shadow(0 0 5px #ff0055)",
          }}
        >
          ⚠️
        </span>
      )}
    </div>
  );
}

export function PixelPieceMini({ type, color }: { type: PieceSymbol; color: Color }) {
  return (
    <PixelPiece type={type} color={color} size={28} className="capture-sprite" />
  );
}

/* ── SVG Pixel Art Sprites (Cyber Neon Hollow Aesthetic) ── */

type SpriteRenderer = (color: string) => React.ReactNode;

const commonProps = (c: string) => ({
  fill: "rgba(0, 0, 20, 0.6)",
  stroke: c,
  strokeWidth: "1.2",
  strokeLinejoin: "miter" as const,
  shapeRendering: "crispEdges" as const,
});

// Cyber Pawn
const pawnSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M8,3 L10,5 L10,7 L9,8 L10,13 L12,14 L12,15 L4,15 L4,14 L6,13 L7,8 L6,7 L6,5 Z" {...commonProps(c)} />
    <rect x="7.5" y="4.5" width="1" height="1" fill={c} />
  </g>
);

// Cyber Rook
const rookSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M3,3 L5,3 L5,5 L7,5 L7,3 L9,3 L9,5 L11,5 L11,3 L13,3 L13,6 L11,8 L11,13 L13,14 L13,15 L3,15 L3,14 L5,13 L5,8 L3,6 Z" {...commonProps(c)} />
    <line x1="8" y1="8" x2="8" y2="12" stroke={c} strokeWidth="1.2" shapeRendering="crispEdges" />
  </g>
);

// Cyber Knight
const knightSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M5,4 L8,2 L12,4 L12,7 L14,9 L14,12 L11,12 L10,9 L8,11 L10,13 L12,14 L12,15 L4,15 L4,14 L6,13 L6,8 Z" {...commonProps(c)} />
    <rect x="8" y="5" width="1.5" height="1.5" fill={c} />
  </g>
);

// Cyber Bishop
const bishopSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M8,2 L11,6 L11,10 L9,12 L11,13 L11,15 L5,15 L5,13 L7,12 L5,10 L5,6 Z" {...commonProps(c)} />
    <path d="M8,5 L8,9 M6,7 L10,7" stroke={c} strokeWidth="1.2" fill="none" shapeRendering="crispEdges" />
  </g>
);

// Cyber Queen
const queenSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M2,4 L5,8 L8,3 L11,8 L14,4 L12,10 L13,14 L13,15 L3,15 L3,14 L4,10 Z" {...commonProps(c)} />
    <path d="M8,10 L9,11 L8,12 L7,11 Z" fill="none" stroke={c} strokeWidth="1" shapeRendering="crispEdges" />
  </g>
);

// Cyber King
const kingSprite: SpriteRenderer = (c) => (
  <g>
    <path d="M7,1 L9,1 L9,3 L11,3 L11,5 L9,5 L9,6 L12,9 L12,13 L13,14 L13,15 L3,15 L3,14 L4,13 L4,9 L7,6 L7,5 L5,5 L5,3 L7,3 Z" {...commonProps(c)} />
    <path d="M8,8 L9,11 L7,11 Z" fill="none" stroke={c} strokeWidth="1" shapeRendering="crispEdges" />
  </g>
);

const PIECE_SPRITES: Record<PieceSymbol, SpriteRenderer> = {
  p: pawnSprite,
  r: rookSprite,
  n: knightSprite,
  b: bishopSprite,
  q: queenSprite,
  k: kingSprite,
};
