import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVerify } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleVerify(req, res);
}
