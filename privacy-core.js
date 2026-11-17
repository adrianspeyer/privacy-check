/* Pure interpretation helpers, shared by the browser and Node's test runner. */
(function (root) {
  'use strict';

  function normalizeIP(value) {
    if (typeof value !== 'string' || value !== value.trim() || !value) return null;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
      const parts = value.split('.');
      return parts.every(part => Number(part) <= 255 && String(Number(part)) === part) ? value : null;
    }
    if (!value.includes(':') || !/^[0-9a-fA-F:.]+$/.test(value)) return null;
    if (value.includes('.')) {
      const tail = value.slice(value.lastIndexOf(':') + 1);
      if (!normalizeIP(tail)) return null;
    }
    try {
      const hostname = new URL(`http://[${value}]/`).hostname;
      return hostname.slice(1, -1).toLowerCase();
    } catch { return null; }
  }

  function describePermission(state) {
    const descriptions = {
      granted: { state: 'attention', value: 'Allowed for this site', description: 'Review this permission in your browser’s site settings if you no longer need it. This does not describe access granted to other sites.' },
      denied: { state: 'clear', value: 'Blocked for this site', description: 'This site cannot use this permission. Other sites can have different settings.' },
      prompt: { state: 'clear', value: 'Ask first', description: 'This site has not been granted access. Your browser reports that permission must be requested.' }
    };
    return Object.hasOwn(descriptions, state) ? descriptions[state] : { state: 'unknown', value: 'Not available', description: 'Your browser did not expose this permission state. This is not evidence that access is allowed or blocked.' };
  }

  function classifyCandidate(candidate) {
    const text = typeof candidate === 'string' ? candidate : candidate?.candidate || '';
    const raw = (typeof candidate === 'object' && candidate?.address) || text.trim().split(/\s+/)[4] || '';
    if (/^[a-z0-9.-]+\.local\.?$/i.test(raw)) return { kind: 'masked', address: null };
    const address = normalizeIP(raw);
    if (address && address !== '0.0.0.0' && address !== '::') return { kind: 'address', address };
    return { kind: 'other', address: null };
  }

  function summarizeChecks(checks) {
    const summary = { attention: 0, clear: 0, unknown: 0, observed: 0, total: 0 };
    for (const check of checks) {
      summary.total++;
      if (Object.hasOwn(summary, check.state) && check.state !== 'total') summary[check.state]++;
    }
    return summary;
  }

  const api = { normalizeIP, isIPAddress: value => normalizeIP(value) !== null, describePermission, classifyCandidate, summarizeChecks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrivacyCore = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
