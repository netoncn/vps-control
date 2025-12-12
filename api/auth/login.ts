import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleLogin(req, res);
}
