import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../../_lib/auth';
import { findComposeProjectPath, deployProject, redeployProject } from '../../_lib/compose';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID required' });
  }

  // Extrair nome do projeto do ID (auto:nome -> nome)
  const projectName = id.startsWith('auto:') ? id.slice(5) : id;

  try {
    const projectPath = await findComposeProjectPath(projectName);
    if (!projectPath) {
      return res.status(404).json({ error: 'Project path not found' });
    }

    const { action } = req.body || {};
    let output: string;

    if (action === 'redeploy') {
      // Pull + recreate containers
      output = await redeployProject(projectPath);
    } else {
      // Just up -d
      output = await deployProject(projectPath);
    }

    return res.status(200).json({ success: true, output });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
