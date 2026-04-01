export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="animate-pulse space-y-6">
        {/* Page title skeleton */}
        <div className="h-8 w-48 bg-bg-elevated rounded-xl" />

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
              <div className="aspect-video bg-bg-elevated" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-bg-elevated rounded-lg w-3/4" />
                <div className="h-3 bg-bg-elevated rounded-lg w-1/2" />
                <div className="h-6 bg-bg-elevated rounded-lg w-1/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
