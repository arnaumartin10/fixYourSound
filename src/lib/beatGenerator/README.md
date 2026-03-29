# Beat Generator Sample-Based Audio Engine

## Overview

The upgraded Beat Generator now uses high-quality audio samples from the `/public/sounds/drum-kits/` folder structure instead of synthesized sounds. This provides professional-quality drum sounds with intelligent sample selection based on user prompts.

## Folder Structure

```
public/sounds/drum-kits/
├── electronic/
│   ├── kick/
│   │   ├── sample-0.wav
│   │   ├── sample-1.wav
│   │   └── ...
│   ├── snare/
│   ├── closed-hihat/
│   └── open-hihat/
├── pop/
├── rock/
├── latino/
└── rap-trap/
    ├── kick/
    ├── snare/
    ├── closed-hihat/
    └── open-hihat/
```

## File Organization

### New Modules

#### 1. **SampleLoader.ts** (`src/lib/beatGenerator/SampleLoader.ts`)
Handles loading and managing drum samples using Tone.js Samplers.

**Key Functions:**
- `createDrumKitSampler(genre, prompt)` - Creates a complete drum kit with 4 Samplers
- `resolveSamplePath(genre, drumType, prompt)` - Intelligently selects sample based on prompt analysis
- `triggerDrumSample(sampler, time, duration)` - Triggers a sample at the specified time
- `getSamplesLoadingProgress(kitSampler)` - Returns loading progress (0-100)
- `clearSampleCache()` - Cleans up loaded samples

**Features:**
- Automatic fallback to generic samples if specific genre samples are missing
- Caching system to avoid reloading samples
- Graceful error handling with console warnings

#### 2. **PromptAnalyzer.ts** (`src/lib/beatGenerator/PromptAnalyzer.ts`)
Analyzes user prompts to determine drum characteristics and select appropriate samples.

**Key Functions:**
- `analyzePrompt(prompt)` - Analyzes prompt and returns keywords + characteristics
- `selectSampleIndex(analysis, totalSamples)` - Selects sample variation index
- `getSampleWeighting(analysis, sampleIndex, totalSamples)` - Calculates sample priority

**Supported Keywords:**
- **Heavy:** "heavy", "thick", "powerful", "deep", "dense", "fat"
- **Distorted:** "distorted", "gritty", "dirty", "grimy", "raw", "harsh"
- **Hard:** "hard", "knockout", "bang", "crack", "sharp", "aggressive"
- **Soft:** "soft", "smooth", "gentle", "warm", "mellow", "subtle"
- **Punchy:** "punchy", "snappy", "tight", "quick", "percussive", "bright"
- **Crisp:** "crisp", "clear", "clean", "bright", "articulate"
- **Tight:** "tight", "locked", "strict", "rigid"
- **Loose:** "loose", "swing", "groove", "relaxed", "laid-back"

## Implementation Details

### Beat Generator Component Updates

**Old Approach (Synthesized):**
- Used Tone.MembraneSynth, NoiseSynth, and MetalSynth
- No sample library - real-time synthesis only
- Limited to predefined drum kit templates

**New Approach (Sample-Based):**
- Uses Tone.Sampler for professional audio playback
- Accesses `/public/sounds/drum-kits/[genre]/[drumType]/` folders
- Intelligently selects samples based on prompt keywords
- Pre-loading with visual feedback ("Loading High-Quality Samples...")

### Intelligent Sample Selection Flow

```
User enters prompt
    ↓
analyzePrompt() extracts keywords and characteristics
    ↓
selectSampleIndex() determines which variation to use (0-4)
    ↓
resolveSamplePath() builds the full path
    ↓
initializeSampler() loads the sample with Tone.Sampler
    ↓
If sample not found → Use fallback (electronic kit)
    ↓
triggerDrumSample() plays at the right time
```

### Volume Levels (Default)
- Kick: -6 dB
- Snare: -8 dB
- Closed Hat: -10 dB
- Open Hat: -9 dB

## UI Improvements

### Loading State
When the user clicks "Play", a loading indicator appears showing:
- "Loading High-Quality Samples..." message
- Progress bar (0-100%)
- Status text: "Resolving samples..." → "Pre-buffering audio..." → "Almost ready..."

### Playback Controls
- Play button is disabled during sample loading
- Stop button works during both loading and playback
- New "Kit Genre" metadata row shows which folder is being used

## Fallback Mechanism

If a specific sample is missing:
1. First attempt: Load from selected genre folder
2. If 404 or timeout: Fall back to `/electronic/[drumType]/sample-0.wav`
3. If fallback fails: Return silent sampler with error logged

This ensures users never hear silence or encounter errors.

## Sample Naming Convention

Recommended naming for sample variations:
- `sample-0.wav` - Softest/Most mellow (lower aggression)
- `sample-1.wav` - Medium (neutral)
- `sample-2.wav` - Hard-hitting (more aggression)
- `sample-3.wav` - Extra aggressive
- `sample-4.wav` - Extreme (most aggression)

The prompt analyzer uses these indices to select the best match.

## Setting Up Samples

### Step 1: Create Folder Structure
```bash
mkdir -p public/sounds/drum-kits/{electronic,pop,rock,latino,rap-trap}/{kick,snare,closed-hihat,open-hihat}
```

### Step 2: Add .wav or .mp3 Files
Place drum samples in the appropriate folders. For each drum type, you can add:
```
public/sounds/drum-kits/rock/kick/
├── sample-0.wav (soft kick)
├── sample-1.wav (medium kick)
└── sample-2.wav (hard kick)
```

### Step 3: Test Loading
Start playback and check the console for:
- `✓ Loaded [genre]/[drumType]` - Success
- Warnings for missing samples - Fallback in action

## Performance Considerations

- **Caching:** Samples are cached after first load
- **Pre-loading:** All 4 drums load in parallel using Promise.all()
- **Memory:** Tone.js handles buffer management
- **Cleanup:** `clearSampleCache()` disposes samplers on unmount

## Browser Compatibility

Requires browsers supporting:
- Web Audio API
- Tone.js 14.8.0+
- ES6+ JavaScript

## Error Handling

All errors are gracefully handled:
1. Missing folders → Fallback to electronic kit
2. Timeout (5s) → Use fallback sample
3. Network issues → Console warning + silent playback
4. Context issues → Automatically starts Tone context

## Future Improvements

- [ ] Add multiple sample variation naming schemes
- [ ] Implement dynamic sample blending (crossfade between variations)
- [ ] Add sample preview playback in browser
- [ ] Web audio analysis to suggest keywords automatically
- [ ] Sample library upload/management UI
