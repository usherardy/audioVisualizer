import React, { useEffect, useState } from "react";
import AudioVisualizer from "./components/AudioVisualizer.jsx";

export default function App() {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [visualMode, setVisualMode] = useState("center"); // "center" or "wave"

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error("Failed to fetch config");
        const json = await res.json();
        setConfig(json);
      } catch (err) {
        console.error(err);
        // Fallback defaults if backend is down
        setConfig({
          beatSensitivity: 1.4,
          historySize: 60,
          minBeatGapMs: 150,
          particleBurstCount: 50,
          particleMaxLife: 1200
        });
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, []);

  if (loadingConfig) {
    return (
      <div className="app-root">
        <div className="card">
          <h1>Beat Particle Visualizer</h1>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="card">
        <h1>Beat Particle Audio Visualizer</h1>
        <p className="subtitle">
          Upload a track and watch particles react to the beat.
        </p>

        <div
          style={{
            marginTop: "8px",
            marginBottom: "8px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            fontSize: "0.9rem"
          }}
        >
          <span>Visual mode:</span>
          <select
            value={visualMode}
            onChange={(e) => setVisualMode(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid rgba(130, 160, 255, 0.8)",
              backgroundColor: "rgba(10, 14, 40, 0.9)",
              color: "#f5f7ff"
            }}
          >
            <option value="center">Center Burst (original)</option>
            <option value="wave">Wave Flow (particles on waveform)</option>
          </select>
        </div>

        <AudioVisualizer config={config} visualMode={visualMode} />

        <p className="footer-note">
          Tip: Try a track with strong drums/bass. Change the mode and see the
          difference between center bursts and particles flowing along the wave.
        </p>
      </div>
    </div>
  );
}
