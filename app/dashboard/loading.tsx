export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-input" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-input" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-input" />
        ))}
      </div>
    </div>
  );
}
