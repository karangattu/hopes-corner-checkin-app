'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Increment error count from localStorage (shared across instances)
    let newCount = 1;
    try {
      const currentCount = parseInt(localStorage.getItem('errorBoundaryErrorCount') || '0', 10);
      newCount = currentCount + 1;
      localStorage.setItem('errorBoundaryErrorCount', newCount.toString());
    } catch (storageError) {
      console.error('Failed to update error count in localStorage:', storageError);
    }

    this.setState({
      error,
      errorInfo,
      errorCount: newCount,
    });

    // Log to external service if configured (Google Analytics)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as { gtag?: (event: string, action: string, params: Record<string, unknown>) => void }).gtag?.(
        'event',
        'exception',
        {
          description: error.toString(),
          fatal: true,
        }
      );
    }

    // Store error in localStorage for debugging
    try {
      const errorLog = {
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      const existingLogs = JSON.parse(
        localStorage.getItem('errorBoundaryLogs') || '[]'
      );
      existingLogs.push(errorLog);

      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.shift();
      }

      localStorage.setItem('errorBoundaryLogs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.error('Failed to log error to localStorage:', storageError);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Allow custom fallback UI
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="bg-red-100 rounded-full p-4">
                  <AlertCircle size={48} className="text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
                Something went wrong
              </h1>

              <p className="text-gray-600 text-center mb-6">
                We&apos;re sorry, but something unexpected happened. Your data is safe,
                and the error has been logged.
              </p>

              {/* Error Count Warning */}
              {errorCount > 1 && (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold">
                    ⚠️ This error has occurred {errorCount} times. A full page reload might be needed.
                  </p>
                </div>
              )}

              {/* Error Details (in development) */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mb-6 p-4 bg-gray-100 rounded-lg text-sm">
                  <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-gray-900">Error:</strong>
                      <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-auto">
                        {error.toString()}
                      </pre>
                    </div>
                    {errorInfo && (
                      <div>
                        <strong className="text-gray-900">Component Stack:</strong>
                        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
                >
                  <RefreshCw size={20} />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
                >
                  <Home size={20} />
                  Go Home
                </button>

                {errorCount > 1 && (
                  <button
                    onClick={this.handleReload}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-md"
                  >
                    <RefreshCw size={20} />
                    Full Reload
                  </button>
                )}
              </div>

              {/* Support Information */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                If this problem persists, please contact support with the error
                details above.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
