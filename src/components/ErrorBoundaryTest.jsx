import React, { useState } from 'react';

/**
 * Test component for Error Boundary
 * Can be used to test error recovery functionality
 */
const ErrorBoundaryTest = () => {
    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
        // Intentionally throw an error to test Error Boundary
        throw new Error("Test error: This is an intentional crash to test the Error Boundary!");
    }

    return (
        <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg">
            <h2 className="text-xl font-bold text-red-900 mb-4">
                🧪 Error Boundary Test
            </h2>
            <p className="text-red-700 mb-4">
                Click the button below to trigger an intentional error and test the Error Boundary functionality:
            </p>

            <button
                onClick={() => setShouldCrash(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Trigger Error
            </button>

            <div className="mt-4 p-4 bg-white rounded border border-red-200">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Expected Behavior:</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Error Boundary should catch the error</li>
                    <li>Display fallback UI with error message</li>
                    <li>Show "Try Again", "Go Home", and recovery options</li>
                    <li>Log error to localStorage for debugging</li>
                    <li>Not crash the entire application</li>
                </ul>
            </div>
        </div>
    );
};

export default ErrorBoundaryTest;
