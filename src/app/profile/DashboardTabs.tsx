"use client";

import { useState } from "react";
import { Guitar, Music, Mic, Layers, Settings2, Trash2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePreset } from "@/actions/presetActions";

export function DashboardTabs({ presets }: { presets: any[] }) {
  const [activeTab, setActiveTab] = useState("GUITAR");
  const router = useRouter();
  
  const tabs = [
    { id: "GUITAR", label: "Guitar Rigs", icon: Guitar, url: "/ai-synth?mode=guitar" },
    { id: "SYNTH", label: "Synth Patches", icon: Music, url: "/ai-synth?mode=synth" },
    { id: "FX", label: "Audio FX", icon: Settings2, url: "/prompting-effects" },
    { id: "CHORD", label: "Chord Banks", icon: Layers, url: "/chord-architect" },
    { id: "VOICE", label: "Vocal Notes", icon: Mic, url: "/voice-to-notes" }
  ];
  
  const activePresets = presets.filter(p => p.category === activeTab);
  
  const handleLoad = (preset: any) => {
    localStorage.setItem(`fys_load_preset_${activeTab}`, preset.data);
    const tabData = tabs.find(t => t.id === activeTab);
    if(tabData) router.push(tabData.url);
  };
  
  const handleDelete = async (id: string) => {
    if(confirm("Delete this preset permanently?")) {
      await deletePreset(id);
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
      
      {/* Presets Grid */}
      {activePresets.length === 0 ? (
         <div className="py-20 text-center border border-white/5 border-dashed rounded-3xl bg-white/[0.02]">
            <p className="text-white/30 font-bold uppercase tracking-widest text-sm mb-2">No Presets Found</p>
            <p className="text-white/20 text-xs">Save patches from the studio to access them here.</p>
         </div>
      ) : (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePresets.map((preset) => (
              <div key={preset.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between h-40 group hover:border-white/20 transition-all">
                 <div>
                    <h3 className="text-xl font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">{preset.name}</h3>
                    <p className="text-white/30 text-xs mt-1">{new Date(preset.createdAt).toLocaleDateString()}</p>
                 </div>
                 
                 <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 md:translate-y-4 group-hover:translate-y-0">
                    <button onClick={() => handleLoad(preset)} className="flex-1 flex items-center justify-center gap-2 bg-[#00f5d4] text-black font-black py-2 rounded-xl text-sm transition-transform active:scale-95">
                       <Play size={14} /> Load
                    </button>
                    <button onClick={() => handleDelete(preset.id)} className="px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            ))}
         </div>
      )}
    </div>
  )
}
