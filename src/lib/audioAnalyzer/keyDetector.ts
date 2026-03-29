/**
 * Key Detection using Web Audio API and spectral analysis
 * Analyzes the frequency content to estimate the key
 */

import { Note, Pcset } from "tonal";

export interface KeyResult {
  note: string;
  mode: "major" | "minor";
  confidence: number;
}

// Pitch class set for major and minor scales
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11]; // semitones from root
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10]; // natural minor

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Detect the key from audio buffer using spectral analysis
 */
export async function detectKey(audioBuffer: AudioBuffer): Promise<KeyResult | null> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Use FFT to analyze frequency content
  const chromaVector = await getChromaVector(channelData, sampleRate);

  if (!chromaVector) {
    return null;
  }

  // Find the best matching key
  const result = findBestKey(chromaVector);
  return result;
}

/**
 * Compute chroma vector (12-bin pitch class distribution)
 * using Constant-Q Transform approximation
 */
async function getChromaVector(samples: Float32Array, sampleRate: number): Promise<number[] | null> {
  if (samples.length < 2048) {
    return null;
  }

  // Use multiple analysis windows for better stability
  const chromaBins = Array(12).fill(0);
  const windowCount = Math.max(1, Math.floor(samples.length / 8192));

  for (let w = 0; w < windowCount; w++) {
    const offset = Math.floor((w / windowCount) * (samples.length - 4096));
    const window = samples.slice(offset, offset + 4096);

    const fft = computeFFT(window);
    const localChroma = convertFFTToChroma(fft, sampleRate);

    for (let i = 0; i < 12; i++) {
      chromaBins[i] += localChroma[i];
    }
  }

  // Normalize
  const sum = chromaBins.reduce((a, b) => a + b, 0);
  return sum > 0 ? chromaBins.map((c) => c / sum) : null;
}

/**
 * Simple FFT approximation using Web Audio API's AnalyserNode
 * (For production, consider using library like fftjs)
 */
function computeFFT(samples: Float32Array): Float32Array {
  // Apply Hann window
  const windowed = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
    windowed[i] = samples[i] * window;
  }

  // Use Cooley-Tukey FFT algorithm (simplified)
  return naiveDFT(windowed);
}

/**
 * Naive Discrete Fourier Transform for small inputs
 * (Not optimized, but sufficient for demonstration)
 */
function naiveDFT(input: Float32Array): Float32Array {
  const N = input.length;
  const output = new Float32Array(N);

  for (let k = 0; k < N / 2; k++) {
    let realSum = 0;
    let imagSum = 0;

    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      realSum += input[n] * Math.cos(angle);
      imagSum += input[n] * Math.sin(angle);
    }

    output[k] = Math.sqrt(realSum * realSum + imagSum * imagSum);
  }

  return output;
}

/**
 * Convert FFT bins to chroma (12 pitch classes)
 */
function convertFFTToChroma(fft: Float32Array, sampleRate: number): number[] {
  const chroma = Array(12).fill(0);
  const fftBinFreq = sampleRate / fft.length;

  // Map FFT bins to MIDI notes and then to pitch classes
  for (let i = 0; i < fft.length / 2; i++) {
    const freq = i * fftBinFreq;
    if (freq < 20 || freq > 8000) continue; // Focus on musical range

    // Convert frequency to MIDI note
    const midi = 12 * Math.log2(freq / 440) + 69;
    const pitchClass = Math.round(midi) % 12;

    if (pitchClass >= 0 && pitchClass < 12) {
      chroma[pitchClass] += fft[i];
    }
  }

  return chroma;
}

/**
 * Find the best matching key from chroma vector
 */
function findBestKey(chromaVector: number[]): KeyResult {
  let bestScore = -Infinity;
  let bestKey: KeyResult = { note: "C", mode: "major", confidence: 0 };

  // Try each possible tonic (0-11)
  for (let tonic = 0; tonic < 12; tonic++) {
    // Major key
    const majorScore = scoreKey(chromaVector, tonic, MAJOR_SCALE_INTERVALS);
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = {
        note: NOTES[tonic],
        mode: "major",
        confidence: 0,
      };
    }

    // Minor key
    const minorScore = scoreKey(chromaVector, tonic, MINOR_SCALE_INTERVALS);
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = {
        note: NOTES[tonic],
        mode: "minor",
        confidence: 0,
      };
    }
  }

  // Calculate confidence (0-1)
  const maxPossibleScore = chromaVector.reduce((a, b) => a + b, 0);
  const confidence = maxPossibleScore > 0 ? Math.min(1, bestScore / maxPossibleScore) : 0;

  return { ...bestKey, confidence };
}

/**
 * Score how well a key matches the chroma vector
 */
function scoreKey(
  chromaVector: number[],
  tonicIndex: number,
  scaleIntervals: number[]
): number {
  let score = 0;

  // Add energy for scale degrees
  for (const interval of scaleIntervals) {
    const pitchClass = (tonicIndex + interval) % 12;
    score += chromaVector[pitchClass] * 2;
  }

  // Subtract energy for non-scale degrees
  for (let i = 0; i < 12; i++) {
    const isInScale = scaleIntervals.some((interval) => (tonicIndex + interval) % 12 === i);
    if (!isInScale) {
      score -= chromaVector[i] * 0.5;
    }
  }

  return score;
}
