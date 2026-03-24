"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

interface FileDropzoneProps {
  onFile: (file: File) => Promise<void>;
}

export function FileDropzone({ onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 px-4 py-4 text-sm text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        <UploadCloud className="h-5 w-5" />
        Drag and drop audio or click to upload
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
