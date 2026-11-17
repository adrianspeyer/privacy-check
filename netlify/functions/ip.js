// This opt-in endpoint echoes the connection address supplied by Netlify.
// The function does not log or store it; the hosting provider handles the request.
const { isIP } = require('node:net');

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    return {
      statusCode: 405,
      headers: { ...responseHeaders, Allow: 'GET, HEAD' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Forwarded-For, Client-IP and Real-IP may be caller-controlled. Never use
  // them as fallbacks. Netlify supplies this header at its trusted ingress.
  const entry = Object.entries(event.headers || {}).find(
    ([name]) => name.toLowerCase() === 'x-nf-client-connection-ip'
  );
  const value = typeof entry?.[1] === 'string' ? entry[1].trim() : '';
  const valid = value.length <= 45 && !value.includes('%') && isIP(value);
  const ip = valid ? (isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname.slice(1, -1) : value) : null;

  return {
    statusCode: ip ? 200 : 503,
    headers: responseHeaders,
    body: method === 'HEAD' ? '' : JSON.stringify(ip ? { ip } : {
      ip: null,
      error: 'Connection address unavailable on this host'
    })
  };
};
