import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

const COLORS = [
  { color: "rgba(245, 200, 66, ALPHA)", weight: 0.4 },   // gold
  { color: "rgba(157, 78, 221, ALPHA)", weight: 0.3 },    // arcane purple
  { color: "rgba(72, 202, 228, ALPHA)", weight: 0.2 },    // frost blue
  { color: "rgba(240, 230, 200, ALPHA)", weight: 0.1 },   // parchment dust
];

function pickColor(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const c of COLORS) {
    cumulative += c.weight;
    if (r <= cumulative) return c.color;
  }
  return COLORS[0].color;
}

function createParticle(canvasW: number, canvasH: number, fromBottom = true): Particle {
  return {
    x: Math.random() * canvasW,
    y: fromBottom ? canvasH + Math.random() * 20 : Math.random() * canvasH,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.15 + Math.random() * 0.35),
    size: 1 + Math.random() * 2,
    alpha: 0.04 + Math.random() * 0.12,
    color: pickColor(),
    life: 0,
    maxLife: 300 + Math.random() * 400,
  };
}

interface Props {
  className?: string;
  particleCount?: number;
}

export function AmbientParticles({ className = "", particleCount = 50 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const init = useCallback((w: number, h: number) => {
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(w, h, false));
    }
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (particlesRef.current.length === 0) {
        init(canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Fade in and out
        let currentAlpha = p.alpha;
        if (p.life < 30) {
          currentAlpha *= p.life / 30;
        }
        if (p.life > p.maxLife - 60) {
          currentAlpha *= (p.maxLife - p.life) / 60;
        }

        // Respawn if off-screen or expired
        if (p.y < -10 || p.life >= p.maxLife) {
          particlesRef.current[i] = createParticle(canvas.width, canvas.height, true);
          continue;
        }

        // Draw particle
        const colorWithAlpha = p.color.replace("ALPHA", String(currentAlpha));
        ctx.fillStyle = colorWithAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
