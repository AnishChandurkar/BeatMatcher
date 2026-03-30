"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import "./globals.css";
import { AudioEngine } from "./audio";
import { TRACKS, BeatMap, Note } from "./beatmaps";

const MAX_LIVES = 5;

type GameState = "MENU" | "COUNTDOWN" | "PLAYING" | "RESULTS";

interface ActiveCircle {
  id: string;
  noteIndex: number;
  note: Note;
  number: number;
}

interface FeedbackData {
  id: string;
  x: number;
  y: number;
  type: "300" | "100" | "50" | "miss";
}

function getGrade(acc: number): { letter: string; color: string } {
  if (acc >= 100) return { letter: "SS", color: "#38bdf8" };
  if (acc >= 95) return { letter: "S", color: "#fbbf24" };
  if (acc >= 90) return { letter: "A", color: "#4ade80" };
  if (acc >= 80) return { letter: "B", color: "#60a5fa" };
  if (acc >= 60) return { letter: "C", color: "#c084fc" };
  return { letter: "D", color: "#f87171" };
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [countdown, setCountdown] = useState(3);
  const [, forceRender] = useState(0);

  // Track selection
  const selectedTrack = useRef<BeatMap | null>(null);

  // Game state refs
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const accuracyRef = useRef(100);
  const hitsRef = useRef({ total: 0, weighted: 0, h300: 0, h100: 0, h50: 0, miss: 0 });
  const activeCirclesRef = useRef<ActiveCircle[]>([]);
  const feedbacksRef = useRef<FeedbackData[]>([]);
  const circleNumRef = useRef(1);
  const nextNoteIndexRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const gameStateRef = useRef<GameState>("MENU");
  const areaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const triggerRender = useCallback(() => forceRender(n => n + 1), []);

  // --- Select Track ---
  const selectTrack = (track: BeatMap) => {
    selectedTrack.current = track;
    setCountdown(3);
    setGameState("COUNTDOWN");

    // Countdown 3..2..1
    let c = 3;
    const interval = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(interval);
        startPlaying();
      } else {
        setCountdown(c);
      }
    }, 800);
  };

  // --- Start Playing ---
  const startPlaying = () => {
    const track = selectedTrack.current;
    if (!track) return;

    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    livesRef.current = MAX_LIVES;
    accuracyRef.current = 100;
    hitsRef.current = { total: 0, weighted: 0, h300: 0, h100: 0, h50: 0, miss: 0 };
    activeCirclesRef.current = [];
    feedbacksRef.current = [];
    circleNumRef.current = 1;
    nextNoteIndexRef.current = 0;

    // Start audio
    const engine = new AudioEngine();
    audioRef.current = engine;
    const startTime = engine.start(track.audio);
    gameStartTimeRef.current = startTime;

    setGameState("PLAYING");
    triggerRender();
  };

  // --- End Game ---
  const endGame = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setGameState("RESULTS");
    triggerRender();
  }, [triggerRender]);

  // --- Back to Menu ---
  const backToMenu = () => {
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setGameState("MENU");
    triggerRender();
  };

  // --- Add Feedback ---
  const addFeedback = useCallback(
    (x: number, y: number, type: FeedbackData["type"]) => {
      const fbId = Math.random().toString(36).substring(7);
      feedbacksRef.current = [...feedbacksRef.current, { id: fbId, x, y, type }];
      setTimeout(() => {
        feedbacksRef.current = feedbacksRef.current.filter(f => f.id !== fbId);
        triggerRender();
      }, 600);
    },
    [triggerRender]
  );

  // --- Process a Hit (clicked by player) ---
  // Any click on a visible circle ALWAYS counts as at least a 50.
  // Only unclicked circles that expire are misses (lose a life).
  const processHit = useCallback(
    (circle: ActiveCircle) => {
      const track = selectedTrack.current;
      if (!track || gameStateRef.current !== "PLAYING") return;

      const elapsed = performance.now() - gameStartTimeRef.current;
      const diff = Math.abs(elapsed - circle.note.time);

      let hitType: FeedbackData["type"];
      let scoreAdd: number;

      if (diff <= track.hitWindow300) {
        hitType = "300";
        scoreAdd = 300;
        hitsRef.current.h300++;
      } else if (diff <= track.hitWindow100) {
        hitType = "100";
        scoreAdd = 100;
        hitsRef.current.h100++;
      } else {
        // Any other click = 50 (never a miss from clicking)
        hitType = "50";
        scoreAdd = 50;
        hitsRef.current.h50++;
      }

      let accWeight = 0;
      if (hitType === "300") accWeight = 1;
      else if (hitType === "100") accWeight = 0.8;
      else if (hitType === "50") accWeight = 0.5;

      hitsRef.current.total++;
      comboRef.current++;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      scoreRef.current += scoreAdd + Math.floor(scoreAdd * comboRef.current * 0.1);
      hitsRef.current.weighted += accWeight;

      accuracyRef.current =
        hitsRef.current.total > 0
          ? (hitsRef.current.weighted / hitsRef.current.total) * 100
          : 100;

      const area = areaRef.current;
      if (area) {
        addFeedback(circle.note.x * area.clientWidth, circle.note.y * area.clientHeight, hitType);
      }

      activeCirclesRef.current = activeCirclesRef.current.filter(c => c.id !== circle.id);
      triggerRender();
    },
    [addFeedback, triggerRender]
  );

  // --- Game Loop ---
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const track = selectedTrack.current;
    if (!track) return;

    const loop = () => {
      if (gameStateRef.current !== "PLAYING") return;

      const elapsed = performance.now() - gameStartTimeRef.current;
      elapsedRef.current = elapsed;

      // Check if track ended
      if (elapsed >= track.duration + 500) {
        endGame();
        return;
      }

      let dirty = false;

      // Spawn new circles
      while (
        nextNoteIndexRef.current < track.notes.length &&
        elapsed >= track.notes[nextNoteIndexRef.current].time - track.approachTime
      ) {
        const note = track.notes[nextNoteIndexRef.current];
        const circle: ActiveCircle = {
          id: `${nextNoteIndexRef.current}-${Math.random().toString(36).substring(7)}`,
          noteIndex: nextNoteIndexRef.current,
          note,
          number: circleNumRef.current,
        };
        circleNumRef.current = (circleNumRef.current % 9) + 1;
        activeCirclesRef.current = [...activeCirclesRef.current, circle];
        nextNoteIndexRef.current++;
        dirty = true;
      }

      // Check for missed circles
      const stillActive = activeCirclesRef.current.filter(c => {
        if (elapsed > c.note.time + track.missWindow) {
          // Auto miss
          hitsRef.current.total++;
          hitsRef.current.miss++;
          comboRef.current = 0;
          livesRef.current--;

          accuracyRef.current =
            hitsRef.current.total > 0
              ? (hitsRef.current.weighted / hitsRef.current.total) * 100
              : 100;

          const area = areaRef.current;
          if (area) {
            addFeedback(c.note.x * area.clientWidth, c.note.y * area.clientHeight, "miss");
          }

          if (livesRef.current <= 0) {
            endGame();
            return false;
          }

          dirty = true;
          return false;
        }
        return true;
      });

      if (stillActive.length !== activeCirclesRef.current.length) {
        activeCirclesRef.current = stillActive;
        dirty = true;
      }

      if (dirty) triggerRender();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // Also set up a slower interval for continuous UI updates (timer, progress)
    const uiInterval = setInterval(triggerRender, 50);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(uiInterval);
    };
  }, [gameState, endGame, addFeedback, triggerRender]);

  // --- Read current values ---
  const score = scoreRef.current;
  const combo = comboRef.current;
  const maxC = maxComboRef.current;
  const lives = livesRef.current;
  const accuracy = accuracyRef.current;
  const circles = activeCirclesRef.current;
  const feedbacks = feedbacksRef.current;
  const elapsed = elapsedRef.current;
  const track = selectedTrack.current;
  const progress = track ? Math.min(elapsed / track.duration, 1) : 0;
  const timeLeft = track ? Math.max(0, Math.ceil((track.duration - elapsed) / 1000)) : 0;
  const grade = getGrade(accuracy);

  return (
    <div className="game-container">
      {/* ===== MENU ===== */}
      {gameState === "MENU" && (
        <div className="menu-screen">
          <h1 className="menu-title">BeatMatcher</h1>
          <p className="menu-subtitle">Select a track to play</p>

          <div className="track-grid">
            {TRACKS.map(t => (
              <button
                key={t.id}
                className={`track-card track-${t.difficulty}`}
                onClick={() => selectTrack(t)}
                style={{ "--track-color": t.color } as React.CSSProperties}
              >
                <div className="track-difficulty-badge">{t.difficulty.toUpperCase()}</div>
                <h2 className="track-name">{t.name}</h2>
                <p className="track-sub">{t.subtitle}</p>
                <div className="track-info">
                  <span>{t.notes.length} notes</span>
                  <span>30s</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== COUNTDOWN ===== */}
      {gameState === "COUNTDOWN" && (
        <div className="countdown-screen">
          <h2 className="countdown-track-name">{track?.name}</h2>
          <div className="countdown-number" key={countdown}>
            {countdown}
          </div>
        </div>
      )}

      {/* ===== PLAYING ===== */}
      {gameState === "PLAYING" && (
        <>
          <div className="ui-layer">
            <div className="score-display">
              {Math.floor(score).toString().padStart(7, "0")}
            </div>
            <div className="stats-container">
              <div className="lives-display">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <span key={i} className={`life-heart ${i < lives ? "alive" : "dead"}`}>
                    ♥
                  </span>
                ))}
              </div>
              <div className="accuracy-display">{accuracy.toFixed(2)}%</div>
              <div className="combo-display">{combo}x</div>
            </div>
          </div>

          <div className="play-area" ref={areaRef} onDragStart={e => e.preventDefault()}>
            {/* Timer */}
            <div className="timer-display">{timeLeft}s</div>

            {/* Progress Bar */}
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress * 100}%`,
                  background: track?.color ?? "#f43f5e",
                }}
              />
            </div>

            {/* Circles */}
            {circles.map(circle => {
              const area = areaRef.current;
              if (!area) return null;
              const px = circle.note.x * area.clientWidth;
              const py = circle.note.y * area.clientHeight;
              const approachTime = track?.approachTime ?? 1500;

              return (
                <div
                  key={circle.id}
                  className="hit-circle-wrapper"
                  style={{ left: px, top: py }}
                >
                  <div
                    className="approach-circle"
                    style={{ animation: `shrink ${approachTime}ms linear forwards` }}
                  />
                  <div
                    className="hit-circle"
                    onMouseDown={e => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      processHit(circle);
                    }}
                  >
                    {circle.number}
                  </div>
                </div>
              );
            })}

            {/* Feedbacks */}
            {feedbacks.map(fb => (
              <div
                key={fb.id}
                className={`hit-feedback feedback-${fb.type}`}
                style={{ left: fb.x, top: fb.y }}
              >
                {fb.type === "miss" ? "X" : fb.type}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== RESULTS ===== */}
      {gameState === "RESULTS" && (
        <div className="results-screen">
          <h1 className="results-title" style={{ color: grade.color }}>
            {grade.letter}
          </h1>
          <h2 className="results-track">{track?.name}</h2>

          <div className="results-score">{Math.floor(score).toLocaleString()}</div>

          <div className="results-stats">
            <div className="stat-row">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{accuracy.toFixed(2)}%</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Max Combo</span>
              <span className="stat-value">{maxC}x</span>
            </div>
            <div className="results-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-count" style={{ color: "#38bdf8" }}>
                  {hitsRef.current.h300}
                </span>
                <span className="breakdown-label">300</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-count" style={{ color: "#4ade80" }}>
                  {hitsRef.current.h100}
                </span>
                <span className="breakdown-label">100</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-count" style={{ color: "#fbbf24" }}>
                  {hitsRef.current.h50}
                </span>
                <span className="breakdown-label">50</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-count" style={{ color: "#f87171" }}>
                  {hitsRef.current.miss}
                </span>
                <span className="breakdown-label">Miss</span>
              </div>
            </div>
          </div>

          <div className="results-buttons">
            <button className="btn-primary" onClick={() => track && selectTrack(track)}>
              RETRY
            </button>
            <button className="btn-secondary" onClick={backToMenu}>
              BACK TO MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
