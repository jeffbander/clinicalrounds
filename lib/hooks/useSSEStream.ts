/**
 * Generic SSE (Server-Sent Events) stream reader.
 *
 * Reads a fetch Response body as a stream of SSE events, parsing each
 * `data: {...}` line as JSON and invoking the callback for each event.
 */
export async function readSSEStream<T>(
  response: Response,
  onEvent: (event: T) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        let parsed: T;
        try {
          parsed = JSON.parse(trimmed.slice(6)) as T;
        } catch {
          // Skip unparseable lines
          continue;
        }
        onEvent(parsed);
      }
    }
  }

  // Process any remaining data in the buffer
  if (buffer.trim().startsWith('data: ')) {
    let parsed: T;
    try {
      parsed = JSON.parse(buffer.trim().slice(6)) as T;
    } catch {
      return; // Skip unparseable final line
    }
    onEvent(parsed);
  }
}
