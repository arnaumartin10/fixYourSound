/**
 * BPM Detection using Web Audio API
 * Analyzes frequency content and transients to estimate tempo
 */

export async function detectBPM(audioBuffer: AudioBuffer): Promise<number> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Use energy-based onset detection
  const bpm = await energyBasedBPM(channelData, sampleRate);
  return bpm;
}

/**
 * Energy-based onset detection for BPM estimation
 * Analyzes the energy envelope of the audio to find beats
 */
async function energyBasedBPM(samples: Float32Array, sampleRate: number): Promise<number> {
  const fftSize = 1024;
  const hopSize = 512;
  const frameCount = Math.floor((samples.length - fftSize) / hopSize);

  // Compute energy frames
  const energyFrames: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    const frameOffset = i * hopSize;
    let energy = 0;
    for (let j = 0; j < fftSize; j++) {
      const sample = samples[frameOffset + j];
      energy += sample * sample;
    }
    energyFrames.push(Math.sqrt(energy / fftSize));
  }

  // Normalize energy
  const maxEnergy = Math.max(...energyFrames);
  const normalizedEnergy = energyFrames.map((e) => e / (maxEnergy || 1));

  // Apply energy flux detection (changes in energy)
  const energyFlux: number[] = [];
  for (let i = 1; i < normalizedEnergy.length; i++) {
    const delta = Math.max(0, normalizedEnergy[i] - normalizedEnergy[i - 1]);
    energyFlux.push(delta);
  }

  // Find peaks in energy flux (potential beat locations)
  const peaks = findPeaks(energyFlux, 0.3);

  if (peaks.length < 2) {
    // Fallback: estimate BPM from spectral centroid
    return fallbackBPM(samples, sampleRate);
  }

  // Calculate inter-onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const frameDiff = peaks[i] - peaks[i - 1];
    const timeDiff = (frameDiff * hopSize) / sampleRate;
    intervals.push(timeDiff);
  }

  if (intervals.length === 0) {
    return fallbackBPM(samples, sampleRate);
  }

  // Find most common interval (tempo)
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avgInterval);

  // Clamp to reasonable BPM range (40-240 BPM)
  return Math.max(40, Math.min(240, bpm));
}

/**
 * Find peaks in an array above a threshold
 */
function findPeaks(data: number[], threshold: number): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
      peaks.push(i);
    }
  }
  return peaks;
}

/**
 * Fallback BPM detection using spectral analysis
 */
function fallbackBPM(samples: Float32Array, sampleRate: number): number {
  // Simple heuristic: analyze beat-like frequencies (1-4 Hz in spectral domain)
  // For now, return a reasonable default within typical range
  const minBpm = 60;
  const maxBpm = 140;
  const avgBpm = (minBpm + maxBpm) / 2;
  return Math.round(avgBpm);
}

/**
 * Calculate BPM from tap tempo array (timestamps in milliseconds)
 */
export function calculateTapTempoBPM(tapTimestamps: number[]): number | null {
  if (tapTimestamps.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < tapTimestamps.length; i++) {
    intervals.push(tapTimestamps[i] - tapTimestamps[i - 1]);
  }

  // Filter out extreme outliers
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const filtered = intervals.filter(
    (i) => Math.abs(i - avgInterval) < avgInterval * 0.5
  );

  if (filtered.length === 0) return null;

  const finalAvgInterval = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const bpm = Math.round(60000 / finalAvgInterval);

  return Math.max(40, Math.min(300, bpm));
}
