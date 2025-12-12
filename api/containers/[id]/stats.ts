import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../../_lib/auth';
import { getContainerStats } from '../../_lib/docker';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Container ID required' });
  }

  try {
    const stats = await getContainerStats([id]);
    return res.status(200).json(stats[0] || {});
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
