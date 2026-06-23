import { useEffect, useState, useRef } from "react";

export function useTimer(initialSeconds: number, activeTurn: "w" | "b", disabled: boolean) {
  const [whiteTime, setWhiteTime] = useState(initialSeconds);
  const [blackTime, setBlackTime] = useState(initialSeconds);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (disabled) {
      lastTickRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);

      if (delta >= 1) {
        if (activeTurn === "w") {
          setWhiteTime((t) => Math.max(0, t - delta));
        } else {
          setBlackTime((t) => Math.max(0, t - delta));
        }
        lastTickRef.current = now;
      }
    }, 100); // Poll frequently to ensure smooth seconds tracking

    return () => clearInterval(interval);
  }, [activeTurn, disabled]);

  // Sync ref on un-pause
  useEffect(() => {
    if (!disabled) {
      lastTickRef.current = Date.now();
    }
  }, [disabled]);

  const reset = () => {
    setWhiteTime(initialSeconds);
    setBlackTime(initialSeconds);
    lastTickRef.current = Date.now();
  };

  return {
    white: whiteTime,
    black: blackTime,
    reset,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
