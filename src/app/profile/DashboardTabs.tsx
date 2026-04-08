"use client";

import { useState } from "react";
import { Guitar, Music, Mic, Layers, Settings2, Trash2, Play, Pencil, X, Check, Settings, User, Image as ImageIcon, Loader2, ArrowLeft, Zap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePreset, updatePreset, updateUserProfile } from "@/actions/presetActions";

interface DashboardTabsProps {
  presets: any[];
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  initialTab?: string;
  onSettingsClick?: () => void;
  isSettingsOpen?: boolean;
}

export function DashboardTabs({ presets, user, initialTab, onSettingsClick, isSettingsOpen }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "GUITAR");
  const [isEditingProfile, setIsEditingProfile] = useState(initialTab === "SETTINGS" || isSettingsOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [settingsName, setSettingsName] = useState(user.name || "");
  const router = useRouter();
  
  const handleSettingsToggle = () => {
    const newValue = !isEditingProfile;
    setIsEditingProfile(newValue);
    if (onSettingsClick) {
      onSettingsClick();
    }
  };
  
  const handleCancelSettings = () => {
    setIsEditingProfile(false);
    if (onSettingsClick) {
      onSettingsClick();
    }
  };
  
  const tabs = [
    { id: "GUITAR", label: "Guitar Rigs", icon: Guitar },
    { id: "SYNTH", label: "Synth Patches", icon: Music },
    { id: "FX", label: "Audio FX", icon: Settings2 },
    { id: "CHORD", label: "Chord Banks", icon: Layers },
    { id: "VOICE", label: "Vocal Notes", icon: Mic },
    { id: "MELODY", label: "Melodies", icon: Sparkles },
    { id: "BEAT", label: "Beat Packs", icon: Zap },
    { id: "SONG", label: "My Songs", icon: Music }
  ];
  
  const activePresets = presets.filter(p => p.category === activeTab);
  
  const handleLoad = (preset: any) => {
    let url = "/ai-synth";
    
    const category = preset.category?.toUpperCase();
    
    switch (category) {
      case "GUITAR":
        url = "/ai-synth?mode=guitar";
        break;
      case "SYNTH":
        url = "/ai-synth?mode=synth";
        break;
      case "FX":
        url = "/prompting-effects";
        break;
      case "CHORD":
        url = "/chord-architect";
        break;
      case "VOICE":
        url = "/voice-to-notes";
        break;
      case "MELODY":
        url = "/melody-generator";
        break;
      case "BEAT":
        url = "/beat-generator";
        break;
      case "SONG":
        url = "/build-a-song";
        break;
      default:
        url = "/ai-synth";
    }

    
    const separator = url.includes('?') ? '&' : '?';
    router.push(`${url}${separator}presetId=${preset.id}`);
  };
  
  const handleDelete = async (id: string) => {
    if(confirm("Delete this preset permanently?")) {
      await deletePreset(id);
    }
  };

  const handleEdit = (preset: any) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updatePreset(id, editName);
    setEditingId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) return;
    setIsUpdating(true);
    try {
      await updateUserProfile(settingsName);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 scrollbar-hide">
         {tabs.map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all flex-1 justify-center ${
               activeTab === tab.id 
                 ? "bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30" 
                 : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white"
             }`}
           >
             <tab.icon size={18} /> {tab.label}
           </button>
         ))}
      </div>
      
      {/* Settings Form */}
      {activeTab === "SETTINGS" ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Settings className="text-[#00f5d4]" size={24} />
              <h2 className="text-2xl font-black text-white">User Settings</h2>
            </div>
            <button 
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:border-white/20 transition-all text-sm font-bold"
            >
              <ArrowLeft size={16} /> Back to Presets
            </button>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="max-w-md space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-white/10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9d4edd] flex items-center justify-center text-black font-black text-3xl overflow-hidden shadow-[0_0_30px_rgba(0,245,212,0.2)]">
                {user.image ? (
                  <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0) || user.email?.charAt(0) || "U"
                )}
              </div>
              <div>
                <button 
                  type="button" 
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/50 rounded-xl text-sm font-bold cursor-not-allowed"
                >
                  <ImageIcon size={16} /> Change Avatar
                </button>
                <p className="text-xs text-white/30 mt-2">Avatar is managed by your Google account</p>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-2">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input 
                  type="text" 
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50 transition-colors"
                />
              </div>
            </div>

            {/* Email Field (readonly) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Email Address</label>
              <input 
                type="email" 
                value={user.email || ""}
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
              />
              <p className="text-xs text-white/30 mt-2">Email is managed by your authentication provider</p>
            </div>

            {/* Save Button */}
            <button 
              type="submit" 
              disabled={isUpdating || !settingsName.trim()}
              className="w-full py-4 bg-[#00f5d4] text-black font-black rounded-xl hover:bg-[#00f5d4]/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      ) : activePresets.length === 0 ? (
          <div className="py-20 text-center border border-white/5 border-dashed rounded-3xl bg-white/[0.02]">
             <p className="text-white/30 font-bold uppercase tracking-widest text-sm mb-2">No Presets Found</p>
             <p className="text-white/20 text-xs">Save patches from the studio to access them here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePresets.map((preset) => (
               <div key={preset.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between h-40 group hover:border-white/20 transition-all">
                   <div>
                     {editingId === preset.id ? (
                       <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           value={editName}
                           onChange={(e) => setEditName(e.target.value)}
                           className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-[#00f5d4]"
                           autoFocus
                         />
                         <button onClick={() => handleSaveEdit(preset.id)} className="p-1.5 bg-[#00f5d4] text-black rounded-lg hover:bg-[#00d4aa]">
                           <Check size={14} />
                         </button>
                         <button onClick={handleCancelEdit} className="p-1.5 bg-white/10 text-white/50 rounded-lg hover:bg-white/20">
                           <X size={14} />
                         </button>
                       </div>
                     ) : (
                       <>
                         <h3 className="text-xl font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">{preset.name}</h3>
                         <p className="text-white/30 text-xs mt-1">
                           {preset.createdAt ? new Date(preset.createdAt).toLocaleDateString() : "No date"}
                         </p>
                       </>
                     )}
                   </div>
                   
                   {editingId !== preset.id && (
                     <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 md:translate-y-4 group-hover:translate-y-0">
                        <button onClick={() => handleLoad(preset)} className="flex-1 flex items-center justify-center gap-2 bg-[#00f5d4] text-black font-black py-2 rounded-xl text-sm transition-transform active:scale-95">
                           <Play size={14} /> Load
                        </button>
                        <button onClick={() => handleEdit(preset)} className="px-3 bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors">
                           <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(preset.id)} className="px-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                           <Trash2 size={16} />
                        </button>
                     </div>
                   )}
               </div>
             ))}
          </div>
        )}
    </div>
  )
}
