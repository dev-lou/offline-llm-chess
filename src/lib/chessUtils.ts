import type { Color, PieceSymbol } from "chess.js";

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// White pieces use the solid (filled) glyphs; black uses the same set but we color them differently.
// Using solid glyphs for both renders more crisply with the pixel font.
export const PIECE_UNICODE: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export type SquareName = `${(typeof FILES)[number]}${(typeof RANKS)[number]}`;

export function squareName(fileIdx: number, rankIdx: number): SquareName {
  return `${FILES[fileIdx]}${RANKS[rankIdx]}` as SquareName;
}

export function isLightSquare(fileIdx: number, rankIdx: number): boolean {
  return (fileIdx + rankIdx) % 2 === 0;
}

export interface CapturedSummary {
  byWhite: PieceSymbol[]; // black pieces captured by white
  byBlack: PieceSymbol[]; // white pieces captured by black
  whiteAdvantage: number; // positive = white ahead
}

export function summarizeCaptures(history: { captured?: PieceSymbol; color: Color }[]): CapturedSummary {
  const byWhite: PieceSymbol[] = [];
  const byBlack: PieceSymbol[] = [];
  for (const m of history) {
    if (!m.captured) continue;
    if (m.color === "w") byWhite.push(m.captured);
    else byBlack.push(m.captured);
  }
  const whiteScore = byWhite.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const blackScore = byBlack.reduce((s, p) => s + PIECE_VALUES[p], 0);
  return { byWhite, byBlack, whiteAdvantage: whiteScore - blackScore };
}

export function groupPieces(pieces: PieceSymbol[]): { piece: PieceSymbol; count: number }[] {
  const order: PieceSymbol[] = ["q", "r", "b", "n", "p"];
  const counts = new Map<PieceSymbol, number>();
  for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
  return order
    .filter((p) => counts.has(p))
    .map((p) => ({ piece: p, count: counts.get(p)! }));
}
