"use client";

import { useEffect, useRef } from "react";
import { SemanticProcessor } from "@/lib/SemanticProcessor";
import type { DspState } from "@/lib/SemanticProcessor";

interface FrequencyVisualizerProps {
  dryFftValues: Float32Array;
  processedFftValues: Float32Array;
  hasPrompt: boolean;
  dspState: DspState;
}

const MIN_DB = -120;
const MAX_DB = 0;
const MIN_FREQ = 20;
const MAX_FREQ = 20000;

function frequencyToX(freq: number, width: number) {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);
  const freqLog = Math.log10(Math.min(Math.max(freq, MIN_FREQ), MAX_FREQ));
  return ((freqLog - minLog) / (maxLog - minLog)) * width;
}

export function FrequencyVisualizer({
  dryFftValues,
  processedFftValues,
  hasPrompt,
  dspState,
}: FrequencyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "rgba(10, 15, 28, 0.8)");
    bgGradient.addColorStop(1, "rgba(5, 8, 15, 0.95)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Grid lines (Logarithmic)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    [100, 1000, 10000].forEach(freq => {
      const x = frequencyToX(freq, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    const drawSpectrum = (fftValues: Float32Array, color: string, glowColor: string, isWet: boolean) => {
      ctx.beginPath();
      ctx.lineWidth = isWet ? 2.5 : 1.5;
      ctx.strokeStyle = color;
      
      const binCount = fftValues.length;
      const sampleRate = 44100; // Assuming standard sample rate
      
      for (let x = 0; x < width; x++) {
        const logX = x / width;
        const freq = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** logX;
        
        // Find corresponding bin in FFT
        const bin = Math.floor((freq / (sampleRate / 2)) * binCount);
        const db = fftValues[bin] ?? MIN_DB;
        
        const normalized = (db - MIN_DB) / (MAX_DB - MIN_DB);
        const y = height - normalized * height;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      if (isWet) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = glowColor;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Draw EQ Slopes (Highpass and Lowpass)
    const drawEQCurve = () => {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(94, 255, 200, 0.4)";
      ctx.lineWidth = 1.5;

      for (let x = 0; x < width; x++) {
        const logX = x / width;
        const freq = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** logX;
        
        // Very basic approximation of Tone.Filter response for visualization
        let gain = 1;
        if (freq < dspState.highPass.frequency) {
          gain *= (freq / dspState.highPass.frequency) ** 2; // 12dB/oct approx
        }
        if (freq > dspState.lowPass.frequency) {
          gain *= (dspState.lowPass.frequency / freq) ** 2; // 12dB/oct approx
        }

        const y = height - (gain * 0.8 + 0.1) * height;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawSpectrum(dryFftValues, "rgba(100, 116, 139, 0.45)", "transparent", false);
    if (hasPrompt) {
      drawSpectrum(processedFftValues, "rgba(0, 245, 212, 1)", "rgba(0, 245, 212, 0.4)", true);
      drawEQCurve();
    }

  }, [dryFftValues, hasPrompt, processedFftValues, dspState]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Frequency spectrum visualizer"
      className="h-[280px] w-full rounded-xl border border-white/10 bg-slate-950/50"
    />
  );
}
