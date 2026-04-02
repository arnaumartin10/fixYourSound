"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import { Chord } from "tonal";

interface UseTonePlaybackOptions {
  type: "chord" | "melody";
}

export function useTonePlayback(options: UseTonePlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const synthRef = useRef<Tone.PolySynth | Tone.Synth | null>(null);
  const isReadyRef = useRef(false);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(id => clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

  const initAudio = useCallback(async () => {
    if (isReadyRef.current) return true;

    setIsLoading(true);
    try {
      console.log("Starting Tone.js audio engine...");
      await Tone.start();
      console.log("Tone.start() completed");
      
      if (options.type === "chord") {
        console.log("Creating PolySynth for chords...");
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle8" },
          envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 0.8,
          },
        }).toDestination();
      } else {
        console.log("Creating Synth for melody...");
        synthRef.current = new Tone.Synth({
          oscillator: { type: "triangle8" },
          envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 0.8,
          },
        }).toDestination();
      }

      Tone.Destination.volume.value = 0;
      console.log("Synth connected to destination");
      
      isReadyRef.current = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [options.type]);

  const stopPlayback = useCallback(() => {
    try {
      clearTimeouts();
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (e) {
      console.error("Error stopping playback:", e);
    }
    setIsPlaying(false);
  }, [clearTimeouts]);

  const playChords = useCallback(async (chords: string[], durationSec: number = 2) => {
    console.log("playChords called with:", chords);
    
    if (!isReadyRef.current) {
      console.log("Audio not ready, initializing...");
      const success = await initAudio();
      if (!success) {
        console.error("Failed to initialize audio");
        return;
      }
    }

    stopPlayback();

    const synth = synthRef.current as Tone.PolySynth;
    if (!synth) {
      console.error("Synth not found");
      return;
    }

    console.log("Playing chords with setTimeout approach...");
    
    chords.forEach((chordName, index) => {
      const chord = Chord.get(chordName);
      let notes: string[];
      if (chord.notes.length) {
        notes = chord.notes.map(n => `${n}4`);
        console.log(`Chord ${chordName}: parsed notes:`, notes);
      } else {
        notes = chordName.split(" ").map(n => n.trim()).filter(n => n);
        console.log(`Chord ${chordName}: fallback notes:`, notes);
      }

      const timeoutId = setTimeout(() => {
        console.log(`Triggering chord ${chordName} at index ${index}`);
        synth.triggerAttackRelease(notes, durationSec);
      }, index * durationSec * 1000);
      
      timeoutIdsRef.current.push(timeoutId);
    });

    setIsPlaying(true);

    const totalDuration = chords.length * durationSec * 1000;
    const finalTimeoutId = setTimeout(() => {
      setIsPlaying(false);
    }, totalDuration);
    timeoutIdsRef.current.push(finalTimeoutId);
  }, [initAudio, stopPlayback]);

  const playMelody = useCallback(async (notes: { pitch: string; startTime: number; duration: number }[]) => {
    console.log("playMelody called with:", notes.length, "notes");
    
    if (!isReadyRef.current) {
      console.log("Audio not ready, initializing...");
      const success = await initAudio();
      if (!success) {
        console.error("Failed to initialize audio");
        return;
      }
    }

    stopPlayback();

    const synth = synthRef.current as Tone.Synth;
    if (!synth) {
      console.error("Synth not found");
      return;
    }

    console.log("Playing melody with setTimeout approach...");
    
    notes.forEach((note, index) => {
      const timeoutId = setTimeout(() => {
        console.log(`Triggering note ${note.pitch} at time ${note.startTime}`);
        synth.triggerAttackRelease(note.pitch, note.duration);
      }, note.startTime * 1000);
      
      timeoutIdsRef.current.push(timeoutId);
    });

    setIsPlaying(true);

    if (notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      const totalDuration = (lastNote.startTime + lastNote.duration) * 1000;
      const finalTimeoutId = setTimeout(() => {
        setIsPlaying(false);
      }, totalDuration);
      timeoutIdsRef.current.push(finalTimeoutId);
    }
  }, [initAudio, stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (synthRef.current) {
        try {
          synthRef.current.dispose();
        } catch (e) {
          console.error("Error disposing synth:", e);
        }
        synthRef.current = null;
      }
      isReadyRef.current = false;
    };
  }, [stopPlayback]);

  return {
    isReady: isReadyRef.current,
    isPlaying,
    isLoading,
    initAudio,
    stopPlayback,
    playChords,
    playMelody,
  };
}