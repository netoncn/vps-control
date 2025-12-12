import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import { execSSH } from '../_lib/ssh';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await execSSH('echo ssh-ok');
    return res.status(200).json({ ok: true, output: result.stdout.trim() });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export default withAuth(handler);
