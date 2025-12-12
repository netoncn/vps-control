import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadConfig } from './config';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

export function setCorsHeaders(res: VercelResponse) {
  const config = loadConfig();
  const origin = config.corsOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function withAuth(handler: Handler): Handler {
  return async (req: VercelRequest, res: VercelResponse) => {
    setCorsHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const config = loadConfig();

    // Se auth nao esta habilitada, prosseguir
    if (!config.auth.enabled) {
      return handler(req, res);
    }

    // Verificar token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      (req as any).user = decoded;
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export async function handleLogin(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = loadConfig();

  if (!config.auth.enabled) {
    return res.status(400).json({ error: 'Auth is not enabled' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username !== config.auth.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, config.auth.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, config.auth.jwtSecret, { expiresIn: '24h' });

  return res.status(200).json({ token });
}

export async function handleVerify(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = loadConfig();

  if (!config.auth.enabled) {
    return res.status(200).json({ valid: true, authEnabled: false });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    return res.status(200).json({ valid: true, user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
