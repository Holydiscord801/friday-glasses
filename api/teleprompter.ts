import type { VercelRequest, VercelResponse } from './_store.js';
import { cors, getStore, updateStore } from './_store.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    switch (req.method) {
      case 'GET': {
        const { teleprompter } = getStore();
        return res.status(200).json({ success: true, data: teleprompter });
      }

      case 'POST': {
        const { content } = req.body ?? {};

        if (typeof content !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'Missing required field: content (string)' });
        }

        const teleprompter = { content, scrollPosition: 0 };
        updateStore({ teleprompter });

        return res.status(200).json({ success: true, data: { content } });
      }

      default:
        res.setHeader('Allow', 'GET,POST,OPTIONS');
        return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }
  } catch (err: any) {
    console.error('[teleprompter]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
