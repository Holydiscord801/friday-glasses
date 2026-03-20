import type { VercelRequest, VercelResponse } from './_store';
import { cors, getStore } from './_store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET,OPTIONS');
      return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }

    const state = getStore();
    return res.status(200).json({ success: true, data: state });
  } catch (err: any) {
    console.error('[state]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
