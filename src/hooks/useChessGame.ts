import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";

export type GameStatus =
  | "playing"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "threefold"
  | "insufficient";

export interface ChessGameState {
  fen: string;
  pgn: string;
  turn: "w" | "b";
  history: Move[];
  status: GameStatus;
  inCheck: boolean;
  winner: "w" | "b" | null;
  lastMove: Move | null;
  checkSquare: Square | null;
}

function computeStatus(chess: Chess): { status: GameStatus; winner: "w" | "b" | null } {
  if (chess.isCheckmate()) {
    // The side to move is checkmated; the other side wins.
    return { status: "checkmate", winner: chess.turn() === "w" ? "b" : "w" };
  }
  if (chess.isStalemate()) return { status: "stalemate", winner: null };
  if (chess.isThreefoldRepetition()) return { status: "threefold", winner: null };
  if (chess.isInsufficientMaterial()) return { status: "insufficient", winner: null };
  if (chess.isDraw()) return { status: "draw", winner: null };
  return { status: "playing", winner: null };
}

function findKingSquare(chess: Chess, color: "w" | "b"): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === "k" && p.color === color) {
        const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
        return `${files[f]}${8 - r}` as Square;
      }
    }
  }
  return null;
}

export function useChessGame() {
  const chessRef = useRef(new Chess());
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const state: ChessGameState = useMemo(() => {
    const chess = chessRef.current;
    const history = chess.history({ verbose: true }) as Move[];
    const { status, winner } = computeStatus(chess);
    const inCheck = chess.inCheck();
    const checkSquare = inCheck ? findKingSquare(chess, chess.turn()) : null;
    return {
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn(),
      history,
      status,
      inCheck,
      winner,
      lastMove: history.length ? history[history.length - 1] : null,
      checkSquare,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chessRef.current.fen()]);

  const legalMovesFrom = useCallback((square: Square): Move[] => {
    return chessRef.current.moves({ square, verbose: true }) as Move[];
  }, []);

  const makeMove = useCallback(
    (move: { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" }): Move | null => {
      try {
        const result = chessRef.current.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion ?? "q",
        });
        if (result) rerender();
        return result;
      } catch {
        return null;
      }
    },
    [rerender],
  );

  const makeUciMove = useCallback(
    (uci: string): Move | null => {
      const clean = uci.trim().toLowerCase().replace(/[^a-h1-8qrbn]/g, "");
      if (clean.length < 4) return null;
      const from = clean.slice(0, 2) as Square;
      const to = clean.slice(2, 4) as Square;
      const promotion = clean[4] as "q" | "r" | "b" | "n" | undefined;
      return makeMove({ from, to, promotion });
    },
    [makeMove],
  );

  const reset = useCallback(() => {
    chessRef.current = new Chess();
    rerender();
  }, [rerender]);

  const undo = useCallback((plies = 1) => {
    for (let i = 0; i < plies; i++) chessRef.current.undo();
    rerender();
  }, [rerender]);

  const allLegalMoves = useCallback((): Move[] => {
    return chessRef.current.moves({ verbose: true }) as Move[];
  }, []);

  return { state, legalMovesFrom, makeMove, makeUciMove, reset, undo, allLegalMoves };
}
