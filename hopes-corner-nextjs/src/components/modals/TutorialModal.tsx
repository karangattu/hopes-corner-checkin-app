import React, { useState } from 'react';
import {
    X,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    Search,
    Utensils,
    Link as LinkIcon,
    Ban,
    Lightbulb,
    CheckCircle2,
    FileText,
    Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
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
                        This app helps you quickly and easily check guests in when they arrive
                        at Hope&apos;s Corner.
                    </p>
                    <p className="text-sm text-gray-600">
                        Let&apos;s walk through how to use the check-in system!
                    </p>
                </div>
            ),
        },
        {
            title: "Search for a Guest",
            icon: Search,
            iconColor: "text-blue-500",
            bgColor: "bg-blue-50",
            content: (
                <div className="space-y-3">
                    <p>
                        Start by typing a guest&apos;s name in the search box.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <Search size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                            <span>Type any part of their name - first, last, or preferred name</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                            <span>If you misspell a name, we&apos;ll suggest similar matches!</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                            <span>We&apos;ll find existing guests in the system</span>
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            title: "Quick Add Meals",
            icon: Utensils,
            iconColor: "text-green-500",
            bgColor: "bg-green-50",
            content: (
                <div className="space-y-3">
                    <p>
                        After searching for a guest, quickly log meal services.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <Utensils size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                            <span>Click the <strong>1</strong> or <strong>2</strong> button to log meals</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                            <span>Only one meal entry per guest per day is allowed</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Clock size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                            <span>Guests with recent meals show a green &quot;RECENT&quot; badge</span>
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            title: "Add a New Guest",
            icon: UserPlus,
            iconColor: "text-purple-500",
            bgColor: "bg-purple-50",
            content: (
                <div className="space-y-3">
                    <p>
                        If a guest is not in the system, you can add them quickly.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <UserPlus size={16} className="mt-0.5 flex-shrink-0 text-purple-600" />
                            <span>Click &quot;Add Guest&quot; to create a new entry</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <FileText size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                            <span>Fill in their name and any other details they provide</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                            <span>They&apos;ll be checked in once you save them</span>
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            title: "Link Guests Together",
            icon: LinkIcon,
            iconColor: "text-indigo-500",
            bgColor: "bg-indigo-50",
            content: (
                <div className="space-y-3">
                    <p>
                        Link guests who are related or share information.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <LinkIcon size={16} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                            <span>Click the expand button (▼) on a guest card</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <UserPlus size={16} className="mt-0.5 flex-shrink-0 text-purple-600" />
                            <span>Click <strong>&quot;Link Guest&quot;</strong> to connect related guests</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                            <span>Linked guests show a count badge on their card</span>
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            title: "Ban Guests (Administrators)",
            icon: Ban,
            iconColor: "text-red-500",
            bgColor: "bg-red-50",
            content: (
                <div className="space-y-3">
                    <p>
                        Restrict guest access to specific services or all services.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <Ban size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                            <span>Click the expand button (▼) on a guest card</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <FileText size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                            <span>Click <strong>&quot;Ban&quot;</strong> to set restrictions with an end date and reason</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                            <span>Ban specific services (meals, showers, laundry, bicycle) or all services</span>
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
                        You now have everything you need to manage guests!
                    </p>
                    <div className="bg-emerald-100 rounded-lg p-3 text-sm text-emerald-900">
                        <strong>Quick summary:</strong>
                        <ul className="mt-2 space-y-1">
                            <li>• Search for guests by name</li>
                            <li>• Quick add meals with 1 or 2 buttons</li>
                            <li>• Link related guests together</li>
                            <li>• Ban guests when needed (admin)</li>
                            <li>• View and update guest info</li>
                        </ul>
                    </div>
                    <p className="text-sm text-gray-600 text-center pt-2">
                        If you need help later, click the <strong>&quot;Need help?&quot;</strong> button anytime!
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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative z-10"
                    >
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
                        <div className="px-6 py-5 text-gray-700 min-h-[200px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {currentStepData.content}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Progress dots */}
                        <div className="flex justify-center gap-1.5 pb-4">
                            {tutorialSteps.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`w-2 h-2 rounded-full transition-all ${index === currentStep
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
                                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isFirstStep
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
