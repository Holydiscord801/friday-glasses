import { addConversationEntry, setProcessing } from '../store';

/**
 * useFriday - hook to interact with the Friday AI assistant.
 * Posts question to /api/ask which stores it as a pending_question.
 * The local friday-listener picks it up, calls OpenClaw, and POSTs
 * the response back to /api/answer. The response arrives via polling.
 */
export function useFriday() {
  async function sendMessage(message: string): Promise<void> {
    // Add user entry to local conversation immediately
    addConversationEntry({
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    });

    setProcessing(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      // Response will arrive async via polling when friday-listener answers.
      // isProcessing will be cleared by the polling loop when pending_question
      // becomes null on the server.
    } catch (err) {
      addConversationEntry({
        role: 'friday',
        text: `Error: ${err instanceof Error ? err.message : 'Unknown error occurred.'}`,
        timestamp: new Date().toISOString(),
      });
      setProcessing(false);
    }
  }

  return { sendMessage };
}
