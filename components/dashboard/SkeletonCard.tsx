export function SkeletonKpiCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl p-5 skeleton h-36" />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = "h-52" }: { height?: string }) {
  return (
    <div className={`rounded-2xl skeleton ${height} w-full`} />
  );
}

export function SkeletonRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 rounded-2xl skeleton h-52" />
      <div className="rounded-2xl skeleton h-52" />
    </div>
  );
}
