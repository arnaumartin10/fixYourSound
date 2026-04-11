"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

interface User {
  id: string;
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: User | null;
  isSystemMessage?: boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
  isLoading: boolean;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading,
  onDeleteMessage,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-[#0a0a0a] to-[#0a0a0a]/50"
    >
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <p className="text-2xl mb-2">🎵</p>
            <p className="text-white/60 font-medium">
              Silence is golden, but a beat is better. Start the conversation!
            </p>
          </div>
        </div>
      )}

      {isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">
            <p className="text-white/40">Loading messages...</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          id={message.id}
          content={message.content}
          user={message.user}
          timestamp={message.createdAt}
          isOwn={message.user?.id === currentUserId && !message.isSystemMessage}
          isSystemMessage={message.isSystemMessage}
          onDelete={onDeleteMessage}
        />
      ))}

      {/* Auto-scroll anchor */}
      <div ref={endRef} />
    </div>
  );
}
