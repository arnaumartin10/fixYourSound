/**
 * Loudness and Level Detection
 * Calculates Peak Level (dB), RMS Level, and simplified loudness estimation
 */

export interface LoudnessMetrics {
  peakLevel: number; // dB
  rmsLevel: number; // dB
  loudnessValue: number; // 0-100 scale (0 = quiet, 100 = very loud)
}

/**
 * Analyze loudness metrics from audio buffer
 */
export function analyzeLoudness(audioBuffer: AudioBuffer): LoudnessMetrics {
  const channelData = audioBuffer.getChannelData(0);

  const peakLevel = calculatePeakLevel(channelData);
  const rmsLevel = calculateRMSLevel(channelData);
  const loudnessValue = normalizeLoudness(peakLevel);

  return {
    peakLevel,
    rmsLevel,
    loudnessValue,
  };
}

/**
 * Calculate peak level in dB
 * Peak Level (dB) = 20 * log10(peak_amplitude)
 */
function calculatePeakLevel(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) {
      peak = abs;
    }
  }

  // Clamp to avoid log(0) and ensure dB range
  peak = Math.max(peak, 1e-6);
  const peakDb = 20 * Math.log10(peak);

  // Clamp to reasonable dB range
  return Math.max(-80, Math.min(0, peakDb));
}

/**
 * Calculate RMS (Root Mean Square) level in dB
 */
function calculateRMSLevel(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }

  const rms = Math.sqrt(sum / samples.length);
  // Clamp to avoid log(0)
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -80;

  return Math.max(-80, Math.min(0, rmsDb));
}

/**
 * Normalize peak level to 0-100 scale
 * -80 dB = 0 (very quiet)
 *   0 dB = 100 (maximum)
 */
function normalizeLoudness(peakDb: number): number {
  // Scale from [-80, 0] to [0, 100]
  const normalized = ((peakDb + 80) / 80) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Get loudness description for UI
 */
export function getLoudnessDescription(loudnessValue: number): string {
  if (loudnessValue < 20) return "Very Quiet";
  if (loudnessValue < 40) return "Quiet";
  if (loudnessValue < 60) return "Moderate";
  if (loudnessValue < 80) return "Loud";
  return "Very Loud";
}

/**
 * Check if track is "radio-ready" (commercial loudness standards)
 */
export function isRadioReady(peakLevel: number, rmsLevel: number): boolean {
  // Radio-ready tracks typically have:
  // Peak Level around -3dB to -1dB
  // RMS Level around -9dB to -6dB
  return peakLevel >= -3 && rmsLevel >= -9;
}
