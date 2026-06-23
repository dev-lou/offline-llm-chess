import type { GameStatus as Status } from "@/hooks/useChessGame";

interface Props {
  turn: "w" | "b";
  status: Status;
  inCheck: boolean;
  thinking: boolean;
  aiError: string | null;
  timeWhite?: number;
  timeBlack?: number;
}

export function GameStatus({ turn, status, inCheck, thinking, aiError, timeWhite = 600, timeBlack = 600 }: Props) {
  let label = turn === "w" ? "YOUR TURN" : "OPPONENT";
  let badgeClass = "status-badge status-badge-info";

  if (status === "checkmate") {
    label = "CHECKMATE";
    badgeClass = "status-badge status-badge-end";
  } else if (status === "stalemate" || status === "threefold" || status === "insufficient" || status === "draw") {
    label = "DRAW";
    badgeClass = "status-badge status-badge-end";
  } else if (inCheck) {
    label = turn === "w" ? "⚠ CHECK" : "⚠ CHECK";
    badgeClass = "status-badge status-badge-danger";
  } else if (thinking) {
    label = "AI THINKING";
    badgeClass = "status-badge status-badge-thinking";
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, "0")}`;
  };

  const timerClass = (time: number, isTurn: boolean) => {
    if (time <= 30) return "blitz-timer blitz-timer-critical";
    if (isTurn) return "blitz-timer blitz-timer-active";
    return "blitz-timer";
  };

  return (
    <div className="flex items-center gap-4">
      {/* Timers */}
      <div className="flex items-center gap-2">
        <div className={timerClass(timeWhite, turn === "w")}>
          <span className="opacity-50 mr-1">W</span> {formatTime(timeWhite)}
        </div>
        <div className={timerClass(timeBlack, turn === "b")}>
          <span className="opacity-50 mr-1">B</span> {formatTime(timeBlack)}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className={badgeClass}>
          {label}
          {thinking && <ThinkingDots />}
        </span>
        {aiError && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              color: "var(--accent-magenta)",
            }}
          >
            fallback
          </span>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="ml-1 inline-flex gap-0.5 align-middle">
      <span
        className="inline-block animate-bounce"
        style={{
          width: 3, height: 3,
          background: "var(--accent-frost)",
          animationDelay: "-0.3s",
        }}
      />
      <span
        className="inline-block animate-bounce"
        style={{
          width: 3, height: 3,
          background: "var(--accent-frost)",
          animationDelay: "-0.15s",
        }}
      />
      <span
        className="inline-block animate-bounce"
        style={{
          width: 3, height: 3,
          background: "var(--accent-frost)",
        }}
      />
    </span>
  );
}
