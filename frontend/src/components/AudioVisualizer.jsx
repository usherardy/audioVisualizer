import React, { useEffect, useRef } from "react";

export default function AudioVisualizer({ config, visualMode }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const freqDataRef = useRef(null);
  const timeDataRef = useRef(null);
  const rafIdRef = useRef(null);

  const particlesRef = useRef([]);
  const beatStateRef = useRef({ history: [], lastBeatTime: 0 });
  const visualModeRef = useRef(visualMode);

  // Keep latest mode in a ref so the animation loop can read it
  useEffect(() => {
    visualModeRef.current = visualMode;
  }, [visualMode]);

  const {
    beatSensitivity = 1.4,
    historySize = 60,
    minBeatGapMs = 150,
    particleBurstCount = 50,
    particleMaxLife = 1200
  } = config || {};

  const clearAnimation = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const setupAudio = async (file) => {
    if (!file) return;

    // Stop previous animation and audio context
    clearAnimation();

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext", e);
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      freqDataRef.current = null;
      timeDataRef.current = null;
    }

    // Reset particles & beat history
    particlesRef.current = [];
    beatStateRef.current = { history: [], lastBeatTime: 0 };

    const url = URL.createObjectURL(file);
    const audioElement = audioRef.current;
    audioElement.src = url;
    audioElement.load();

    // Start playing (may require user to hit play if autoplay blocked)
    audioElement.play().catch(() => {
      // ignore autoplay errors; user can click play
    });

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const source = audioCtx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;
    freqDataRef.current = freqData;
    timeDataRef.current = timeData;

    startAnimation();
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setupAudio(file);
  };

  // --- DSP: beat detection based on bass energy ---
  const detectBeat = (bassEnergy, nowMs) => {
    const state = beatStateRef.current;
    const history = state.history;

    const avg =
      history.length > 0
        ? history.reduce((sum, v) => sum + v, 0) / history.length
        : bassEnergy;

    const threshold = avg * beatSensitivity;
    const isAbove = bassEnergy > threshold;
    const enoughTimePassed = nowMs - state.lastBeatTime > minBeatGapMs;

    let isBeat = false;
    let strength = 0;

    if (isAbove && enoughTimePassed) {
      isBeat = true;
      state.lastBeatTime = nowMs;
      strength = avg > 0 ? bassEnergy / avg : 1;
    }

    // Maintain moving average history
    history.push(bassEnergy);
    if (history.length > historySize) {
      history.shift();
    }

    return { isBeat, strength };
  };

  // --- Particle spawning: original center burst mode ---
  const spawnParticlesCenter = (cx, cy, strength) => {
    const particles = particlesRef.current;
    const baseCount = particleBurstCount;
    const count = Math.floor(baseCount * Math.min(strength, 3));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4 * strength;

      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: particleMaxLife,
        maxLife: particleMaxLife
      });
    }
  };

  // --- Particle spawning: new wave-following mode ---
  const spawnParticlesOnWave = (ctx, timeData, strength) => {
    const particles = particlesRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    if (!timeData || timeData.length === 0) return;

    // How many points along the wave to spawn from
    const steps = 40;
    const baseCount = Math.floor(particleBurstCount * 0.7);
    const count = Math.floor(baseCount * Math.min(strength, 3));

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1); // 0..1
      const idx = Math.min(
        timeData.length - 1,
        Math.floor(t * timeData.length)
      );
      const v = timeData[idx] / 255; // 0..1
      const midY = height * 0.5;
      const amplitude = height * 0.25;
      const x = t * width;
      const y = midY + (v - 0.5) * 2 * amplitude;

      // For each wave point, maybe spawn a few particles
      const localCount = Math.max(1, Math.floor(count / steps));
      for (let j = 0; j < localCount; j++) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const baseSpeed = 1.0 + 2.5 * strength;
        const vx = dir * (baseSpeed + Math.random() * baseSpeed);
        const vy = (Math.random() - 0.5) * baseSpeed;

        particles.push({
          x,
          y,
          vx,
          vy,
          size: 1.5 + Math.random() * 2.5,
          life: particleMaxLife * (0.5 + Math.random() * 0.5),
          maxLife: particleMaxLife
        });
      }
    }
  };

  const updateAndDrawParticles = (ctx, deltaMs) => {
    const particles = particlesRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const lifeRatio = p.life / p.maxLife;

      // Motion
      p.x += p.vx;
      p.y += p.vy;

      // Light drag
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Gentle downward pull
      p.vy += 0.01 * (deltaMs / 16.67);

      p.life -= deltaMs;
      if (
        p.life <= 0 ||
        p.x < -50 ||
        p.x > width + 50 ||
        p.y < -50 ||
        p.y > height + 50
      ) {
        particles.splice(i, 1);
        continue;
      }

      // Draw
      const alpha = Math.max(lifeRatio, 0);
      ctx.globalAlpha = alpha;

      // Color: from bluish to pinkish as it dies
      const r = Math.floor(200 + (1 - lifeRatio) * 55);
      const g = Math.floor(90 + lifeRatio * 40);
      const b = Math.floor(210 + lifeRatio * 45);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const startAnimation = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const freqData = freqDataRef.current;
    const timeData = timeDataRef.current;

    if (!canvas || !analyser || !freqData || !timeData) return;

    const ctx = canvas.getContext("2d");
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const width = canvas.width;
      const height = canvas.height;

      // Background with slight trail for both modes
      ctx.fillStyle = "rgba(5, 8, 20, 0.45)";
      ctx.fillRect(0, 0, width, height);

      // Compute bass energy from low bins for beat detection
      const bassBins = Math.min(32, freqData.length);
      let bassSum = 0;
      for (let i = 0; i < bassBins; i++) {
        bassSum += freqData[i];
      }
      const bassEnergy = bassSum / bassBins;

      const { isBeat, strength } = detectBeat(bassEnergy, now);

      const mode = visualModeRef.current;

      if (mode === "center") {
        // --- ORIGINAL MODE: center pulse + burst ---

        const cx = width / 2;
        const cy = height / 2 + height * 0.1;

        // Pulse circle
        const pulseRadius = 40 + (isBeat ? 20 * strength : 10);
        ctx.beginPath();
        ctx.strokeStyle = isBeat
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(140, 150, 230, 0.6)";
        ctx.lineWidth = isBeat ? 3 : 1.5;
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (isBeat) {
          spawnParticlesCenter(cx, cy, strength);
        }

        // Little spectrum bars at top
        const barWidth = (width / freqData.length) * 1.5;
        let x = 0;
        ctx.fillStyle = "rgba(140, 180, 255, 0.7)";
        for (let i = 0; i < freqData.length; i++) {
          const barHeight = (freqData[i] / 255) * (height * 0.25);
          ctx.fillRect(
            x,
            height * 0.05 + (height * 0.25 - barHeight),
            barWidth,
            barHeight
          );
          x += barWidth + 1;
        }
      } else if (mode === "wave") {
        // --- NEW MODE: waveform + particles flowing along it ---

        if (timeData.length > 0) {
          const midY = height * 0.5;
          const amplitude = height * 0.25;

          ctx.beginPath();
          for (let i = 0; i < timeData.length; i++) {
            const t = i / (timeData.length - 1);
            const sample = timeData[i] / 255; // 0..1
            const x = t * width;
            const y = midY + (sample - 0.5) * 2 * amplitude;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "rgba(150, 190, 255, 0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (isBeat) {
          spawnParticlesOnWave(ctx, timeData, strength);
        }
      }

      // Draw and update particles (used in both modes)
      updateAndDrawParticles(ctx, deltaMs);

      rafIdRef.current = requestAnimationFrame(render);
    };

    clearAnimation();
    rafIdRef.current = requestAnimationFrame(render);
  };

  // Handle canvas sizing (simple, no hi-DPI to avoid weird scaling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 360;
      canvas.style.width = rect.width + "px";
      canvas.style.height = "360px";
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgb(5, 8, 20)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnimation();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="visualizer-container">
      <div className="controls">
        <label className="file-input-label">
          <span>Select audio file</span>
          <input type="file" accept="audio/*" onChange={onFileChange} />
        </label>
        <audio ref={audioRef} controls className="audio-player" />
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
