/* Privacy Check — local observations, with explicit limits. No telemetry. */
(() => {
  'use strict';
  const VERSION = '4.0.0';
  const Core = window.PrivacyCore;
  const $ = id => document.getElementById(id);
  const checks = new Map();
  const signals = new Map();
  const panels = new Map();
  const optionalCleanups = new Set();
  const session = { baseline: null, latest: null, at: null };
  let scanId = 0;
  let scanning = false;
  let ipController = null;
  let lastScan = null;
  let toastTimer;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function announce(message) {
    const toast = $('toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
  }

  function section(group, id, icon, title, description, open = false) {
    const details = node('details', 'check-section');
    details.id = `section-${id}`;
    details.open = open;
    const summary = node('summary', 'section-heading');
    const symbol = node('span', 'section-icon', icon);
    symbol.setAttribute('aria-hidden', 'true');
    const heading = node('div');
    heading.append(node('h3', 'section-title', title), node('p', 'section-description', description));
    summary.append(symbol, heading);
    const body = node('div', 'section-body');
    const list = node('div', 'data-list');
    body.append(list);
    details.append(summary, body);
    $(group).append(details);
    panels.set(id, list);
    return list;
  }

  function row(panel, item) {
    const wrapper = node('div', 'data-item');
    wrapper.dataset.check = item.id;
    const top = node('div', 'data-top');
    const badgeNames = { attention: 'Review', clear: 'Checked', observed: 'Observed', unknown: 'Inconclusive', info: 'Device signal' };
    const badge = node('span', 'status-badge', badgeNames[item.state] || 'Information');
    badge.dataset.state = item.state;
    top.append(node('span', 'data-label', item.label), badge);
    wrapper.append(top, node('div', 'data-value', item.value), node('p', 'data-description', item.description));
    const previous = Array.from(panel.children).find(child => child.dataset.check === item.id);
    if (previous) previous.replaceWith(wrapper);
    else panel.append(wrapper);
  }

  function record(panel, item, token, footprint = false) {
    if (token !== scanId) return;
    (footprint ? signals : checks).set(item.id, item);
    row(panel, item);
  }

  function button(label, callback, secondary = true) {
    const element = node('button', `button ${secondary ? 'button-secondary' : 'button-primary'}`, label);
    element.type = 'button';
    element.addEventListener('click', callback);
    return element;
  }

  async function bounded(promise, ms = 2200) {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out')), ms);
      })]);
    } finally { clearTimeout(timer); }
  }

  function updateOverview() {
    const result = Core.summarizeChecks([...checks.values()]);
    const known = result.total - result.unknown;
    $('o-grade').textContent = scanning ? 'Checking' : result.attention ? 'Review' : known ? 'Checked' : 'Limited';
    $('o-grade').dataset.state = scanning || !known ? 'unknown' : result.attention ? 'attention' : 'observed';
    $('o-label').textContent = scanning ? 'Reading available browser signals…' : result.attention
      ? `${result.attention} ${result.attention === 1 ? 'setting deserves' : 'settings deserve'} a closer look`
      : 'Read the findings and limits below';
    $('check-count').textContent = scanning ? '—' : `${known}/${result.total}`;
    $('signal-count').textContent = scanning ? '—' : String(signals.size);
    $('last-scan').textContent = lastScan ? `Last scan ${lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'First scan in progress';
    $('report').setAttribute('aria-busy', String(scanning));
    $('download-report').disabled = scanning;
    if (scanning) return;

    const plan = $('action-plan');
    plan.replaceChildren();
    const tips = [];
    if ([...checks.values()].some(check => check.id.startsWith('permission-') && check.state === 'attention')) {
      tips.push(['Review this site’s permissions', 'Open your browser’s site settings near the address bar. Remove camera, microphone, location, or notification access you no longer want.']);
    }
    if (checks.get('webrtc')?.state === 'attention') {
      tips.push(['Review network address exposure', 'This page observed a numeric WebRTC address. If that matters to you, review your browser or VPN’s WebRTC settings, then rescan. This test does not verify your VPN.']);
    }
    if (checks.get('secure-context')?.state === 'attention') {
      tips.push(['Use a secure connection', 'Open the hosted HTTPS version. Some browser protections and tests are unavailable over an insecure connection.']);
    }
    if (checks.get('gpc')?.value !== 'Signal enabled') {
      tips.push(['Check your privacy preferences', 'Look for Global Privacy Control in your browser settings. This signal expresses a privacy preference; it does not itself block trackers.']);
    }
    if (result.unknown) {
      tips.push([`${result.unknown} ${result.unknown === 1 ? 'check is' : 'checks are'} inconclusive`, 'Browser support and privacy protections can limit what this page can read. An unavailable result does not mean you are protected or exposed.']);
    }
    tips.push(['Review protections across all sites', 'Check tracking protection, third-party cookie controls, and permissions in your browser settings. This page can only observe a small part of your privacy settings.']);
    for (const [title, description] of tips.slice(0, 4)) {
      const item = node('div', 'action-item');
      item.append(node('h3', 'action-title', title), node('p', 'action-description', description));
      plan.append(item);
    }
  }

  async function scanPermissions(token) {
    const panel = panels.get('permissions');
    const names = [['geolocation', 'Location'], ['camera', 'Camera'], ['microphone', 'Microphone'], ['notifications', 'Notifications']];
    const results = await Promise.all(names.map(async ([name, label]) => {
      let state;
      try { state = (await bounded(navigator.permissions.query({ name }))).state; } catch { state = 'unknown'; }
      return { id: `permission-${name}`, label, ...Core.describePermission(state) };
    }));
    for (const result of results) record(panel, result, token);
  }

  async function scanProtection(token) {
    const panel = panels.get('protection');
    record(panel, {
      id: 'secure-context', label: 'Secure browser context', state: window.isSecureContext ? 'clear' : 'attention',
      value: window.isSecureContext ? 'Available' : 'Not a secure context',
      description: 'HTTPS and trusted local origins enable secure browser APIs. This does not certify the safety of a website.'
    }, token);
    const gpc = navigator.globalPrivacyControl;
    record(panel, {
      id: 'gpc', label: 'Global Privacy Control', state: typeof gpc === 'boolean' ? 'observed' : 'unknown',
      value: gpc === true ? 'Signal enabled' : gpc === false ? 'Signal not enabled' : 'Not reported',
      description: 'GPC communicates a privacy preference to websites. It is not a tracker blocker; browser support varies.'
    }, token);
    const bait = node('div', 'adsbox ad-banner ad-banner-top adunit adsbygoogle');
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:10px;height:10px;pointer-events:none';
    document.body.append(bait);
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const style = getComputedStyle(bait);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || bait.getBoundingClientRect().height === 0;
      record(panel, {
        id: 'cosmetic-filter', label: 'Cosmetic ad filtering', state: hidden ? 'observed' : 'unknown',
        value: hidden ? 'Sample ad element hidden' : 'Sample ad element visible',
        description: 'A local test element checks cosmetic filtering only. Neither result establishes whether network requests or trackers are blocked. No ad request is sent.'
      }, token);
    } finally { bait.remove(); }
  }

  async function scanNetwork(token) {
    const panel = panels.get('network');
    const result = await new Promise(resolve => {
      let pc;
      let timer;
      let settled = false;
      let masked = false;
      const addresses = new Set();
      const finish = reason => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (pc) {
          pc.onicecandidate = null;
          pc.onicegatheringstatechange = null;
          try { pc.close(); } catch { /* Already closed. */ }
        }
        if (addresses.size) resolve({ state: 'attention', value: 'Numeric network address observed', description: 'A WebRTC host candidate exposed a numeric address to this page. It may be local, public, or a VPN address. The address is not retained in the report.' });
        else if (reason === 'unavailable') resolve({ state: 'unknown', value: 'WebRTC unavailable', description: 'This browser does not expose RTCPeerConnection. No conclusion about network privacy can be drawn.' });
        else if (reason === 'error') resolve({ state: 'unknown', value: 'Could not complete test', description: 'The browser declined or failed WebRTC setup. This is not proof of protection.' });
        else if (reason === 'timeout') resolve({ state: 'unknown', value: 'Candidate gathering timed out', description: 'No numeric address was observed before the time limit. The test did not finish, so the result is inconclusive.' });
        else resolve({ state: 'observed', value: masked ? 'Local address masked with mDNS' : 'No numeric address observed', description: 'Candidate gathering finished without a numeric address. No STUN or TURN servers were configured for this test. This limited test cannot verify a VPN or rule out other address exposure.' });
      };
      if (typeof window.RTCPeerConnection !== 'function') { finish('unavailable'); return; }
      try {
        pc = new RTCPeerConnection({ iceServers: [] });
        pc.onicecandidate = event => {
          if (settled) return;
          if (!event.candidate) { finish('complete'); return; }
          const candidate = Core.classifyCandidate(event.candidate);
          if (candidate.kind === 'address') addresses.add(candidate.address);
          if (candidate.kind === 'masked') masked = true;
        };
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') finish('complete');
        };
        timer = setTimeout(() => finish('timeout'), 2500);
        pc.createDataChannel('privacy-check');
        Promise.resolve(pc.createOffer()).then(offer => {
          if (!settled) return pc.setLocalDescription(offer);
        }).catch(() => finish('error'));
      } catch { finish('error'); }
    });
    record(panel, { id: 'webrtc', label: 'WebRTC address exposure', ...result }, token);
  }

  async function scanFootprint(token) {
    const panel = panels.get('device');
    const add = (id, label, value, description) => {
      if (value === undefined || value === null || value === '') return;
      record(panel, { id, label, value, description, state: 'info' }, token, true);
    };
    add('user-agent', 'Browser identifier', navigator.userAgent, 'Browser identifiers may be reduced, modified, or shared by many devices. They do not reliably reveal your privacy settings.');
    try { add('timezone', 'Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone, 'Sites can combine your time zone with other signals.'); } catch { /* Optional. */ }
    add('languages', 'Preferred languages', (navigator.languages || [navigator.language]).join(', '), 'Language preferences can contribute to a device fingerprint.');
    add('screen', 'Screen dimensions', `${screen.width} × ${screen.height} CSS pixels`, 'Screen dimensions can change with your display and browser privacy settings.');
    add('pixel-ratio', 'Pixel ratio', window.devicePixelRatio, 'The ratio of device pixels to CSS pixels.');
    add('cores', 'Reported CPU threads', navigator.hardwareConcurrency, 'Browsers may reduce or round this value. It is not an exact hardware inventory.');
    add('memory', 'Approximate memory', navigator.deviceMemory ? `${navigator.deviceMemory} GB` : null, 'A coarse, browser-reported estimate; unavailable in some browsers.');
    add('touch', 'Maximum touch points', navigator.maxTouchPoints, 'A capability reported by the browser, not a unique identifier.');
    add('cookies', 'Cookie availability', typeof navigator.cookieEnabled === 'boolean' ? (navigator.cookieEnabled ? 'Cookies enabled' : 'Cookies disabled') : null, 'This does not reveal third-party cookie restrictions or whether a particular site can track you.');
    if (navigator.connection?.effectiveType) add('connection', 'Estimated connection type', navigator.connection.effectiveType, 'An approximate connection classification. It does not identify a VPN.');

    setupCanvas(token);
    const batteryPanel = panels.get('battery');
    try {
      if (!navigator.getBattery) throw new Error('Unsupported');
      const battery = await bounded(navigator.getBattery());
      record(batteryPanel, { id: 'battery', label: 'Battery level', state: 'info', value: `${Math.round(battery.level * 100)}%${battery.charging ? ' · charging' : ''}`, description: 'A changing device signal. Many browsers do not expose it.' }, token, true);
    } catch {
      if (token === scanId) row(batteryPanel, { id: 'battery', label: 'Battery level', state: 'unknown', value: 'Not available', description: 'This browser did not expose battery information.' });
    }
  }

  function setupCanvas(token) {
    const fingerprint = panels.get('fingerprint');
    fingerprint.replaceChildren();
    signals.delete('canvas');
    // Resetting the width discards existing pixels without reading them back.
    $('fp-canvas').width = 200;
    fingerprint.append(node('p', 'privacy-note', 'Optional: generate a local drawing sample. Browsers with fingerprinting protection may ask before allowing canvas readback. Nothing is uploaded.'));
    const sample = button('Generate canvas sample', () => {
      sample.disabled = true;
      signals.delete('canvas');
      try {
        const canvas = $('fp-canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textBaseline = 'top';
        context.font = '14px Arial';
        context.fillStyle = '#f60';
        context.fillRect(125, 1, 62, 20);
        context.fillStyle = '#069';
        context.fillText('Privacy!', 2, 15);
        const data = canvas.toDataURL();
        let hash = 0x811c9dc5;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 0x01000193);
        record(fingerprint, { id: 'canvas', label: 'Canvas rendering sample', state: 'info', value: (hash >>> 0).toString(16).padStart(8, '0').toUpperCase(), description: 'A short hash of one drawing. Different devices may share it, and browsers may randomize it. It is not an identity, a uniqueness score, or an estimate of tracking risk.' }, token, true);
      } catch {
        if (token === scanId) row(fingerprint, { id: 'canvas', label: 'Canvas rendering sample', state: 'unknown', value: 'Not available', description: 'The browser did not allow a readable canvas sample.' });
      } finally {
        sample.disabled = false;
        updateOverview();
      }
    });
    fingerprint.append(sample);
  }

  async function rescan() {
    if (scanning) return;
    scanning = true;
    const token = ++scanId;
    checks.clear();
    signals.clear();
    for (const id of ['permissions', 'protection', 'network', 'device', 'fingerprint', 'battery']) panels.get(id).replaceChildren();
    $('global-rescan').disabled = true;
    $('global-rescan').setAttribute('aria-busy', 'true');
    $('scan-status').textContent = 'Checking locally. No permission requests are made.';
    updateOverview();
    try {
      const tasks = [scanPermissions(token), scanProtection(token), scanNetwork(token), scanFootprint(token)];
      const results = await Promise.allSettled(tasks);
      results.forEach((result, index) => {
        if (result.status === 'rejected') record(panels.get(['permissions', 'protection', 'network', 'device'][index]), {
          id: `unavailable-${index}`, label: 'Check unavailable', state: 'unknown', value: 'Could not read this browser signal', description: 'The browser prevented this check from completing. No privacy conclusion is drawn.'
        }, token);
      });
      lastScan = new Date();
    } finally {
      scanning = false;
      $('global-rescan').disabled = false;
      $('global-rescan').removeAttribute('aria-busy');
      updateOverview();
      const summary = Core.summarizeChecks([...checks.values()]);
      $('scan-status').textContent = `Scan complete. ${summary.total - summary.unknown} of ${summary.total} checks returned a finding; ${summary.unknown} inconclusive. ${summary.attention} to review.`;
    }
  }

  function renderIP(message) {
    const panel = panels.get('ip');
    panel.replaceChildren();
    panel.append(node('p', 'notice', 'Optional: asks this site’s host for the public IP it sees. The host receives your request and may keep standard access logs. No third-party IP service is used. Results stay in this tab’s memory.'));
    panel.append(node('p', 'data-description', 'For a comparison, save a baseline, change your network or VPN connection, then check again. An IP change does not prove a VPN is working; an unchanged IP does not prove it is off.'));
    const status = message || (!session.baseline ? 'No comparison started.' : !session.latest ? 'Baseline saved. Change your connection, then compare.' : session.baseline === session.latest ? 'Public IP unchanged.' : 'Public IP changed.');
    const result = node('p', 'vpn-result', status);
    result.setAttribute('role', 'status');
    panel.append(result);
    if (session.baseline) {
      const addresses = node('div', 'vpn-addresses');
      addresses.append(node('p', '', `Baseline: ${session.baseline}`));
      if (session.latest) addresses.append(node('p', '', `Latest: ${session.latest}`));
      if (session.at) addresses.append(node('p', 'data-description', `Checked ${new Date(session.at).toLocaleString()}`));
      panel.append(addresses);
    }
    const actions = node('div', 'inline-actions');
    const run = button(ipController ? 'Checking…' : session.baseline ? 'Compare again' : 'Save baseline IP', runIP, false);
    run.disabled = Boolean(ipController);
    actions.append(run);
    if (session.baseline) {
      const reset = button('Reset comparison', () => {
        session.baseline = session.latest = session.at = null;
        renderIP('Comparison cleared. Save a new baseline when you are ready.');
      });
      reset.disabled = Boolean(ipController);
      actions.append(reset);
    }
    panel.append(actions);
  }

  async function runIP() {
    if (ipController) return;
    const controller = new AbortController();
    ipController = controller;
    $('vpn-test').disabled = true;
    renderIP('Asking this site’s host for your public IP…');
    const timer = setTimeout(() => controller.abort(), 6500);
    let message;
    try {
      if (!['http:', 'https:'].includes(location.protocol)) throw new Error('unsupported');
      const response = await fetch(new URL('/.netlify/functions/ip', location.origin), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('unavailable');
      const data = await response.json();
      const ip = Core.normalizeIP(data.ip);
      if (!ip) throw new Error('invalid');
      if (controller.signal.aborted) return;
      if (session.baseline) session.latest = ip;
      else session.baseline = ip;
      session.at = new Date().toISOString();
    } catch {
      message = controller.signal.aborted ? 'The IP request timed out or was cancelled. Try again when connected.' : 'Public IP unavailable. This optional feature needs the included Netlify endpoint and an internet connection. Your local checks still work.';
    } finally {
      clearTimeout(timer);
      if (ipController === controller) {
        ipController = null;
        $('vpn-test').disabled = false;
        renderIP(message);
      }
    }
  }

  function showIP() {
    const details = $('section-ip');
    details.open = true;
    details.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    details.querySelector('button').focus({ preventScroll: true });
  }

  function optionalDemos() {
    for (const cleanup of optionalCleanups) cleanup();
    optionalCleanups.clear();
    const panel = panels.get('demos');
    panel.replaceChildren();
    panel.append(node('p', 'privacy-note', 'These optional demonstrations stay in this tab. They do not affect the privacy overview. No camera or microphone stream is requested.'));
    const mediaResult = node('p', 'data-description', 'Device labels are often hidden until this site has permission.');
    mediaResult.setAttribute('role', 'status');
    const media = button('List visible media devices', async () => {
      media.disabled = true;
      try {
        if (!navigator.mediaDevices?.enumerateDevices) throw new Error('unsupported');
        const devices = await bounded(navigator.mediaDevices.enumerateDevices());
        const counts = new Map();
        for (const device of devices) counts.set(device.kind, (counts.get(device.kind) || 0) + 1);
        mediaResult.textContent = devices.length ? [...counts].map(([kind, count]) => `${kind}: ${count}`).join(' · ') + '. Counts may include default-device entries. Labels and identifiers are not retained.' : 'No devices were visible. This may reflect permissions, browser restrictions, or the absence of hardware.';
      } catch { mediaResult.textContent = 'Device enumeration is unavailable or could not complete. This does not mean camera or microphone access is blocked.'; }
      finally { media.disabled = false; }
    });
    panel.append(media, mediaResult);

    const fileResult = node('p', 'data-description', 'A page can only inspect files you choose. This demo reports a count without reading file contents or names.');
    fileResult.setAttribute('role', 'status');
    const input = node('input');
    input.type = 'file';
    input.hidden = true;
    input.multiple = true;
    input.addEventListener('change', () => {
      fileResult.textContent = input.files.length ? `${input.files.length} file(s) selected for this demo. No file contents were read or uploaded.` : 'No file selected.';
      input.value = '';
    });
    input.addEventListener('cancel', () => { fileResult.textContent = 'Selection cancelled. No files were read.'; });
    panel.append(button('Try a file selection', () => input.click()), input, fileResult);

    const motionResult = node('p', 'data-description', 'Tests for a real motion event. On some devices, your browser will ask for permission after you click.');
    motionResult.setAttribute('role', 'status');
    const motion = button('Test motion availability', async () => {
      if (!window.DeviceMotionEvent) { motionResult.textContent = 'Motion events are not supported in this browser.'; return; }
      motion.disabled = true;
      let cancelled = false;
      const cancel = () => { cancelled = true; };
      optionalCleanups.add(cancel);
      try {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          const permission = await DeviceMotionEvent.requestPermission();
          if (cancelled) return;
          if (permission !== 'granted') { motionResult.textContent = 'Motion permission was not granted.'; return; }
        }
        motionResult.textContent = 'Listening for up to three seconds…';
        const observed = await new Promise(resolve => {
          let timer;
          const finish = value => {
            clearTimeout(timer);
            window.removeEventListener('devicemotion', listener);
            optionalCleanups.delete(cleanup);
            resolve(value);
          };
          const cleanup = () => finish(false);
          const listener = event => {
            const groups = [event.acceleration, event.accelerationIncludingGravity, event.rotationRate];
            if (groups.some(group => group && ['x', 'y', 'z', 'alpha', 'beta', 'gamma'].some(key => typeof group[key] === 'number' && Number.isFinite(group[key])))) finish(true);
          };
          optionalCleanups.add(cleanup);
          window.addEventListener('devicemotion', listener);
          timer = setTimeout(() => finish(false), 3000);
        });
        if (!cancelled) motionResult.textContent = observed ? 'A motion reading reached this page. The listener has now stopped; no values were saved.' : 'No motion reading arrived. Your device may be stationary, unsupported, or restricted. This result is inconclusive.';
      } catch { if (!cancelled) motionResult.textContent = 'Motion access could not be tested. The result is inconclusive.'; }
      finally { optionalCleanups.delete(cancel); motion.disabled = false; }
    });
    panel.append(motion, motionResult);
  }

  function behaviorDemo() {
    const panel = panels.get('behavior');
    panel.append(node('p', 'data-description', 'Sites can observe pointer movement within a page. Try this local demonstration; each dot disappears and no movement history is saved.'));
    const demo = node('div', 'demo-area', 'Move your pointer or touch here');
    demo.setAttribute('aria-label', 'Optional pointer movement demonstration');
    let last = 0;
    demo.addEventListener('pointermove', event => {
      if (event.timeStamp - last < 40 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      last = event.timeStamp;
      const bounds = demo.getBoundingClientRect();
      const dot = node('span', 'touch-trail');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.left = `${event.clientX - bounds.left}px`;
      dot.style.top = `${event.clientY - bounds.top}px`;
      demo.append(dot);
      setTimeout(() => dot.remove(), 450);
    });
    panel.append(demo);
  }

  function setupTheme() {
    const system = matchMedia('(prefers-color-scheme: dark)');
    let preference;
    try { preference = localStorage.getItem('privacycheck_theme'); } catch { /* Storage is optional. */ }
    const apply = dark => {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      $('theme-toggle').setAttribute('aria-pressed', String(dark));
      $('theme-toggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    };
    apply(preference === 'dark' || (preference !== 'light' && system.matches));
    $('theme-toggle').addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(preference === 'dark');
      try { localStorage.setItem('privacycheck_theme', preference); } catch { /* Continue in memory. */ }
    });
    system.addEventListener('change', event => { if (!preference) apply(event.matches); });
    return () => { preference = null; apply(system.matches); };
  }

  function downloadReport() {
    const report = {
      app: 'Privacy Check', version: VERSION, checkedAt: lastScan?.toISOString(),
      scope: 'Observations from this site and browser only. Not a security certification or uniqueness estimate. Public IP addresses and canvas hashes are excluded.',
      checks: [...checks.values()], signals: [...signals.values()].filter(signal => signal.id !== 'canvas')
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = node('a');
    link.href = url;
    link.download = `privacy-check-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Report downloaded locally. It includes device details; public IP addresses and the canvas hash are excluded.');
  }

  function setupOffline() {
    if (!('serviceWorker' in navigator) || !['http:', 'https:'].includes(location.protocol) || !window.isSecureContext) return;
    let acceptedUpdate = false;
    let reloading = false;
    const showUpdate = worker => {
      $('update-toast').hidden = false;
      $('btn-update').onclick = () => {
        acceptedUpdate = true;
        $('btn-update').disabled = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      };
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!acceptedUpdate || reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js').then(registration => {
      if (registration.waiting) showUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
        });
      });
    }).catch(() => { /* Offline installation is optional; local checks still work. */ });
  }

  function init() {
    // Remove the old release's persistently saved IP addresses.
    try { localStorage.removeItem('privacycheck_vpn_state_v1'); } catch { /* May be disabled. */ }
    const resetTheme = setupTheme();
    section('sec-actionable', 'permissions', '◎', 'Site permissions', 'What this origin can request or access', true);
    section('sec-actionable', 'protection', '◇', 'Browser protections', 'Signals we can observe, with their limits', true);
    section('sec-actionable', 'network', '↗', 'Network visibility', 'A local WebRTC candidate check', true);
    section('sec-actionable', 'ip', '⇄', 'Compare public IP', 'An optional, two-step connection check');
    section('sec-footprint', 'device', '▣', 'Device & browser', 'The details a page can read');
    section('sec-footprint', 'fingerprint', '◈', 'Canvas fingerprint', 'One rendering sample, not a unique identity');
    section('sec-footprint', 'battery', '▤', 'Battery information', 'A signal some browsers make available');
    section('sec-footprint', 'demos', '⊕', 'Permission demonstrations', 'Optional checks that you control');
    section('sec-footprint', 'behavior', '⌁', 'Pointer demonstration', 'See how movement becomes page data');
    renderIP();
    optionalDemos();
    behaviorDemo();
    $('global-rescan').addEventListener('click', rescan);
    $('vpn-test').addEventListener('click', showIP);
    $('download-report').addEventListener('click', downloadReport);
    $('clear-data').addEventListener('click', () => {
      if (ipController) { ipController.abort(); ipController = null; $('vpn-test').disabled = false; }
      session.baseline = session.latest = session.at = null;
      try { localStorage.removeItem('privacycheck_theme'); localStorage.removeItem('privacycheck_vpn_state_v1'); } catch { /* Optional storage. */ }
      resetTheme();
      renderIP();
      optionalDemos();
      setupCanvas(scanId);
      updateOverview();
      announce('Comparison, optional demo results, and saved theme cleared. Automatic scan results remain in this tab.');
    });
    window.addEventListener('offline', () => announce('You are offline. Local checks still work; public IP comparison needs a connection.'));
    window.addEventListener('online', () => announce('Connection restored. Rescan or compare your public IP when ready.'));
    rescan();
    setupOffline();
  }

  init();
})();
