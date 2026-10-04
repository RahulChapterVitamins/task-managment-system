"use client";

import { useMemo } from "react";

const COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
  size: number;
};

function createPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 1.1 + Math.random() * 0.8,
    rotation: Math.random() * 360,
    color: COLORS[id % COLORS.length],
    size: 6 + Math.random() * 6,
  }));
}

type ConfettiBurstProps = {
  active: boolean;
  count?: number;
};

export function ConfettiBurst({ active, count = 42 }: ConfettiBurstProps) {
  const pieces = useMemo(() => createPieces(count), [count]);

  if (!active) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-screen overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block rounded-sm animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.4,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
