import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import { getSystemOverview } from '../_lib/system';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const overview = await getSystemOverview();
    return res.status(200).json(overview);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
