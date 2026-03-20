import type { VercelRequest, VercelResponse } from './_store';
import { cors, getStore, updateStore } from './_store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    switch (req.method) {
      case 'GET': {
        const { contact } = getStore();
        return res.status(200).json({ success: true, data: contact });
      }

      case 'POST': {
        const { name, title, company, context, talking_points } = req.body ?? {};

        if (typeof name !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'Missing required field: name (string)' });
        }

        const contact = {
          name,
          title: typeof title === 'string' ? title : '',
          company: typeof company === 'string' ? company : '',
          context: typeof context === 'string' ? context : '',
          talking_points: Array.isArray(talking_points) ? talking_points : [],
        };

        updateStore({ contact });

        return res.status(200).json({ success: true, data: contact });
      }

      case 'DELETE': {
        updateStore({ contact: null });
        return res.status(200).json({ success: true, data: null });
      }

      default:
        res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
        return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }
  } catch (err: any) {
    console.error('[contact]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
