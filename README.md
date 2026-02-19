# 🔍 Privacy Check

**Audit your digital footprint. Adjust settings. Rescan to verify your privacy.**

No hacks. No tricks. Just standard browser APIs doing what they were designed to do. The results might surprise you.

---

## What Is This?

Privacy Check is a free, open-source tool that shows you — in real time — what data websites can silently collect about you.

- Runs entirely on your device
- No accounts, no tracking, no analytics
- No uploads, no servers storing your results

Built as an educational tool for **seniors, teens, teachers, and anyone who wants to understand what they’re giving away** every time they open a browser.

---

## The “Dual-Tier” Logic

Most privacy tools give you a scary grade because your screen size is unique. That’s not helpful.

Privacy Check splits results into two meaningful categories:

### 1) 🛡️ Actionable Security (The Grade)
These are risks you can realistically fix. Your A–F grade is based **only** on these items.

Examples:
- **Ad Blocking** (are tracking scripts being blocked?)
- **Global Privacy Control** (are you signaling “Do Not Sell/Share”?)
- **Permissions** (have you granted Camera/Mic/Location already?)
- **WebRTC exposure** (are candidates revealing network details?)

### 2) 👣 Device Footprint (The Complexity)
These identify you, but are often hard to change. They do **not** lower your grade — they teach you how unique your setup is.

Examples:
- Hardware (screen, RAM, cores)
- Fingerprints (canvas rendering)
- Identity signals (user agent, timezone)

---

## ✨ Features

- **🔄 Rescan Button** — Updates results without rebuilding the UI (no jumping/scrolling).
- **🧪 VPN Test (Simple)** — A two-step check that compares your public IP:
  1. Press **VPN Test** once (VPN OFF) to save a baseline IP.
  2. Turn VPN ON and press **VPN Test** again to compare.
- **🎓 Smart Action Plan** — Generates a simple “what to do next” summary from your results.
- **📊 Privacy Report Card** — Overall A–F grade with a progress bar.
- **🎛️ Organized Sections** — Clear separation between actionable risks and fingerprint/footprint data.
- **🌗 Light & Dark Mode** — Toggle in the sticky header.
- **♿ Accessible** — Keyboard friendly and readable (never relies on color alone).
- **📱 PWA Ready** — Installable, offline capable, designed for mobile “native” feel.

---

## 🛠️ Tech Stack

- Single `index.html` (no build step)
- Speyer UI (SUI) via CDN
- Inter font via Google Fonts
- Service worker for offline caching + controlled updates
- Netlify-friendly (includes `netlify.toml`)

---

## 🚀 Getting Started

### Option 1: Open Locally
Download `index.html` and open it in a browser.

Note: Some tests behave differently when not served over HTTPS.

### Option 2: Deploy as a PWA (Recommended)
Deploy the folder on any static host (Netlify, GitHub Pages, Vercel, Cloudflare Pages).

Required files:

    privacy-check/
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── icon-192.png
    └── icon-512.png

### Option 3: Netlify (Best “Clone & Go”)
1. Clone the repo
2. Deploy to Netlify
3. You’re done

This repo includes a `netlify.toml` that helps ensure service worker updates are picked up reliably.

---

## 🧪 How To Test VPN (Without Confusion)

The VPN test is intentionally simple and user-initiated:

1. Press **VPN Test** once (VPN OFF) → saves baseline public IP  
2. Turn VPN ON  
3. Press **VPN Test** again → compares the new IP to baseline  

Results show under **Network Exposure** (baseline IP + latest IP + status).

Important: An IP can change for reasons other than a VPN (mobile network changes, router changes, ISP behavior). This is a “best effort” educational test, not a forensic guarantee.

---

## Who Is This For?

- **Seniors** who want to understand what “tracking” looks like
- **Teens** who grew up online but never saw what’s under the hood
- **Teachers** looking for a safe, visual digital literacy demo
- **Anyone** testing whether privacy tools are actually doing anything

---

## Contributing

Found a browser API I missed? Have a clearer explanation for a data point? PRs are welcome.

---

## License

MIT — use it, fork it, teach with it.

Made in Canada with love 🇨🇦

---

# Changelog

## v3.8.1
- Improved VPN testing UX:
  - Added a single “VPN Test” button in the header
  - Two-step flow: set baseline (VPN off) → compare (VPN on)
  - Stores baseline/latest IP and status without UI jumping
- Stabilized Rescan:
  - Rescan updates panels in place (no full UI rebuild / no scroll jumping)
- Service Worker improvements:
  - Cache version bump
  - Avoid caching dynamic endpoints (e.g., Netlify functions / public IP calls)
  - Network-first navigation to pick up new `index.html` reliably

## v3.5
- Initial public release of Privacy Check PWA with report card, sections, and reactive rescanning
