import {
  CreativesSkeleton,
  FilterBarSkeleton,
  SummarySkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <FilterBarSkeleton />
      <div className="flex flex-col gap-14">
        <SummarySkeleton />
        <CreativesSkeleton />
      </div>
    </div>
  );
}
