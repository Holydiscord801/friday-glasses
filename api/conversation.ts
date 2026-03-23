import type { VercelRequest, VercelResponse } from './_store.js';
import { cors, getStore, updateStore } from './_store.js';
import type { ConversationEntry } from './_store.js';

const SYSTEM_PROMPT =
  'You are Friday, an AI assistant running on Even Realities G2 smart glasses. ' +
  'You provide concise, helpful responses optimized for a small glasses display ' +
  '(576x288 pixels). Keep responses brief and actionable. You can see what the user ' +
  'sees through their glasses and help them in real-time. Be warm but efficient ' +
  '— every word counts on the display.';

async function getFridayResponse(entries: ConversationEntry[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return 'Friday AI is not configured. Set ANTHROPIC_API_KEY in your environment.';
  }

  // Dynamic import so the module only loads when we actually have a key
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: entries.map((e) => ({
      role: e.role === 'friday' ? ('assistant' as const) : ('user' as const),
      content: e.text,
    })),
  });

  // Extract text from the response content blocks
  const textBlock = response.content.find((block: any) => block.type === 'text');
  return textBlock ? (textBlock as any).text : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Append user message
    const userEntry: ConversationEntry = { role: 'user', text: message.trim(), timestamp: now };
    const entries = [...store.conversation.entries, userEntry];

    // Get Friday's response
    const fridayText = await getFridayResponse(entries);

    const fridayEntry: ConversationEntry = {
      role: 'friday',
      text: fridayText,
      timestamp: new Date().toISOString(),
    };

    const updatedEntries = [...entries, fridayEntry];
    updateStore({ conversation: { entries: updatedEntries } });

    return res.status(200).json({
      success: true,
      data: {
        userMessage: userEntry,
        fridayResponse: fridayEntry,
      },
    });
  } catch (err: any) {
    console.error('[conversation]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
