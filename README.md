# 🔍 Privacy Check

**Audit your digital footprint. Adjust settings. Rescan to verify your privacy.**

No hacks. No tricks. Just standard browser APIs doing what they were designed to do. The results might surprise you.

---

## What Is This?

Privacy Check is a free, open-source tool that shows you — in real time — all the data websites can silently collect about you. It runs entirely on your device. Nothing is sent anywhere. Zero tracking. Zero irony.

It was built as an educational tool for **seniors, teens, and anyone who wants to understand what they're giving away** every time they open a browser.

---

## 🧠 The "Dual-Tier" Logic

Unlike other tools that give you a scary "F" just because you have a unique screen size, Privacy Check splits your results into two meaningful categories:

### 1. 🛡️ Actionable Security (The Grade)

Things you can actually fix. Your A–F grade is based **only** on these risks.

- **WebRTC Leaks:** Is your real IP visible through your VPN?
- **Ad Blocking:** Are you stopping invisible trackers?
- **Global Privacy Control:** Is your browser signaling "Do Not Sell"?
- **Permissions:** Have you accidentally granted access to Motion or Camera?

### 2. 👣 Digital Footprint (The Complexity)

Things that identify you but are hard to change. These don't lower your grade, but they show how unique you are.

- **Hardware:** Screen resolution, CPU cores, RAM.
- **Fingerprints:** Canvas rendering, Audio context hashes.
- **Identity:** User Agent string, Timezone, System Fonts.

---

## ✨ Features

- **🔄 Reactive Engine** — Toggle your VPN or change a setting, then hit the sticky "Rescan" button. The dashboard updates instantly without a page reload.
- **🎓 Smart Action Plan** — A dynamic guide that reads your situation (e.g., "You have a VPN, but WebRTC is leaking") and gives tailored advice.
- **📱 Native App Feel** — High-performance PWA. Installable, offline-ready, native scroll physics.
- **👆 Interactive Demos** — Visualizes mouse and touch tracking in real time.
- **♿ Accessible Design** — WCAG 2.1 AA compliant. High contrast, screen reader friendly, never relies on color alone.

---

## 🛠️ Tech Stack

- **Zero Dependencies:** Single HTML file (~60KB). No build step.
- **Design System:** [Speyer UI](https://github.com/adrianspeyer/speyer-ui) (CDN-based).
- **Offline Core:** Service Worker with "Nagging Toast" updates.

---

## 🚀 Getting Started

### Option 1: Just Open It

Download `index.html` and open it in any browser. Works 100% locally.

### Option 2: Deploy as a PWA

Drop these files on any static host (Netlify, Vercel, GitHub Pages):

```text
privacy-check/
├── index.html       # The application
├── manifest.json    # PWA install config
├── sw.js            # Offline logic & updates
├── icon-192.png     # App icon
└── icon-512.png     # App icon
```

> **Note for Netlify Users:**  
> Ensure `sw.js` is served with `Cache-Control: no-cache` so updates happen immediately.  
> A `netlify.toml` is included in the repo for this purpose.

---

## Who Is This For?

- **Seniors** who want to understand what "tracking" actually looks like
- **Teens** who grew up online but never looked under the hood
- **Teachers** looking for a safe, visual demo for digital literacy
- **You**, checking if your VPN is actually working

---

## Contributing

Found a new browser API that leaks data?  
Have a clearer way to explain canvas fingerprinting?

Pull requests are welcome.

---

## License

MIT — Use it, fork it, teach with it.

---

Made in Canada with love 🇨🇦
