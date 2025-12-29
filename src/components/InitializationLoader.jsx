import { useState, useEffect } from "react";
import { Database, Check, Folder, Cog, Zap, Target } from "lucide-react";

/**
 * InitializationLoader - User-friendly loading screen during app initialization
 * Shows progress stages with friendly messaging instead of technical jargon
 */
export const InitializationLoader = () => {
  const [stage, setStage] = useState(0);

  // Cycle through stages for visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev < 3 ? prev + 1 : 0));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    { label: "Loading your data", Icon: Folder },
    { label: "Preparing the app", Icon: Cog },
    { label: "Getting ready", Icon: Zap },
    { label: "Almost there", Icon: Target },
  ];

  const currentStage = stages[stage];
  const CurrentIcon = currentStage.Icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
      <div className="text-center space-y-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
            
            {/* Inner pulsing icon */}
            <div className="absolute inset-4 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
              <Database className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="space-y-2">
          <div className="flex justify-center">
            <CurrentIcon className="w-12 h-12 text-emerald-600" />
          </div>
          <p className="text-xl font-semibold text-emerald-900">
            {currentStage.label}
          </p>
          <p className="text-sm text-emerald-600">
            This usually takes a few seconds
          </p>
        </div>

        {/* Progress indicator dots */}
        <div className="flex justify-center gap-2">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === stage
                  ? "w-8 bg-emerald-500"
                  : index < stage
                    ? "w-2 bg-emerald-300"
                    : "w-2 bg-emerald-200"
              }`}
            />
          ))}
        </div>

        {/* Completed stages */}
        <div className="space-y-2 max-w-xs mx-auto">
          {stages.map((s, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm transition-opacity ${
                index <= stage ? "opacity-100" : "opacity-40"
              }`}
            >
              {index < stage ? (
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : index === stage ? (
                <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-emerald-200 flex-shrink-0" />
              )}
              <span
                className={`${
                  index <= stage ? "text-emerald-900" : "text-emerald-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
