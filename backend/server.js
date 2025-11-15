const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simple API to get visualizer config
app.get("/api/config", (req, res) => {
  const configPath = path.join(__dirname, "config", "visualizerConfig.json");
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const json = JSON.parse(raw);
    res.json(json);
  } catch (err) {
    console.error("Error reading config:", err);
    res.status(500).json({ error: "Failed to read config" });
  }
});

// Example: log beats (later you can persist in DB)
app.post("/api/beat-event", (req, res) => {
  const { timestamp, strength } = req.body || {};
  console.log("Beat detected:", { timestamp, strength });
  res.json({ status: "ok" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend running" });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
