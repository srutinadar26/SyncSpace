export function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="mt-2 h-3 w-1/2" />
      <SkeletonLine className="mt-4 h-2 w-full" />
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonLine className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine className="h-3 w-1/3" />
            <SkeletonLine className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonBoard() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {[0, 1, 2].map((col) => (
        <div key={col} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
          <SkeletonLine className="h-3 w-20" />
          <div className="mt-3 space-y-2">
            <SkeletonLine className="h-16 w-full rounded-lg" />
            <SkeletonLine className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
