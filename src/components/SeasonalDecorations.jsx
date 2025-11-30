import React, { useEffect, useState, useMemo } from "react";
import { getCurrentTheme, isSpecialOccasion } from "../utils/seasonalThemes";

/**
 * Floating decoration element
 */
const FloatingDecoration = ({ emoji, delay, duration, left, size }) => (
  <div
    className="fixed pointer-events-none animate-float z-50 opacity-70"
    style={{
      left: `${left}%`,
      top: "-50px",
      fontSize: size,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    {emoji}
  </div>
);

/**
 * Get decoration emojis based on type
 */
const getDecorationEmojis = (decorationType) => {
  const decorations = {
    snowflakes: ["❄️", "❄️", "❄️", "✨", "⛄"],
    hearts: ["💕", "💖", "💗", "💝", "💘"],
    clovers: ["☘️", "🍀", "☘️", "🌈", "🍀"],
    eggs: ["🥚", "🐰", "🌷", "🐣", "🥚"],
    confetti: ["🎊", "🎉", "✨", "🎊", "🎉"],
    fireworks: ["🎆", "✨", "🎇", "⭐", "🎆"],
    stars: ["⭐", "✨", "🌟", "⭐", "✨"],
    pumpkins: ["🎃", "👻", "🦇", "🕷️", "🎃"],
    bats: ["🦇", "👻", "🎃", "🦇", "👻"],
    leaves: ["🍂", "🍁", "🍃", "🍂", "🍁"],
    ornaments: ["🎄", "🎁", "🔔", "⭐", "❄️"],
    flowers: ["🌸", "🌷", "🌼", "🌺", "🌸"],
    sun: ["☀️", "🌴", "🌊", "☀️", "🏖️"],
    sparkle: ["✨", "🎆", "⭐", "✨", "🎇"],
  };
  return decorations[decorationType] || ["✨"];
};

/**
 * SeasonalDecorations component
 * Renders floating decorations based on current holiday/season
 */
export default function SeasonalDecorations({ enabled = true, count = 8 }) {
  const [decorations, setDecorations] = useState([]);
  const theme = useMemo(() => getCurrentTheme(), []);
  const isHoliday = useMemo(() => isSpecialOccasion(), []);

  useEffect(() => {
    // Only show decorations if enabled and during holidays (not everyday seasons)
    if (!enabled || !isHoliday) {
      setDecorations([]);
      return;
    }

    const decorationTypes = theme.decorations || ["sparkle"];
    const allEmojis = decorationTypes.flatMap(getDecorationEmojis);

    const newDecorations = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: allEmojis[Math.floor(Math.random() * allEmojis.length)],
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 8,
      left: Math.random() * 100,
      size: `${1 + Math.random() * 1.5}rem`,
    }));

    setDecorations(newDecorations);
  }, [enabled, isHoliday, theme.decorations, count]);

  if (!enabled || !isHoliday || decorations.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-40"
      aria-hidden="true"
    >
      {decorations.map((dec) => (
        <FloatingDecoration key={dec.id} {...dec} />
      ))}

      {/* Add CSS animation via style tag */}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Holiday banner component - shows a themed message
 */
export function HolidayBanner({ className = "" }) {
  const theme = useMemo(() => getCurrentTheme(), []);
  const isHoliday = useMemo(() => isSpecialOccasion(), []);

  if (!isHoliday) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg ${className}`}
    >
      <span className="text-lg">{theme.emoji}</span>
      <span>{theme.message}</span>
      <span className="text-lg">{theme.emoji}</span>
    </div>
  );
}

/**
 * Themed accent border for cards
 */
export function ThemedBorder({ children, className = "" }) {
  const theme = useMemo(() => getCurrentTheme(), []);
  const isHoliday = useMemo(() => isSpecialOccasion(), []);

  if (!isHoliday) {
    return <div className={className}>{children}</div>;
  }

  const [color1, color2] = theme.colors || ["#6366f1", "#8b5cf6"];

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color1}22, ${color2}22)`,
        borderRadius: "0.75rem",
      }}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-30"
        style={{
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          padding: "2px",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </div>
  );
}
