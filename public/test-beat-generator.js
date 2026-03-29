/**
 * Test script for Beat Generator sample loading
 * Run this in the browser console to verify everything is working
 */

async function testBeatGenerator() {
  console.log("🎵 Testing Beat Generator Sample Loading...\n");

  // Test 1: Check if API endpoint is available
  console.log("Test 1: Checking API endpoint...");
  try {
    const response = await fetch("/api/list-drum-samples?genre=electronic&drumType=kick");
    if (response.ok) {
      const data = await response.json();
      console.log("✓ API endpoint works!");
      console.log("  Available kick samples:", data.files);
      console.log("  Genre:", data.genre);
      console.log("  Drum Type:", data.drumType);
      console.log("  Total files:", data.count);
    } else {
      console.log("✗ API returned error:", response.status, response.statusText);
      const text = await response.text();
      console.log("  Response:", text);
    }
  } catch (error) {
    console.log("✗ API endpoint failed:", error);
  }

  console.log("\n");

  // Test 2: Check if Tone.js is loaded
  console.log("Test 2: Checking Tone.js...");
  if (typeof Tone !== "undefined") {
    console.log("✓ Tone.js is loaded!");
    console.log("  Tone version:", Tone.version);
    console.log("  Context state:", Tone.context.state);
  } else {
    console.log("✗ Tone.js is not loaded");
  }

  console.log("\n");

  // Test 3: Test sample path resolution
  console.log("Test 3: Testing sample loading...");
  try {
    const response = await fetch("/api/list-drum-samples?genre=rock&drumType=snare");
    if (response.ok) {
      const { files, genre } = await response.json();
      const firstFile = files[0];
      const samplePath = `/sounds/drum-kits/${genre}/snare/${firstFile}`;
      console.log("✓ Sample path resolved:");
      console.log("  Path:", samplePath);
      
      // Try to load a small sample
      try {
        const audioResponse = await fetch(samplePath);
        if (audioResponse.ok) {
          console.log("✓ Sample file is accessible!");
          console.log("  Size:", audioResponse.headers.get("content-length"), "bytes");
        } else {
          console.log("✗ Sample file returned:", audioResponse.status);
        }
      } catch (e) {
        console.log("✗ Could not fetch sample:", e.message);
      }
    }
  } catch (error) {
    console.log("✗ Sample loading test failed:", error);
  }

  console.log("\n");

  // Test 4: Test all genres
  console.log("Test 4: Checking all genres...");
  const genres = ["electronic", "pop", "rock", "latino", "rap-trap"];
  for (const genre of genres) {
    try {
      const response = await fetch(`/api/list-drum-samples?genre=${genre}&drumType=kick`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ ${data.genre}: ${data.count} kick samples`);
      } else {
        console.log(`✗ ${genre}: ${response.status} error`);
      }
    } catch (error) {
      console.log(`✗ ${genre}: ${error.message}`);
    }
  }

  console.log("\n✅ Tests complete! Check the results above.");
  console.log("\nNext steps:");
  console.log("1. Go to Beat Generator page");
  console.log("2. Enter a prompt like 'heavy rock beat'");
  console.log("3. Click 'Generate Beat'");
  console.log("4. Click 'Play' and check if samples load");
}

// Run the test
testBeatGenerator();
