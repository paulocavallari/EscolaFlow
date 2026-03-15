export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const allowOrigin = configured.length === 0
    ? '*'
    : (configured.includes(origin) ? origin : configured[0]);

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    Vary: 'Origin',
  };
}