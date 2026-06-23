import type { Square, PieceSymbol, Color } from "chess.js";
import type { PieceState } from "./pieceStats";

export type SpellId = "shield_bash" | "earthquake" | "blink_strike" | "holy_beam" | "meteor" | "rally_cry";

export interface SpellContext {
  casterSquare: Square;
  caster: PieceState;
  squareToId: Record<string, string>;
  pieces: Record<string, PieceState>;
  board: ({ type: PieceSymbol; color: Color } | null)[][]; // chess.board() result
}

function sqToCoord(sq: string): { file: number; rank: number } {
  const file = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  return { file, rank };
}

function coordToSq(file: number, rank: number): Square {
  return `${String.fromCharCode("a".charCodeAt(0) + file)}${rank + 1}` as Square;
}

function inBounds(f: number, r: number) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

function pieceAt(ctx: SpellContext, sq: string): PieceState | null {
  const id = ctx.squareToId[sq];
  return id ? ctx.pieces[id] : null;
}

// Returns the valid target squares for the given spell.
export function getSpellTargets(spellId: SpellId, ctx: SpellContext): Square[] {
  const { file: cf, rank: cr } = sqToCoord(ctx.casterSquare);
  const targets: Square[] = [];

  switch (spellId) {
    case "shield_bash": {
      // Adjacent enemy
      for (let df = -1; df <= 1; df++)
        for (let dr = -1; dr <= 1; dr++) {
          if (!df && !dr) continue;
          const f = cf + df, r = cr + dr;
          if (!inBounds(f, r)) continue;
          const sq = coordToSq(f, r);
          const t = pieceAt(ctx, sq);
          if (t && t.color !== ctx.caster.color) targets.push(sq);
        }
      return targets;
    }
    case "earthquake": {
      // Hits all pieces on same rank (target = self square)
      return [ctx.casterSquare as Square];
    }
    case "blink_strike": {
      // Any empty square within 3 (Chebyshev distance)
      for (let f = 0; f < 8; f++)
        for (let r = 0; r < 8; r++) {
          if (f === cf && r === cr) continue;
          if (Math.max(Math.abs(f - cf), Math.abs(r - cr)) > 3) continue;
          const sq = coordToSq(f, r);
          if (!pieceAt(ctx, sq)) targets.push(sq);
        }
      return targets;
    }
    case "holy_beam": {
      // Any piece on the caster's diagonals
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let f = cf + df, r = cr + dr;
        while (inBounds(f, r)) {
          const sq = coordToSq(f, r);
          const t = pieceAt(ctx, sq);
          if (t) {
            targets.push(sq);
            break; // Beam stops at first piece on each diagonal
          }
          f += df;
          r += dr;
        }
      }
      return targets;
    }
    case "meteor": {
      // Any square — 3x3 area
      for (let f = 0; f < 8; f++)
        for (let r = 0; r < 8; r++) {
          targets.push(coordToSq(f, r));
        }
      return targets;
    }
    case "rally_cry": {
      // Self (heals adjacent allies)
      return [ctx.casterSquare as Square];
    }
  }
}

export interface SpellResult {
  damage: { square: Square; amount: number; pieceId: string }[];
  heals: { square: Square; amount: number; pieceId: string }[];
  stuns: { square: Square; pieceId: string }[];
  teleport?: { from: Square; to: Square; pieceId: string };
  animation: "flash" | "shake" | "beam" | "burst" | "heal" | "blink";
  flavor: string;
}

export function applySpell(spellId: SpellId, ctx: SpellContext, target: Square): SpellResult {
  const result: SpellResult = {
    damage: [], heals: [], stuns: [], animation: "burst", flavor: "",
  };
  const casterName = `${ctx.caster.color === "w" ? "White" : "Black"} ${classOf(ctx.caster.type)}`;

  switch (spellId) {
    case "shield_bash": {
      const t = pieceAt(ctx, target);
      if (t && t.type !== "k") {
        result.stuns.push({ square: target, pieceId: t.id });
      }
      result.animation = "burst";
      result.flavor = `${casterName} bashes ${nameOf(t)} — stunned!`;
      break;
    }
    case "earthquake": {
      const { rank } = sqToCoord(ctx.casterSquare);
      for (let f = 0; f < 8; f++) {
        const sq = coordToSq(f, rank);
        const t = pieceAt(ctx, sq);
        if (t && t.id !== ctx.caster.id) {
          result.damage.push({ square: sq, amount: 10, pieceId: t.id });
        }
      }
      result.animation = "shake";
      result.flavor = `${casterName} unleashes Earthquake! Rank ${rank + 1} trembles.`;
      break;
    }
    case "blink_strike": {
      result.teleport = { from: ctx.casterSquare as Square, to: target, pieceId: ctx.caster.id };
      result.animation = "blink";
      result.flavor = `${casterName} blinks to ${target}!`;
      break;
    }
    case "holy_beam": {
      const t = pieceAt(ctx, target);
      if (t) result.damage.push({ square: target, amount: 25, pieceId: t.id });
      result.animation = "beam";
      result.flavor = `${casterName} fires Holy Beam at ${nameOf(t)} — 25 dmg!`;
      break;
    }
    case "meteor": {
      const { file: tf, rank: tr } = sqToCoord(target);
      for (let df = -1; df <= 1; df++)
        for (let dr = -1; dr <= 1; dr++) {
          const f = tf + df, r = tr + dr;
          if (!inBounds(f, r)) continue;
          const sq = coordToSq(f, r);
          const t = pieceAt(ctx, sq);
          if (t) result.damage.push({ square: sq, amount: 40, pieceId: t.id });
        }
      result.animation = "flash";
      result.flavor = `${casterName} drops a Meteor on ${target}!`;
      break;
    }
    case "rally_cry": {
      const { file: cf, rank: cr } = sqToCoord(ctx.casterSquare);
      for (let df = -1; df <= 1; df++)
        for (let dr = -1; dr <= 1; dr++) {
          if (!df && !dr) continue;
          const f = cf + df, r = cr + dr;
          if (!inBounds(f, r)) continue;
          const sq = coordToSq(f, r);
          const t = pieceAt(ctx, sq);
          if (t && t.color === ctx.caster.color) {
            result.heals.push({ square: sq, amount: 20, pieceId: t.id });
          }
        }
      result.animation = "heal";
      result.flavor = `${casterName} rallies allies — +20 HP!`;
      break;
    }
  }
  return result;
}

function classOf(t: PieceSymbol): string {
  return ({ p: "Squire", r: "Rook", n: "Knight", b: "Bishop", q: "Queen", k: "King" })[t];
}

function nameOf(p: PieceState | null): string {
  if (!p) return "empty square";
  return `${p.color === "w" ? "White" : "Black"} ${classOf(p.type)}`;
}
