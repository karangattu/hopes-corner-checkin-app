import React from 'react';

/**
 * Skeleton loading placeholder component for large lists.
 * Renders a configurable number of placeholders while data loads.
 */
const SkeletonCard = ({ className = '' }) => (
  <div
    className={`skeleton h-20 w-full mb-3 ${className}`}
    aria-hidden="true"
  />
);

export const ListSkeleton = ({ count = 5, className = '' }) => (
  <div className={`p-4 ${className}`} role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export const CardSkeleton = ({ className = '' }) => (
  <div
    className={`skeleton rounded-lg p-4 ${className}`}
    style={{ height: 180 }}
    aria-hidden="true"
  />
);

export default ListSkeleton;
