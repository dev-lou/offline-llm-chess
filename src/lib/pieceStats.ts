import type { Color, PieceSymbol } from "chess.js";

export interface PieceBaseStats {
  className: string;
  passive: string;
  hp: number;
  mp: number;
  maxMp: number;
  spell: {
    id: string;
    name: string;
    cost: number;
    description: string;
  };
}

export const MAX_MP = 100;
export const MP_REGEN = 5;

export const PIECE_BASE: Record<PieceSymbol, PieceBaseStats> = {
  p: {
    className: "Squire",
    passive: "+1 ATK when adjacent to ally",
    hp: 50,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "shield_bash", name: "Shield Bash", cost: 20, description: "Stun an adjacent enemy 1 turn" },
  },
  r: {
    className: "Fortress Knight",
    passive: "Blocks spells through its file",
    hp: 120,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "earthquake", name: "Earthquake", cost: 35, description: "All pieces on same rank lose 10 HP" },
  },
  n: {
    className: "Arcane Rider",
    passive: "Ignores terrain effects",
    hp: 90,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "blink_strike", name: "Blink Strike", cost: 40, description: "Teleport to any square within 3" },
  },
  b: {
    className: "Mage",
    passive: "+1 spell range",
    hp: 80,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "holy_beam", name: "Holy Beam", cost: 30, description: "Deal 25 dmg to any piece on its diagonal" },
  },
  q: {
    className: "Archmage",
    passive: "Regenerates 5 MP/turn",
    hp: 150,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "meteor", name: "Meteor", cost: 60, description: "Deal 40 dmg in a 3x3 area" },
  },
  k: {
    className: "War Chief",
    passive: "Immune to stun",
    hp: 200,
    mp: 60,
    maxMp: MAX_MP,
    spell: { id: "rally_cry", name: "Rally Cry", cost: 50, description: "Restore 20 HP to all adjacent allies" },
  },
};

export type PieceId = string;

export interface PieceState {
  id: PieceId;
  type: PieceSymbol;
  color: Color;
  hp: number;
  maxHp: number;
  mp: number;
  stunnedTurns: number; // >0 means stunned for this many of their own turns
  wounded: boolean; // hp dropped to 0 from spells
}

export function makePiece(id: PieceId, type: PieceSymbol, color: Color): PieceState {
  const base = PIECE_BASE[type];
  return {
    id,
    type,
    color,
    hp: base.hp,
    maxHp: base.hp,
    mp: base.mp,
    stunnedTurns: 0,
    wounded: false,
  };
}

// Build the initial square->id map and id->state map for the standard starting position.
export function makeInitialPieceState(): {
  squareToId: Record<string, PieceId>;
  pieces: Record<PieceId, PieceState>;
} {
  const squareToId: Record<string, PieceId> = {};
  const pieces: Record<PieceId, PieceState> = {};
  let counter = 0;
  const add = (sq: string, type: PieceSymbol, color: Color) => {
    const id = `${color}${type}${counter++}`;
    squareToId[sq] = id;
    pieces[id] = makePiece(id, type, color);
  };
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const backRank: PieceSymbol[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  files.forEach((f, i) => add(`${f}2`, "p", "w"));
  files.forEach((f, i) => add(`${f}7`, "p", "b"));
  backRank.forEach((t, i) => add(`${files[i]}1`, t, "w"));
  backRank.forEach((t, i) => add(`${files[i]}8`, t, "b"));
  return { squareToId, pieces };
}
