import React, { useState } from "react";
import type { Difficulty } from "@/App";
import { PIECE_BASE } from "@/lib/pieceStats";
import { AmbientParticles } from "./AmbientParticles";

interface LandingPageProps {
  onStart: (difficulty: Difficulty) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("medium");
  const [activePieceTab, setActivePieceTab] = useState<string>("q");

  const pieceList = [
    { type: "p", icon: "♙", label: "Pawn" },
    { type: "n", icon: "♘", label: "Knight" },
    { type: "b", icon: "♗", label: "Bishop" },
    { type: "r", icon: "♖", label: "Rook" },
    { type: "q", icon: "♕", label: "Queen" },
    { type: "k", icon: "♔", label: "King" },
  ] as const;

  const activePieceStats = PIECE_BASE[activePieceTab as keyof typeof PIECE_BASE];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden app-background select-none">
      <div className="crt-overlay" />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <AmbientParticles particleCount={150} />
      </div>

      <div className="max-w-3xl w-full z-10 flex flex-col items-center gap-12 pt-8 pb-16">
        
        {/* Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl tracking-[0.2em] font-light bg-gradient-to-r from-cyan-300 via-cyan-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]">
            CHESS CHRONICLES
          </h1>
          <p className="text-xs md:text-sm tracking-[0.3em] text-cyan-500/70 uppercase">
            Next-Generation RPG Chess Engine
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <div className="flex w-full bg-slate-900/50 rounded-full p-1 border border-cyan-900/40 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDiff(diff)}
                className={`flex-1 py-2 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                  selectedDiff === diff 
                    ? "bg-cyan-500/20 text-cyan-100 shadow-[0_0_15px_rgba(0,255,255,0.3)] border border-cyan-400/50" 
                    : "text-slate-500 hover:text-cyan-300 border border-transparent"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <div className="text-center h-10 flex items-center justify-center">
            <p className="text-xs text-slate-400 max-w-[280px] font-light leading-relaxed">
              {selectedDiff === "easy" && "Forgiving AI that makes mistakes. Perfect for testing spell combos."}
              {selectedDiff === "medium" && "Balanced challenge. Calculates solid moves but occasionally misses tactics."}
              {selectedDiff === "hard" && "Grandmaster engine. Relentlessly calculates optimal attacks and spell usage."}
            </p>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart(selectedDiff)}
          className="relative group overflow-hidden rounded border border-cyan-500/30 bg-slate-900/40 backdrop-blur-md px-16 py-5 mt-2 transition-all duration-300 hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          <span className="relative text-lg tracking-[0.3em] text-cyan-50 title-glow">ENTER ARENA</span>
        </button>

        {/* How It Works Codex - Glassmorphism Tabbed Interface */}
        <div className="w-full mt-8 rounded-lg border border-slate-700/50 bg-black/30 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="bg-slate-900/80 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-cyan-600 tracking-widest uppercase">Codex // Mechanics</span>
            <span className="text-[10px] text-slate-500">Select a piece to view stats</span>
          </div>
          
          <div className="p-6">
            <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-2xl text-center mx-auto font-light">
              Standard chess rules apply, augmented with <span className="text-cyan-400 font-bold">HP</span> and <span className="text-magenta-400 font-bold">MP</span>. 
              Pieces reduced to 0 HP via spells become <b className="text-slate-200">Wounded</b>, unable to move or cast. 
              Standard captures instantly slay regardless of HP.
            </p>

            {/* Piece Tabs */}
            <div className="flex justify-center gap-2 md:gap-4 mb-6">
              {pieceList.map((piece) => (
                <button
                  key={piece.type}
                  onClick={() => setActivePieceTab(piece.type)}
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-2xl md:text-3xl rounded border transition-all duration-300 ${
                    activePieceTab === piece.type
                      ? "bg-cyan-900/40 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.2)]"
                      : "bg-black/40 border-slate-800 text-slate-500 hover:border-cyan-700/40 hover:text-cyan-600"
                  }`}
                >
                  {piece.icon}
                </button>
              ))}
            </div>

            {/* Active Piece Stats */}
            <div key={activePieceTab} className="bg-black/40 rounded border border-slate-800/60 p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="text-6xl text-cyan-500/80 drop-shadow-[0_0_15px_rgba(0,255,255,0.4)] w-24 flex justify-center">
                {pieceList.find(p => p.type === activePieceTab)?.icon}
              </div>
              
              <div className="flex-1 space-y-4 w-full">
                <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                  <h3 className="text-lg text-slate-200 tracking-widest uppercase">
                    {pieceList.find(p => p.type === activePieceTab)?.label} <span className="text-cyan-500 text-sm ml-2 font-mono">// {activePieceStats.className}</span>
                  </h3>
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">HP: {activePieceStats.hp}</span>
                    <span className="text-magenta-400 bg-magenta-950/40 px-2 py-1 rounded">MP: {activePieceStats.mp}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    <span className="text-[10px] text-yellow-500 uppercase tracking-widest block mb-1">Passive Ability</span>
                    <span className="text-xs text-slate-300">{activePieceStats.passive}</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-cyan-900/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-cyan-400 uppercase tracking-widest">Active Spell: {activePieceStats.spell.name}</span>
                      <span className="text-[10px] text-magenta-500 bg-magenta-950/30 px-1.5 py-0.5 rounded border border-magenta-900/50">{activePieceStats.spell.cost} MP</span>
                    </div>
                    <span className="text-xs text-slate-300 block">{activePieceStats.spell.description}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
