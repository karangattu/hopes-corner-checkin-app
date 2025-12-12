import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Search,
  ClipboardList,
  ShowerHead,
  WashingMachine,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Lightbulb,
  FileText,
  Clock,
} from "lucide-react";

const TutorialModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to Hope's Corner!",
      icon: Lightbulb,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
      content: (
        <div className="space-y-3">
          <p>
            This app helps volunteers manage guest check-ins, services like showers 
            and laundry, and track overall attendance at Hope's Corner.
          </p>
          <p className="text-sm text-gray-600">
            Let's walk through the main features so you can get started quickly!
          </p>
        </div>
      ),
    },
    {
      title: "Guest Check-In",
      icon: UserPlus,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
      content: (
        <div className="space-y-3">
          <p>
            The <strong>Check In</strong> tab is where you'll register guests when they arrive.
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <Search size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>Search for existing guests by name - if they're new, you can add them</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>Click on a guest's name to check them in for today's service</span>
            </li>
            <li className="flex items-start gap-2">
              <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <span>If you misspell a name, we'll suggest similar matches!</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Managing Services",
      icon: ClipboardList,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      content: (
        <div className="space-y-3">
          <p>
            The <strong>Services</strong> tab manages showers, laundry, and other guest services.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <ShowerHead size={18} className="text-blue-500 mb-1" />
              <span className="font-medium text-blue-800">Showers</span>
              <p className="text-xs text-blue-600 mt-1">Book time slots for guests. Track who's waiting.</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <WashingMachine size={18} className="text-purple-500 mb-1" />
              <span className="font-medium text-purple-800">Laundry</span>
              <p className="text-xs text-purple-600 mt-1">On-site or off-site. Track with bag numbers.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Shower Queue Tips",
      icon: ShowerHead,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      content: (
        <div className="space-y-3">
          <p>
            Managing the shower queue is easy:
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <Clock size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <span>Guests can be waitlisted if all slots are full - they'll see their position in line</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
              <span>Mark showers as "Done" when finished so the next person can go</span>
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw size={16} className="mt-0.5 flex-shrink-0 text-purple-500" />
              <span>Waitlisted guests are automatically promoted when slots open</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Laundry Tracking",
      icon: WashingMachine,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      content: (
        <div className="space-y-3">
          <p>
            Keep track of laundry with these features:
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span><strong>On-site:</strong> Washer → Dryer → Done → Picked Up</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span><strong>Off-site:</strong> Waiting → Transported → Returned → Picked Up</span>
            </li>
            <li className="flex items-start gap-2">
              <FileText size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <span>Assign bag numbers to help match laundry to guests</span>
            </li>
          </ul>
          <p className="text-xs text-purple-600 bg-purple-100 rounded-lg p-2">
            💡 Shower and laundry share a common waiver - if signed for one, it covers both!
          </p>
        </div>
      ),
    },
    {
      title: "Admin",
      icon: BarChart3,
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-50",
      content: (
        <div className="space-y-3">
          <p>
            The <strong>Admin</strong> tab (if you have access) provides:
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <BarChart3 size={16} className="mt-0.5 flex-shrink-0 text-indigo-500" />
              <span>Daily and monthly attendance reports</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
              <span>Service utilization statistics</span>
            </li>
            <li className="flex items-start gap-2">
              <FileText size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <span>Export data for reporting purposes</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Keyboard Shortcuts",
      icon: Lightbulb,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
      content: (
        <div className="space-y-3">
          <p>
            Speed up your workflow with keyboard shortcuts:
          </p>
          <div className="bg-gray-100 rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Open keyboard shortcuts help</span>
              <kbd className="px-2 py-1 bg-white border rounded text-xs font-mono">?</kbd>
            </div>
            <div className="flex justify-between">
              <span>Close any modal</span>
              <kbd className="px-2 py-1 bg-white border rounded text-xs font-mono">Esc</kbd>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs font-mono">?</kbd> anytime to see all available shortcuts.
          </p>
        </div>
      ),
    },
    {
      title: "You're Ready!",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
      content: (
        <div className="space-y-3">
          <p>
            That's the basics! Here's a quick recap:
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-100 rounded-lg p-2">
              <UserPlus size={20} className="mx-auto text-emerald-600 mb-1" />
              <span className="text-emerald-800">Check In</span>
            </div>
            <div className="bg-purple-100 rounded-lg p-2">
              <ClipboardList size={20} className="mx-auto text-purple-600 mb-1" />
              <span className="text-purple-800">Services</span>
            </div>
            <div className="bg-indigo-100 rounded-lg p-2">
              <BarChart3 size={20} className="mx-auto text-indigo-600 mb-1" />
              <span className="text-indigo-800">Reports</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center pt-2">
            If you need help later, click the <strong>"Need help?"</strong> button anytime!
          </p>
        </div>
      ),
    },
  ];

  const currentStepData = tutorialSteps[currentStep];
  const StepIcon = currentStepData.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const goNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const goPrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${currentStepData.bgColor} px-6 py-4 relative`}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Close tutorial"
          >
            <X size={20} className="text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-white shadow-sm`}>
              <StepIcon size={24} className={currentStepData.iconColor} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentStepData.title}
              </h2>
              <p className="text-xs text-gray-500">
                Step {currentStep + 1} of {tutorialSteps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 text-gray-700">
          {currentStepData.content}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? "bg-emerald-500 w-6"
                  : index < currentStep
                  ? "bg-emerald-300"
                  : "bg-gray-200"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={isFirstStep}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFirstStep
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <button
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip tutorial
          </button>

          <button
            onClick={goNext}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
