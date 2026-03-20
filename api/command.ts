import type { VercelRequest, VercelResponse } from './_store';
import { cors, getStore, updateStore, generateId } from './_store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST,OPTIONS');
      return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }

    const { action, payload } = req.body ?? {};

    if (typeof action !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required field: action (string)' });
    }

    const store = getStore();

    switch (action) {
      // ---- Teleprompter ----
      case 'set_teleprompter': {
        const content = payload?.content;
        if (typeof content !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'payload.content (string) is required' });
        }
        updateStore({ teleprompter: { content, scrollPosition: 0 } });
        return res.status(200).json({ success: true, action, data: { content } });
      }

      case 'clear_teleprompter': {
        updateStore({ teleprompter: { content: '', scrollPosition: 0 } });
        return res.status(200).json({ success: true, action, data: { content: '' } });
      }

      // ---- Notes ----
      case 'add_note': {
        const title = payload?.title;
        const content = payload?.content;
        if (typeof title !== 'string' || typeof content !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'payload.title and payload.content (strings) are required' });
        }
        const note = {
          id: generateId(),
          title,
          content,
          createdAt: new Date().toISOString(),
        };
        updateStore({ notes: [...store.notes, note] });
        return res.status(200).json({ success: true, action, data: note });
      }

      case 'clear_notes': {
        updateStore({ notes: [] });
        return res.status(200).json({ success: true, action, data: { notes: [] } });
      }

      // ---- Contact ----
      case 'set_contact': {
        if (!payload || typeof payload.name !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'payload.name (string) is required' });
        }
        const contact = {
          name: payload.name,
          title: typeof payload.title === 'string' ? payload.title : '',
          company: typeof payload.company === 'string' ? payload.company : '',
          context: typeof payload.context === 'string' ? payload.context : '',
          talking_points: Array.isArray(payload.talking_points) ? payload.talking_points : [],
        };
        updateStore({ contact });
        return res.status(200).json({ success: true, action, data: contact });
      }

      case 'clear_contact': {
        updateStore({ contact: null });
        return res.status(200).json({ success: true, action, data: null });
      }

      // ---- Unknown ----
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err: any) {
    console.error('[command]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
