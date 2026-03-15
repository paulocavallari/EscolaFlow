declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

export async function sendEvolutionMessage(phoneNumber: string, text: string) {
  const apiUrl = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  const instance = Deno.env.get('EVOLUTION_INSTANCE_NAME') ?? 'zap';

  if (!apiUrl || !apiKey) {
    return { success: false, error: 'Evolution API credentials missing' };
  }

  const number = formatPhoneNumber(phoneNumber);
  const url = `${apiUrl}/message/sendText/${instance}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify({
      number,
      textMessage: { text },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { success: false, error: `HTTP ${response.status}: ${body}` };
  }

  return { success: true };
}
