"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";
import { ChevronDown, Music, BookOpen, LogOut } from "lucide-react";
import { useState } from "react";

const mainNavLinks: { name: string; href: string; wip?: boolean }[] = [
  { name: "Home", href: "/" },
  { name: "Song Analyzer", href: "/song-analyzer" },
];

const studioTools: { name: string; href: string; wip?: boolean; icon?: any; description?: string }[] = [
  { name: "AI Synth", href: "/ai-synth" },
  { name: "Chord Architect", href: "/chord-architect" },
  { name: "Prompting Effects", href: "/prompting-effects" },
  { name: "Voice to Notes", href: "/voice-to-notes" },
  { name: "Melody Generator", href: "/melody-generator" },
  { name: "Beat Generator", href: "/beat-generator" },
];

const commonLinks: { name: string; href: string; wip?: boolean }[] = [
  { name: "Community", href: "/community" },
];

export const Header = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isStudioToolActive = studioTools.some(tool => pathname === tool.href);
  const isLearningHubActive = pathname === "/learning-hub";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/pictures/logo.png"
            alt="FixYourSound Logo"
            width={80}
            height={80}
            priority
            className="h-20 w-20 object-contain group-hover:scale-110 transition-transform duration-300"
          />
          <span className="text-lg font-black text-[#00f5d4] tracking-tight hidden sm:inline hover:text-[#00d4aa] transition-colors duration-300">
            FIXYOURSOUND
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          {mainNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <div key={link.name} className="relative group/item">
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition-all duration-300 ${isActive ? "text-[#00f5d4]" : "text-white/60 hover:text-white"
                    }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.8)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </div>
            );
          })}

          {/* Studio Tools Dropdown */}
          <div className="relative group/dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
              className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 ${isStudioToolActive ? "text-[#00f5d4]" : "text-white/60 hover:text-white"
                }`}
            >
              <Music size={16} />
              Studio
              <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
              {isStudioToolActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                  className="absolute top-full left-0 mt-2 w-56 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {studioTools.map((tool, index) => {
                    const isActive = pathname === tool.href;
                    return (
                      <motion.div key={tool.href} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}>
                        <Link
                          href={tool.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-l-2 ${isActive
                              ? "bg-[#00f5d4]/10 border-[#00f5d4] text-[#00f5d4]"
                              : "border-transparent text-white/70 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          {tool.name}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Learning Hub Link */}
          <div className="relative group/item">
            <Link
              href="/learning-hub"
              className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 ${isLearningHubActive ? "text-[#00f5d4]" : "text-white/60 hover:text-white"
                }`}
            >
              <BookOpen size={16} />
              Learning Hub
              {isLearningHubActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          </div>

          {/* Other Links */}
          {commonLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <div key={link.name} className="relative group/item">
                {link.wip ? (
                  <span className="text-sm font-medium text-white/30 cursor-not-allowed flex items-center gap-2">
                    {link.name}
                    <span className="text-[10px] bg-[#9d4edd]/20 border border-[#9d4edd]/30 px-1.5 py-0.5 rounded text-[#9d4edd] font-bold">
                      WIP
                    </span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#9d4edd] text-white text-[10px] rounded opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold shadow-[0_0_10px_rgba(157,78,237,0.5)]">
                      COMING SOON
                    </div>
                  </span>
                ) : (
                  <Link
                    href={link.href}
                    className={`text-sm font-medium transition-all duration-300 ${isActive ? "text-[#00f5d4]" : "text-white/60 hover:text-white"
                      }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.8)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center ml-8 gap-4">
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#00f5d4] animate-spin" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-3 group">
                <span className="text-xs font-bold text-white/50 group-hover:text-white transition-colors">{session.user.name?.split(' ')[0] || "Profile"}</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9d4edd] flex items-center justify-center text-black font-black text-sm overflow-hidden shadow-[0_0_15px_rgba(0,245,212,0.2)] group-hover:scale-105 transition-all">
                  {session.user.image ? <img src={session.user.image} alt="User" className="w-full h-full object-cover" /> : session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                </div>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white transition-all"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-5 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm font-bold transition-all"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-full bg-[#00f5d4] text-black text-sm font-bold transition-all hover:bg-[#00d4aa] hover:shadow-[0_0_20px_rgba(0,245,212,0.4)]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
