import type { VercelRequest, VercelResponse } from './_store.js';
import { cors, getStore, updateStore } from './_store.js';
import type { ConversationEntry } from './_store.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST,OPTIONS');
      return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }

    const { answer } = req.body ?? {};

    if (typeof answer !== 'string' || answer.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required field: answer (non-empty string)' });
    }

    const store = getStore();
    const now = new Date().toISOString();

    // Add Friday's response to conversation
    const fridayEntry: ConversationEntry = { role: 'friday', text: answer.trim(), timestamp: now };
    const entries = [...store.conversation.entries, fridayEntry];

    // Clear the pending question and store the response
    updateStore({
      conversation: { entries },
      pending_question: null,
    });

    return res.status(200).json({
      success: true,
      data: { fridayResponse: fridayEntry },
    });
  } catch (err: any) {
    console.error('[answer]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
