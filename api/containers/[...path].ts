import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import {
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  inspectContainer,
  getContainerStats,
  updateResources,
} from '../_lib/docker';

async function handler(req: VercelRequest, res: VercelResponse) {
  let { path } = req.query;

  // Normalizar path para array (pode vir como string ou array)
  if (typeof path === 'string') {
    path = path.split('/').filter(Boolean);
  }
  if (!path || !Array.isArray(path) || path.length === 0) {
    return res.status(400).json({ error: 'Invalid path', received: req.query });
  }

  const [containerId, action] = path;

  if (!containerId) {
    return res.status(400).json({ error: 'Container ID required' });
  }

  try {
    // GET /api/containers/:id/logs
    if (req.method === 'GET' && action === 'logs') {
      const lines = parseInt(req.query.lines as string) || 200;
      const logs = await getContainerLogs(containerId, lines);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(logs);
    }

    // GET /api/containers/:id/inspect
    if (req.method === 'GET' && action === 'inspect') {
      const data = await inspectContainer(containerId);
      return res.status(200).json(data);
    }

    // GET /api/containers/:id/stats
    if (req.method === 'GET' && action === 'stats') {
      const stats = await getContainerStats([containerId]);
      return res.status(200).json(stats[0] || {});
    }

    // POST /api/containers/:id/start
    if (req.method === 'POST' && action === 'start') {
      await startContainer(containerId);
      return res.status(200).json({ success: true });
    }

    // POST /api/containers/:id/stop
    if (req.method === 'POST' && action === 'stop') {
      await stopContainer(containerId);
      return res.status(200).json({ success: true });
    }

    // POST /api/containers/:id/restart
    if (req.method === 'POST' && action === 'restart') {
      await restartContainer(containerId);
      return res.status(200).json({ success: true });
    }

    // POST /api/containers/:id/resources
    if (req.method === 'POST' && action === 'resources') {
      const { cpus, memory } = req.body || {};
      const result = await updateResources(containerId, { cpus, memory });
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
