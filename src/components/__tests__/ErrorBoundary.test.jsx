import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import ErrorBoundary from "../ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow = false, message = "Test error" }) => {
    if (shouldThrow) {
        throw new Error(message);
    }
    return <div>No Error</div>;
};

describe("ErrorBoundary", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        // Suppress console.error during tests
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        localStorage.clear();

        // Clear error count
        localStorage.removeItem("errorBoundaryErrorCount");

        // Mock window.location
        delete window.location;
        window.location = { href: "", reload: vi.fn() };
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe("Normal Operation", () => {
        it("should render children when there is no error", () => {
            render(
                <ErrorBoundary>
                    <div>Child Component</div>
                </ErrorBoundary>
            );

            expect(screen.getByText("Child Component")).toBeInTheDocument();
        });

        it("should not show error UI when no error occurs", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
            expect(screen.getByText("No Error")).toBeInTheDocument();
        });
    });

    describe("Error Handling", () => {
        it("should catch errors and display fallback UI", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Component crashed" />
                </ErrorBoundary>
            );

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();
            expect(screen.queryByText("No Error")).not.toBeInTheDocument();
        });

        it("should display error message", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(
                screen.getByText(/We're sorry, but something unexpected happened/)
            ).toBeInTheDocument();
        });

        it("should log error to console", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Test error" />
                </ErrorBoundary>
            );

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it("should log error to localStorage", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Storage test error" />
                </ErrorBoundary>
            );

            const logs = JSON.parse(localStorage.getItem("errorBoundaryLogs") || "[]");
            expect(logs.length).toBe(1);
            expect(logs[0].message).toContain("Storage test error");
            expect(logs[0].timestamp).toBeDefined();
            expect(logs[0].userAgent).toBeDefined();
        });

        it("should limit error logs to 10 entries", () => {
            // Add 12 errors
            for (let i = 0; i < 12; i++) {
                const { unmount } = render(
                    <ErrorBoundary>
                        <ThrowError shouldThrow={true} message={`Error ${i}`} />
                    </ErrorBoundary>
                );
                unmount();
            }

            const logs = JSON.parse(localStorage.getItem("errorBoundaryLogs") || "[]");
            expect(logs.length).toBe(10);
            // First two errors should be removed
            expect(logs[0].message).toContain("Error 2");
            expect(logs[9].message).toContain("Error 11");
        });
    });

    describe("Error Recovery", () => {
        it("should display Try Again button", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
        });

        it("should display Go Home button", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole("button", { name: /Go Home/i })).toBeInTheDocument();
        });

        it("should reset error state when Try Again is clicked", () => {
            const TestComponent = ({ shouldThrow }) => {
                const [throwError, setThrowError] = React.useState(shouldThrow);
                
                return (
                    <>
                        <ErrorBoundary>
                            {throwError ? (
                                <ThrowError shouldThrow={true} />
                            ) : (
                                <div>No Error</div>
                            )}
                        </ErrorBoundary>
                        <button onClick={() => setThrowError(false)}>Stop Throwing</button>
                    </>
                );
            };

            render(<TestComponent shouldThrow={true} />);

            // Error UI should be shown
            expect(screen.getByText("Something went wrong")).toBeInTheDocument();

            // Stop the child from throwing
            const stopThrowingButton = screen.getByRole("button", { name: /Stop Throwing/i });
            fireEvent.click(stopThrowingButton);

            // Click Try Again to reset the error boundary
            const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
            fireEvent.click(tryAgainButton);

            // Should now show the child content
            expect(screen.getByText("No Error")).toBeInTheDocument();
            expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
        });

        it("should redirect to home when Go Home is clicked", () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            const goHomeButton = screen.getByRole("button", { name: /Go Home/i });
            fireEvent.click(goHomeButton);

            expect(window.location.href).toBe("/");
        });
    });

    describe("Multiple Errors", () => {
        it("should track error count", () => {
            const { unmount } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="First error" />
                </ErrorBoundary>
            );

            // Unmount and remount with error to trigger multiple errors
            unmount();

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Second error" />
                </ErrorBoundary>
            );

            expect(screen.getByText(/This error has occurred 2 times/i)).toBeInTheDocument();
        });

        it("should show Full Reload button after multiple errors", () => {
            const { unmount } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="First error" />
                </ErrorBoundary>
            );

            unmount();

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Second error" />
                </ErrorBoundary>
            );

            expect(screen.getByRole("button", { name: /Full Reload/i })).toBeInTheDocument();
        });

        it("should reload page when Full Reload is clicked", () => {
            const { unmount } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            unmount();

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            const reloadButton = screen.getByRole("button", { name: /Full Reload/i });
            fireEvent.click(reloadButton);

            expect(window.location.reload).toHaveBeenCalled();
        });
    });

    describe("Custom Fallback", () => {
        it("should render custom fallback when provided", () => {
            const customFallback = (error, reset) => (
                <div>
                    <p>Custom Error UI</p>
                    <button onClick={reset}>Custom Reset</button>
                </div>
            );

            render(
                <ErrorBoundary fallback={customFallback}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Custom Reset/i })).toBeInTheDocument();
            expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
        });

        it("should call custom fallback with error and reset function", () => {
            const customFallback = vi.fn((error, reset) => (
                <div>
                    <p>{error.message}</p>
                    <button onClick={reset}>Reset</button>
                </div>
            ));

            render(
                <ErrorBoundary fallback={customFallback}>
                    <ThrowError shouldThrow={true} message="Custom error message" />
                </ErrorBoundary>
            );

            expect(customFallback).toHaveBeenCalled();
            expect(customFallback.mock.calls[0][0].message).toContain("Custom error message");
            expect(typeof customFallback.mock.calls[0][1]).toBe("function");
        });
    });

    describe("Edge Cases", () => {
        it("should handle localStorage errors gracefully", () => {
            const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
                throw new Error("Storage quota exceeded");
            });

            // Should not crash even if localStorage fails
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();

            setItemSpy.mockRestore();
        });

        it("should handle errors during error logging", () => {
            const stringifySpy = vi.spyOn(JSON, "stringify").mockImplementation(() => {
                throw new Error("JSON error");
            });

            // Should still show error UI even if logging fails
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();

            stringifySpy.mockRestore();
        });

        it("should handle missing error message", () => {
            const ErrorWithoutMessage = () => {
                const error = new Error();
                error.message = undefined;
                throw error;
            };

            render(
                <ErrorBoundary>
                    <ErrorWithoutMessage />
                </ErrorBoundary>
            );

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        });
    });

    describe("Production vs Development", () => {
        it("should show error details in development", () => {
            vi.stubEnv('MODE', 'development');

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Dev error" />
                </ErrorBoundary>
            );

            expect(screen.getByText("Error Details (Development Only)")).toBeInTheDocument();

            vi.unstubAllEnvs();
        });

        it("should not show error details in production", () => {
            vi.stubEnv('MODE', 'production');

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="Prod error" />
                </ErrorBoundary>
            );

            expect(screen.queryByText("Error Details (Development Only)")).not.toBeInTheDocument();

            vi.unstubAllEnvs();
        });
    });

    describe("Analytics Integration", () => {
        it("should log error to Google Analytics if available", () => {
            const gtagMock = vi.fn();
            window.gtag = gtagMock;

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} message="GA error" />
                </ErrorBoundary>
            );

            expect(gtagMock).toHaveBeenCalledWith("event", "exception", {
                description: expect.stringContaining("GA error"),
                fatal: true,
            });

            delete window.gtag;
        });

        it("should not crash if gtag is not available", () => {
            delete window.gtag;

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        });
    });
});
