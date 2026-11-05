"use client";

import { createContext, use, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

const PendingContext = createContext(null);

// A single transition backs every filter change and refresh, so the app has one
// loading indicator instead of one per control.
export function PendingProvider({ children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (url) => startTransition(() => router.replace(url, { scroll: false })),
    [router],
  );
  const run = useCallback((task) => startTransition(task), []);

  const value = useMemo(() => ({ isPending, navigate, run }), [isPending, navigate, run]);
  return <PendingContext value={value}>{children}</PendingContext>;
}

export function usePending() {
  return use(PendingContext);
}

// Holds the previous render at reduced opacity while new data loads, with no layout jump.
export function PendingDim({ className = "", children }) {
  const { isPending } = usePending();
  return (
    <div
      aria-busy={isPending}
      className={`transition-opacity duration-200 ${isPending ? "opacity-50" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
