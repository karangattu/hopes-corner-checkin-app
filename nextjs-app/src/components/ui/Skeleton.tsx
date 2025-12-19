'use client';

import React, { ReactNode } from 'react';

interface SkeletonCardProps {
  className?: string;
}

/**
 * Individual skeleton card placeholder
 */
const SkeletonCard = ({ className = '' }: SkeletonCardProps) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-20 w-full mb-3 ${className}`}
    aria-hidden="true"
  />
);

interface ListSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton loading placeholder component for large lists.
 * Renders a configurable number of placeholders while data loads.
 */
export function ListSkeleton({ count = 5, className = '' }: ListSkeletonProps) {
  return (
    <div className={`p-4 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  height?: number;
}

/**
 * Single card skeleton placeholder
 */
export function CardSkeleton({ className = '', height = 180 }: CardSkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg p-4 ${className}`}
      style={{ height }}
      aria-hidden="true"
    />
  );
}

interface TextSkeletonProps {
  width?: string;
  className?: string;
}

/**
 * Text line skeleton placeholder
 */
export function TextSkeleton({ width = '100%', className = '' }: TextSkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Avatar/profile picture skeleton placeholder
 */
export function AvatarSkeleton({ size = 'md', className = '' }: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Table skeleton placeholder
 */
export function TableSkeleton({ rows = 5, columns = 4, className = '' }: TableSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading table">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="animate-pulse bg-gray-300 dark:bg-gray-600 rounded h-8"
            aria-hidden="true"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6"
              aria-hidden="true"
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

/**
 * Form skeleton placeholder
 */
export function FormSkeleton({ fields = 4, className = '' }: FormSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`} role="status" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {/* Label */}
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-24" aria-hidden="true" />
          {/* Input */}
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-10 w-full" aria-hidden="true" />
        </div>
      ))}
      {/* Submit button */}
      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 rounded h-10 w-32 mt-6" aria-hidden="true" />
      <span className="sr-only">Loading form...</span>
    </div>
  );
}

interface ChartSkeletonProps {
  className?: string;
  height?: number;
}

/**
 * Chart skeleton placeholder
 */
export function ChartSkeleton({ className = '', height = 300 }: ChartSkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}

/**
 * Wrapper component for skeleton loading states
 */
interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

export function SkeletonWrapper({ isLoading, skeleton, children }: SkeletonWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}

export default ListSkeleton;
