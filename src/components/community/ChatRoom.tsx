"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChannelSidebar } from "./ChannelSidebar";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

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

interface Community {
  id: string;
  name: string;
  icon?: string | null;
  language: string;
  description?: string | null;
  messageCount?: number;
}

export function ChatRoom() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "es">("en");
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setIsLoadingCommunities(true);
        // Initialize communities first
        await fetch("/api/community/init", { method: "POST" });

        const response = await fetch("/api/community");
        if (response.ok) {
          const data = await response.json();
          setCommunities(data.communities);
          // Auto-select first English community
          const firstEnCommunity = data.communities.find(
            (c: Community) => c.language === "en"
          );
          if (firstEnCommunity) {
            setSelectedCommunityId(firstEnCommunity.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch communities:", error);
      } finally {
        setIsLoadingCommunities(false);
      }
    };

    fetchCommunities();
  }, []);

  // Fetch messages when community changes
  useEffect(() => {
    if (!selectedCommunityId) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const response = await fetch(
          `/api/community/messages?communityId=${selectedCommunityId}&limit=100`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
          setLastFetchTime(Date.now());
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    fetchMessages();

    // Set up polling for new messages
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/community/messages?communityId=${selectedCommunityId}&limit=100`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to refresh messages:", error);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedCommunityId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Handle send message with optimistic update
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedCommunityId || !session?.user?.id) return;

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        user: {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image,
          email: session.user.email,
        },
        isSystemMessage: false,
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        setIsSending(true);
        const response = await fetch("/api/community/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            communityId: selectedCommunityId,
          }),
        });

        if (response.ok) {
          const newMessage = await response.json();
          // Replace optimistic message with real one
          setMessages((prev) =>
            prev.map((msg) => (msg.id === tempId ? newMessage : msg))
          );
        } else {
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          console.error("Failed to send message:", response.statusText);
        }
      } catch (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [selectedCommunityId, session?.user]
  );

  // Handle delete message
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        // Optimistically remove the message
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        const response = await fetch(
          `/api/community/messages?id=${messageId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          // If deletion failed, revert the optimistic removal
          console.error("Failed to delete message:", response.statusText);
          // Refetch messages to restore state
          const messagesResponse = await fetch(
            `/api/community/messages?communityId=${selectedCommunityId}&limit=100`
          );
          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error("Failed to delete message:", error);
        // Refetch messages on error
        const messagesResponse = await fetch(
          `/api/community/messages?communityId=${selectedCommunityId}&limit=100`
        );
        if (messagesResponse.ok) {
          const data = await messagesResponse.json();
          setMessages(data.messages);
        }
      }
    },
    [selectedCommunityId]
  );

  // Get selected community info
  const selectedCommunity = communities.find(
    (c) => c.id === selectedCommunityId
  );

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Sidebar */}
      <ChannelSidebar
        communities={communities}
        selectedCommunityId={selectedCommunityId}
        onSelectCommunity={setSelectedCommunityId}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        isLoading={isLoadingCommunities}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md p-4 sm:p-6">
          <div className="flex items-center gap-3">
            {selectedCommunity && (
              <>
                <span className="text-2xl">{selectedCommunity.icon || "💬"}</span>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">
                    #{selectedCommunity.name}
                  </h1>
                  {selectedCommunity.description && (
                    <p className="text-xs sm:text-sm text-white/60">
                      {selectedCommunity.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages or Login Prompt */}
        {status === "unauthenticated" ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-white/60 mb-4">
                Sign in to join the conversation
              </p>
              <button
                onClick={() => router.push("/auth/signin")}
                className="px-6 py-2 bg-[#00f5d4]/10 border border-[#00f5d4]/30 rounded-lg text-[#00f5d4] font-semibold hover:bg-[#00f5d4]/20 transition-all active:scale-95"
              >
                Sign In
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Messages Container */}
            <MessageList
              messages={messages}
              currentUserId={session?.user?.id}
              isLoading={isLoadingMessages}
              onDeleteMessage={handleDeleteMessage}
            />

            {/* Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isSending}
              isAuthenticated={status === "authenticated"}
              onAuthRequired={() => router.push("/auth/signin")}
            />
          </>
        )}
      </div>
    </div>
  );
}
