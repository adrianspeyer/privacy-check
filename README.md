# Privacy Check

Understand what your browser reveals, review permissions, and explore how device fingerprinting works.

Privacy Check is a small, open-source educational app with no accounts, analytics, external fonts, or CDN dependencies. Automatic checks run in your browser without asking for camera, microphone, location, or motion access. An optional public-IP comparison contacts the site's own host.

## What the results mean

The overview reports observed findings and check coverage. It does **not** assign a security grade, estimate fingerprint “bits,” or certify anonymity.

- **Site permissions:** existing camera, microphone, location, and notification permission states for this origin. Other sites can have different permissions.
- **Browser protections:** secure-context availability, Global Privacy Control when exposed, and whether a local sample ad element is hidden. Cosmetic filtering cannot prove that trackers or network requests are blocked.
- **Network visibility:** a local WebRTC candidate check with no STUN or TURN servers. A numeric address may be local, public, or a VPN address. Missing candidates and timeouts are not proof of protection.
- **Device footprint:** browser-reported details such as language, time zone, screen size, approximate hardware capabilities, and battery information where supported. These observations do not establish how unique a device is.

Unavailable APIs produce inconclusive results. Browser restrictions, extensions, operating systems, and settings can all affect what the page observes. Change a setting and select **Rescan** to compare what this page can see.

## Optional experiments

**Compare public IP** opens a two-step experiment. Save a baseline, change your network or VPN connection, then compare again. Addresses stay in the current page's memory and are cleared on reload or through **Reset comparison**. An address change cannot verify a VPN; an unchanged address cannot prove one is off. This feature requires the included Netlify endpoint and an internet connection.

**Generate canvas sample** creates a local drawing and reads its rendered output only after you click. Browsers with fingerprinting protection may ask for permission at that point. The displayed hash illustrates fingerprinting; it is not a unique identity or a risk score, and it is excluded from saved reports.

**Permission demonstrations** run only when selected:

- Media enumeration reports visible device counts without requesting a camera or microphone stream. Counts may include default-device entries; names and identifiers are not retained.
- File selection reports how many files you chose. It does not read file contents or names, or upload files.
- Motion detection listens briefly for an actual reading and then stops. Some browsers ask for motion permission after you click. No reading means the result is inconclusive.

A pointer demonstration shows temporary dots within its area without keeping movement history. These experiments do not change the privacy findings; a successful canvas sample adds one observed device signal.

## Data handling

Scan results remain in the current page's memory and are not uploaded by the app. The theme preference is saved locally. The service worker caches the app's own static files for offline use; it does not cache IP responses.

The optional IP endpoint returns the connection address supplied by Netlify. The function does not log or persist it, but the hosting provider receives requests and may retain standard access logs, including for ordinary page visits. The app uses no third-party IP lookup service.

**Save report** creates a JSON download on your device. It excludes IP addresses and the canvas hash, but includes browser and device details such as language, time zone, and screen dimensions. Review the file before sharing it.

**Reset local session** clears the IP comparison, optional demo results, canvas sample, and saved theme. It leaves the current automatic scan results and offline app files available. Older versions' persistently saved IP comparisons are removed when this version starts.

## Run locally

No build step or package installation is required. From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000`. Core checks work locally; the public-IP endpoint is unavailable on this simple static server. API support still depends on the browser.

## Deploy

Publish this folder to an HTTPS static host. For Netlify, the included `netlify.toml` configures the publish directory, IP function, security headers, and caching. Other static hosts can serve the core app; Netlify is needed only for the bundled IP comparison endpoint.

The app uses relative asset paths and a scoped service worker, so static hosting under a subdirectory is supported. HTTPS or a trusted localhost origin is required for service workers and some browser APIs. After the first successful load and offline installation, local checks remain usable offline. A prepared update is offered in the app; selecting **Update** reloads the new version.

Core files:

```text
index.html             Page structure
styles.css             Local responsive styles and themes
app.js                 Browser checks and interface
privacy-core.js        Shared result interpretation helpers
sw.js                  Versioned offline app shell
manifest.json          Installable web app metadata
icon-192.png
icon-512.png
netlify/functions/ip.js Optional same-origin IP endpoint
netlify.toml           Hosting headers and function configuration
```

## Verify changes

The automated tests use Node.js built-ins, with no test dependencies:

```sh
node --test tests/*.test.cjs
```

The browser smoke test starts a loopback server and an isolated headless Chrome instance:

```sh
node tests/browser-smoke.cjs
```

It defaults to Chrome's standard macOS location. Set `CHROME_PATH` to your Chrome or Chromium executable on other systems. The runner uses a temporary browser profile, not your personal profile. Use a current Node.js release with built-in WebSocket support.

When changing cached assets for a new release, update the version in `sw.js` so existing installations receive the complete new app shell.

## Contributing and license

Reports of misleading results, accessibility problems, or browser compatibility issues are welcome. Include your browser version and reproduction steps; avoid posting addresses or unreviewed reports.

MIT licensed. Made in Canada.
