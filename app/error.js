"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

export default function ErrorBoundary({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto mt-16 max-w-lg border border-rule bg-wall p-8 shadow-frame">
      <TriangleAlert className="size-5 text-warn" aria-hidden />
      <h1 className="mt-4 font-display text-3xl">The dashboard couldn&rsquo;t load</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Something went wrong while building this page. No figures are shown, because a partial
        view could be misleading.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-ink-3">
          Reference for the server logs: <code>{error.digest}</code>
        </p>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
      >
        <RotateCw className="size-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
