# Changelog

## v4.0.0
- Replaced heuristic security grades and unsupported fingerprint-bit estimates with observed findings, check coverage, and explicit limits.
- Rebuilt the responsive interface with local styles, accessible status messages, keyboard navigation, light/dark themes, and reduced-motion support.
- Removed external scripts, fonts, and public-IP fallback services; automatic checks make no permission requests.
- Made permission, cosmetic filtering, WebRTC, canvas, and unsupported-API results more accurate and bounded asynchronous checks to prevent stalled rescans.
- Changed IP comparison to an optional same-origin request with validated addresses, timeouts, session-only results, and clear hosting-log disclosure. Removed older saved IP comparisons.
- Added local JSON report downloads that exclude addresses and canvas hashes, plus a control to clear the saved theme and optional experiment results.
- Made canvas sampling opt-in because protected browsers may prompt before readback; automatic checks do not request it.
- Added explicit media-count, file-selection, motion, and pointer demonstrations with limited data handling and cleanup.
- Hardened the IP function, security headers, and offline cache. App assets install together, updates are user-controlled, deployment paths are relative, and unrelated caches are preserved.
- Added Node regression tests and an isolated headless-browser smoke runner.

## v3.8.5
- Grade + scoring reliability
  - Grade now updates immediately when scored items change (scheduled UI update)
  - Fixed VPN scoring write (was accidentally writing to this.RiskMap)
  - Browser + Cookies are now advisory (not scored), so “good setup on Chrome” can still earn an A
  - WebRTC local IP leak is weighted more heavily (as intended)

## v3.8.4
- Grade calibration
  - Adjusted grade thresholds so “recommendations” (like Cookies + GPC) don’t force a C
  - VPN test now contributes a small amount to the grade (CHANGED = best)

## v3.8.3
- Rescan stability
  - Rescan is now async-safe (prevents races and “blank panel” moments)
  - Adds a visible “Scanning…” state
- VPN Test UX
  - Single button in the header
  - Two-step baseline/compare flow (public IP)
  - Stores baseline/latest locally
- AdBlock detection fix
  - Uses a sized bait element so detection is not inverted or random
- SW caching hardening
  - Network-first for HTML
  - Never caches Netlify Functions or API endpoints

## v3.8.0
- Initial public release
