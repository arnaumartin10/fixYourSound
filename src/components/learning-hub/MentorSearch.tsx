"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader, BookOpen } from "lucide-react";

interface MentorSearchProps {
  isDisabled?: boolean;
}

export function MentorSearch({ isDisabled = false }: MentorSearchProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isRelatedTerm, setIsRelatedTerm] = useState(false);
  const [relatedTermName, setRelatedTermName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [response]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/learning-hub/mentor-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data.response);
        setIsRelatedTerm(data.isExistingTerm);
        setRelatedTermName(data.matchedTerm);
      } else {
        console.error("API error response:", data);
        setResponse(data.error || "Hmm, I couldn't process that. Try asking about a specific audio effect!");
      }
    } catch (error) {
      console.error("Search error:", error);
      setResponse("Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
      setQuery("");
      inputRef.current?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-[#00f5d4] to-transparent rounded-full" />
          <div>
            <h3 className="font-black text-white/80 text-sm">MENTOR SEARCH</h3>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest mt-1">Ask about any audio production term</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What is saturation? What does sidechain mean?..."
              disabled={isDisabled || isLoading}
              className="w-full bg-white/5 border border-white/10 focus:border-[#00f5d4]/50 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-300 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isDisabled || isLoading || !query.trim()}
            className="px-4 py-3 bg-[#00f5d4] hover:bg-[#00f5d4]/90 text-black font-bold rounded-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isLoading ? "Thinking..." : "Ask"}</span>
          </button>
        </form>

        {/* Response Area */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div
              key="response"
              ref={responseRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              {isLoading ? (
                <div className="flex items-center gap-3 py-4 px-4 bg-white/5 rounded-lg">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#00f5d4] border-t-transparent rounded-full"
                  />
                  <p className="text-white/60 text-sm">Finding the answer...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI Response */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/70 leading-relaxed">{response}</p>
                  </div>

                  {/* Related Term Suggestion */}
                  {isRelatedTerm && relatedTermName && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-start gap-3"
                    >
                      <div className="w-1 h-full bg-gradient-to-b from-[#00f5d4] to-transparent rounded-full" />
                      <div>
                        <p className="text-xs font-semibold text-white/60 mb-1">Related Card</p>
                        <p className="text-sm text-white/70">
                          Check out the <span className="font-semibold text-[#00f5d4]">{relatedTermName}</span> effect below.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placeholder */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <p className="text-xs text-white/30 text-center">
              Ask about any audio production term and the AI mentor will explain it
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
