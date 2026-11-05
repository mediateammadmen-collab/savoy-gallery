import { Suspense } from "react";
import { CreativeGallery } from "@/components/creative-gallery";
import { FilterBar } from "@/components/filter-bar";
import { MetaErrorNotice, MissingEnvNotice } from "@/components/notices";
import { PendingDim } from "@/components/pending-provider";
import {
  CreativesSkeleton,
  FilterBarSkeleton,
  SummarySkeleton,
} from "@/components/skeletons";
import { SummaryPanel } from "@/components/summary-panel";
import { getCreatives, getSummary } from "@/lib/dashboard";
import { filtersToQuery, parseFilters } from "@/lib/filters";
import { getMissingEnv, isMetaApiError } from "@/lib/meta";

// Meta failures become a readable notice, because error.js only gets a generic message
// in production. Anything else still goes to error.js.
async function load(fetchData) {
  try {
    return { data: await fetchData() };
  } catch (error) {
    if (isMetaApiError(error)) return { errorMessage: error.message };
    throw error;
  }
}

async function SummarySection({ searchParams }) {
  const filters = parseFilters(await searchParams);
  const missing = getMissingEnv();
  if (missing.length) return <MissingEnvNotice missing={missing} />;
  const { data, errorMessage } = await load(() => getSummary(filters));
  if (errorMessage) return <MetaErrorNotice message={errorMessage} />;
  return <SummaryPanel data={data} />;
}

async function CreativesSection({ searchParams }) {
  const filters = parseFilters(await searchParams);
  if (getMissingEnv().length) return null;
  const { data, errorMessage } = await load(() => getCreatives(filters));
  if (errorMessage) return <MetaErrorNotice message={errorMessage} />;
  // Remounting on a new date range resets the open tab and "show more".
  return <CreativeGallery key={filtersToQuery(filters)} data={data} />;
}

export default function DashboardPage({ searchParams }) {
  return (
    <div className="flex flex-col gap-10">
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar />
      </Suspense>
      <PendingDim className="flex flex-col gap-14">
        <Suspense fallback={<SummarySkeleton />}>
          <SummarySection searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<CreativesSkeleton />}>
          <CreativesSection searchParams={searchParams} />
        </Suspense>
      </PendingDim>
    </div>
  );
}
