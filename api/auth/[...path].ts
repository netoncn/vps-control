import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogin, handleVerify } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;

  // path é um array: ["login"] ou ["verify"]
  if (!path || !Array.isArray(path) || path.length === 0) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const [action] = path;

  // POST /api/auth/login
  if (action === 'login') {
    return handleLogin(req, res);
  }

  // GET /api/auth/verify
  if (action === 'verify') {
    return handleVerify(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
