export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 animate-pulse shadow-sm border border-slate-100">
      <div className="w-32 h-32 bg-slate-200 rounded-full" />
      <div className="h-4 w-20 bg-slate-200 rounded-full" />
      <div className="h-3 w-12 bg-slate-100 rounded-full" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
