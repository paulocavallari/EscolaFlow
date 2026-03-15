export function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  corsHeaders: Record<string, string>,
  status: number,
  message: string,
  details?: string
) {
  return jsonResponse(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    status,
    corsHeaders
  );
}
