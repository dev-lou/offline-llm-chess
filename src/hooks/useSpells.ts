import { useCallback, useRef, useState } from "react";
import type { Move, Square, Color } from "chess.js";
import {
  PIECE_BASE,
  MP_REGEN,
  MAX_MP,
  makeInitialPieceState,
  type PieceId,
  type PieceState,
} from "@/lib/pieceStats";
import { applySpell, getSpellTargets, type SpellId, type SpellResult } from "@/lib/spellDefinitions";

export interface BattleLogEntry {
  id: number;
  ply: number;
  type: "spell" | "death" | "info";
  text: string;
  color: "w" | "b" | "neutral";
}

export interface SpellEvent {
  id: number;
  spellId: SpellId;
  caster: Square;
  target: Square;
  result: SpellResult;
  ply: number;
}

interface Snapshot {
  squareToId: Record<string, PieceId>;
  pieces: Record<PieceId, PieceState>;
  log: BattleLogEntry[];
}

function clone(s: Snapshot): Snapshot {
  return {
    squareToId: { ...s.squareToId },
    pieces: Object.fromEntries(Object.entries(s.pieces).map(([k, v]) => [k, { ...v }])),
    log: s.log.slice(),
  };
}

export function useSpells() {
  const initial = makeInitialPieceState();
  const stateRef = useRef<Snapshot>({ ...initial, log: [] });
  const historyRef = useRef<Snapshot[]>([clone(stateRef.current)]);
  const logIdRef = useRef(0);
  const eventIdRef = useRef(0);
  const [, force] = useState(0);
  const [animEvent, setAnimEvent] = useState<SpellEvent | null>(null);
  const [captureEvent, setCaptureEvent] = useState<{ id: number; square: string; color: Color } | null>(null);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const get = () => stateRef.current;

  const pushLog = (entry: Omit<BattleLogEntry, "id">) => {
    stateRef.current.log.push({ ...entry, id: ++logIdRef.current });
  };

  // Apply chess move side-effects to piece-state map
  const applyMove = useCallback((move: Move, plyAfter: number) => {
    const s = stateRef.current;
    const from = move.from;
    const to = move.to;
    const movingId = s.squareToId[from];
    if (!movingId) {
      // Could be teleport already moved id; just snapshot and return
      historyRef.current.push(clone(s));
      rerender();
      return;
    }

    // Handle capture
    if (move.captured) {
      // En passant: captured pawn is on a different square
      let capturedSq: string = to;
      if (move.flags.includes("e")) {
        const file = to[0];
        const rank = move.color === "w" ? "5" : "4";
        capturedSq = `${file}${rank}`;
      }
      const capturedId = s.squareToId[capturedSq];
      if (capturedId) {
        const cap = s.pieces[capturedId];
        if (cap) {
          pushLog({
            ply: plyAfter,
            type: "death",
            text: `${nameOf(cap)} captured.`,
            color: cap.color,
          });
          
          // Trigger capture event shockwave
          const cid = ++eventIdRef.current;
          setCaptureEvent({ id: cid, square: capturedSq, color: cap.color });
          setTimeout(() => setCaptureEvent((cur) => (cur && cur.id === cid ? null : cur)), 1000);

          delete s.pieces[capturedId];
        }
        delete s.squareToId[capturedSq];
      }
    }

    // Move the piece
    delete s.squareToId[from];
    s.squareToId[to] = movingId;

    // Promotion: change type
    if (move.promotion) {
      const p = s.pieces[movingId];
      if (p) {
        p.type = move.promotion as PieceState["type"];
        p.maxHp = PIECE_BASE[p.type].hp;
        p.hp = Math.min(p.hp, p.maxHp);
      }
    }

    // Castling: also move the rook
    if (move.flags.includes("k") || move.flags.includes("q")) {
      const rank = move.color === "w" ? "1" : "8";
      const [rookFrom, rookTo] = move.flags.includes("k")
        ? [`h${rank}`, `f${rank}`]
        : [`a${rank}`, `d${rank}`];
      const rookId = s.squareToId[rookFrom];
      if (rookId) {
        delete s.squareToId[rookFrom];
        s.squareToId[rookTo] = rookId;
      }
    }

    // Turn-based regen + stun decrement happens at start of THIS color's next turn,
    // which means when the OTHER color just moved. So when move.color === X moves,
    // we just changed to other color; before their move, regen them.
    const nextTurnColor: Color = move.color === "w" ? "b" : "w";
    for (const p of Object.values(s.pieces)) {
      if (p.color === nextTurnColor) {
        p.mp = Math.min(MAX_MP, p.mp + MP_REGEN);
        if (p.stunnedTurns > 0) p.stunnedTurns -= 1;
      }
    }

    historyRef.current.push(clone(s));
    rerender();
  }, [rerender]);

  const undoTo = useCallback((plyCount: number) => {
    // history index 0 = before any moves. After N moves, history.length = N+1
    while (historyRef.current.length - 1 > plyCount) historyRef.current.pop();
    stateRef.current = clone(historyRef.current[historyRef.current.length - 1]);
    rerender();
  }, [rerender]);

  const reset = useCallback(() => {
    const fresh = makeInitialPieceState();
    stateRef.current = { ...fresh, log: [] };
    historyRef.current = [clone(stateRef.current)];
    setAnimEvent(null);
    rerender();
  }, [rerender]);

  const castSpell = useCallback(
    (
      spellId: SpellId,
      casterSquare: Square,
      target: Square,
      board: ReturnType<import("chess.js").Chess["board"]>,
      plyAfter: number,
    ): SpellResult | null => {
      const s = stateRef.current;
      const casterId = s.squareToId[casterSquare];
      if (!casterId) return null;
      const caster = s.pieces[casterId];
      if (!caster) return null;
      const base = PIECE_BASE[caster.type];
      if (base.spell.id !== spellId) return null;
      if (caster.mp < base.spell.cost) return null;
      if (caster.wounded) return null;

      const ctx = { casterSquare, caster, squareToId: s.squareToId, pieces: s.pieces, board };
      const valid = getSpellTargets(spellId, ctx);
      if (!valid.includes(target)) return null;

      const result = applySpell(spellId, ctx, target);
      caster.mp -= base.spell.cost;

      // Create animation event immediately
      const ev: SpellEvent = {
        id: ++eventIdRef.current,
        spellId,
        caster: casterSquare,
        target,
        result,
        ply: plyAfter,
      };
      setAnimEvent(ev);

      // Snapshot before damage application so history isn't corrupted
      const currentHistoryIdx = historyRef.current.length - 1;

      const applyEffects = () => {
        // Apply damage
        for (const d of result.damage) {
          const p = s.pieces[d.pieceId];
          if (!p) continue;
          p.hp = Math.max(0, p.hp - d.amount);
          if (p.hp === 0 && !p.wounded) {
            p.wounded = true;
            pushLog({ ply: plyAfter, type: "death", text: `${nameOf(p)} is wounded!`, color: p.color });
          }
        }
        // Apply heals
        for (const h of result.heals) {
          const p = s.pieces[h.pieceId];
          if (!p) continue;
          p.hp = Math.min(p.maxHp, p.hp + h.amount);
          if (p.wounded && p.hp > 0) p.wounded = false;
        }
        // Apply stuns
        for (const st of result.stuns) {
          const p = s.pieces[st.pieceId];
          if (!p) continue;
          if (p.type === "k") continue; // King immune
          p.stunnedTurns = Math.max(p.stunnedTurns, 2); // lasts through their next move
        }
        // Teleport: update squareToId
        if (result.teleport) {
          delete s.squareToId[result.teleport.from];
          s.squareToId[result.teleport.to] = result.teleport.pieceId;
        }

        pushLog({ ply: plyAfter, type: "spell", text: result.flavor, color: caster.color });

        // Update the snapshot with the applied effects
        historyRef.current[currentHistoryIdx] = clone(s);
        rerender();
      };

      // Delay state updates if it's the meteor spell so the impact syncs with animation
      if (spellId === "meteor") {
        setTimeout(applyEffects, 1100);
      } else {
        applyEffects();
      }

      // Clear animation after a moment
      setTimeout(() => setAnimEvent((cur) => (cur && cur.id === ev.id ? null : cur)), 1400);

      historyRef.current[currentHistoryIdx] = clone(s);
      rerender();
      return result;
    },
    [rerender],
  );

  return {
    state: get(),
    applyMove,
    undoTo,
    reset,
    castSpell,
    getSpellTargetsFor: (spellId: SpellId, casterSquare: Square, board: ReturnType<import("chess.js").Chess["board"]>) => {
      const s = stateRef.current;
      const casterId = s.squareToId[casterSquare];
      if (!casterId) return [];
      const caster = s.pieces[casterId];
      if (!caster) return [];
      return getSpellTargets(spellId, { casterSquare, caster, squareToId: s.squareToId, pieces: s.pieces, board });
    },
    getSnapshot: (ply: number) => {
      // Return the snapshot for a given ply, safely clamped to available history
      const idx = Math.max(0, Math.min(ply, historyRef.current.length - 1));
      return historyRef.current[idx];
    },
    animEvent,
    captureEvent,
  };
}

function nameOf(p: PieceState): string {
  const cls = ({ p: "Pawn", r: "Rook", n: "Knight", b: "Bishop", q: "Queen", k: "King" })[p.type];
  return `${p.color === "w" ? "White" : "Black"} ${cls}`;
}
