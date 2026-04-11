"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  onAuthRequired?: () => void;
}

export function MessageInput({
  onSendMessage,
  isLoading,
  isAuthenticated,
  onAuthRequired,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (!content.trim() || isSending || isLoading) return;

    try {
      setIsSending(true);
      await onSendMessage(content);
      setContent("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/10 bg-[#0a0a0a] p-4"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isAuthenticated
              ? "Share your thoughts... (text + emojis + press Enter)"
              : "Sign in to chat"
          }
          disabled={!isAuthenticated || isSending || isLoading}
          maxLength={500}
          autoComplete="off"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 transition-all hover:border-white/20 focus:border-[#00f5d4]/50 focus:outline-none focus:ring-1 focus:ring-[#00f5d4]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={
            !isAuthenticated ||
            !content.trim() ||
            isSending ||
            isLoading
          }
          className="flex items-center gap-2 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/20 px-4 py-2.5 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d4]/20 hover:border-[#00f5d4]/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
      {content.length > 0 && (
        <p className="text-xs text-white/30 mt-1">
          {content.length}/500 characters
        </p>
      )}
    </form>
  );
}
