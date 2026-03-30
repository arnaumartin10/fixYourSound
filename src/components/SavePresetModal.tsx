"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, X, Loader2 } from "lucide-react";
import { savePreset } from "@/actions/presetActions";
import { motion, AnimatePresence } from "framer-motion";

interface SavePresetModalProps {
  category: "SYNTH" | "GUITAR" | "FX" | "CHORD" | "VOICE" | "MELODY" | "BEAT";
  getData: () => any;
  isOpen?: boolean;
  onClose?: () => void;
  hideTriggerButton?: boolean;
}

export function SavePresetModal({ category, getData, isOpen: externalIsOpen, onClose, hideTriggerButton }: SavePresetModalProps) {
  const { status } = useSession();
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(value);
    }
    if (value === false && onClose) {
      onClose();
    }
  };

  const handleOpen = () => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      const data = JSON.stringify(getData());
      await savePreset(name, category, data);
      setIsOpen(false);
      setName("");
      alert("Preset saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save preset.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!hideTriggerButton && (
        <button 
          onClick={handleOpen}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-full text-white font-bold transition-all text-sm group"
        >
          <Save size={16} className="text-[#00f5d4] group-hover:scale-110 transition-transform" />
          Save Preset
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-black text-white mb-2">Save Preset</h3>
                <p className="text-white/50 text-sm">Give your sound a name so you can load it later in your Studio Dashboard.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-2">Preset Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Dark Fuzz"
                    autoFocus
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50 transition-colors"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSaving || !name.trim()}
                  className="w-full py-4 bg-[#00f5d4] text-black font-black rounded-xl hover:bg-[#00f5d4]/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSaving ? "Saving..." : "Save to Dashboard"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
