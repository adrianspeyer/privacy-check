// netlify/functions/ip.js
// Returns client public IP (no logging, no storage). Used by the VPN Test in the UI.
exports.handler = async (event) => {
  const h = event.headers || {};
  const ip =
    h["x-nf-client-connection-ip"] ||
    (h["x-forwarded-for"] ? String(h["x-forwarded-for"]).split(",")[0].trim() : "") ||
    h["client-ip"] ||
    h["x-real-ip"] ||
    "";

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify({ ip: ip || null })
  };
};
