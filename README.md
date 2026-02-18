# 🔍 Privacy Check

**Audit your digital footprint. Adjust settings. Rescan to verify your privacy.**

No hacks. No tricks. Just standard browser APIs doing what they were designed to do. The results might surprise you.

---

## What Is This?

Privacy Check is a free, open-source tool that shows you — in real time — what websites can silently learn about you using standard browser APIs. It runs entirely on your device. Nothing is sent anywhere. **Zero tracking. Zero irony.**

It was built as an educational tool for **seniors, teens, and anyone who wants to understand what they're giving away** every time they open a browser.

---

## 🧠 How to Read the Results

Privacy Check splits your results into two useful categories:

### 🛡️ Actionable Security (Your Grade)
Things you can fix. Your A–F grade focuses on practical risks like:
- WebRTC leaks (local IP exposure)
- Tracker blocking / ad blocking
- Global Privacy Control (GPC)
- Browser permission settings (camera, mic, motion, notifications, etc.)

### 👣 Digital Footprint (Your Uniqueness)
Things that identify you but are harder to change (and shouldn’t “fail” you), like:
- Hardware traits (screen, CPU cores, RAM)
- Fingerprinting signals (canvas rendering, audio context)
- Identity traits (user agent, timezone, fonts)

---

## ✨ Features

- **🔄 Rescan Button** — Toggle your VPN or change a setting, then rescan to see changes instantly.
- **🎓 Smart Action Plan** — Personalized guidance based on what the tool detects.
- **📱 PWA (Installable App)** — Install on iOS/Android. Works offline. Feels native.
- **👆 Interactive Demos** — Visualizes touch + mouse tracking behavior in real time.
- **♿ Accessible** — WCAG-minded: keyboard friendly, screen reader friendly, never relies on color alone.

---

## 🛠️ Tech Stack

- Single HTML file (no build step)
- [Speyer UI (SUI)](https://github.com/adrianspeyer/speyer-ui) via CDN
- Service Worker for offline caching + update prompts
- No frameworks. No analytics. No dependencies.

---

## 🚀 Getting Started

### Option 1: Just Open It
Download `index.html` and open it in your browser. Everything runs locally.

### Option 2: Deploy as a PWA
Drop these files onto any static host served over HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages):

```text
privacy-check/
├── index.html       # The application
├── manifest.json    # PWA install config
├── sw.js            # Offline caching + update flow
├── icon-192.png     # App icon
└── icon-512.png     # App icon
```

---

## 🌐 Deploy Notes (Netlify)

This repo includes a `netlify.toml` that helps ensure users get the latest logic quickly (especially `index.html` and `sw.js`).

---

## Who Is This For?

- **Seniors** who want to understand what “tracking” actually looks like  
- **Teens** who grew up online but never looked under the hood  
- **Teachers** who want a safe, visual demo for digital literacy classes  
- **Anyone** who wants to verify whether their browser/VPN setup is actually protecting them  

---

## Contributing

Found a browser API that leaks data? Have a clearer way to explain a fingerprinting technique? Pull requests are welcome.

---

## License

MIT — use it, fork it, teach with it.

---

Made in Canada with love 🇨🇦
