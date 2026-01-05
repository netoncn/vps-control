import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_lib/auth';
import { getProjects } from '../_lib/projects';
import { createProject, CreateProjectConfig } from '../_lib/compose';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { autoProjects } = await getProjects();
      // Manter compatibilidade com frontend (manualProjects vazio na Vercel)
      return res.status(200).json({ autoProjects, manualProjects: [] });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const config: CreateProjectConfig = req.body;

      // Validações básicas
      if (!config.projectName || typeof config.projectName !== 'string') {
        return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
      }

      if (!/^[a-z0-9-]+$/.test(config.projectName)) {
        return res.status(400).json({ error: 'Nome do projeto deve conter apenas letras minúsculas, números e hífens' });
      }

      if (!config.services || !Array.isArray(config.services) || config.services.length === 0) {
        return res.status(400).json({ error: 'Pelo menos um serviço é obrigatório' });
      }

      for (const service of config.services) {
        if (!service.serviceName || !/^[a-z0-9-]+$/.test(service.serviceName)) {
          return res.status(400).json({ error: `Nome do serviço inválido: ${service.serviceName}` });
        }

        if (!service.image || !service.image.startsWith('ghcr.io/')) {
          return res.status(400).json({ error: `Imagem deve começar com ghcr.io/: ${service.image}` });
        }

        if (!service.host) {
          return res.status(400).json({ error: `Host é obrigatório para o serviço: ${service.serviceName}` });
        }

        if (!service.port || service.port < 1 || service.port > 65535) {
          return res.status(400).json({ error: `Porta inválida para o serviço: ${service.serviceName}` });
        }
      }

      const projectPath = await createProject(config);
      return res.status(201).json({ success: true, projectPath });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
