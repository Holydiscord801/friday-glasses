import type { VercelRequest, VercelResponse } from './_store';
import { cors, getStore, updateStore, generateId } from './_store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    switch (req.method) {
      case 'GET': {
        const { notes } = getStore();
        return res.status(200).json({ success: true, data: notes });
      }

      case 'POST': {
        const { title, content } = req.body ?? {};

        if (typeof title !== 'string' || typeof content !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'Missing required fields: title (string), content (string)' });
        }

        const note = {
          id: generateId(),
          title,
          content,
          createdAt: new Date().toISOString(),
        };

        const store = getStore();
        const notes = [...store.notes, note];
        updateStore({ notes });

        return res.status(201).json({ success: true, data: note });
      }

      case 'DELETE': {
        const id = typeof req.query.id === 'string' ? req.query.id : req.query.id?.[0];

        if (!id) {
          return res
            .status(400)
            .json({ success: false, error: 'Missing required query parameter: id' });
        }

        const store = getStore();
        const index = store.notes.findIndex((n) => n.id === id);

        if (index === -1) {
          return res.status(404).json({ success: false, error: `Note with id "${id}" not found` });
        }

        const notes = store.notes.filter((n) => n.id !== id);
        updateStore({ notes });

        return res.status(200).json({ success: true, data: { deleted: id } });
      }

      default:
        res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
        return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }
  } catch (err: any) {
    console.error('[notes]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
