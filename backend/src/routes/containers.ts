import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DockerService } from '../services/dockerService';
import { ProjectStore } from '../services/projectStore';
import { ResourceLimits } from '../types';

type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

type RouteDeps = {
  docker: DockerService;
  projects: ProjectStore;
  auth?: AuthHandler;
};

function groupAutoProjects(containers: Awaited<ReturnType<DockerService['listContainers']>>) {
  const groups: Record<string, string[]> = {};
  containers.forEach((c) => {
    if (c.composeProject) {
      if (!groups[c.composeProject]) groups[c.composeProject] = [];
      groups[c.composeProject].push(c.id);
    }
  });
  return Object.entries(groups).map(([name, ids]) => ({
    id: `auto:${name}`,
    name,
    containerIds: ids,
    source: 'auto' as const,
    composeProject: name,
  }));
}

export async function containersRoutes(fastify: FastifyInstance, deps: RouteDeps) {
  const { docker, projects, auth } = deps;
  const preHandler = auth ? [auth] : [];

  fastify.get('/api/containers', { preHandler }, async () => {
    const containers = await docker.listContainers();
    const manual = await projects.list();
    const auto = groupAutoProjects(containers);
    return { containers, autoProjects: auto, manualProjects: manual };
  });

  fastify.get<{ Params: { id: string } }>('/api/containers/:id/inspect', { preHandler }, async (request) => {
    const { id } = request.params;
    return docker.inspectContainer(id);
  });

  fastify.get<{ Params: { id: string } }>('/api/containers/:id/stats', { preHandler }, async (request) => {
    const { id } = request.params;
    const stats = await docker.stats([id]);
    return stats[0] || {};
  });

  fastify.get('/api/containers/stats', { preHandler }, async () => {
    return docker.statsAll();
  });

  fastify.post<{ Params: { id: string } }>('/api/containers/:id/start', { preHandler }, async (request) => {
    return { result: await docker.startContainer(request.params.id) };
  });

  fastify.post<{ Params: { id: string } }>('/api/containers/:id/stop', { preHandler }, async (request) => {
    return { result: await docker.stopContainer(request.params.id) };
  });

  fastify.post<{ Params: { id: string } }>('/api/containers/:id/restart', { preHandler }, async (request) => {
    return { result: await docker.restartContainer(request.params.id) };
  });

  fastify.get<{ Params: { id: string }; Querystring: { lines?: string } }>(
    '/api/containers/:id/logs',
    { preHandler },
    async (request, reply) => {
      const lines = request.query.lines ? Number(request.query.lines) : 200;
      const data = await docker.tailLogs(request.params.id, { lines });
      reply.type('text/plain');
      return data;
    },
  );

  fastify.get<{ Params: { id: string }; Querystring: { lines?: string } }>(
    '/api/containers/:id/logs/stream',
    { preHandler },
    async (request, reply) => {
      const lines = request.query.lines ? Number(request.query.lines) : 200;
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      });

      const send = (data: string) => {
        const normalized = data.replace(/\n/g, '\ndata: ');
        reply.raw.write(`data: ${normalized}\n\n`);
      };

      const handle = docker.streamLogs(
        request.params.id,
        lines,
        (chunk) => send(chunk.toString('utf8')),
        (err) => send(`error: ${err.message}`),
        () => send('close'),
      );

      request.raw.on('close', () => {
        handle.close();
        reply.raw.end();
      });
    },
  );

  fastify.post<{
    Params: { id: string };
    Body: ResourceLimits;
  }>('/api/containers/:id/resources', { preHandler }, async (request) => {
    return docker.updateResources(request.params.id, request.body);
  });
}
