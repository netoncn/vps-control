import Fastify from 'fastify';
import cors from '@fastify/cors';
import ssePlugin from 'fastify-sse-v2';
import { loadConfig } from './config';
import { SSHClient } from './services/sshClient';
import { DockerService } from './services/dockerService';
import { ProjectStore } from './services/projectStore';
import { containersRoutes } from './routes/containers';
import { projectsRoutes } from './routes/projects';
import { settingsRoutes } from './routes/settings';
import { SystemService } from './services/systemService';
import { systemRoutes } from './routes/system';
import { registerAuth, createAuthRoutes } from './middleware/auth';

async function buildServer() {
  const config = loadConfig();
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: config.corsOrigin });
  await fastify.register(ssePlugin);

  // Registrar autenticacao (se habilitada)
  await registerAuth(fastify, config.auth);

  // Rotas de auth (sempre disponiveis para login)
  if (config.auth.enabled) {
    createAuthRoutes(fastify, config.auth);
  }

  const ssh = new SSHClient(config.ssh);
  const docker = new DockerService(ssh);
  const projects = new ProjectStore();
  const system = new SystemService(ssh);

  // Opcoes de rota com ou sem autenticacao
  const routeOpts = { docker, projects, auth: config.auth.enabled ? fastify.authenticate : undefined };

  await containersRoutes(fastify, routeOpts);
  await projectsRoutes(fastify, { ...routeOpts });
  await settingsRoutes(fastify, { ssh, auth: routeOpts.auth });
  await systemRoutes(fastify, { system, auth: routeOpts.auth });

  return { fastify, config };
}

async function start() {
  try {
    const { fastify, config } = await buildServer();
    await fastify.listen({ port: config.serverPort, host: config.serverHost });
    fastify.log.info(`Server ready on http://${config.serverHost}:${config.serverPort}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildServer };
