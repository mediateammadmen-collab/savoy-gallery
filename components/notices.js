import { KeyRound, TriangleAlert } from "lucide-react";

export function MissingEnvNotice({ missing }) {
  return (
    <div className="border border-rule bg-wall p-8 shadow-frame">
      <KeyRound className="size-5 text-warn" aria-hidden />
      <h1 className="mt-4 font-display text-3xl">Meta credentials are missing</h1>
      <p className="mt-2 text-sm text-ink-2">
        No data can be shown until {missing.length === 1 ? "this variable is" : "these variables are"}{" "}
        set in <code>.env.local</code>, or in the site&rsquo;s environment variables when deployed:
      </p>
      <ul className="mt-4 space-y-1 text-sm font-medium">
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MetaErrorNotice({ message }) {
  return (
    <div className="border border-rule bg-wall p-8 shadow-frame">
      <TriangleAlert className="size-5 text-warn" aria-hidden />
      <h2 className="mt-4 font-display text-3xl">Meta returned an error</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{message}</p>
      <p className="mt-3 text-xs text-ink-3">
        No figures are shown, because a partial view could be misleading.
      </p>
    </div>
  );
}
