const A4_HZ = 440;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert frequency in Hz to MIDI note number as a float (e.g. 60.25).
 */
export function freqToMidiFloat(freqHz: number): number {
  if (!Number.isFinite(freqHz) || freqHz <= 0) return NaN;
  return 69 + 12 * Math.log2(freqHz / A4_HZ);
}

export function midiFloatToMidiIntAndCents(midiFloat: number): {
  midiInt: number;
  cents: number;
} {
  const midiInt = Math.round(midiFloat);
  const cents = (midiFloat - midiInt) * 100;
  return { midiInt, cents };
}

/**
 * Root-mean-square in dBFS (full scale = 1.0).
 */
export function rmsDb(pcm: Float32Array, eps = 1e-8): number {
  let sumSq = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const s = pcm[i];
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / pcm.length);
  // 20 * log10 for amplitude.
  return 20 * Math.log10(rms + eps);
}

export function velocityFromRmsDb(
  rmsDbValue: number,
  silenceDbFloor = -60,
  silenceDbCeil = -6
): number {
  const normalized = (rmsDbValue - silenceDbFloor) / (silenceDbCeil - silenceDbFloor);
  const v = clamp(normalized, 0, 1);
  // MIDI velocity 0..127 (we keep 0..127 as requested).
  return Math.round(v * 127);
}

export function centsToPitchBendNormalized(cents: number, rangeSemis: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(rangeSemis) || rangeSemis <= 0) return 0;
  const normalized = cents / (rangeSemis * 100);
  return clamp(normalized, -1, 1);
}

