const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { handler } = require('../netlify/functions/ip.js');

const getIP = (headers, httpMethod = 'GET') => handler({ headers, httpMethod });

test('IP endpoint returns the trusted connection address with no-store headers', async () => {
  const result = await getIP({
    'x-nf-client-connection-ip': '203.0.113.42',
    'x-forwarded-for': '198.51.100.1'
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ip: '203.0.113.42' });
  assert.match(result.headers['Cache-Control'], /no-store/);
  assert.equal(result.headers['Netlify-CDN-Cache-Control'], 'no-store');
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
});

test('IP endpoint rejects spoofable fallbacks and malformed addresses', async () => {
  for (const headers of [
    {},
    { 'x-forwarded-for': '203.0.113.42', 'client-ip': '203.0.113.42', 'x-real-ip': '203.0.113.42' },
    ...['garbage', '203.0.113.42, 198.51.100.1', '999.1.1.1', 'fe80::1%eth0', '<script>'].map(value => ({
      'x-nf-client-connection-ip': value
    }))
  ]) {
    const result = await getIP(headers);
    assert.equal(result.statusCode, 503);
    assert.equal(JSON.parse(result.body).ip, null);
  }
});

test('IP endpoint normalizes IPv6 and supports HEAD without a response body', async () => {
  const headers = { 'X-Nf-Client-Connection-Ip': ' 2001:0DB8:0000:0000:0000:0000:0000:0001 ' };
  const result = await getIP(headers);
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).ip, '2001:db8::1');
  assert.equal((await getIP(headers, 'HEAD')).body, '');
  const rejected = await getIP(headers, 'POST');
  assert.equal(rejected.statusCode, 405);
  assert.equal(rejected.headers.Allow, 'GET, HEAD');
});

function workerHarness(scope = 'https://privacy.example/check/') {
  const handlers = {};
  const stores = new Map();
  const calls = { fetch: [], install: [], claimed: 0, skipped: 0 };
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) {
          calls.install.push(...requests);
          for (const request of requests) store.set(request.url, new Response(`cached:${request.url}`));
        },
        async match(key) { return store.get(typeof key === 'string' ? key : key.url)?.clone(); }
      };
    }
  };
  const self = {
    registration: { scope },
    addEventListener(type, callback) { handlers[type] = callback; },
    clients: { async claim() { calls.claimed++; } },
    async skipWaiting() { calls.skipped++; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), {
    self, caches, URL, Request, Response, Set,
    async fetch(request) {
      calls.fetch.push(request);
      return new Response('network', { status: 503 });
    }
  });
  const dispatch = async (type, values = {}) => {
    let response;
    const pending = [];
    handlers[type]({
      ...values,
      waitUntil(value) { pending.push(value); },
      respondWith(value) { response = value; }
    });
    await Promise.all(pending);
    return response;
  };
  return { dispatch, stores, calls };
}

const request = (url, mode = 'cors', method = 'GET') => ({ url, mode, method });

test('worker precaches only local assets under its deployment scope', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  assert.equal(worker.calls.install.length, 7);
  for (const asset of worker.calls.install) {
    assert.ok(asset.url.startsWith('https://privacy.example/check/'));
    assert.equal(asset.cache, 'reload');
  }
  assert.ok(worker.calls.install.some(asset => asset.url.endsWith('/privacy-core.js')));
});

test('worker keeps app-shell navigation coherent and available offline', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  for (const url of ['https://privacy.example/check/', 'https://privacy.example/check/index.html?from=home']) {
    const response = await worker.dispatch('fetch', { request: request(url, 'navigate') });
    assert.equal(await response.text(), 'cached:https://privacy.example/check/index.html');
  }
  const script = await worker.dispatch('fetch', { request: request('https://privacy.example/check/app.js') });
  assert.equal(await script.text(), 'cached:https://privacy.example/check/app.js');
  assert.equal(worker.calls.fetch.length, 0);
});

test('worker never intercepts IP requests, third parties or unrelated resources', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  for (const url of [
    'https://privacy.example/.netlify/functions/ip',
    'https://privacy.example/api/ip',
    'https://privacy.example/check/app.js?private=value',
    'https://privacy.example/check/unrelated.json',
    'https://privacy.example/other/index.html',
    'https://api.ipify.org/?format=json',
    'https://cdn.jsdelivr.net/app.js'
  ]) {
    assert.equal(await worker.dispatch('fetch', { request: request(url) }), undefined);
  }
  assert.equal(await worker.dispatch('fetch', {
    request: request('https://privacy.example/check/app.js', 'cors', 'POST')
  }), undefined);
  assert.equal(worker.calls.fetch.length, 0);
});

test('worker activation removes only obsolete caches owned by this deployment', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  worker.stores.set('privacy-check:/check/:v3.0.0', new Map());
  worker.stores.set('privacy-check:/other/:v3.0.0', new Map());
  worker.stores.set('unrelated-app', new Map());
  await worker.dispatch('activate');
  assert.ok(!worker.stores.has('privacy-check:/check/:v3.0.0'));
  assert.ok(worker.stores.has('privacy-check:/check/:v4.0.0'));
  assert.ok(worker.stores.has('privacy-check:/other/:v3.0.0'));
  assert.ok(worker.stores.has('unrelated-app'));
  assert.equal(worker.calls.claimed, 1);
});

test('root worker removes legacy Privacy Check caches without deleting other apps', async () => {
  const worker = workerHarness('https://privacy.example/');
  worker.stores.set('privacy-check-v3.8.5', new Map());
  worker.stores.set('other-app-v3.8.5', new Map());
  await worker.dispatch('activate');
  assert.ok(!worker.stores.has('privacy-check-v3.8.5'));
  assert.ok(worker.stores.has('other-app-v3.8.5'));
});

test('worker falls back after cache eviction and does not cache server errors', async () => {
  const worker = workerHarness();
  const response = await worker.dispatch('fetch', {
    request: request('https://privacy.example/check/app.js')
  });
  assert.equal(response.status, 503);
  assert.equal(worker.calls.fetch.length, 1);
  assert.equal([...worker.stores.values()][0].size, 0);
});

test('worker activates an update only on the explicit update message', async () => {
  const worker = workerHarness();
  await worker.dispatch('message', { data: { type: 'OTHER' } });
  assert.equal(worker.calls.skipped, 0);
  await worker.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(worker.calls.skipped, 1);
});
