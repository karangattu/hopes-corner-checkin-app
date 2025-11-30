import React, { useEffect, useState, useCallback } from "react";
import {
  markMilestoneShown,
  getCelebrationMessage,
} from "../utils/milestones";

/**
 * Firework particle component
 */
const Particle = ({ x, y, color, delay, size }) => (
  <div
    className="absolute rounded-full animate-firework"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      backgroundColor: color,
      animationDelay: `${delay}ms`,
    }}
  />
);

/**
 * Confetti piece component
 */
const Confetti = ({ left, color, delay, rotation }) => (
  <div
    className="fixed top-0 animate-confetti-fall"
    style={{
      left: `${left}%`,
      width: "10px",
      height: "10px",
      backgroundColor: color,
      animationDelay: `${delay}ms`,
      transform: `rotate(${rotation}deg)`,
      borderRadius: rotation % 2 === 0 ? "50%" : "0",
    }}
  />
);

/**
 * Generate firework particles
 */
const generateFireworkParticles = (centerX, centerY) => {
  const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
  const particles = [];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * 360;
    const distance = 50 + Math.random() * 100;
    const radians = (angle * Math.PI) / 180;
    const x = centerX + Math.cos(radians) * distance;
    const y = centerY + Math.sin(radians) * distance;

    particles.push({
      id: i,
      x: `${x}px`,
      y: `${y}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 200,
      size: `${4 + Math.random() * 6}px`,
    });
  }

  return particles;
};

/**
 * Generate confetti pieces
 */
const generateConfetti = () => {
  const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#DDA0DD", "#87CEEB"];
  const pieces = [];

  for (let i = 0; i < 50; i++) {
    pieces.push({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3000,
      rotation: Math.random() * 360,
    });
  }

  return pieces;
};

/**
 * Milestone Celebration Modal
 */
export function MilestoneCelebration({
  milestone,
  serviceType,
  onClose,
  visible,
}) {
  const [particles, setParticles] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      // Generate effects based on milestone size
      if (milestone >= 1000) {
        // Fireworks for big milestones
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setParticles(generateFireworkParticles(centerX, centerY));
      }
      // Always show confetti
      setConfetti(generateConfetti());

      // Show content after a brief delay
      setTimeout(() => setShowContent(true), 300);
    } else {
      setParticles([]);
      setConfetti([]);
      setShowContent(false);
    }
  }, [visible, milestone]);

  const handleClose = useCallback(() => {
    markMilestoneShown(serviceType, milestone);
    onClose();
  }, [serviceType, milestone, onClose]);

  if (!visible) return null;

  const message = getCelebrationMessage(milestone, serviceType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Confetti */}
      {confetti.map((c) => (
        <Confetti key={c.id} {...c} />
      ))}

      {/* Firework particles */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Modal content */}
      {showContent && (
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform animate-bounce-in">
          {/* Trophy/celebration icon */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div className="text-6xl animate-bounce">🎉</div>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
              Milestone Reached!
            </h2>

            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4">
              {milestone.toLocaleString()}
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              {message}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Thank you for making a difference! 💜
            </p>

            <button
              onClick={handleClose}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Continue 🚀
            </button>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes firework {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-firework {
          animation: firework 1s ease-out forwards;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 4s ease-in-out forwards;
        }
        
        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default MilestoneCelebration;
