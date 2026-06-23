import { useEffect, useState } from "react";
import type { SpellEvent } from "@/hooks/useSpells";

interface Props {
  event: SpellEvent | null;
  captureEvent?: { id: number; square: string; color: string } | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
}

interface FloatingNumber {
  id: number;
  square: string;
  amount: number;
  kind: "dmg" | "heal";
}

let floatId = 0;

export function SpellAnimation({ event, captureEvent, boardRef }: Props) {
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [darkOverlay, setDarkOverlay] = useState(false);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [shieldIcon, setShieldIcon] = useState<{ x: number; y: number } | null>(null);
  const [healRings, setHealRings] = useState<{ x: number; y: number }[]>([]);
  const [shockwaves, setShockwaves] = useState<{ id: number; color: string }[]>([]);
  const [killParticles, setKillParticles] = useState<{ id: number; square: string; color: string }[]>([]);
  const [meteors, setMeteors] = useState<{ id: number; target: string }[]>([]);

  useEffect(() => {
    if (!event) return;
    const anim = event.result.animation;
    const spellId = event.spellId;

    // Earthquake — shake
    if (anim === "shake") {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }

    // Meteor — dark overlay + intense flash + falling visual
    if (spellId === "meteor") {
      setDarkOverlay(true);
      const mId = ++floatId;
      setMeteors(cur => [...cur, { id: mId, target: event.target }]);
      
      setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
      }, 1400); // Flash happens right as it hits

      setTimeout(() => {
        setMeteors(cur => cur.filter(m => m.id !== mId));
      }, 1600); // Allow time for meteor animation to completely finish

      setTimeout(() => setDarkOverlay(false), 2200);
      // Also shake
      setTimeout(() => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }, 1400);
    } else if (anim === "flash") {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }

    // Shield Bash — shield icon
    if (spellId === "shield_bash" && boardRef.current) {
      const pos = squareToPx(event.target, boardRef.current);
      if (pos) {
        setShieldIcon(pos);
        setTimeout(() => setShieldIcon(null), 800);
      }
    }

    // Rally Cry — healing rings
    if (spellId === "rally_cry" && boardRef.current) {
      const pos = squareToPx(event.caster, boardRef.current);
      if (pos) {
        setHealRings([pos]);
        setTimeout(() => setHealRings([]), 1500);
      }
    }

    // Floating damage/heal numbers
    const newFloats: FloatingNumber[] = [
      ...event.result.damage.map((d) => ({ id: ++floatId, square: d.square, amount: d.amount, kind: "dmg" as const })),
      ...event.result.heals.map((h) => ({ id: ++floatId, square: h.square, amount: h.amount, kind: "heal" as const })),
    ];
    setFloats((cur) => [...cur, ...newFloats]);
    const t = setTimeout(() => {
      setFloats((cur) => cur.filter((f) => !newFloats.find((n) => n.id === f.id)));
    }, 1400);
    return () => clearTimeout(t);
  }, [event, boardRef]);

  // Capture Events -> Shockwave & Kill Particles
  useEffect(() => {
    if (!captureEvent) return;
    // Add a shockwave
    setShockwaves((cur) => [...cur, { id: captureEvent.id, color: captureEvent.color }]);
    setTimeout(() => {
      setShockwaves((cur) => cur.filter((s) => s.id !== captureEvent.id));
    }, 1000);

    // Add kill particles
    setKillParticles((cur) => [...cur, captureEvent]);
    setTimeout(() => {
      setKillParticles((cur) => cur.filter((k) => k.id !== captureEvent.id));
    }, 600);
  }, [captureEvent]);

  // Apply shake to the parent board container via class
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    if (shake) el.classList.add("rpg-shake");
    else el.classList.remove("rpg-shake");
  }, [shake, boardRef]);

  const board = boardRef.current;
  if (!board) return <FullscreenOverlays flash={flash} darkOverlay={darkOverlay} />;
  const rect = board.getBoundingClientRect();
  const sqSize = rect.width / 8;

  const squareToPxLocal = (sq: string) => {
    const file = sq.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(sq[1], 10) - 1;
    const x = file * sqSize + sqSize / 2;
    const y = (7 - rank) * sqSize + sqSize / 2;
    return { x: x + rect.left, y: y + rect.top };
  };

  return (
    <>
      {/* Dark sky overlay for Meteor */}
      {darkOverlay && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background: "rgba(0,0,0,0.6)",
            animation: "overlay-fade-in 200ms ease-out",
          }}
        />
      )}

      {/* Flash overlay */}
      {flash && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background: event?.spellId === "meteor"
              ? "rgba(255, 0, 85, 0.5)"
              : event?.spellId === "earthquake"
                ? "rgba(10, 10, 20, 0.8)"
                : "rgba(0, 240, 255, 0.4)",
            animation: "rpg-flash 0.5s ease-out forwards",
          }}
        />
      )}

      {/* Beam line for Holy Beam and Blink Strike */}
      {event && (event.result.animation === "beam" || event.result.animation === "blink") && (
        <BeamLine
          from={squareToPxLocal(event.caster)}
          to={squareToPxLocal(event.target)}
          color={event.spellId === "blink_strike" ? "var(--accent-purple)" : "var(--accent-cyan)"}
        />
      )}

      {/* Meteors */}
      {meteors.map((m) => {
        const { x, y } = squareToPxLocal(m.target);
        return (
          <div
            key={`m-${m.id}`}
            style={{
              position: "fixed",
              left: x,
              top: y,
              zIndex: 70,
              pointerEvents: "none",
              animation: "meteor-fall 1.4s ease-in forwards",
            }}
          >
             <div style={{
               position: "relative",
               width: 140, height: 140, 
               background: "radial-gradient(circle at 30% 30%, #fff, var(--accent-magenta) 50%, transparent 70%)",
               boxShadow: "0 0 80px 20px var(--accent-magenta)",
               borderRadius: "50%",
               transform: "translate(-50%, -50%)",
             }}>
                {/* tail */}
                <div style={{
                  position: "absolute",
                  top: "-80%", left: "-10%",
                  width: 120, height: 350,
                  background: "linear-gradient(to top, rgba(255,0,85,0.8), transparent)",
                  transform: "rotate(-15deg)",
                  transformOrigin: "bottom center",
                  filter: "blur(15px)",
                  zIndex: -1,
                  borderRadius: "50% 50% 0 0"
                }} />
             </div>
          </div>
        );
      })}

      {/* Shield icon for Shield Bash */}
      {shieldIcon && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: shieldIcon.x - 16,
            top: shieldIcon.y - 16,
            fontSize: 32,
            animation: "piece-materialize 400ms ease-out forwards",
          }}
        >
          🛡️
        </div>
      )}

      {/* Healing rings for Rally Cry */}
      {healRings.map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none fixed z-50"
          style={{
            left: pos.x - 40,
            top: pos.y - 40,
            width: 80,
            height: 80,
            border: "2px solid var(--accent-green)",
            borderRadius: "50%",
            animation: "rpg-flash 1.5s ease-out forwards",
            boxShadow: "0 0 20px rgba(0, 255, 102, 0.4)",
          }}
        />
      ))}

      {/* Floating damage/heal numbers */}
      {floats.map((f) => {
        const { x, y } = squareToPxLocal(f.square);
        return (
          <span
            key={f.id}
            className={`damage-number ${f.kind === "dmg" ? "damage-number-dmg" : "damage-number-heal"}`}
            style={{
              position: "fixed",
              left: x,
              top: y,
              zIndex: 50,
              transform: "translateX(-50%)",
            }}
          >
            {f.kind === "dmg" ? `−${f.amount}` : `+${f.amount}`}
          </span>
        );
      })}
      {/* Capture Shockwaves (originates from center of board) */}
      {shockwaves.map((s) => (
        <div
          key={`sw-${s.id}`}
          className="capture-shockwave"
          style={{
            borderColor: s.color === "w" ? "var(--accent-cyan)" : "var(--accent-magenta)",
            boxShadow: `0 0 50px ${s.color === "w" ? "var(--accent-cyan)" : "var(--accent-magenta)"}, inset 0 0 30px ${s.color === "w" ? "var(--accent-cyan)" : "var(--accent-magenta)"}`,
            top: rect.top + rect.height / 2,
            left: rect.left + rect.width / 2,
          }}
        />
      ))}

      {/* Kill Particles (localized at the captured piece) */}
      {killParticles.map((k) => {
        const { x, y } = squareToPxLocal(k.square);
        const neon = k.color === "w" ? "#00f0ff" : "#ff0055";
        return (
          <div key={`kp-${k.id}`} style={{ position: "fixed", left: x, top: y, zIndex: 60, pointerEvents: "none" }}>
            {/* Cross slash */}
            <div
              style={{
                position: "absolute", width: 80, height: 2, background: "#fff",
                boxShadow: `0 0 20px 5px ${neon}`, animation: "kill-slash 0.3s ease-out forwards",
                "--rot": "45deg"
              } as React.CSSProperties}
            />
            <div
              style={{
                position: "absolute", width: 80, height: 2, background: "#fff",
                boxShadow: `0 0 20px 5px ${neon}`, animation: "kill-slash 0.3s ease-out forwards",
                "--rot": "-45deg"
              } as React.CSSProperties}
            />
            {/* Explosive sparks */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: i % 2 === 0 ? 8 : 4,
                  height: i % 2 === 0 ? 2 : 4,
                  background: "#fff",
                  boxShadow: `0 0 10px ${neon}, 0 0 20px ${neon}`,
                  animation: `kill-particle 0.6s cubic-bezier(0.1, 0.8, 0.1, 1) forwards`,
                  transformOrigin: "center",
                  // CSS variables for random trajectories
                  "--dx": `${(Math.random() - 0.5) * 200}px`,
                  "--dy": `${(Math.random() - 0.5) * 200}px`,
                  "--rot": `${Math.random() * 360}deg`,
                  borderRadius: i % 3 === 0 ? "50%" : "0",
                } as React.CSSProperties}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function FullscreenOverlays({ flash, darkOverlay }: { flash: boolean; darkOverlay: boolean }) {
  return (
    <>
      {darkOverlay && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      )}
      {flash && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background: "rgba(255, 165, 0, 0.5)",
            animation: "rpg-flash 0.5s ease-out forwards",
          }}
        />
      )}
    </>
  );
}

function BeamLine({ from, to, color }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <div
      className="pointer-events-none fixed z-50 origin-left"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        height: 6,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        boxShadow: `0 0 20px 8px ${color}`,
        animation: "beam-strike 0.5s ease-out forwards",
        "--angle": `${angle}deg`
      } as React.CSSProperties}
    />
  );
}

function squareToPx(sq: string, board: HTMLDivElement): { x: number; y: number } | null {
  const rect = board.getBoundingClientRect();
  const sqSize = rect.width / 8;
  const file = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  const x = file * sqSize + sqSize / 2 + rect.left;
  const y = (7 - rank) * sqSize + sqSize / 2 + rect.top;
  return { x, y };
}
