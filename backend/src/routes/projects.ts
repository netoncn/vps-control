import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DockerService } from '../services/dockerService';
import { ProjectStore } from '../services/projectStore';
import { Project, ProjectWithContainers } from '../types';

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
      groups[c.composeProject] = groups[c.composeProject] || [];
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

function attachContainers(projectIds: Project[], containers: Awaited<ReturnType<DockerService['listContainers']>>): ProjectWithContainers[] {
  return projectIds.map((project) => ({
    project,
    containers: containers.filter((c) => project.containerIds.includes(c.id)),
  }));
}

async function resolveProjectWithContainers(
  id: string,
  docker: DockerService,
  projects: ProjectStore,
) {
  const containers = await docker.listContainers();
  const manual = await projects.list();
  const auto = groupAutoProjects(containers);
  const all = [...manual, ...auto];
  const found = all.find((p) => p.id === id);
  if (!found) throw new Error('Project not found');
  return {
    project: found,
    containers: containers.filter((c) => found.containerIds.includes(c.id)),
  };
}

export async function projectsRoutes(fastify: FastifyInstance, deps: RouteDeps) {
  const { docker, projects, auth } = deps;
  const preHandler = auth ? [auth] : [];

  fastify.get('/api/projects', { preHandler }, async () => {
    const containers = await docker.listContainers();
    const manual = await projects.list();
    const auto = groupAutoProjects(containers);
    return {
      manualProjects: attachContainers(manual, containers),
      autoProjects: attachContainers(auto, containers),
    };
  });

  fastify.post<{ Body: { name: string; containerIds?: string[] } }>(
    '/api/projects',
    { preHandler },
    async (request) => {
      const { name, containerIds = [] } = request.body;
      if (!name) throw new Error('Name is required');
      const project = await projects.create(name, containerIds);
      return project;
    },
  );

  fastify.put<{ Params: { id: string }; Body: { name?: string; containerIds?: string[] } }>(
    '/api/projects/:id',
    { preHandler },
    async (request) => {
      return projects.update(request.params.id, request.body);
    },
  );

  fastify.delete<{ Params: { id: string } }>('/api/projects/:id', { preHandler }, async (request, reply) => {
    await projects.remove(request.params.id);
    reply.code(204).send();
  });

  fastify.post<{ Params: { id: string } }>('/api/projects/:id/start', { preHandler }, async (request) => {
    const { containers } = await resolveProjectWithContainers(request.params.id, docker, projects);
    const results = await Promise.all(containers.map((c) => docker.startContainer(c.id)));
    return { started: results };
  });

  fastify.post<{ Params: { id: string } }>('/api/projects/:id/stop', { preHandler }, async (request) => {
    const { containers } = await resolveProjectWithContainers(request.params.id, docker, projects);
    const results = await Promise.all(containers.map((c) => docker.stopContainer(c.id)));
    return { stopped: results };
  });

  fastify.post<{ Params: { id: string } }>('/api/projects/:id/restart', { preHandler }, async (request) => {
    const { containers } = await resolveProjectWithContainers(request.params.id, docker, projects);
    const results = await Promise.all(containers.map((c) => docker.restartContainer(c.id)));
    return { restarted: results };
  });
}
