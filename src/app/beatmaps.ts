import { AudioEvent } from "./audio";

// --- Types ---
export interface Note {
  time: number; // ms - when the player should click (perfect hit time)
  x: number;    // 0.0-1.0 horizontal position in play area
  y: number;    // 0.0-1.0 vertical position in play area
}

export interface BeatMap {
  id: string;
  name: string;
  subtitle: string;
  bpm: number;
  duration: number;       // ms
  difficulty: "easy" | "medium" | "hard";
  approachTime: number;   // ms - how long approach circle takes to shrink
  hitWindow300: number;
  hitWindow100: number;
  hitWindow50: number;
  missWindow: number;
  color: string;
  notes: Note[];
  audio: AudioEvent[];
}

// --- Position Pattern Helpers ---
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function circlePos(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function clampPos(v: number): number {
  return Math.max(0.08, Math.min(0.92, v));
}

// Generate positions in a circle pattern
function circlePattern(cx: number, cy: number, r: number, n: number, startAngle = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (2 * Math.PI * i) / n;
    return { x: clampPos(cx + r * Math.cos(a)), y: clampPos(cy + r * Math.sin(a)) };
  });
}

// Generate positions in a line
function linePattern(x1: number, y1: number, x2: number, y2: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: clampPos(lerp(x1, x2, n === 1 ? 0.5 : i / (n - 1))),
    y: clampPos(lerp(y1, y2, n === 1 ? 0.5 : i / (n - 1))),
  }));
}

// Generate zigzag positions
function zigzag(startX: number, y: number, endX: number, amp: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: clampPos(lerp(startX, endX, i / (n - 1))),
    y: clampPos(y + amp * (i % 2 === 0 ? -1 : 1)),
  }));
}

// Combine notes with timing
function makeNotes(times: number[], positions: { x: number; y: number }[]): Note[] {
  return times.map((t, i) => ({
    time: t,
    x: positions[i % positions.length].x,
    y: positions[i % positions.length].y,
  }));
}

// ============================================================
// TRACK 1: "STARLIGHT" - Easy (120 BPM)
// Chill electronic, gentle build, satisfying drop
// ============================================================
function generateStarlight(): BeatMap {
  const beat = 500; // ms per beat at 120 BPM
  const b = (n: number) => n * beat;

  const notes: Note[] = [];
  const audio: AudioEvent[] = [];

  // --- INTRO (0-8s, beats 0-15) ---
  // Gentle kicks every 2 beats, hi-hats on off-beats
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) audio.push({ time: b(i), type: "kick" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "hihat" });
  }
  // Soft synth melody
  const introMelody = [261, 329, 392, 329]; // C4, E4, G4, E4
  for (let i = 0; i < 4; i++) {
    audio.push({ time: b(i * 4), type: "synth", freq: introMelody[i], dur: 800 });
  }
  // Circles: every 2 beats, gentle left-right sway
  const introPositions = [
    { x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 },
    { x: 0.3, y: 0.6 }, { x: 0.7, y: 0.6 },
    { x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 },
    { x: 0.4, y: 0.7 }, { x: 0.6, y: 0.7 },
  ];
  for (let i = 0; i < 8; i++) {
    notes.push({ time: b(i * 2), ...introPositions[i] });
  }

  // --- BUILD (8-16s, beats 16-31) ---
  // Add snare on beats 18, 22, 26, 30 (beats 2&4 of each bar)
  for (let i = 16; i < 32; i++) {
    audio.push({ time: b(i), type: "kick" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "hihat" });
    if (i % 4 === 2) audio.push({ time: b(i), type: "snare" });
  }
  // Rising synth melody
  const buildMelody = [330, 392, 440, 494, 523, 587, 659, 784];
  for (let i = 0; i < 8; i++) {
    audio.push({ time: b(16 + i * 2), type: "synth", freq: buildMelody[i], dur: 600 });
  }
  // Sweep leading to drop
  audio.push({ time: b(26), type: "sweep", dur: 3000 });

  // Circles: diagonal patterns, every beat
  const buildPositions = linePattern(0.2, 0.2, 0.8, 0.8, 8)
    .concat(linePattern(0.8, 0.2, 0.2, 0.8, 8));
  for (let i = 0; i < 16; i++) {
    notes.push({ time: b(16 + i), ...buildPositions[i] });
  }

  // --- DROP (16-24s, beats 32-47) ---
  // Heavy beat, crash on beat 32
  audio.push({ time: b(32), type: "crash" });
  for (let i = 32; i < 48; i++) {
    audio.push({ time: b(i), type: "kick" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "snare" });
    audio.push({ time: b(i), type: "hihat" });
    if (i % 4 === 0) audio.push({ time: b(i), type: "bass", freq: 55, dur: 800 });
  }
  // Drop synth - heavy chords
  for (let i = 0; i < 4; i++) {
    audio.push({ time: b(32 + i * 4), type: "synth", freq: 220, dur: 1500 });
    audio.push({ time: b(32 + i * 4), type: "synth", freq: 330, dur: 1500 });
  }
  // Circles: clockwise circle pattern, every beat
  const dropPositions = circlePattern(0.5, 0.5, 0.3, 16, -Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    notes.push({ time: b(32 + i), ...dropPositions[i] });
  }

  // --- OUTRO (24-30s, beats 48-59) ---
  for (let i = 48; i < 60; i++) {
    if (i % 2 === 0) audio.push({ time: b(i), type: "kick" });
    if (i % 4 === 0) audio.push({ time: b(i), type: "synth", freq: 261, dur: 1500 });
  }
  // Circles: converge to center, every 2 beats
  const outroPositions = [
    { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 },
    { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 },
    { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.5 },
  ];
  for (let i = 0; i < 6; i++) {
    notes.push({ time: b(48 + i * 2), ...outroPositions[i] });
  }

  return {
    id: "starlight",
    name: "STARLIGHT",
    subtitle: "Chill Electronic · 120 BPM",
    bpm: 120,
    duration: 30000,
    difficulty: "easy",
    approachTime: 2000,
    hitWindow300: 200,
    hitWindow100: 400,
    hitWindow50: 700,
    missWindow: 400,
    color: "#4ade80",
    notes,
    audio,
  };
}

// ============================================================
// TRACK 2: "NEON RUSH" - Medium (140 BPM)
// Energetic house/EDM, punchy drums, synth stabs
// ============================================================
function generateNeonRush(): BeatMap {
  const beat = 60000 / 140; // ~428.57ms
  const b = (n: number) => Math.round(n * beat);

  const notes: Note[] = [];
  const audio: AudioEvent[] = [];

  // --- INTRO (0-6s, beats 0-13) ---
  // Synth arpeggios, sparse
  const arpNotes = [330, 440, 554, 660, 554, 440]; // E4, A4, C#5, E5...
  for (let i = 0; i < 14; i++) {
    audio.push({ time: b(i), type: "synth", freq: arpNotes[i % arpNotes.length], dur: 300 });
    if (i % 2 === 0) audio.push({ time: b(i), type: "hihat" });
  }
  // Circles every 3 beats - wide spread
  const introPos = [
    { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.5 },
    { x: 0.3, y: 0.7 }, { x: 0.7, y: 0.2 },
    { x: 0.5, y: 0.5 },
  ];
  for (let i = 0; i < 5; i++) {
    notes.push({ time: b(i * 3), ...introPos[i] });
  }

  // --- BUILD (6-14s, beats 14-32) ---
  // Add kicks and snares
  for (let i = 14; i < 33; i++) {
    audio.push({ time: b(i), type: "kick" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "hihat" });
    if (i % 4 === 2) audio.push({ time: b(i), type: "snare" });
    if (i % 4 === 0) audio.push({ time: b(i), type: "clap" });
  }
  // Build melody
  const buildFreqs = [440, 494, 523, 587, 659, 698, 784, 880];
  for (let i = 0; i < 8; i++) {
    audio.push({ time: b(14 + i * 2), type: "synth", freq: buildFreqs[i], dur: 500 });
  }
  // Rising sweep
  audio.push({ time: b(27), type: "sweep", dur: 2500 });

  // Circles: zigzag pattern, every 1.5 beats
  const buildZig = zigzag(0.15, 0.5, 0.85, 0.25, 12);
  for (let i = 0; i < 12; i++) {
    notes.push({ time: b(14 + i * 1.5), ...buildZig[i] });
  }

  // --- DROP (14-24s, beats 33-55) ---
  // Heavy beat + crash
  audio.push({ time: b(33), type: "crash" });
  for (let i = 33; i < 56; i++) {
    audio.push({ time: b(i), type: "kick" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "snare" });
    audio.push({ time: b(i), type: "hihat" });
    if (i % 4 === 0) {
      audio.push({ time: b(i), type: "bass", freq: 65, dur: 600 });
      audio.push({ time: b(i), type: "clap" });
    }
    if (i % 8 === 0) {
      audio.push({ time: b(i), type: "synth", freq: 220, dur: 1200 });
      audio.push({ time: b(i), type: "synth", freq: 330, dur: 1200 });
      audio.push({ time: b(i), type: "synth", freq: 440, dur: 1200 });
    }
  }
  // Bass line during drop
  const bassLine = [65, 73, 82, 65];
  for (let i = 0; i < 6; i++) {
    audio.push({ time: b(33 + i * 4), type: "bass", freq: bassLine[i % bassLine.length], dur: 1200 });
  }

  // Circles: dense patterns - star shape then streams
  // Star pattern (5 points)
  const starOuter = circlePattern(0.5, 0.5, 0.35, 5, -Math.PI / 2);
  const starInner = circlePattern(0.5, 0.5, 0.15, 5, -Math.PI / 2 + Math.PI / 5);
  const starPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    starPositions.push(starOuter[i], starInner[i]);
  }
  // First half of drop: star patterns (every beat)
  for (let i = 0; i < 10; i++) {
    notes.push({ time: b(33 + i), ...starPositions[i] });
  }
  // Second half: rapid streams (every half beat)
  const streamLeft = linePattern(0.2, 0.2, 0.2, 0.8, 6);
  const streamRight = linePattern(0.8, 0.2, 0.8, 0.8, 6);
  for (let i = 0; i < 6; i++) {
    notes.push({ time: b(43 + i), ...streamLeft[i] });
    notes.push({ time: b(43 + i) + beat / 2, ...streamRight[i] });
  }

  // --- OUTRO (24-30s, beats 56-69) ---
  for (let i = 56; i < 70; i++) {
    if (i % 2 === 0) audio.push({ time: b(i), type: "kick" });
    if (i % 4 === 0) audio.push({ time: b(i), type: "synth", freq: 330, dur: 1500 });
  }
  // Wind down circles
  const outroSpiral = circlePattern(0.5, 0.5, 0.25, 7, 0);
  for (let i = 0; i < 7; i++) {
    notes.push({ time: b(56 + i * 2), ...outroSpiral[i] });
  }

  return {
    id: "neon-rush",
    name: "NEON RUSH",
    subtitle: "EDM / House · 140 BPM",
    bpm: 140,
    duration: 30000,
    difficulty: "medium",
    approachTime: 1500,
    hitWindow300: 150,
    hitWindow100: 350,
    hitWindow50: 600,
    missWindow: 350,
    color: "#fbbf24",
    notes,
    audio,
  };
}

// ============================================================
// TRACK 3: "CHAOS ENGINE" - Hard (170 BPM)
// Aggressive DnB/dubstep, heavy bass, complex rhythms
// ============================================================
function generateChaosEngine(): BeatMap {
  const beat = 60000 / 170; // ~352.94ms
  const b = (n: number) => Math.round(n * beat);

  const notes: Note[] = [];
  const audio: AudioEvent[] = [];

  // --- INTRO (0-4s, beats 0-10) ---
  // Dramatic buildup
  for (let i = 0; i < 11; i++) {
    audio.push({ time: b(i), type: "hihat" });
    if (i % 2 === 0) audio.push({ time: b(i), type: "kick" });
    if (i % 4 === 3) audio.push({ time: b(i), type: "snare" });
  }
  audio.push({ time: b(0), type: "synth", freq: 165, dur: 2000 }); // Low E
  audio.push({ time: b(6), type: "sweep", dur: 1800 });

  // Circles: cross pattern
  const crossPos = [
    { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.5 },
    { x: 0.5, y: 0.8 }, { x: 0.2, y: 0.5 },
    { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 },
  ];
  for (let i = 0; i < 6; i++) {
    notes.push({ time: b(i * 2), ...crossPos[i] });
  }

  // --- MAIN (4-10s, beats 11-28) ---
  // Fast drum pattern
  for (let i = 11; i < 29; i++) {
    audio.push({ time: b(i), type: "kick" });
    audio.push({ time: b(i), type: "hihat" });
    if (i % 2 === 1) audio.push({ time: b(i), type: "snare" });
    if (i % 4 === 0) audio.push({ time: b(i), type: "clap" });
  }
  // Aggressive synth
  const mainFreqs = [165, 196, 220, 247, 165, 220, 165, 247, 196];
  for (let i = 0; i < 9; i++) {
    audio.push({ time: b(11 + i * 2), type: "synth", freq: mainFreqs[i], dur: 500 });
    audio.push({ time: b(11 + i * 2), type: "bass", freq: mainFreqs[i] / 2, dur: 500 });
  }
  // Rising sweep to drop
  audio.push({ time: b(23), type: "sweep", dur: 2200 });

  // Circles: rapid zigzag
  const mainZig = zigzag(0.15, 0.5, 0.85, 0.3, 18);
  for (let i = 0; i < 18; i++) {
    notes.push({ time: b(11 + i), ...mainZig[i] });
  }

  // --- DROP (10-22s, beats 29-62) ---
  // MASSIVE drop
  audio.push({ time: b(29), type: "crash" });
  audio.push({ time: b(29), type: "bass", freq: 41, dur: 1500 }); // Low E bass hit

  for (let i = 29; i < 63; i++) {
    // DnB pattern: kick on 1, snare on 3, fast hi-hats
    audio.push({ time: b(i), type: "hihat" });
    if (i % 4 === 0 || i % 4 === 1) audio.push({ time: b(i), type: "kick" });
    if (i % 4 === 2) audio.push({ time: b(i), type: "snare" });
    if (i % 4 === 3) audio.push({ time: b(i), type: "snare" });
    if (i % 8 === 0) {
      audio.push({ time: b(i), type: "crash" });
      audio.push({ time: b(i), type: "bass", freq: 41, dur: 1000 });
    }
  }
  // Wobble bass during drop
  const wobbleFreqs = [55, 41, 55, 62, 41, 55, 41, 62];
  for (let i = 0; i < 8; i++) {
    audio.push({ time: b(29 + i * 4), type: "bass", freq: wobbleFreqs[i], dur: 1200 });
  }
  // Heavy synth stabs
  for (let i = 0; i < 8; i++) {
    audio.push({ time: b(29 + i * 4), type: "synth", freq: 165, dur: 800 });
    audio.push({ time: b(29 + i * 4), type: "synth", freq: 247, dur: 800 });
    audio.push({ time: b(31 + i * 4), type: "synth", freq: 196, dur: 400 });
  }

  // Drop circles: DENSE
  // Phase 1: Tight spiral (beats 29-40)
  const spiral1 = circlePattern(0.5, 0.5, 0.35, 12, 0);
  for (let i = 0; i < 12; i++) {
    notes.push({ time: b(29 + i), ...spiral1[i] });
  }

  // Phase 2: Alternating corners with half-beat hits (beats 41-50)
  const corners = [
    { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 },
    { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 },
    { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 },
    { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 },
  ];
  for (let i = 0; i < 10; i++) {
    notes.push({ time: b(41 + i), ...corners[i % corners.length] });
    // Extra half-beat notes for intensity
    if (i % 2 === 0) {
      const halfPos = corners[(i + 1) % corners.length];
      notes.push({ time: b(41 + i) + beat / 2, ...halfPos });
    }
  }

  // Phase 3: Rapid stream (beats 51-62)
  const stream1 = linePattern(0.15, 0.3, 0.85, 0.3, 6);
  const stream2 = linePattern(0.85, 0.7, 0.15, 0.7, 6);
  for (let i = 0; i < 6; i++) {
    notes.push({ time: b(51 + i * 2), ...stream1[i] });
    notes.push({ time: b(52 + i * 2), ...stream2[i] });
  }

  // --- OUTRO (22-30s, beats 63-84) ---
  for (let i = 63; i < 85; i++) {
    if (i % 2 === 0) audio.push({ time: b(i), type: "kick" });
    if (i % 4 === 2) audio.push({ time: b(i), type: "snare" });
    audio.push({ time: b(i), type: "hihat" });
  }
  audio.push({ time: b(63), type: "synth", freq: 165, dur: 3000 });
  audio.push({ time: b(75), type: "synth", freq: 165, dur: 4000 });

  // Outro circles: still fast but spacing out
  const outroCirc = circlePattern(0.5, 0.5, 0.3, 11, Math.PI);
  for (let i = 0; i < 11; i++) {
    notes.push({ time: b(63 + i * 2), ...outroCirc[i] });
  }

  return {
    id: "chaos-engine",
    name: "CHAOS ENGINE",
    subtitle: "DnB / Dubstep · 170 BPM",
    bpm: 170,
    duration: 30000,
    difficulty: "hard",
    approachTime: 1200,
    hitWindow300: 100,
    hitWindow100: 250,
    hitWindow50: 500,
    missWindow: 300,
    color: "#f43f5e",
    notes,
    audio,
  };
}

// --- Apply warmup offset so players have time to react ---
const WARMUP_MS = 3500;

function applyWarmup(map: BeatMap): BeatMap {
  return {
    ...map,
    duration: map.duration + WARMUP_MS,
    notes: map.notes.map(n => ({ ...n, time: n.time + WARMUP_MS })),
    audio: map.audio.map(a => ({ ...a, time: a.time + WARMUP_MS })),
  };
}

// Export all tracks
export const TRACKS: BeatMap[] = [
  applyWarmup(generateStarlight()),
  applyWarmup(generateNeonRush()),
  applyWarmup(generateChaosEngine()),
];

export function getTrack(id: string): BeatMap | undefined {
  return TRACKS.find(t => t.id === id);
}
