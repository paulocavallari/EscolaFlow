export function stripThinkTags(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();
}

export function parseJsonSafe<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}
