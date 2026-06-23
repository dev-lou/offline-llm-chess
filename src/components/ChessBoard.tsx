import { forwardRef, useMemo, useState } from "react";
import type { Chess, Move, Square } from "chess.js";
import { Chess as ChessClass } from "chess.js";
import { ChessSquare } from "./ChessSquare";
import { PlanningArrows } from "./PlanningArrows";
import { FILES, RANKS, isLightSquare, squareName } from "@/lib/chessUtils";
import type { PieceState } from "@/lib/pieceStats";

interface Props {
  fen: string;
  turn: "w" | "b";
  lastMove: Move | null;
  checkSquare: Square | null;
  disabled: boolean;
  // RPG additions
  squareToId: Record<string, string>;
  pieces: Record<string, PieceState>;
  spellTargets: Square[]; // when targeting mode is active
  spellArmed: boolean;
  onMove: (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => void;
  onSelectSquare: (sq: Square | null) => void;
  onSpellTarget: (sq: Square) => void;
  selectedSquare: Square | null;
}

export const ChessBoard = forwardRef<HTMLDivElement, Props>(function ChessBoard(
  {
    fen, turn, lastMove, checkSquare, disabled,
    squareToId, pieces, spellTargets, spellArmed,
    onMove, onSelectSquare, onSpellTarget, selectedSquare,
  },
  ref,
) {
  const chess: Chess = useMemo(() => new ChessClass(fen), [fen]);
  const board = useMemo(() => chess.board(), [chess]);

  const [arrows, setArrows] = useState<{ from: Square; to: Square }[]>([]);
  const [currentDrag, setCurrentDrag] = useState<{ from: Square; toSquare: Square | null } | null>(null);

  const legalFromSelected = useMemo<Move[]>(() => {
    if (!selectedSquare || spellArmed) return [];
    // Stunned pieces can't move
    const id = squareToId[selectedSquare];
    if (id && pieces[id]?.stunnedTurns) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true }) as Move[];
    } catch {
      return [];
    }
  }, [chess, selectedSquare, spellArmed, squareToId, pieces]);

  const legalTargetMap = useMemo(() => {
    const m = new Map<string, Move>();
    for (const mv of legalFromSelected) m.set(mv.to, mv);
    return m;
  }, [legalFromSelected]);

  const spellTargetSet = useMemo(() => new Set(spellTargets), [spellTargets]);

  const handleSquareClick = (sq: Square) => {
    setArrows([]); // Clear arrows on normal click
    if (spellArmed) {
      if (spellTargetSet.has(sq)) onSpellTarget(sq);
      return;
    }
    if (disabled) return;
    const piece = chess.get(sq);

    if (selectedSquare) {
      if (sq === selectedSquare) {
        onSelectSquare(null);
        return;
      }
      const target = legalTargetMap.get(sq);
      if (target) {
        const promotion = target.promotion as "q" | "r" | "b" | "n" | undefined;
        onMove(selectedSquare, sq, promotion);
        onSelectSquare(null);
        return;
      }
      if (piece && piece.color === turn) {
        onSelectSquare(sq);
        return;
      }
      onSelectSquare(null);
      return;
    }

    if (piece && piece.color === turn) {
      onSelectSquare(sq);
    } else if (piece) {
      // allow inspecting enemy pieces
      onSelectSquare(sq);
    }
  };

  return (
    <div
      className="board-frame"
      style={{ position: "relative" }}
      onContextMenu={(e) => {
        e.preventDefault(); // Prevent context menu globally on the board
        if (!currentDrag) setArrows([]);
      }}
      onMouseUp={(e) => {
        if (e.button === 2 && currentDrag) {
          if (currentDrag.toSquare) {
            setArrows((a) => {
              // Toggle arrow off if it already exists
              const exists = a.find((x) => x.from === currentDrag.from && x.to === currentDrag.toSquare);
              if (exists) return a.filter((x) => x !== exists);
              return [...a, { from: currentDrag.from, to: currentDrag.toSquare! }];
            });
          }
          setCurrentDrag(null);
        }
      }}
      onMouseLeave={() => setCurrentDrag(null)}
    >
      {/* explicit corners instead of pseudo-elements so ::before can be the floor */}
      <div className="corner-tl" style={{ position: "absolute", width: 16, height: 16, border: "2px solid var(--accent-cyan)", zIndex: 2 }} />
      <div className="corner-br" style={{ position: "absolute", width: 16, height: 16, border: "2px solid var(--accent-cyan)", zIndex: 2 }} />
      <div style={{ position: "absolute", top: -1, right: -1, width: 16, height: 16, border: "2px solid var(--accent-cyan)", borderLeft: "none", borderBottom: "none", boxShadow: "2px -2px 10px rgba(0, 240, 255, 0.5)", zIndex: 2 }} />
      <div style={{ position: "absolute", bottom: -1, left: -1, width: 16, height: 16, border: "2px solid var(--accent-cyan)", borderRight: "none", borderTop: "none", boxShadow: "-2px 2px 10px rgba(0, 240, 255, 0.5)", zIndex: 2 }} />

      {/* Rank labels (left side) */}
      <div
        style={{
          position: "absolute", left: -16, top: 0, bottom: 0,
          display: "flex", flexDirection: "column", justifyContent: "space-around",
          zIndex: 3,
        }}
      >
        {RANKS.map((r) => (
          <span
            key={r}
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: 8,
              color: "var(--accent-cyan)",
              lineHeight: 1,
              textAlign: "center",
              width: 12,
              textShadow: "0 0 5px var(--accent-cyan)",
            }}
          >
            {r}
          </span>
        ))}
      </div>

      {/* File labels (bottom) */}
      <div
        style={{
          position: "absolute", bottom: -16, left: 0, right: 0,
          display: "flex", justifyContent: "space-around",
          zIndex: 3,
        }}
      >
        {FILES.map((f) => (
          <span
            key={f}
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: 8,
              color: "var(--accent-cyan)",
              lineHeight: 1,
              textAlign: "center",
              width: 12,
              textShadow: "0 0 5px var(--accent-cyan)",
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Board grid */}
      <div ref={ref} className="grid grid-cols-8 gap-0" style={{ position: "relative", zIndex: 1, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(0, 240, 255, 0.4)", boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)" }}>
        
        <PlanningArrows arrows={arrows} currentDrag={currentDrag} />

        {board.map((row, rankIdx) =>
          row.map((piece, fileIdx) => {
            const sq = squareName(fileIdx, rankIdx);
            const light = isLightSquare(fileIdx, rankIdx);
            const isSelected = selectedSquare === sq;
            const target = legalTargetMap.get(sq);
            const isLastMove = !!lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isCheck = checkSquare === sq;
            const id = squareToId[sq];
            const state = id ? pieces[id] : null;
            const hpPct = state ? state.hp / state.maxHp : null;
            let dist = 0;
            if (selectedSquare) {
              const sFile = selectedSquare.charCodeAt(0) - 97;
              const sRank = 8 - parseInt(selectedSquare[1], 10);
              // Calculate Chebyshev distance (max of x and y diffs) for an outward wave effect
              dist = Math.max(Math.abs(fileIdx - sFile), Math.abs(rankIdx - sRank));
            }

            return (
              <div
                key={sq}
                className="w-[clamp(32px,min(11vw,7.5vh),64px)]"
                onMouseDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault();
                    setCurrentDrag({ from: sq, toSquare: null });
                  }
                }}
                onMouseEnter={() => {
                  if (currentDrag) {
                    setCurrentDrag((c) => (c ? { ...c, toSquare: sq !== c.from ? sq : null } : null));
                  }
                }}
              >
                <ChessSquare
                  fileIdx={fileIdx}
                  rankIdx={rankIdx}
                  light={light}
                  piece={piece ? { type: piece.type, color: piece.color } : null}
                  selected={isSelected}
                  legalTarget={!!target}
                  legalCapture={!!target && (target.flags.includes("c") || target.flags.includes("e"))}
                  lastMove={isLastMove}
                  inCheck={isCheck}
                  spellTarget={spellTargetSet.has(sq)}
                  wounded={!!state?.wounded}
                  stunned={!!state && state.stunnedTurns > 0}
                  hpPct={hpPct}
                  showFileLabel={false}
                  showRankLabel={false}
                  fileLabel={FILES[fileIdx]}
                  rankLabel={RANKS[rankIdx]}
                  disabled={disabled && !spellArmed}
                  animDelay={dist * 0.05}
                  onClick={() => handleSquareClick(sq)}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
});
