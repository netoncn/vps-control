import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../../_lib/auth';
import { getProjectContainers } from '../../_lib/projects';
import { stopContainer } from '../../_lib/docker';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID required' });
  }

  try {
    const containers = await getProjectContainers(id);
    const results = await Promise.all(containers.map((c) => stopContainer(c.id)));
    return res.status(200).json({ stopped: results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
