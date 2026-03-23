import { addConversationEntry, setProcessing } from '../store';

/**
 * useFriday - hook to interact with the Friday AI assistant.
 * Sends messages via the /api/conversation endpoint and
 * updates the store with the response.
 */
export function useFriday() {
  async function sendMessage(message: string): Promise<void> {
    // Add user entry to conversation
    addConversationEntry({
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    });

    setProcessing(true);

    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const json = await res.json();
      const reply = json.data?.fridayResponse?.text ?? 'No response from Friday.';

      addConversationEntry({
        role: 'friday',
        text: reply,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      addConversationEntry({
        role: 'friday',
        text: `Error: ${err instanceof Error ? err.message : 'Unknown error occurred.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setProcessing(false);
    }
  }

  return { sendMessage };
}
