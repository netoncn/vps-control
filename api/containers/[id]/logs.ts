import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../../_lib/auth';
import { getContainerLogs } from '../../_lib/docker';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, lines } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Container ID required' });
  }

  const numLines = lines ? Number(lines) : 200;

  try {
    const logs = await getContainerLogs(id, numLines);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
