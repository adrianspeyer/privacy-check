# Changelog

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
