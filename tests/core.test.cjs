const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isIPAddress,
  normalizeIP,
  describePermission,
  classifyCandidate,
  summarizeChecks
} = require('../privacy-core.js');

test('IP validation accepts IPv4, IPv6, and embedded IPv4 addresses', () => {
  for (const address of [
    '192.0.2.1', '255.255.255.255', '0.0.0.0',
    '::', '::1', '2001:db8::1', '2001:0DB8:0:0:0:0:0:1',
    '::ffff:192.0.2.1'
  ]) {
    assert.equal(isIPAddress(address), true, address);
  }
});

test('IP validation rejects hostnames, malformed addresses, and ambiguous IPv4', () => {
  for (const address of [
    null, undefined, 123, '', 'example.com', '<img src=x onerror=alert(1)>',
    '256.0.0.1', '192.168.001.1', '127.1', '192.0.2.1:80',
    '1.2.3.4.5', '2001:db8:::1', '2001:db8::1::2', '2001:db8:1',
    '2001:db8:0:0:0:0:0:0:1', '::ffff:999.0.0.1', 'fe80::1%eth0'
  ]) {
    assert.equal(isIPAddress(address), false, String(address));
    assert.equal(normalizeIP(address), null, String(address));
  }
});

test('IP comparisons normalize equivalent IPv6 spellings without merging different addresses', () => {
  assert.equal(normalizeIP('2001:0DB8:0000:0000:0000:0000:0000:0001'), normalizeIP('2001:db8::1'));
  assert.equal(normalizeIP('::ffff:192.0.2.1'), normalizeIP('0:0:0:0:0:ffff:c000:201'));
  assert.equal(normalizeIP('192.0.2.1'), '192.0.2.1');
  assert.notEqual(normalizeIP('2001:db8::1'), normalizeIP('2001:db8::2'));
});

test('permissions distinguish granted access from blocked and ask-first states', () => {
  const granted = describePermission('granted');
  const denied = describePermission('denied');
  const prompt = describePermission('prompt');
  assert.equal(granted.state, 'attention');
  assert.equal(denied.state, 'clear');
  assert.equal(prompt.state, 'clear');
  assert.notEqual(denied.value, prompt.value);
  for (const result of [granted, denied, prompt]) {
    assert.equal(typeof result.value, 'string');
    assert.ok(result.value.length > 0);
    assert.equal(typeof result.description, 'string');
    assert.ok(result.description.length > 0);
  }
});

test('unsupported or unrecognized permissions stay unknown', () => {
  for (const state of [undefined, null, '', 'unknown', 'unsupported', 'future-state', 'constructor', 'toString', '__proto__']) {
    assert.equal(describePermission(state).state, 'unknown', String(state));
  }
});

test('WebRTC classifies actual IPv4 and IPv6 candidate addresses', () => {
  for (const address of ['192.168.1.4', '2001:db8::4', '::ffff:192.0.2.4']) {
    for (const candidate of [
      { address },
      { candidate: `candidate:1 1 udp 2122260223 ${address} 54832 typ host generation 0` }
    ]) {
      const result = classifyCandidate(candidate);
      assert.equal(result.kind, 'address', JSON.stringify(candidate));
      assert.equal(normalizeIP(result.address), normalizeIP(address));
    }
  }
});

test('WebRTC uses the address field rather than unrelated addresses in candidate metadata', () => {
  const result = classifyCandidate({
    candidate: 'candidate:192.0.2.99 1 udp 2122260223 peer.local 54832 typ host raddr 192.168.1.1 rport 0'
  });
  assert.equal(result.kind, 'masked');
});

test('WebRTC recognizes mDNS names without accepting lookalike domains', () => {
  for (const candidate of [
    { address: 'b481afc1-2e72-4eb8-89cc.local' },
    { candidate: 'candidate:1 1 udp 2122260223 host.local 54832 typ host' }
  ]) {
    assert.equal(classifyCandidate(candidate).kind, 'masked');
  }
  assert.deepEqual(classifyCandidate({ address: 'peer.local.example.com' }), { kind: 'other', address: null });
});

test('WebRTC ignores unspecified addresses and malformed or empty candidates', () => {
  for (const candidate of [
    null, {}, { candidate: '' }, { candidate: 'invalid 192.168.1.1' },
    { address: '0.0.0.0' }, { address: '::' }, { address: '0:0:0:0:0:0:0:0' },
    { address: '999.0.0.1' }, { address: '<img src=x>' }
  ]) {
    assert.deepEqual(classifyCandidate(candidate), { kind: 'other', address: null }, JSON.stringify(candidate));
  }
});

test('summary keeps unknown and observed findings separate from clear checks', () => {
  assert.deepEqual(summarizeChecks([
    { id: 'camera', state: 'attention' },
    { id: 'microphone', state: 'clear' },
    { id: 'location', state: 'clear' },
    { id: 'notifications', state: 'unknown' },
    { id: 'gpc', state: 'observed' },
    { id: 'cookies', state: 'info' }
  ]), { attention: 1, clear: 2, unknown: 1, observed: 1, total: 6 });
});

test('empty and entirely unsupported scans never imply successful checks', () => {
  assert.deepEqual(summarizeChecks([]), { attention: 0, clear: 0, unknown: 0, observed: 0, total: 0 });
  assert.deepEqual(summarizeChecks([
    { id: 'camera', state: 'unknown' },
    { id: 'webrtc', state: 'unknown' }
  ]), { attention: 0, clear: 0, unknown: 2, observed: 0, total: 2 });
});
