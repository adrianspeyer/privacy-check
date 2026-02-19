exports.handler = async (event) => {
  // Netlify provides a reliable IP header:
  // https://docs.netlify.com/functions/build-with-javascript/#format
  const ip =
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] ? event.headers['x-forwarded-for'].split(',')[0].trim() : '') ||
    event.headers['client-ip'] ||
    '';

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify({ ip: ip || null })
  };
};
