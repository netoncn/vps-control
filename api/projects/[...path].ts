import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import { listContainers, startContainer, stopContainer, restartContainer } from '../_lib/docker';
import {
  findComposeProjectPath,
  listProjectFiles,
  readProjectFile,
  writeProjectFile,
  deployProject,
  redeployProject,
} from '../_lib/compose';

async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;

  // path é um array: ["projectId", "action"]
  if (!path || !Array.isArray(path) || path.length === 0) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const [projectId, action] = path;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }

  // Extrair nome do projeto do ID (auto:nome -> nome)
  const projectName = projectId.startsWith('auto:') ? projectId.slice(5) : projectId;

  try {
    // GET /api/projects/:id/files
    if (req.method === 'GET' && action === 'files') {
      const projectPath = await findComposeProjectPath(projectName);
      if (!projectPath) {
        return res.status(404).json({ error: 'Project path not found' });
      }
      const files = await listProjectFiles(projectPath);
      return res.status(200).json({ projectPath, files });
    }

    // GET /api/projects/:id/file?path=
    if (req.method === 'GET' && action === 'file') {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: 'File path required' });
      }
      const content = await readProjectFile(filePath);
      return res.status(200).json({ content });
    }

    // PUT /api/projects/:id/file
    if (req.method === 'PUT' && action === 'file') {
      const { path: filePath, content } = req.body || {};
      if (!filePath || typeof content !== 'string') {
        return res.status(400).json({ error: 'File path and content required' });
      }
      await writeProjectFile(filePath, content);
      return res.status(200).json({ success: true });
    }

    // POST /api/projects/:id/deploy
    if (req.method === 'POST' && action === 'deploy') {
      const projectPath = await findComposeProjectPath(projectName);
      if (!projectPath) {
        return res.status(404).json({ error: 'Project path not found' });
      }
      const { action: deployAction } = req.body || {};
      const output = deployAction === 'redeploy'
        ? await redeployProject(projectPath)
        : await deployProject(projectPath);
      return res.status(200).json({ success: true, output });
    }

    // POST /api/projects/:id/start
    if (req.method === 'POST' && action === 'start') {
      const containers = await listContainers();
      const projectContainers = containers.filter((c) => c.composeProject === projectName);
      for (const c of projectContainers) {
        await startContainer(c.id);
      }
      return res.status(200).json({ success: true, count: projectContainers.length });
    }

    // POST /api/projects/:id/stop
    if (req.method === 'POST' && action === 'stop') {
      const containers = await listContainers();
      const projectContainers = containers.filter((c) => c.composeProject === projectName);
      for (const c of projectContainers) {
        await stopContainer(c.id);
      }
      return res.status(200).json({ success: true, count: projectContainers.length });
    }

    // POST /api/projects/:id/restart
    if (req.method === 'POST' && action === 'restart') {
      const containers = await listContainers();
      const projectContainers = containers.filter((c) => c.composeProject === projectName);
      for (const c of projectContainers) {
        await restartContainer(c.id);
      }
      return res.status(200).json({ success: true, count: projectContainers.length });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
