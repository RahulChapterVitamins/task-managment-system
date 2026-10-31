"use client";

import { useMemo } from "react";

const EMOJIS = ["🎉", "✨", "🔥", "💪", "⭐"];

type EmojiPiece = {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  drift: number;
};

function createPieces(count: number): EmojiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: 25 + Math.random() * 50,
    delay: Math.random() * 0.15,
    drift: (Math.random() - 0.5) * 36,
  }));
}

type EmojiPopProps = {
  active: boolean;
  count?: number;
};

export function EmojiPop({ active, count = 6 }: EmojiPopProps) {
  const pieces = useMemo(() => createPieces(count), [count]);

  if (!active) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-1/2 block text-base animate-emoji-pop"
          style={
            {
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              "--emoji-drift": `${piece.drift}px`,
            } as React.CSSProperties
          }
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}
