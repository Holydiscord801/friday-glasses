import type { VercelRequest, VercelResponse } from './_store.js';
import { cors, updateStore } from './_store.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    // DELETE — clear pending audio (called by listener after transcription)
    if (req.method === 'DELETE') {
      updateStore({ pending_audio: null });
      return res.status(200).json({ success: true });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST,DELETE,OPTIONS');
      return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }

    const { audio } = req.body ?? {};

    if (typeof audio !== 'string' || audio.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required field: audio (base64 string)' });
    }

    // Store the audio for the local listener to pick up and transcribe
    updateStore({ pending_audio: audio });

    return res.status(200).json({
      success: true,
      data: { pending: true },
    });
  } catch (err: any) {
    console.error('[audio]', err);
    return res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
