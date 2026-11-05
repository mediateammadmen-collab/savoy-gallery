"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarRange, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Popover, ToggleGroup } from "radix-ui";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { refreshDashboard } from "@/app/actions";
import { DATE_PRESETS } from "@/lib/config";
import { filtersToQuery, parseFilters } from "@/lib/filters";
import { usePending } from "./pending-provider";

const CHIP =
  "whitespace-nowrap px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink " +
  "data-[state=on]:bg-ink data-[state=on]:text-paper";

function CustomRangePicker({ filters, onApply }) {
  const [open, setOpen] = useState(false);
  const isCustom = filters.range === "custom";
  const label = isCustom
    ? `${format(parseISO(filters.start), "d MMM yyyy")} – ${format(parseISO(filters.end), "d MMM yyyy")}`
    : "Custom";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        data-state={isCustom ? "on" : "off"}
        className={`${CHIP} inline-flex items-center gap-1.5`}
      >
        <CalendarRange className="size-3.5" aria-hidden />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="popover-content z-40 border border-rule bg-wall p-4 shadow-frame"
        >
          <RangeForm
            filters={filters}
            onApply={(range) => {
              setOpen(false);
              onApply(range);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Mounted only while the popover is open, so "today" is read in the browser.
function RangeForm({ filters, onApply }) {
  const [today] = useState(() => new Date());
  const [selected, setSelected] = useState(
    filters.range === "custom"
      ? { from: parseISO(filters.start), to: parseISO(filters.end) }
      : undefined,
  );
  const complete = selected?.from && selected?.to;

  return (
    <div>
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={setSelected}
        disabled={{ after: today }}
        defaultMonth={selected?.from ?? today}
        endMonth={today}
      />
      <button
        type="button"
        disabled={!complete}
        onClick={() =>
          onApply({
            start: format(selected.from, "yyyy-MM-dd"),
            end: format(selected.to, "yyyy-MM-dd"),
          })
        }
        className="mt-3 w-full bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-40"
      >
        Apply range
      </button>
    </div>
  );
}

export function FilterBar() {
  const searchParams = useSearchParams();
  const { isPending, navigate, run } = usePending();
  const filters = parseFilters(Object.fromEntries(searchParams));

  const go = (next) => navigate(`/?${filtersToQuery(next)}`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border border-rule bg-wall p-1">
        <ToggleGroup.Root
          type="single"
          aria-label="Date range"
          value={filters.range === "custom" ? "" : filters.range}
          onValueChange={(range) => range && go({ range })}
          className="flex flex-wrap gap-1"
        >
          {DATE_PRESETS.map((preset) => (
            <ToggleGroup.Item key={preset.id} value={preset.id} className={CHIP}>
              {preset.label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <CustomRangePicker
          filters={filters}
          onApply={({ start, end }) => go({ range: "custom", start, end })}
        />
      </div>
      <button
        type="button"
        onClick={() => run(() => refreshDashboard())}
        disabled={isPending}
        className="inline-flex items-center gap-2 border border-rule bg-wall px-3 py-2 text-[13px] text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        Refresh
      </button>
    </div>
  );
}
