"use client";

import { useState } from "react";
import { MessageCircle, Music, Zap, Lightbulb, Globe } from "lucide-react";
import { motion } from "framer-motion";

interface Community {
  id: string;
  name: string;
  icon?: string | null;
  language: string;
  messageCount?: number;
}

interface ChannelSidebarProps {
  communities: Community[];
  selectedCommunityId: string | null;
  onSelectCommunity: (communityId: string) => void;
  currentLanguage: "en" | "es";
  onLanguageChange: (language: "en" | "es") => void;
  isLoading: boolean;
}

const iconMap: Record<string, React.ComponentType<{ size: number }>> = {
  "💬": MessageCircle,
  "🎸": Music,
  "🔌": Zap,
  "💡": Lightbulb,
};

export function ChannelSidebar({
  communities,
  selectedCommunityId,
  onSelectCommunity,
  currentLanguage,
  onLanguageChange,
  isLoading,
}: ChannelSidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState(true);

  // Filter communities by current language
  const filteredCommunities = communities.filter(
    (c) => c.language === currentLanguage
  );

  return (
    <div className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold text-white/80 mb-3 tracking-wider">
          CHANNELS
        </h2>

        {/* Language Switcher */}
        <div className="flex gap-2 mb-4">
          {(["en", "es"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentLanguage === lang
                  ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4]"
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20"
              }`}
            >
              {lang === "en" ? "EN" : "ES"}
            </button>
          ))}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setExpandedMenu(!expandedMenu)}
          className="w-full text-left px-2 py-1 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {expandedMenu ? "Collapse" : "Expand ▶"}
        </button>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-white/40">Loading channels...</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="p-3 text-center">
            <p className="text-xs text-white/40">
              No channels for {currentLanguage === "en" ? "English" : "Spanish"}
            </p>
          </div>
        ) : (
          filteredCommunities.map((community) => {
            const isSelected = selectedCommunityId === community.id;
            return (
              <motion.button
                key={community.id}
                onClick={() => onSelectCommunity(community.id)}
                whileHover={{ x: 4 }}
                className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] font-semibold"
                    : "text-white/70 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                <span className="text-base">{community.icon || "💬"}</span>
                {expandedMenu && (
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      #{community.name}
                    </div>
                    {community.messageCount !== undefined && (
                      <div className="text-xs text-white/40">
                        {community.messageCount} {community.messageCount === 1 ? "message" : "messages"}
                      </div>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 text-xs text-white/40 space-y-1">
        <div className="flex items-center gap-1">
          <Globe size={14} />
          <span>{currentLanguage === "en" ? "English" : "Español"}</span>
        </div>
        <p className="text-white/30 text-[10px]">
          {filteredCommunities.length} channels
        </p>
      </div>
    </div>
  );
}
