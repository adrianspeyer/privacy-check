# 🔍 Privacy Check

**See exactly what your phone and browser reveal about you — just by visiting a website.**

No hacks. No tricks. Just standard browser APIs doing what they were designed to do. The results might surprise you.

## What Is This?

Privacy Check is a free, open-source tool that shows you — in real time — all the data websites can silently collect about you. It runs entirely on your device. Nothing is sent anywhere. Zero tracking. Zero irony.

It was built as an educational tool for **seniors, teens, and anyone who wants to understand what they're giving away** every time they open a browser.

## What Does It Detect?

A lot. Here's the short version:

- **Device Identity** — Your browser, OS, language, timezone, and more. Before you've typed a single character.
- **Hardware Profile** — Screen size, CPU cores, RAM, pixel density, refresh rate. Enough to narrow down your exact device.
- **Network Exposure** — Connection type, speed, latency, and your local IP address leaking through WebRTC (yes, even through VPNs).
- **Behavior Tracking** — An interactive demo showing how every touch, mouse movement, scroll, and keystroke can be captured.
- **Phone Sensors** — Accelerometer, gyroscope, compass, ambient light, magnetometer, proximity. Your phone is a sensor array.
- **Media & Capabilities** — Camera resolution, mic/speaker labels, installed voice packs, supported codecs.
- **Browser Capabilities** — Cookies, storage APIs, service workers, NFC, Bluetooth, vibration, push notifications, wake lock, screen capture, and dozens more.
- **GPU & Graphics** — Your exact GPU model, extensions, and rendering characteristics.
- **Your Preferences** — Dark mode, reduced motion, color gamut, HDR, high contrast. Every setting is a data point.
- **Font Detection** — Tests 38 common fonts. Your combination is almost unique.
- **Invisible Fingerprints** — Canvas, audio, and WebGL fingerprints that survive clearing cookies and incognito mode.
- **Timing & Performance** — Page load, timer precision, CPU benchmarks, memory limits.
- **Permission-Gated Data** — Location, clipboard, camera resolution, vibration, wake lock. What happens when you tap "Allow."
- **Battery Status** — Level, charging state, and drain rate. No permission needed in some browsers.

Each data point includes a plain-language explanation of **why it matters** and how it can be used to track you.

## Features

- 📊 **Privacy Report Card** — Overall A–F grade with per-category scores and a progress bar
- 🎛️ **Collapsible Sections** — 16 categories, all expandable/collapsible (SUI accordion)
- 🌗 **Light & Dark Mode** — Toggle switch, persists your choice
- 👆 **Interactive Demos** — Touch/mouse tracking visualization, scroll depth counter, permission tests
- 🛡️ **Protection Check** — Tests your browser for HTTPS, ad blockers, WebRTC leaks, cookie blocking, and fingerprint randomization
- 💡 **What You Can Do** — 10 practical tips with specific tool recommendations
- ♿ **Accessible** — WCAG 2.1 AA, keyboard navigable, screen reader friendly, color never used alone as an indicator
- 📱 **PWA** — Installable on your home screen, works offline

## Tech Stack

- Single HTML file (~52KB), no build step
- [Speyer UI (SUI)](https://github.com/adrianspeyer/speyer-ui) design system — tokens, components, accordion, badges, alerts, progress bars
- Inter font via Google Fonts
- Service worker for offline caching
- Zero dependencies. Zero frameworks. Just works.

## Getting Started

### Option 1: Just Open It
Download `index.html` and open it in your browser. Everything works locally.

### Option 2: Deploy as a PWA
Drop all 5 files on any static host served over HTTPS:

```
index.html
manifest.json
sw.js
icon-192.png
icon-512.png
```

Works on GitHub Pages, Netlify, Vercel, Cloudflare Pages — anything that serves static files over HTTPS.

### Option 3: GitHub Pages
1. Fork this repo
2. Go to Settings → Pages → Deploy from main branch
3. Done. Your users can install it as an app from the browser.

## File Structure

```
privacy-check/
├── index.html       # The entire app (single file, ~52KB)
├── manifest.json    # PWA manifest
├── sw.js            # Service worker (offline support)
├── icon-192.png     # App icon (192×192)
├── icon-512.png     # App icon (512×512)
└── README.md        # You're reading it
```

## Who Is This For?

- **Seniors** who want to understand what's happening when they browse the web
- **Teens** who grew up online but never stopped to look under the hood
- **Teachers and educators** who want a live demo for digital literacy classes
- **Event organizers** running privacy awareness workshops
- **Anyone** who's ever wondered "how do they know that about me?"

## Contributing

Found a browser API I missed? Have a better explanation for a data point? PRs are welcome.

If you spot an accessibility issue, please open an issue — that's a priority.

## License

MIT — use it, fork it, teach with it.

---

Made in Canada with love 🇨🇦
