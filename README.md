# 🎧 Beat-Reactive Audio Visualizer (React + Web Audio API)

Real-time music visualization with **beat detection**, **particle effects**, **waveform surfing**, and a **neon-glass UI** — all running in your browser.

[![React](https://img.shields.io/badge/FE-React-61DAFB?logo=react&logoColor=000&labelColor=fff)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite&logoColor=fff)](https://vitejs.dev/)
[![Canvas API](https://img.shields.io/badge/Graphics-Canvas%202D-0A7BBB)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-8A2BE2)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![DSP](https://img.shields.io/badge/DSP-Beat%20Detection%20%2F%20FFT-orange)]()

---

## ✨ Features

- **Two visualization modes**
  - 💥 *Center Burst* — particles explode on every beat  
  - 🌊 *Wave Flow* — particles surf along the waveform  
- **Beat detection** using bass frequency energy  
- **Full bar spectrum equalizer**  
- **Dynamic particle engine**  
- **Real-time FFT analysis**  
- **Responsive canvas resizing**  
- **Neon-glass themed interface**  
- 100% browser-based — no external DSP libraries  

---

## 🧠 DSP Techniques Used

- FFT via `AnalyserNode.frequencyBinCount`
- Time-domain waveform sampling
- Bass-bin averaging for beat strength
- Rolling average adaptive threshold for beat detection
- Slope-based particle motion on waveform
- Smooth animation via `requestAnimationFrame`

---

## 🗂️ Project Structure

beat-visualizer/
│
├── src/
│   ├── components/
│   │   └── AudioVisualizer.jsx     # Core engine (FFT, particles, visuals)
│   ├── App.jsx                     # UI wrapper + mode switcher
│   ├── main.jsx                    # React/Vite bootstrap
│   ├── styles.css                  # Neon glass theme
│   └── ...
│
├── index.html
├── package.json
└── README.md



---

## ⚙️ Setup (Local)

### 1) Install dependencies

```bash
npm install

