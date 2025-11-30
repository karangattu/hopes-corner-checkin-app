import React, { useState, useMemo } from "react";
import {
  getCurrentTheme,
  getCurrentHoliday,
  getCurrentSeason,
  getThemedGreeting,
  HOLIDAYS,
  SEASONS,
} from "../../utils/seasonalThemes";
import {
  MILESTONES,
  SERVICE_CONFIGS,
  getCelebrationMessage,
} from "../../utils/milestones";
import MilestoneCelebration from "../MilestoneCelebration";
import SeasonalDecorations, { HolidayBanner } from "../SeasonalDecorations";
import { Sparkles, PartyPopper, Calendar, Eye, EyeOff } from "lucide-react";

/**
 * Admin-only Easter Egg Tester
 * Allows previewing seasonal themes and milestone celebrations
 */
export default function EasterEggTester() {
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [showDecorations, setShowDecorations] = useState(false);
  const [celebrationConfig, setCelebrationConfig] = useState(null);
  const [selectedService, setSelectedService] = useState("meals");
  const [selectedMilestone, setSelectedMilestone] = useState(1000);

  // Current actual theme
  const currentTheme = useMemo(() => getCurrentTheme(), []);
  const currentHoliday = useMemo(() => getCurrentHoliday(), []);
  const currentSeason = useMemo(() => getCurrentSeason(), []);

  // Preview a specific holiday's decorations
  const previewHoliday = (holidayKey) => {
    setSelectedHoliday(holidayKey);
    setShowDecorations(true);
  };

  // Trigger a milestone celebration preview
  const previewCelebration = () => {
    setCelebrationConfig({
      milestone: selectedMilestone,
      serviceType: selectedService,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <Sparkles className="w-6 h-6 text-purple-500" />
        <h2 className="text-xl font-bold text-gray-800">
          🎉 Easter Egg Tester (Admin Only)
        </h2>
      </div>

      {/* Current Status */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Current Status (Today)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/80 rounded-lg p-3">
            <span className="text-gray-500">Theme Type:</span>
            <p className="font-medium">{currentTheme.type === "holiday" ? "🎊 Holiday" : "🌿 Season"}</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <span className="text-gray-500">Active:</span>
            <p className="font-medium">
              {currentHoliday ? `${currentHoliday.emoji} ${currentHoliday.name}` : `${currentSeason.emoji} ${currentSeason.name}`}
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <span className="text-gray-500">Greeting:</span>
            <p className="font-medium text-xs">{getThemedGreeting()}</p>
          </div>
        </div>
      </div>

      {/* Seasonal Themes Preview */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <PartyPopper className="w-4 h-4" />
          Preview Holiday Themes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Object.entries(HOLIDAYS).map(([key, holiday]) => (
            <button
              key={key}
              onClick={() => previewHoliday(key)}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                selectedHoliday === key
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
            >
              <div className="text-2xl mb-1">{holiday.emoji}</div>
              <div className="text-xs font-medium text-gray-700">{holiday.name}</div>
              <div className="flex gap-0.5 justify-center mt-1">
                {holiday.colors.slice(0, 3).map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Season preview */}
        <h4 className="font-medium text-gray-600 mt-4 mb-2 text-sm">Seasons</h4>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(SEASONS).map(([key, season]) => (
            <div
              key={key}
              className="p-2 rounded-lg border border-gray-200 text-center"
            >
              <div className="text-xl">{season.emoji}</div>
              <div className="text-xs text-gray-600">{season.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorations Preview Controls */}
      {selectedHoliday && (
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800">
                {HOLIDAYS[selectedHoliday].emoji} {HOLIDAYS[selectedHoliday].name} Preview
              </p>
              <p className="text-sm text-amber-600">
                {HOLIDAYS[selectedHoliday].message}
              </p>
            </div>
            <button
              onClick={() => setShowDecorations(!showDecorations)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showDecorations
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {showDecorations ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Milestone Celebration Tester */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          🎆 Preview Milestone Celebrations
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Service Type
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.emoji} {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Milestone
            </label>
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {MILESTONES.map((m) => (
                <option key={m} value={m}>
                  {m.toLocaleString()} {m >= 1000 ? "🎆" : "🎊"}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={previewCelebration}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
          >
            🎉 Trigger Celebration!
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Preview message: {getCelebrationMessage(selectedMilestone, selectedService)}
        </p>
      </div>

      {/* Holiday Banner Preview */}
      {selectedHoliday && showDecorations && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Holiday Banner Preview:</h4>
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg">
            <span className="text-lg">{HOLIDAYS[selectedHoliday].emoji}</span>
            <span>{HOLIDAYS[selectedHoliday].message}</span>
            <span className="text-lg">{HOLIDAYS[selectedHoliday].emoji}</span>
          </div>
        </div>
      )}

      {/* Decorations Overlay */}
      {showDecorations && selectedHoliday && (
        <SeasonalDecorationsPreview holiday={HOLIDAYS[selectedHoliday]} />
      )}

      {/* Milestone Celebration Modal */}
      {celebrationConfig && (
        <MilestoneCelebration
          milestone={celebrationConfig.milestone}
          serviceType={celebrationConfig.serviceType}
          visible={true}
          onClose={() => setCelebrationConfig(null)}
        />
      )}
    </div>
  );
}

/**
 * Preview decorations for a specific holiday
 */
function SeasonalDecorationsPreview({ holiday }) {
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

  const decorationTypes = holiday.decorations || ["sparkle"];
  const allEmojis = decorationTypes.flatMap(getDecorationEmojis);

  const decorations = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    emoji: allEmojis[Math.floor(Math.random() * allEmojis.length)],
    delay: Math.random() * 5,
    duration: 6 + Math.random() * 6,
    left: Math.random() * 100,
    size: `${1 + Math.random() * 1.5}rem`,
  }));

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-40"
      aria-hidden="true"
    >
      {decorations.map((dec) => (
        <div
          key={dec.id}
          className="fixed pointer-events-none animate-float z-50 opacity-70"
          style={{
            left: `${dec.left}%`,
            top: "-50px",
            fontSize: dec.size,
            animationDelay: `${dec.delay}s`,
            animationDuration: `${dec.duration}s`,
          }}
        >
          {dec.emoji}
        </div>
      ))}
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
