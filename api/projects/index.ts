import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import { getProjects } from '../_lib/projects';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { autoProjects } = await getProjects();
    // Manter compatibilidade com frontend (manualProjects vazio na Vercel)
    return res.status(200).json({ autoProjects, manualProjects: [] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
