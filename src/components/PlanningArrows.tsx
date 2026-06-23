import type { Square } from "chess.js";

interface Props {
  arrows: { from: Square; to: Square }[];
  currentDrag: { from: Square; toSquare: Square | null } | null;
}

export function PlanningArrows({ arrows, currentDrag }: Props) {
  const renderArrow = (from: Square, to: Square, key: string, isDragging: boolean) => {
    // Convert chess coordinates (a1..h8) to relative percentages
    const fromX = (from.charCodeAt(0) - "a".charCodeAt(0)) * 12.5 + 6.25;
    const fromY = (7 - (parseInt(from[1], 10) - 1)) * 12.5 + 6.25;
    
    const toX = (to.charCodeAt(0) - "a".charCodeAt(0)) * 12.5 + 6.25;
    const toY = (7 - (parseInt(to[1], 10) - 1)) * 12.5 + 6.25;

    // SVG parameters
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return null; // Same square

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Draw the body ending a bit before the center so the arrowhead isn't inside the piece
    const shrink = isDragging ? 0 : 3; 
    const drawLen = Math.max(0, length - shrink);

    return (
      <g key={key} transform={`translate(${fromX}, ${fromY})`} style={{ pointerEvents: "none" }}>
        <g transform={`rotate(${angle})`}>
          {/* Arrow Body */}
          <line
            x1="0"
            y1="0"
            x2={drawLen}
            y2="0"
            stroke="var(--accent-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0 0 4px rgba(0,240,255,0.8))",
              opacity: isDragging ? 0.6 : 0.9,
            }}
          />
          {/* Arrow Head */}
          <polygon
            points="0,-1.5 3,0 0,1.5"
            fill="var(--accent-cyan)"
            transform={`translate(${drawLen}, 0)`}
            style={{
              filter: "drop-shadow(0 0 4px rgba(0,240,255,0.8))",
              opacity: isDragging ? 0.6 : 0.9,
            }}
          />
        </g>
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "visible",
      }}
    >
      {arrows.map((a, i) => renderArrow(a.from, a.to, `arrow-${i}`, false))}
      {currentDrag && currentDrag.toSquare && renderArrow(currentDrag.from, currentDrag.toSquare, "drag", true)}
    </svg>
  );
}
