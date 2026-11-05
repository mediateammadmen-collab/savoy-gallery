"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/config";
import { usePending } from "./pending-provider";

// public/logo.png is supplied separately. Until it exists, show a monogram.
function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-full bg-accent pt-0.5 font-display text-xl text-accent-ink"
      >
        S
      </span>
    );
  }
  return (
    <Image
      src="/logo.png"
      alt=""
      width={36}
      height={36}
      unoptimized
      className="size-9 rounded-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function SiteHeader() {
  const { isPending } = usePending();
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="truncate font-display text-2xl leading-none">{BRAND.name}</span>
        </Link>
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 text-xs font-medium text-ink-2"
        >
          <span
            aria-hidden
            className={`size-2 rounded-full ${isPending ? "bg-accent" : "live-dot bg-good"}`}
          />
          {isPending ? "Updating…" : "Live data"}
        </div>
      </div>
      <div aria-hidden className="relative h-px overflow-hidden">
        {isPending && <div className="progress-line absolute inset-y-0 w-1/4 bg-accent" />}
      </div>
    </header>
  );
}
