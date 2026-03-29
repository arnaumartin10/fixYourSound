"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Logo } from "./Logo";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Song Analyzer", href: "/song-analyzer" },
  { name: "AI Synth", href: "/ai-synth" },
  { name: "Prompting Audio Effects", href: "/prompting-effects" },
  { name: "Chord Architect", href: "/chord-architect" },
  { name: "Voice to Notes", href: "/voice-to-notes" },
  { name: "Learning Hub", href: "/learning-hub", wip: true },
  { name: "Community", href: "/community", wip: true },
];

export const Header = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => {
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
                    className={`text-sm font-medium transition-all duration-300 ${
                      isActive ? "text-[#00f5d4]" : "text-white/60 hover:text-white"
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
            <Link href="/profile" className="flex items-center gap-3 group">
              <span className="text-xs font-bold text-white/50 group-hover:text-white transition-colors">{session.user.name?.split(' ')[0] || "Profile"}</span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9d4edd] flex items-center justify-center text-black font-black text-sm overflow-hidden shadow-[0_0_15px_rgba(0,245,212,0.2)] group-hover:scale-105 transition-all">
                  {session.user.image ? <img src={session.user.image} alt="User" /> : session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
              </div>
            </Link>
          ) : (
            <Link href="/auth/signin" className="px-5 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-[#00f5d4] text-sm font-bold transition-all hover:shadow-[0_0_15px_rgba(0,245,212,0.2)]">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
