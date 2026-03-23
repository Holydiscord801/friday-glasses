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

    const { message } = req.body ?? {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required field: message (non-empty string)' });
    }

    const store = getStore();
    const now = new Date().toISOString();

    // Add user entry to conversation
    const userEntry: ConversationEntry = { role: 'user', text: message.trim(), timestamp: now };
    const entries = [...store.conversation.entries, userEntry];

    // Store the pending question for the local listener to pick up
    updateStore({
      conversation: { entries },
      pending_question: message.trim(),
    });

    return res.status(200).json({
      success: true,
      data: { userMessage: userEntry, pending: true },
    });
  } catch (err: any) {
    console.error('[ask]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
