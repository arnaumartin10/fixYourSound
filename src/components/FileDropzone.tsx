"use client";

import { UploadCloud, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";

interface FileDropzoneProps {
  onFile: (file: File) => Promise<void>;
}

export function FileDropzone({ onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const processFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("Unsupported file type. Please upload an audio file.");
      return;
    }
    setError("");
    try {
      await onFile(file);
    } catch {
      setError("Failed to load audio file. Please try another format.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        void processFiles([file] as unknown as FileList);
        
        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Microphone access denied or not available. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <section
      className={`rounded-xl border p-5 transition ${
        isDragging ? "border-cyan-300 bg-cyan-400/10" : "border-white/15 bg-white/5"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        await processFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="audio/*"
        onChange={(event) => {
          const files = event.target.files;
          if (!files) return;
          void processFiles(files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-3 rounded-lg border border-white/10 px-4 py-4 text-sm text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 transition"
        >
          <UploadCloud className="h-5 w-5" />
          <span>Upload Audio File</span>
        </button>
        
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex flex-1 items-center justify-center gap-3 rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-4 text-sm text-red-100 hover:bg-red-500/30 transition animate-pulse"
          >
            <Square className="h-5 w-5 fill-current" />
            <span>Stop Recording</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="flex flex-1 items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#00f5d4]/10 px-4 py-4 text-sm text-[#00f5d4] hover:bg-[#00f5d4]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5d4] transition"
          >
            <Mic className="h-5 w-5" />
            <span>Record Voice</span>
          </button>
        )}
      </div>
      
      {error && <p className="mt-4 text-xs text-red-400 text-center">{error}</p>}
      <p className="mt-4 text-xs text-slate-400 text-center opacity-70">
        Drag and drop supported, or use the buttons above.
      </p>
    </section>
  );
}
