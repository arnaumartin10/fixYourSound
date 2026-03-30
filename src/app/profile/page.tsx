"use client";

import { useState, useEffect, Suspense } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Settings, User, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { DashboardTabs } from "./DashboardTabs";
import { useRouter, useSearchParams } from "next/navigation";
import { updateUserProfile } from "@/actions/presetActions";

interface Preset {
  id: string;
  name: string;
  category: string;
  data: string;
  createdAt: Date;
}

interface UserData {
  name: string | null;
  email: string | null;
  image: string | null;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [user, setUser] = useState<UserData>({ name: null, email: null, image: null });
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (!session?.user?.id) {
          router.push("/auth/signin");
          return;
        }

        setUser({
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        });

        const presetsRes = await fetch("/api/presets");
        const presetsData = await presetsRes.json();
        setPresets(presetsData.presets || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  useEffect(() => {
    setShowSettings(searchParams.get("tab") === "settings");
  }, [searchParams]);

  useEffect(() => {
    setSettingsName(user.name || "");
  }, [user.name]);

  const handleSettingsClick = () => {
    const newValue = !showSettings;
    setShowSettings(newValue);
    if (newValue) {
      router.push("/profile?tab=settings");
    } else {
      router.push("/profile");
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/" });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-6xl min-h-screen">
        <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 md:p-12 shadow-2xl space-y-12">
          <div className="animate-pulse h-20 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl min-h-screen">
       <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 md:p-12 shadow-2xl space-y-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9d4edd] flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(0,245,212,0.2)]">
                   {user.image ? <img src={user.image} alt="User" className="w-full h-full rounded-full object-cover" /> : user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div>
                   <h1 className="text-3xl font-black text-white">{user.name || "Music Producer"}</h1>
                   <p className="text-white/50">{user.email}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                <button onClick={() => setShowSettings(!showSettings)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"><Settings size={20} className="text-white" /></button>
               <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 transition-all"
               >
                 <LogOut size={18} /> Sign Out
               </button>
             </div>
          </div>
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
            {/* Main Dashboard Area */}
            {showSettings ? ( 
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mt-8">
                <h2 className="text-2xl font-black text-white mb-6">User Settings</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-2">Display Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input 
                        type="text" 
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Email</label>
                    <input 
                      type="email" 
                      value={user.email || ""}
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <button 
                      type="button" 
                      disabled
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/50 rounded-xl text-sm font-bold cursor-not-allowed"
                    >
                      <ImageIcon size={16} /> Change Avatar
                    </button>
                    <span className="text-xs text-white/30">Managed by Google</span>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={async () => {
                        if (!settingsName.trim()) return;
                        setIsUpdating(true);
                        try {
                          await updateUserProfile(settingsName);
                          setUser({ ...user, name: settingsName });
                          alert("Profile updated!");
                        } catch (err) {
                          console.error(err);
                          alert("Failed to update profile");
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating || !settingsName.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-[#00f5d4] text-black font-bold rounded-xl hover:bg-[#00d4aa] transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setShowSettings(false)} className="px-6 py-3 text-white/50 hover:text-white">Cancel</button>
                  </div>
                </div>
              </div>
            ) : ( 
              <DashboardTabs 
                presets={presets} 
                user={user}
                initialTab="GUITAR"
                isSettingsOpen={showSettings}
                onSettingsClick={handleSettingsClick}
              />
            )}
       </div>
    </div>
  );
}

function ProfileFallback() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl min-h-screen">
      <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 md:p-12 shadow-2xl space-y-12">
        <div className="animate-pulse h-20 bg-white/5 rounded-3xl" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
