import { useCallback, useState } from "react";
import { PIECE_BASE, type PieceState } from "@/lib/pieceStats";


export interface AiContext {
  fen: string;
  pgn: string;
  legalUciMoves: string[];
  // For each legal move's "from" square, optional spell info for that piece
  pieces: Record<string, PieceState>;
  squareToId: Record<string, string>;
  // map of casterSquare -> { spellId, validTargets[] } available for black pieces
  availableSpells: { caster: string; spellId: string; cost: number; validTargets: string[] }[];
}

export interface AiResult {
  uci: string;
  spell: { caster: string; spellId: string; target: string } | null;
  attempts: number;
  fellBack: boolean;
  error?: string;
}

function extractUci(text: string, legal: string[]): string | null {
  if (!text) return null;
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const moveLine = cleaned.match(/MOVE:\s*([a-h][1-8][a-h][1-8][qrbn]?)/i);
  if (moveLine) {
    const m = moveLine[1].toLowerCase();
    if (legal.includes(m)) return m;
  }
  const lower = cleaned.toLowerCase();
  for (const m of legal) {
    if (new RegExp(`\\b${m}\\b`, "i").test(lower)) return m;
  }
  const match = lower.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/);
  return match && legal.includes(match[1]) ? match[1] : null;
}

function extractSpell(
  text: string,
  available: AiContext["availableSpells"],
): { caster: string; spellId: string; target: string } | null {
  if (!text || available.length === 0) return null;
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // SPELL: bishop_c8 holy_beam f3   OR   SPELL: c8 holy_beam f3
  const m = cleaned.match(/SPELL:\s*(?:\w+_)?([a-h][1-8])\s+([a-z_]+)\s+([a-h][1-8])/i);
  if (!m) return null;
  const caster = m[1].toLowerCase();
  const spellId = m[2].toLowerCase();
  const target = m[3].toLowerCase();

  const valid = available.find((a) => a.caster === caster && a.spellId === spellId);
  if (!valid || !valid.validTargets.includes(target)) return null;
  return { caster, spellId, target };
}

export function useAI(difficulty: "easy" | "medium" | "hard" = "medium", aiUrl: string, aiModel: string) {
  const [thinking, setThinking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const getMove = useCallback(async (req: AiContext): Promise<AiResult> => {
    setThinking(true);
    setLastError(null);
    const legal = req.legalUciMoves;
    let lastBad = "";
    try {
      const piecesSummary = Object.entries(req.squareToId)
        .map(([sq, id]) => {
          const p = req.pieces[id];
          if (!p) return null;
          const cls = PIECE_BASE[p.type].className;
          return `${sq}:${p.color}${p.type}(${cls}) HP${p.hp}/${p.maxHp} MP${p.mp}${p.wounded ? " WOUNDED" : ""}${p.stunnedTurns ? " STUNNED" : ""}`;
        })
        .filter(Boolean)
        .join("; ");

      const spellsBlock =
        req.availableSpells.length === 0
          ? "(none available)"
          : req.availableSpells
              .map((a) => `${a.caster} ${a.spellId} (${a.cost}MP) -> targets: ${a.validTargets.join(",")}`)
              .join("\n");

      for (let attempt = 1; attempt <= 3; attempt++) {
        let diffPrompt = "";
        let temp = 0.3;
        
        if (difficulty === "easy") {
          diffPrompt = "You are a beginner player. You frequently make suboptimal or purely random moves.";
          temp = 0.8;
        } else if (difficulty === "hard") {
          diffPrompt = "You are an absolute Grandmaster RPG chess engine. You must calculate optimal spell combos to maximize damage and board advantage. Never make blunders.";
          temp = 0.1;
        }

        const system = [
          "You are an RPG chess engine playing Black. Each piece has HP, MP, and a unique spell.",
          "On your turn you MUST make one legal chess move, and you MAY optionally also cast one spell.",
          "Respond in EXACTLY this format on one line:",
          "MOVE: <uci> | SPELL: <casterSquare> <spellId> <targetSquare>",
          "If you don't want to cast a spell, omit the SPELL part:",
          "MOVE: <uci>",
          "No prose, no <think>, no markdown.",
          diffPrompt,
          `Current FEN: ${req.fen}`,
          `PGN: ${req.pgn || "(none)"}`,
          `Legal UCI moves: ${legal.join(" ")}`,
          `Piece state: ${piecesSummary}`,
          `Available spells:\n${spellsBlock}`,
          "Prefer spells when a black piece is in danger or you can damage a high-value target.",
          attempt > 1 ? `Your previous "${lastBad}" was invalid. Pick a legal MOVE from the list.` : "",
        ].filter(Boolean).join("\n");

        let content = "";
        try {
          const res = await fetch(aiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                { role: "system", content: system },
                { role: "user", content: "Your response:" },
              ],
              temperature: temp,
              max_tokens: 4096,
            }),
          });
          if (!res.ok) throw new Error(`LM Studio HTTP ${res.status}`);
          const data = await res.json();
          content = data?.choices?.[0]?.message?.content ?? "";
        } catch (e) {
          setLastError(e instanceof Error ? e.message : String(e));
          break;
        }

        const uci = extractUci(content, legal);
        if (uci) {
          const spell = extractSpell(content, req.availableSpells);
          return { uci, spell, attempts: attempt, fellBack: false };
        }
        lastBad = content.slice(0, 80);
      }

      const random = legal[Math.floor(Math.random() * legal.length)];
      return {
        uci: random,
        spell: null,
        attempts: 3,
        fellBack: true,
        error: lastError ?? "AI failed to return a legal move",
      };
    } finally {
      setThinking(false);
    }
  }, [lastError, difficulty, aiUrl, aiModel]);

  return { getMove, thinking, lastError };
}
