/* Dependency-free integration checks in an isolated headless Chrome profile.
   Run: node tests/browser-smoke.cjs (or set CHROME_PATH). */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
let ip = '203.0.113.1';
let ipStatus = 200;
let ipRequests = 0;
let requests = [];
let failures = [];
let chrome;
let socket;
let server;
let temporary;
let scriptId;
let sessionId;
let navigations = 0;
let sequence = 0;
const pending = new Map();

function command(method, params = {}, target = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 12000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result.value;
}

async function until(expression, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  do {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  throw new Error(message);
}

const baseMock = `
  Object.defineProperty(navigator, 'permissions', {configurable:true, value:{query:async ({name}) => ({state:name === 'camera' ? 'granted' : 'prompt'})}});
  Object.defineProperty(navigator, 'globalPrivacyControl', {configurable:true, value:true});
  Object.defineProperty(navigator, 'getBattery', {configurable:true, value:async()=>({level:.7,charging:false})});
  class MockPeer {
    constructor() { this.iceGatheringState = 'new'; window.__peers = (window.__peers || 0) + 1; }
    createDataChannel() {}
    async createOffer() { return {}; }
    async setLocalDescription() {
      setTimeout(() => {
        this.onicecandidate?.({candidate:{address:'e3c0-test.local'}});
        this.iceGatheringState = 'complete';
        this.onicecandidate?.({candidate:null});
        this.onicegatheringstatechange?.();
      }, 20);
    }
    close() { window.__closed = (window.__closed || 0) + 1; }
  }
  window.RTCPeerConnection = MockPeer;
  const originalCanvasReadback = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) { window.__canvasReads = (window.__canvasReads || 0) + 1; return originalCanvasReadback.apply(this, args); };
`;

async function navigate(origin, extra = '', pathname = '/') {
  if (scriptId) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
  scriptId = (await command('Page.addScriptToEvaluateOnNewDocument', { source: baseMock + extra })).identifier;
  await command('Page.navigate', { url: origin + pathname });
  await until("document.getElementById('scan-status')?.textContent.startsWith('Scan complete')", 'Scan did not finish');
}

async function check(name, fn) {
  await fn();
  process.stdout.write(`✓ ${name}\n`);
}

(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'privacy-check-browser-'));
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/.netlify/functions/ip') {
      ipRequests++;
      response.writeHead(ipStatus, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ip }));
      return;
    }
    let relative = url.pathname.replace(/^\/subdir/, '').replace(/^\//, '') || 'index.html';
    if (relative.endsWith('/')) relative += 'index.html';
    if (!['index.html', 'app.js', 'privacy-core.js', 'styles.css', 'sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png'].includes(relative)) {
      response.writeHead(404); response.end(); return;
    }
    try {
      const body = await fs.readFile(path.join(root, relative));
      response.writeHead(200, {
        'Content-Type': types[path.extname(relative)], 'Cache-Control': 'no-cache',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
      });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${temporary}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start. Check CHROME_PATH.')), 12000);
    chrome.once('error', error => { clearTimeout(timer); reject(error); });
    chrome.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    } else if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) navigations++;
    else if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    else if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  const target = await command('Target.createTarget', { url: 'about:blank' }, null);
  sessionId = (await command('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(origin);

  await check('Initial scan is local, scopes permissions, and closes WebRTC', async () => {
    await until('!!navigator.serviceWorker.controller', 'Service worker did not install');
    assert.equal(navigations, 1, 'First worker activation reloaded the page');
    assert.equal(ipRequests, 0);
    assert.equal(await evaluate('window.__canvasReads || 0'), 0, 'Canvas readback must be opt-in');
    assert(requests.every(url => url.startsWith(origin)), requests.join('\n'));
    assert.equal(await evaluate("document.querySelector('[data-check=permission-camera] .data-value').textContent"), 'Allowed for this site');
    assert.equal(await evaluate("document.querySelector('[data-check=webrtc] .data-value').textContent"), 'Local address masked with mDNS');
    assert.equal(await evaluate('window.__peers === window.__closed'), true);
    assert.equal(await evaluate("document.getElementById('o-grade').textContent"), 'Review');
  });
  await check('Rescans are stable, include device checks, and prevent duplicates', async () => {
    const count = await evaluate("document.querySelectorAll('[data-check]').length");
    await evaluate("document.getElementById('global-rescan').click(); document.getElementById('global-rescan').click()");
    await until("!document.getElementById('global-rescan').disabled", 'Rescan stuck');
    assert.equal(await evaluate("document.querySelectorAll('[data-check]').length"), count);
    assert.equal(await evaluate('window.__peers'), 2);
  });
  await check('Desktop, dark mode, and 320 px mobile layouts fit without overflow', async () => {
    await fs.writeFile(path.join(temporary, 'desktop.png'), Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate("document.getElementById('theme-toggle').click()");
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');
    await fs.writeFile(path.join(temporary, 'dark.png'), Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate("document.querySelectorAll('details').forEach(item=>item.open=true)");
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await fs.writeFile(path.join(temporary, 'mobile.png'), Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await command('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  });
  await check('Public IP requires an explicit request, compares normalized addresses, and resets', async () => {
    await evaluate("document.getElementById('vpn-test').click()");
    assert.equal(ipRequests, 0);
    await evaluate("document.querySelector('#section-ip button').click()");
    await until("document.querySelector('.vpn-result').textContent.includes('Baseline saved')", 'Baseline not saved');
    ip = '203.0.113.2';
    await evaluate("document.querySelector('#section-ip button').click()");
    await until("document.querySelector('.vpn-result').textContent.includes('Public IP changed')", 'Comparison did not finish');
    assert.equal(await evaluate('localStorage.getItem("privacycheck_vpn_state_v1")'), null);
    ipStatus = 503;
    await evaluate("document.querySelector('#section-ip button').click()");
    await until("document.querySelector('.vpn-result').textContent.includes('unavailable')", 'Failure was not explained');
    assert.equal(await evaluate("document.querySelector('#section-ip button').disabled"), false);
    await evaluate("document.querySelectorAll('#section-ip button')[1].click()");
    assert.equal(await evaluate("document.querySelector('.vpn-addresses')"), null);
    ipStatus = 200;
  });
  await check('Canvas is opt-in, failed retries stay accurate, and reset clears optional results', async () => {
    const count = Number(await evaluate("document.getElementById('signal-count').textContent"));
    await evaluate("document.querySelector('#section-fingerprint button').click()");
    assert.equal(Number(await evaluate("document.getElementById('signal-count').textContent")), count + 1);
    await evaluate("window.__readback = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = () => {throw Error('blocked')}; document.querySelector('#section-fingerprint button').click()");
    assert.equal(Number(await evaluate("document.getElementById('signal-count').textContent")), count);
    assert.equal(await evaluate("document.querySelector('[data-check=canvas] .status-badge').dataset.state"), 'unknown');
    await evaluate("HTMLCanvasElement.prototype.toDataURL = window.__readback; document.querySelector('#section-fingerprint button').click(); document.getElementById('clear-data').click()");
    assert.equal(await evaluate("document.querySelector('[data-check=canvas]')"), null);
    assert.equal(Number(await evaluate("document.getElementById('signal-count').textContent")), count);
  });
  await check('Downloaded JSON contains current findings but excludes IP and canvas identifiers', async () => {
    const downloads = path.join(temporary, 'downloads');
    await fs.mkdir(downloads);
    await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads }, null);
    await evaluate("document.querySelector('#section-ip button').click(); document.querySelector('#section-fingerprint button').click()");
    await until("document.querySelector('.vpn-result').textContent.includes('Baseline saved')", 'Report baseline not saved');
    await evaluate("document.getElementById('download-report').click()");
    let filename;
    for (let attempt = 0; attempt < 60 && !filename; attempt++) {
      filename = (await fs.readdir(downloads)).find(name => name.endsWith('.json'));
      if (!filename) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert(filename, 'JSON download not created');
    const raw = await fs.readFile(path.join(downloads, filename), 'utf8');
    const report = JSON.parse(raw);
    assert.equal(report.checks.length, 8);
    assert(!report.signals.some(signal => signal.id === 'canvas'));
    assert(!raw.includes(ip), 'Public IP appeared in report');
    assert(report.checkedAt);
    await evaluate("document.getElementById('clear-data').click()");
  });
  await check('Unsupported APIs and blocked storage remain usable; untrusted text is literal', async () => {
    await navigate(origin, `
      Object.defineProperty(navigator,'permissions',{value:{query:async()=>{throw Error('unsupported')}}});
      Object.defineProperty(navigator,'userAgent',{value:'<img src=x onerror=alert(1)>'});
      Object.defineProperty(navigator,'getBattery',{value:async()=>{throw Error('blocked')}});
      Storage.prototype.getItem = Storage.prototype.setItem = Storage.prototype.removeItem = () => {throw Error('blocked')};
      MockPeer.prototype.createOffer = async () => {throw Error('blocked')};
    `);
    assert.equal(await evaluate("document.querySelectorAll('#section-permissions [data-state=unknown]').length"), 4);
    assert.equal(await evaluate("document.querySelector('[data-check=user-agent] img')"), null);
    assert.match(await evaluate("document.querySelector('[data-check=user-agent] .data-value').textContent"), /<img/);
    assert.match(await evaluate("document.querySelector('[data-check=webrtc] .data-value').textContent"), /Could not complete/);
    assert.equal(await evaluate('window.__peers === window.__closed'), true);
  });
  await check('IPv6 WebRTC candidates are observed and timeouts remain inconclusive', async () => {
    await navigate(origin, "MockPeer.prototype.setLocalDescription = async function(){ this.onicecandidate({candidate:{address:'2001:db8::1'}}); this.onicecandidate({candidate:null}); };");
    assert.equal(await evaluate("document.querySelector('[data-check=webrtc] .status-badge').dataset.state"), 'attention');
    await navigate(origin, 'MockPeer.prototype.setLocalDescription = async function(){};');
    assert.match(await evaluate("document.querySelector('[data-check=webrtc] .data-value').textContent"), /timed out/);
    assert.equal(await evaluate('window.__peers === window.__closed'), true);
  });
  await check('Optional media and motion demos do not misclassify missing data', async () => {
    await navigate(origin, `
      Object.defineProperty(navigator,'mediaDevices',{value:{enumerateDevices:async()=>[{kind:'audioinput',label:'private label'}]}});
      window.DeviceMotionEvent = class {};
    `);
    await evaluate("document.querySelector('#section-demos button').click()");
    await until("document.getElementById('section-demos').textContent.includes('audioinput: 1')", 'Media demo failed');
    assert(!await evaluate("document.getElementById('section-demos').textContent.includes('private label')"));
    await evaluate("document.querySelectorAll('#section-demos button')[2].click()");
    await until("document.getElementById('section-demos').textContent.includes('inconclusive')", 'No-data motion incorrectly passed');
    await evaluate("document.querySelectorAll('#section-demos button')[2].click(); const e=new Event('devicemotion'); e.acceleration={x:0,y:0,z:0}; dispatchEvent(e)");
    await until("document.getElementById('section-demos').textContent.includes('A motion reading')", 'Zero motion reading not detected');
  });
  await check('Installed app works offline', async () => {
    await until('!!navigator.serviceWorker.controller', 'Service worker did not claim the page');
    await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await command('Page.reload');
    await until("document.getElementById('scan-status')?.textContent.startsWith('Scan complete')", 'Offline shell unavailable');
    await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  });
  await check('Subdirectory installs resolve local assets and their own worker scope', async () => {
    await navigate(origin, '', '/subdir/');
    await until("navigator.serviceWorker.controller?.scriptURL.includes('/subdir/sw.js')", 'Subdirectory worker not active');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.checks-grid')).display"), 'grid');
  });
  await check('Native browser APIs complete without mocks or unhandled exceptions', async () => {
    await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    const previousIPRequests = ipRequests;
    await command('Page.navigate', { url: origin });
    await until("document.getElementById('scan-status')?.textContent.startsWith('Scan complete')", 'Native scan did not finish');
    assert.equal(ipRequests, previousIPRequests);
    assert.equal(await evaluate("document.querySelector('[data-check=canvas]')"), null);
    await fs.writeFile(path.join(temporary, 'native.png'), Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  });
  assert.deepEqual(failures, [], 'Unhandled browser exceptions');
  process.stdout.write(`All browser checks passed. Screenshots: ${temporary}\n`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  socket?.close();
  chrome?.kill('SIGTERM');
  if (server) { server.closeAllConnections(); server.close(); }
  for (const task of pending.values()) clearTimeout(task.timer);
});
