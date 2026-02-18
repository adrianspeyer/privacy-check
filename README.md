# 🔍 Privacy Check

Audit your digital footprint. Adjust settings. Rescan to verify your privacy.

Privacy Check is a free, open-source tool that shows you — in real time — what modern websites can silently learn about you using standard browser APIs. It runs on your device and does not ship analytics or trackers.

---

## What it shows

Privacy Check highlights two kinds of information:

- **Actionable Security** (things you can improve)
  - Ad blocking signals
  - Global Privacy Control
  - Permission states (camera, mic, notifications, etc.)
  - Network/WebRTC exposure
  - Manual “sensitive access” tests (only when you tap)

- **Device Footprint** (things that make you unique)
  - Hardware signals (screen, CPU, RAM)
  - Fingerprinting demos (canvas)
  - Behavior demo (mouse/touch trails)
  - Media and battery signals (varies by browser)

---

## Quick start

### Option A — Local (open the file)
1. Download the repo
2. Open `index.html` in a browser

Most features work locally.
The VPN / public IP test may be limited locally because it uses a Netlify endpoint when deployed.

### Option B — Deploy on Netlify (recommended)
1. Push the repo to GitHub
2. In Netlify, create a new site from the repo
3. Deploy

That’s it. This repo includes a `netlify.toml` and a Netlify Function so the VPN test works out of the box.

---

## File structure

~~~text
privacy-check/
├── index.html
├── sw.js
├── manifest.json
├── icon-192.png
├── icon-512.png
├── netlify.toml
├── netlify/
│   └── functions/
│       └── ip.js
└── README.md
~~~

---

## VPN test (simple and fast)

There is no built-in browser API that reveals your public IP address directly.
To make VPN testing easy, the app includes a button-based test that captures your public IP when you request it.

How to test:
1. Open **Network Exposure**
2. Press **Capture / Compare IP** once (VPN off)
3. Turn VPN on
4. Press **Capture / Compare IP** again

If the IP changes, the app labels it as a likely VPN / route change.
(That can also happen if you switch networks — so it’s “likely”, not a guarantee.)

Netlify users:
- The public IP is fetched from your own deploy using `/.netlify/functions/ip`.

Non-Netlify hosting:
- The app may fall back to a public IP endpoint only when you click the VPN test button.
- You can disable the fallback by setting `ALLOW_IPIFY_FALLBACK = false` in `index.html`.

---

## Updating versions (maintainers)

When you publish a new version:
- Update the version in **two places**
  - `index.html` → `APP_VERSION`
  - `sw.js` → `CACHE_NAME`

Example:
- `APP_VERSION = 'v3.9'`
- `CACHE_NAME = 'privacy-check-v3.9'`

Users will see an “Update Available” toast when a new service worker is installed.

---

## License

MIT — use it, fork it, teach with it.

Made in Canada with love 🇨🇦
