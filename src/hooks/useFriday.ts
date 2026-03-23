import { addConversationEntry, setProcessing } from '../store';
import { API_BASE } from '../api';

/**
 * useFriday — hook to interact with the Friday AI assistant.
 * POSTs to the local Express server which calls OpenClaw directly
 * and returns the answer synchronously.
 */
export function useFriday() {
  async function sendMessage(message: string): Promise<void> {
    addConversationEntry({
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    });

    setProcessing(true);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const json = await res.json();
      const fridayText = json.data?.fridayResponse?.text;
      if (fridayText) {
        addConversationEntry({
          role: 'friday',
          text: fridayText,
          timestamp: json.data.fridayResponse.timestamp || new Date().toISOString(),
        });
      }
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
