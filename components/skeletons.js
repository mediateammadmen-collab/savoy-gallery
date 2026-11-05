function Block({ className = "" }) {
  return <div className={`animate-pulse bg-muted-soft ${className}`} />;
}

export function FilterBarSkeleton() {
  return <Block className="h-10 w-full max-w-3xl" />;
}

export function SummarySkeleton() {
  return (
    <div aria-hidden>
      <Block className="h-3 w-40" />
      <Block className="mt-3 h-14 w-80 max-w-full" />
      <div className="mt-7 grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-wall p-6 sm:p-7">
            <Block className="h-3 w-20" />
            <Block className="mt-4 h-11 w-3/4" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Block key={index} className="h-6" />
        ))}
      </div>
    </div>
  );
}

export function CreativesSkeleton() {
  return (
    <div aria-hidden>
      <Block className="h-9 w-56" />
      <Block className="mt-7 h-8 w-full max-w-xl" />
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="border border-rule bg-wall p-2.5">
            <Block className="aspect-[4/5] w-full" />
            <Block className="mt-4 h-4 w-3/4" />
            <Block className="mt-3 h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
