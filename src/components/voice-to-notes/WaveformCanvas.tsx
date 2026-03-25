"use client";

import { useEffect, useMemo, useRef } from "react";

export function WaveformCanvas({
  getSamples,
  color = "rgba(0,245,212,0.9)",
  height = 120,
}: {
  /**
   * Returns the most recent waveform samples (mono PCM [-1, 1]).
   * The array does not need to be stable between calls.
   */
  getSamples: () => Float32Array | null;
  color?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDrawAtRef = useRef<number>(0);

  const draw = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, width: number, h: number) => {
      const samples = getSamples();
      if (!samples || samples.length < 2) return;

      ctx.clearRect(0, 0, width, h);

      // Background.
      ctx.fillStyle = "rgba(2, 6, 23, 0.60)";
      ctx.fillRect(0, 0, width, h);

      // Center line.
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(width, h / 2);
      ctx.stroke();

      // Draw waveform bars.
      const bars = 180;
      const step = Math.max(1, Math.floor(samples.length / bars));
      ctx.fillStyle = color;

      for (let i = 0; i < bars; i += 1) {
        const start = i * step;
        const end = Math.min(samples.length, start + step);
        if (start >= end) break;

        let peak = 0;
        for (let j = start; j < end; j += 1) {
          const v = Math.abs(samples[j]);
          if (v > peak) peak = v;
        }

        const normalized = Math.min(1, peak);
        const barHeight = normalized * (h * 0.42);

        const x = (i / bars) * width;
        const barWidth = Math.max(1, width / bars - 1);

        // Draw symmetrical bars around center line.
        ctx.fillRect(x, h / 2 - barHeight / 2, barWidth, barHeight);
      }
    };
  }, [color, getSamples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, h: height };
    };

    let size = resize();

    const loop = (t: number) => {
      // Throttle draw a bit for UI.
      if (t - lastDrawAtRef.current > 33) {
        lastDrawAtRef.current = t;
        size = resize();
        draw(ctx, size.width, size.h);
      }
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [draw, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Live waveform visualizer"
      className="h-[120px] w-full rounded-xl border border-white/10 bg-slate-950/50"
      style={{ height }}
    />
  );
}

