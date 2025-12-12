import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../../_lib/auth';
import { readProjectFile, writeProjectFile } from '../../_lib/compose';

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID required' });
  }

  // GET - Ler arquivo
  if (req.method === 'GET') {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'File path required' });
    }

    try {
      const content = await readProjectFile(path);
      return res.status(200).json({ content });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Salvar arquivo
  if (req.method === 'PUT') {
    const { path, content } = req.body;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'File path required' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'File content required' });
    }

    try {
      await writeProjectFile(path, content);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
