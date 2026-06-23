import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Square } from "chess.js";
import { Chess as ChessClass } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
import { MoveHistory, type MoveHistoryEntry } from "@/components/MoveHistory";
import { CapturedPieces } from "@/components/CapturedPieces";
import { GameStatus } from "@/components/GameStatus";
import { PieceInfoCard } from "@/components/PieceInfoCard";
import { BattleLog } from "@/components/BattleLog";
import { SpellAnimation } from "@/components/SpellAnimation";
import { AmbientParticles } from "@/components/AmbientParticles";
import { useChessGame } from "@/hooks/useChessGame";
import { useAI } from "@/hooks/useAI";
import { useSpells } from "@/hooks/useSpells";
import { useTimer } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { PIECE_BASE } from "@/lib/pieceStats";

import { LandingPage } from "@/components/LandingPage";

export type Difficulty = "easy" | "medium" | "hard";

export default function App() {
  const [appState, setAppState] = useState<"landing" | "playing">("landing");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [aiUrl, setAiUrl] = useState("http://192.168.1.118:1234/v1/chat/completions");
  const [aiModel, setAiModel] = useState("phi-4-mini-instruct");

  const { state, makeMove, makeUciMove, reset, undo, allLegalMoves } = useChessGame();
  const spells = useSpells();
  const { getMove, thinking, lastError } = useAI(difficulty, aiUrl, aiModel);
  const audio = useAudio();
  const [aiError, setAiError] = useState<string | null>(null);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [spellArmed, setSpellArmed] = useState(false);
  const [spellCastThisTurn, setSpellCastThisTurn] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [viewPly, setViewPly] = useState<number | null>(null);
  // Track spell notes by ply index so they appear in move history
  const [spellNotes, setSpellNotes] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"moves" | "battle">("moves");
  const [checkBanner, setCheckBanner] = useState(false);

  const gameOver = state.status !== "playing";
  const timer = useTimer(600, state.turn, gameOver || thinking);

  useEffect(() => { if (gameOver) setGameOverOpen(true); }, [gameOver]);

  // Check banner
  useEffect(() => {
    if (state.inCheck && !gameOver) {
      setCheckBanner(true);
      const t = setTimeout(() => setCheckBanner(false), 1500);
      return () => clearTimeout(t);
    }
  }, [state.inCheck, state.fen, gameOver]);

  // Capture / Shockwave audio
  useEffect(() => {
    if (spells.captureEvent) {
      audio.playShockwave();
    }
  }, [spells.captureEvent, audio]);

  // Build a chess-board snapshot for spell targeting (always current)
  const currentBoard = useMemo(() => new ChessClass(state.fen).board(), [state.fen]);

  // VCR Replay State
  const isReplayMode = viewPly !== null && viewPly < state.history.length;
  const displayPly = isReplayMode ? viewPly : state.history.length;
  
  const displayFen = useMemo(() => {
    if (!isReplayMode) return state.fen;
    const c = new ChessClass();
    for (let i = 0; i < viewPly; i++) {
      c.move(state.history[i]);
    }
    return c.fen();
  }, [state.fen, isReplayMode, viewPly, state.history]);

  const displaySnapshot = useMemo(() => {
    if (!isReplayMode) return { squareToId: spells.state.squareToId, pieces: spells.state.pieces };
    return spells.getSnapshot(viewPly);
  }, [isReplayMode, viewPly, spells]);

  // Reset per-turn spell-cast flag when turn becomes white
  useEffect(() => {
    if (state.turn === "w" && !thinking) setSpellCastThisTurn(false);
  }, [state.turn, thinking]);

  // Selected piece state (must use displaySnapshot so you can inspect in replay)
  const selectedId = selectedSquare ? displaySnapshot.squareToId[selectedSquare] : null;
  const selectedPiece = selectedId ? displaySnapshot.pieces[selectedId] : null;

  // Spell targets (when armed)
  const spellTargets = useMemo<Square[]>(() => {
    if (!spellArmed || !selectedSquare || !selectedPiece) return [];
    const spellId = PIECE_BASE[selectedPiece.type].spell.id as
      | "shield_bash" | "earthquake" | "blink_strike" | "holy_beam" | "meteor" | "rally_cry";
    return spells.getSpellTargetsFor(spellId, selectedSquare, currentBoard);
  }, [spellArmed, selectedSquare, selectedPiece, spells, currentBoard]);

  // AI turn
  useEffect(() => {
    if (state.turn !== "b" || gameOver || thinking || !!spells.animEvent) return;
    let cancelled = false;
    (async () => {
      const legalMovesVerbose = allLegalMoves();
      // Filter out moves from stunned pieces
      const legal = legalMovesVerbose
        .filter((m) => {
          const id = spells.state.squareToId[m.from];
          const p = id ? spells.state.pieces[id] : null;
          return !p || p.stunnedTurns === 0;
        })
        .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
      if (legal.length === 0) return;

      // Build available spells for black
      const availableSpells: { caster: string; spellId: string; cost: number; validTargets: string[] }[] = [];
      for (const [sq, id] of Object.entries(spells.state.squareToId)) {
        const p = spells.state.pieces[id];
        if (!p || p.color !== "b" || p.wounded || p.stunnedTurns > 0) continue;
        const sp = PIECE_BASE[p.type].spell;
        if (p.mp < sp.cost) continue;
        const targets = spells.getSpellTargetsFor(sp.id as any, sq as Square, currentBoard);
        if (targets.length === 0) continue;
        availableSpells.push({ caster: sq, spellId: sp.id, cost: sp.cost, validTargets: targets as string[] });
      }

      const result = await getMove({
        fen: state.fen,
        pgn: state.pgn,
        legalUciMoves: legal,
        pieces: spells.state.pieces,
        squareToId: spells.state.squareToId,
        availableSpells,
      });
      if (cancelled) return;
      setAiError(result.fellBack ? (result.error ?? "AI fallback used") : null);

      const plyBeforeMove = state.history.length;
      // Optionally cast spell first
      let spellNote = "";
      if (result.spell) {
        const sp = spells.castSpell(
          result.spell.spellId as any,
          result.spell.caster as Square,
          result.spell.target as Square,
          currentBoard,
          plyBeforeMove + 1,
        );
        if (sp) {
          audio.playSpell(result.spell.spellId);
          spellNote = `${PIECE_BASE[spells.state.pieces[spells.state.squareToId[result.spell.caster] ?? ""]?.type ?? "p"].spell.name} → ${result.spell.target}`;
        }
      }
      // For blink_strike teleport: the caster moved squares pre-move
      // (Chess move from "caster" might be invalid now; we keep it simple and let chess.js validate)
      const moveResult = makeUciMove(result.uci);
      if (moveResult) {
        if (moveResult.captured) audio.playCapture();
        else audio.playMove();
        
        spells.applyMove(moveResult, plyBeforeMove + 1);
        if (spellNote) {
          setSpellNotes((cur) => ({ ...cur, [plyBeforeMove]: spellNote }));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turn, state.fen, gameOver]);

  const handleHumanMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      if (state.turn !== "w" || gameOver || thinking || isReplayMode) return;
      // Stunned guard
      const id = spells.state.squareToId[from];
      const p = id ? spells.state.pieces[id] : null;
      if (p && p.stunnedTurns > 0) return;
      const plyBefore = state.history.length;
      const m = makeMove({ from, to, promotion });
      if (m) {
        if (m.captured) audio.playCapture();
        else audio.playMove();

        spells.applyMove(m, plyBefore + 1);
        setSpellArmed(false);
      }
    },
    [state.turn, state.history.length, gameOver, thinking, makeMove, spells],
  );

  const handleSpellTarget = (sq: Square) => {
    if (!selectedSquare || !selectedPiece || !spellArmed || isReplayMode) return;
    if (spellCastThisTurn) return;
    const spellId = PIECE_BASE[selectedPiece.type].spell.id as any;
    const plyBefore = state.history.length;
    const r = spells.castSpell(spellId, selectedSquare, sq, currentBoard, plyBefore + 1);
    if (r) {
      audio.playSpell(spellId);
      setSpellCastThisTurn(true);
      // Record a pending spell note so it shows on the next white move
      const note = `${PIECE_BASE[selectedPiece.type].spell.name} → ${sq}`;
      setSpellNotes((cur) => ({ ...cur, [plyBefore]: note }));
      setSpellArmed(false);
      setSelectedSquare(null);
    }
  };

  const handleNewGame = () => {
    setAiError(null);
    setGameOverOpen(false);
    setSelectedSquare(null);
    setSpellArmed(false);
    setSpellCastThisTurn(false);
    setSpellNotes({});
    setViewPly(null);
    timer.reset();
    reset();
    spells.reset();
  };

  const handleUndo = () => {
    if (thinking) return;
    const plies = state.turn === "w" && state.history.length >= 2 ? 2 : 1;
    const newLen = Math.max(0, state.history.length - plies);
    undo(plies);
    spells.undoTo(newLen);
    setSpellNotes((cur) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(cur)) {
        const idx = parseInt(k, 10);
        if (idx < newLen) next[idx] = v;
      }
      return next;
    });
    setAiError(null);
    setSpellArmed(false);
    setSelectedSquare(null);
    setViewPly(null);
  };

  const boardDisabled = state.turn !== "w" || gameOver || thinking || isReplayMode || !!spells.animEvent;

  const moveHistoryEntries: MoveHistoryEntry[] = state.history.map((m, i) => ({
    move: m,
    ply: i + 1,
    spellNote: spellNotes[i],
  }));

  const resultTitle =
    state.status === "checkmate" ? "CHECKMATE"
    : state.status === "stalemate" ? "STALEMATE"
    : "DRAW";
  const resultDesc =
    state.status === "checkmate"
      ? state.winner === "w" ? "You won! Glorious victory." : "Black wins. Better luck next round."
      : "The game ended in a draw.";

  if (appState === "landing") {
    return (
      <LandingPage
        aiUrl={aiUrl}
        setAiUrl={setAiUrl}
        aiModel={aiModel}
        setAiModel={setAiModel}
        onStart={(diff) => {
          setDifficulty(diff);
          handleNewGame();
          setAppState("playing");
        }}
      />
    );
  }

  return (
    <div className="app-background min-h-screen px-4 py-6" style={{ position: "relative" }}>
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay" />

      {/* Ambient Particles — full background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <AmbientParticles particleCount={50} />
      </div>

      {/* Check Banner */}
      {checkBanner && (
        <div className="check-banner">⚠️ CHECK!</div>
      )}

      <div className="mx-auto max-w-7xl" style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ──────────────────────────────────── */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="title-glow text-base md:text-xl tracking-wider">
              ✦ CHESS CHRONICLES ✦
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
              you (white) vs qwen3-4b · cast spells, slay champions
            </p>
          </div>
          <GameStatus
            turn={state.turn}
            status={state.status}
            inCheck={state.inCheck}
            thinking={thinking}
            aiError={aiError}
            timeWhite={timer.white}
            timeBlack={timer.black}
          />
        </header>

        {/* ── Main Layout ───────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 lg:gap-8">
          {/* LEFT PANEL — Reliquary & Controls */}
          <div className="w-full lg:w-[280px] shrink-0 space-y-4 order-2 lg:order-1">
            {/* Game Controls */}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setAppState("landing")}
                className="btn-pixel btn-pixel-secondary flex-1"
                style={{ fontSize: 10, padding: "8px 4px", border: "1px solid var(--accent-magenta)" }}
              >
                ⏴ EXIT
              </button>
              <button
                type="button"
                onClick={handleNewGame}
                className="btn-pixel btn-pixel-primary flex-1"
                style={{ fontSize: 10, padding: "8px 4px" }}
              >
                ⚔️ RESTART
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={state.history.length === 0 || thinking || gameOver}
                className="btn-pixel flex-1"
                style={{ fontSize: 10, padding: "8px 4px", opacity: (state.history.length === 0 || thinking || gameOver) ? 0.4 : 1 }}
              >
                ↶ UNDO
              </button>
            </div>

            {/* Captured Pieces */}
            <div className="panel-glow p-3">
              <div className="panel-header">⚔️ RELIQUARY</div>
              <CapturedPieces history={state.history} />
            </div>

            {/* Piece Info Card */}
            <PieceInfoCard
              piece={selectedPiece}
              square={selectedSquare}
              isHumanTurn={state.turn === "w" && !gameOver && !thinking && !spellCastThisTurn}
              spellArmed={spellArmed}
              onCastSpell={() => setSpellArmed(true)}
              onCancelSpell={() => setSpellArmed(false)}
            />

            {/* AI Thinking overlay on board */}
            {thinking && (
              <div className="panel-glow p-3">
                <div className="ai-thinking-bar" />
                <ThinkingFlavor />
              </div>
            )}
          </div>

          {/* CENTER — Chess Board */}
          <div className="flex justify-center order-1 lg:order-2 shrink" style={{ position: "relative" }}>
            {isReplayMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none">
                <div className="bg-black/80 text-[var(--accent-magenta)] border border-[var(--accent-magenta)] px-4 py-1 text-xs tracking-[0.2em] font-[var(--font-display)] animate-pulse shadow-[0_0_10px_var(--accent-magenta)]">
                  REPLAY MODE
                </div>
              </div>
            )}
            <ChessBoard
              ref={boardRef}
              fen={displayFen}
              turn={state.turn}
              lastMove={displayPly > 0 ? state.history[displayPly - 1] : null}
              checkSquare={!isReplayMode ? state.checkSquare : null}
              disabled={boardDisabled}
              squareToId={displaySnapshot.squareToId}
              pieces={displaySnapshot.pieces}
              spellTargets={spellTargets}
              spellArmed={spellArmed}
              selectedSquare={selectedSquare}
              onMove={handleHumanMove}
              onSelectSquare={(sq) => { setSelectedSquare(sq); setSpellArmed(false); }}
              onSpellTarget={handleSpellTarget}
            />
            {/* AI thinking overlay on board */}
            {thinking && <div className="ai-thinking-overlay" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />}
          </div>

          {/* RIGHT PANEL — Tome */}
          <div className="w-full lg:w-[300px] shrink-0 panel-glow p-3 order-3 flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
            {/* Tabs */}
            <div className="flex gap-0 mb-3" style={{ borderBottom: "1px solid rgba(0,240,255,0.2)" }}>
              <button
                type="button"
                className={cn("tome-tab", activeTab === "moves" && "tome-tab-active")}
                onClick={() => setActiveTab("moves")}
              >
                📜 CHRONICLE
              </button>
              <button
                type="button"
                className={cn("tome-tab", activeTab === "battle" && "tome-tab-active")}
                onClick={() => setActiveTab("battle")}
              >
                ⚔️ BATTLE LOG
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] pr-1 pb-2">
              {activeTab === "moves" ? (
                <MoveHistory entries={moveHistoryEntries} />
              ) : (
                <BattleLog entries={spells.state.log} />
              )}
            </div>

            {/* VCR Controls */}
            <div className="flex items-center justify-between gap-1 mt-2 pt-3" style={{ borderTop: "1px solid rgba(0,240,255,0.2)" }}>
              <button
                type="button"
                className="btn-vcr !px-2"
                onClick={() => setViewPly(0)}
                disabled={displayPly === 0}
              >
                |&lt;
              </button>
              <button
                type="button"
                className="btn-vcr !px-2"
                onClick={() => setViewPly(Math.max(0, displayPly - 1))}
                disabled={displayPly === 0}
              >
                &lt;
              </button>
              <div className="text-[var(--text-glow)] font-[var(--font-display)] text-sm text-center flex-1" style={{ textShadow: "0 0 5px var(--text-glow)" }}>
                PLY {displayPly}/{state.history.length}
              </div>
              <button
                type="button"
                className="btn-vcr !px-2"
                onClick={() => {
                  if (displayPly + 1 >= state.history.length) setViewPly(null);
                  else setViewPly(displayPly + 1);
                }}
                disabled={displayPly === state.history.length}
              >
                &gt;
              </button>
              <button
                type="button"
                className="btn-vcr !px-2"
                onClick={() => setViewPly(null)}
                disabled={displayPly === state.history.length}
              >
                &gt;|
              </button>
            </div>
          </div>
        </div>

        {/* LM Studio Error Banner */}
        {aiError && (
          <div className="mt-8 text-center" style={{ fontFamily: "var(--font-display)", color: "var(--accent-magenta)" }}>
            ! LM Studio: {aiError}. Make sure http://localhost:1234 is running.
          </div>
        )}
      </div>

      <SpellAnimation event={spells.animEvent} captureEvent={spells.captureEvent} boardRef={boardRef} />

      {/* ── Game Over Overlay ──────────────────────── */}
      {gameOverOpen && (
        <div className="game-over-overlay" onClick={() => setGameOverOpen(false)}>
          <div className="game-over-modal" onClick={(e) => e.stopPropagation()}>
            {/* Confetti */}
            <Confetti color={state.winner === "w" ? "#00f0ff" : "#ff0055"} />
            <div className="game-over-title">{resultTitle}</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 24 }}>
              {resultDesc}
            </p>
            <button
              type="button"
              onClick={handleNewGame}
              className="btn-pixel btn-pixel-primary"
              style={{ fontSize: 9, padding: "12px 32px", animation: "cyber-pulse-yellow 1.5s ease-in-out infinite" }}
            >
              ⚔️ PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper: cn (Tailwind merge) ─────────────────────────── */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── Thinking Flavor Text ────────────────────────────────── */
const FLAVOR_TEXTS = [
  "Consulting the arcane tomes…",
  "Calculating 40 moves ahead…",
  "Summoning dark strategy…",
  "The shadows deliberate…",
  "Weaving tactical sorcery…",
  "Reading the stars…",
];

function ThinkingFlavor() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % FLAVOR_TEXTS.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="flavor-cycle" style={{ marginTop: 8 }}>
      ⚙️ {FLAVOR_TEXTS[idx]}
    </p>
  );
}

/* ── Confetti Component ──────────────────────────────────── */
function Confetti({ color }: { color: string }) {
  const pieces = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 40; i++) {
      arr.push({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.5}s`,
        color: Math.random() > 0.5 ? color : Math.random() > 0.5 ? "#00f0ff" : "#b500ff",
        size: 4 + Math.random() * 6,
      });
    }
    return arr;
  }, [color]);

  return (
    <>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}
