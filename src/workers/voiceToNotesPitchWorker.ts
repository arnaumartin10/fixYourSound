/// <reference lib="webworker" />
import type {
  VoiceToNotesFrameMessage,
  VoiceToNotesProgressMessage,
  VoiceToNotesWorkerInboundMessage,
  VoiceToNotesWorkerInit,
  VoiceToNotesWorkerOutboundMessage,
  VoiceToNotesDoneMessage,
} from "../lib/voiceToNotes/types";
import type { PitchFrameForSegmentation } from "../lib/voiceToNotes/segmenter";
import { NoteSegmenter } from "../lib/voiceToNotes/segmenter";
import {
  clamp,
  freqToMidiFloat,
  midiFloatToMidiIntAndCents,
  rmsDb,
} from "../lib/voiceToNotes/pitchUtils";

let settings: VoiceToNotesWorkerInit | null = null;
let segmenter: NoteSegmenter | null = null;

let pitchDetector: any = null;
let isReady = false;

let buffer: Float32Array = new Float32Array(0);
let consumedSamples = 0;

let analysisFrameIndex = 0;
let nextFrameToPost = 0;

let lastProgressAtSec = -1;

let aubioApiPromise: Promise<any> | null = null;

function loadAubioApi(): Promise<any> {
  if (aubioApiPromise) return aubioApiPromise;

  aubioApiPromise = new Promise((resolve, reject) => {
    try {
      // Load Aubio.js at runtime so Turbopack doesn't attempt to bundle Node-only `fs` shims.
      // eslint-disable-next-line no-restricted-globals
      const base = "https://unpkg.com/aubiojs@0.2.1/build/";
      // eslint-disable-next-line no-restricted-globals
      importScripts(`${base}aubio.js`);

      // `aubio` is defined globally by the imported script.
      const aubioFn = (self as any).aubio;
      if (typeof aubioFn !== "function") {
        throw new Error("aubio() export not found in worker after importScripts");
      }

      // Ensure the wasm is loaded from the same CDN directory.
      aubioFn.locateFile = (path: string) => `${base}${path}`;

      // The factory returns a promise that resolves to Pitch/Tempo/Onset constructors.
      void aubioFn().then(resolve).catch(reject);
    } catch (err) {
      reject(err);
    }
  });

  return aubioApiPromise;
}

function postMessageSafe(msg: VoiceToNotesWorkerOutboundMessage) {
  self.postMessage(msg);
}

function toFrameMessage(params: {
  timeSec: number;
  midiInt: number | null;
  freqHz: number | null;
  confidence: number;
  rmsDb: number;
}): VoiceToNotesFrameMessage {
  return {
    type: "frame",
    ...params,
  };
}

function toProgressMessage(analyzedTimeSec: number): VoiceToNotesProgressMessage {
  return {
    type: "progress",
    analyzedTimeSec,
    totalDurationSec: settings?.totalDurationSec,
  };
}

function computeFrameConfidence(params: {
  rmsDbValue: number;
  cents: number;
  pitchCentsTolerance: number;
  silenceThresholdDb: number;
}) {
  const { rmsDbValue, cents, pitchCentsTolerance, silenceThresholdDb } = params;

  // Higher RMS => more likely voiced
  const rmsConf = clamp((rmsDbValue - silenceThresholdDb) / (0 - silenceThresholdDb), 0, 1);

  // Smaller cents deviation => more stable pitch
  const denom = Math.max(1, pitchCentsTolerance);
  const pitchConf = clamp(1 - Math.abs(cents) / denom, 0, 1);

  return clamp(rmsConf * pitchConf, 0, 1);
}

async function ensureReady(init: VoiceToNotesWorkerInit) {
  if (isReady) return;
  settings = init;
  segmenter = new NoteSegmenter(init);
  buffer = new Float32Array(0);
  consumedSamples = 0;
  analysisFrameIndex = 0;
  nextFrameToPost = 0;
  lastProgressAtSec = -1;

  const api = await loadAubioApi();
  pitchDetector = new api.Pitch(
    "default",
    init.bufferSizeSamples,
    init.hopSizeSamples,
    init.sampleRate
  );

  if (!pitchDetector?.do) {
    pitchDetector = new (api as any).Pitch(
      "default",
      init.bufferSizeSamples,
      init.hopSizeSamples,
      init.sampleRate
    );
  }

  isReady = true;
}

function processAvailableFrames() {
  if (!settings || !segmenter || !pitchDetector) return;

  const { bufferSizeSamples, hopSizeSamples, sampleRate } = settings;
  const hopDurationSec = hopSizeSamples / sampleRate;

  let frameStart = 0;
  while (frameStart + bufferSizeSamples <= buffer.length) {
    const window = buffer.subarray(frameStart, frameStart + bufferSizeSamples);

    const freqHz = pitchDetector.do(window);
    const timeSec = (consumedSamples + frameStart) / sampleRate;

    const rmsValueDb = rmsDb(window);

    const freqValid =
      Number.isFinite(freqHz) && freqHz > settings.minFrequencyHz && freqHz < settings.maxFrequencyHz;

    if (freqValid && rmsValueDb >= settings.silenceThresholdDb) {
      const midiFloat = freqToMidiFloat(freqHz);
      if (Number.isFinite(midiFloat)) {
        const { midiInt, cents } = midiFloatToMidiIntAndCents(midiFloat);

        // Clamp to MIDI range early so segmentation won't drift.
        const midiInRange = midiInt >= 0 && midiInt <= 127;
        if (midiInRange) {
          const confidence = computeFrameConfidence({
            rmsDbValue: rmsValueDb,
            cents,
            pitchCentsTolerance: settings.pitchCentsTolerance,
            silenceThresholdDb: settings.silenceThresholdDb,
          });

          const frameValid = confidence >= settings.minFrameConfidence;
          if (analysisFrameIndex >= nextFrameToPost) {
            if (frameValid) {
              postMessageSafe(
                toFrameMessage({
                  timeSec,
                  midiInt,
                  freqHz,
                  confidence,
                  rmsDb: rmsValueDb,
                })
              );
            } else {
              postMessageSafe(
                toFrameMessage({
                  timeSec,
                  midiInt: null,
                  freqHz: null,
                  confidence: 0,
                  rmsDb: rmsValueDb,
                })
              );
            }
            nextFrameToPost = analysisFrameIndex + Math.max(1, settings.framePostEvery);
          }

          const segFrame: PitchFrameForSegmentation = {
            timeSec,
            hopDurationSec,
            midiInt: frameValid ? midiInt : null,
            freqHz: frameValid ? freqHz : null,
            cents: frameValid ? cents : null,
            confidence: frameValid ? confidence : 0,
            rmsDb: rmsValueDb,
            frameValid,
          };

          segmenter.pushFrame(segFrame);
        } else {
          segmenter.pushFrame({
            timeSec,
            hopDurationSec,
            midiInt: null,
            freqHz: null,
            cents: null,
            confidence: 0,
            rmsDb: rmsValueDb,
            frameValid: false,
          });
        }
      } else {
        segmenter.pushFrame({
          timeSec,
          hopDurationSec,
          midiInt: null,
          freqHz: null,
          cents: null,
          confidence: 0,
          rmsDb: rmsValueDb,
          frameValid: false,
        });
      }
    } else {
      // Silence or out-of-range freq.
      segmenter.pushFrame({
        timeSec,
        hopDurationSec,
        midiInt: null,
        freqHz: null,
        cents: null,
        confidence: 0,
        rmsDb: rmsValueDb,
        frameValid: false,
      });
    }

    analysisFrameIndex += 1;

    if (settings.totalDurationSec) {
      const analyzedTimeSec = (consumedSamples + frameStart) / sampleRate;
      if (analyzedTimeSec - lastProgressAtSec >= 0.2) {
        lastProgressAtSec = analyzedTimeSec;
        postMessageSafe(toProgressMessage(analyzedTimeSec));
      }
    }

    frameStart += hopSizeSamples;
  }

  // Drop processed prefix, keep only the remainder.
  if (frameStart > 0) {
    buffer = buffer.subarray(frameStart);
    consumedSamples += frameStart;
  }
}

self.onmessage = async (e: MessageEvent<VoiceToNotesWorkerInboundMessage>) => {
  const msg = e.data;
  if (msg.type === "init") {
    await ensureReady(msg);
    postMessageSafe({ type: "progress", analyzedTimeSec: 0, totalDurationSec: msg.totalDurationSec });
    return;
  }

  if (!isReady || !settings) return;

  if (msg.type === "audioChunk") {
    const chunk = msg.pcm;
    // Append new samples and process as much as possible.
    const combined = new Float32Array(buffer.length + chunk.length);
    combined.set(buffer, 0);
    combined.set(chunk, buffer.length);
    buffer = combined;

    processAvailableFrames();
    return;
  }

  if (msg.type === "end") {
    // Process remaining as much as possible.
    processAvailableFrames();
    const segments = segmenter ? segmenter.flush() : [];
    const done: VoiceToNotesDoneMessage = {
      type: "done",
      segments,
    };
    postMessageSafe(done);
  }
};

