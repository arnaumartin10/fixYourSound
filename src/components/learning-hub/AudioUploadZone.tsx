"use client";

import { useRef, useState } from "react";
import { Upload, Mic, Square, Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import * as Tone from "tone";

interface AudioUploadProps {
  onAudioLoad: (audioBuffer: AudioBuffer) => void;
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function AudioUploadZone({ onAudioLoad, onFileSelect, isLoading = false }: AudioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      alert("Please select an audio file (MP3, WAV, etc.)");
      return;
    }

    try {
      onFileSelect(file);
      setUploadedFile(file);

      // Convert to AudioBuffer
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = Tone.getContext().rawContext;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      onAudioLoad(audioBuffer);
    } catch (error) {
      console.error("Error loading audio file:", error);
      alert("Error loading audio file. Try another format or file.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);

        // Convert to AudioBuffer
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = Tone.getContext().rawContext;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        onAudioLoad(audioBuffer);

        // Create a File object for consistency
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        onFileSelect(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      const interval = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      // Store interval ID to clear later
      (mediaRecorder as any).intervalId = interval;
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Could not access your microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clear interval
      const intervalId = (mediaRecorderRef.current as any).intervalId;
      if (intervalId) clearInterval(intervalId);

      // Stop microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const playRecording = async () => {
    if (!recordedBlob) return;

    setIsPlayingRecording(true);

    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);

    audio.onended = () => {
      setIsPlayingRecording(false);
      URL.revokeObjectURL(url);
    };

    audio.play();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playOriginalAudio = () => {
    if (!uploadedFile || isPlayingOriginal) return;

    const audio = audioElementRef.current || new Audio();
    audioElementRef.current = audio;

    const url = URL.createObjectURL(uploadedFile);
    audio.src = url;
    
    audio.onended = () => {
      setIsPlayingOriginal(false);
    };

    audio.play().catch((err) => {
      console.error("Error playing audio:", err);
      setIsPlayingOriginal(false);
    });
    
    setIsPlayingOriginal(true);
  };

  const stopOriginalAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlayingOriginal(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FILE UPLOAD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => !uploadedFile && fileInputRef.current?.click()}
          className={`relative group ${!uploadedFile ? "cursor-pointer" : ""}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00f5d4] to-[#0084ff] opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500 rounded-2xl" />

          <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 group-hover:border-white/20 rounded-2xl p-8 transition-all duration-300">
            {!uploadedFile ? (
              <div className="flex flex-col items-center gap-4">
                <Upload className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
                <div className="text-center">
                  <p className="font-black text-white/80 text-sm">Upload Audio File</p>
                  <p className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-widest">MP3, WAV, OGG, FLAC</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Play className="w-8 h-8 text-[#00f5d4]" />
                <div className="text-center">
                  <p className="font-black text-white/80 text-sm">Original Audio Ready</p>
                  <p className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-widest truncate max-w-xs">{uploadedFile.name}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playOriginalAudio();
                    }}
                    disabled={isPlayingOriginal || isLoading}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white/70 rounded-lg font-black text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Play
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopOriginalAudio();
                    }}
                    disabled={!isPlayingOriginal}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg font-black text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" /> Stop
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopOriginalAudio();
                      setUploadedFile(null);
                      setIsPlayingOriginal(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg font-black text-sm transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
        </motion.div>

        {/* MICROPHONE RECORDING */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00f5d4] to-[#0084ff] opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500 rounded-2xl" />

          <div className="relative bg-[#0a0a0a] border border-white/5 group-hover:border-white/10 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col items-center gap-4">
              {!isRecording && !recordedBlob && (
                <>
                  <Mic className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
                  <div className="text-center">
                    <p className="font-black text-white/80 text-sm">Record Microphone</p>
                    <p className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-widest">Capture live audio</p>
                  </div>
                  <button
                    onClick={startRecording}
                    disabled={isLoading}
                    className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/70 rounded-lg font-black text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Recording
                  </button>
                </>
              )}

              {isRecording && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"
                  >
                    <Square className="w-4 h-4 text-white/60" />
                  </motion.div>
                  <div className="text-center">
                    <p className="font-black text-white/80 text-sm">Recording...</p>
                    <p className="text-[10px] text-white/40 font-mono mt-1 font-black uppercase tracking-widest">{formatTime(recordingTime)}</p>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="mt-2 px-4 py-2 bg-white/15 hover:bg-white/20 text-white/70 rounded-lg font-black text-sm transition-colors"
                  >
                    Stop Recording
                  </button>
                </>
              )}

              {recordedBlob && !isRecording && (
                <>
                  <Play className="w-8 h-8 text-white/40" />
                  <div className="text-center">
                    <p className="font-black text-white/80 text-sm">Recording Ready</p>
                    <p className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-widest">{formatTime(recordingTime)}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={playRecording}
                      disabled={isPlayingRecording || isLoading}
                      className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white/70 rounded-lg font-black text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPlayingRecording ? (
                        <>
                          <Pause className="w-4 h-4" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Play
                        </>
                      )}
                    </button>
                    <button
                      onClick={startRecording}
                      disabled={isLoading}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg font-black text-sm transition-colors disabled:opacity-50"
                    >
                      Re-record
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* INFO */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-white/30 mt-6"
      >
        Listen to the original audio, then test effects with the bypass toggle to compare
      </motion.p>
    </div>
  );
}
