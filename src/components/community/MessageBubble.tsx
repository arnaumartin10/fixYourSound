"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  user: User | null;
  timestamp: Date | string;
  isOwn: boolean;
  isSystemMessage?: boolean;
  onDelete?: (messageId: string) => Promise<void>;
}

export function MessageBubble({
  id,
  content,
  user,
  timestamp,
  isOwn,
  isSystemMessage,
  onDelete,
}: MessageBubbleProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete message:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  // System message styling
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-lg px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-xs font-medium text-white/70 leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    );
  }

  // Regular message styling
  if (!user) return null;

  const displayName = user.name || user.email?.split("@")[0] || "Anonymous";
  const avatarUrl =
    user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

  const timestampDate =
    typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const timeAgo = formatDistanceToNow(timestampDate, { addSuffix: true });

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""} mb-4 group`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/10">
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-xs`}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold text-white/80"
          >
            {displayName}
          </span>
          <span className="text-xs text-white/40">{timeAgo}</span>
        </div>

        <div className="flex gap-2 items-start">
          <div
            className={`px-4 py-2 rounded-lg break-words text-sm ${
              isOwn
                ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-white"
                : "bg-white/5 border border-white/10 text-white/90"
            }`}
          >
            {content}
          </div>
          {isOwn && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 disabled:opacity-50 mt-1"
              title="Delete message"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
