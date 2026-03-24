"use client";

import { WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { SemanticProcessor } from "@/lib/SemanticProcessor";

interface VibeCommandBarProps {
  onApply: (command: string) => Promise<void>;
  disabled?: boolean;
}

export function VibeCommandBar({ onApply, disabled = false }: VibeCommandBarProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => SemanticProcessor.suggest(query), [query]);

  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-4">
      <label htmlFor="vibe-input" className="mb-2 block text-xs uppercase tracking-wide text-slate-300">
        Vibe Input
      </label>
      <div className="flex gap-2">
        <input
          id="vibe-input"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim()) {
              void onApply(query);
            }
          }}
          placeholder='Try "warm and airy" or "remove boxy"'
          className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        />
        <button
          type="button"
          onClick={() => query.trim() && void onApply(query)}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <WandSparkles className="h-4 w-4" />
          Apply
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion);
              void onApply(suggestion);
            }}
            disabled={disabled}
            className="rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
