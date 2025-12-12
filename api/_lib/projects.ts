import { listContainers, ContainerInfo } from './docker';

// Projetos são agrupados automaticamente pelo docker-compose label
// Não precisamos de persistência local na Vercel (stateless)

export type Project = {
  id: string;
  name: string;
  containerIds: string[];
  source: 'auto';
  composeProject?: string;
};

export type ProjectWithContainers = {
  project: Project;
  containers: ContainerInfo[];
};

export async function getProjects(): Promise<{
  autoProjects: ProjectWithContainers[];
}> {
  const containers = await listContainers();

  // Agrupar por docker-compose project
  const groups: Record<string, ContainerInfo[]> = {};

  containers.forEach((c) => {
    const key = c.composeProject || '__standalone__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const autoProjects: ProjectWithContainers[] = Object.entries(groups)
    .filter(([key]) => key !== '__standalone__')
    .map(([name, conts]) => ({
      project: {
        id: `auto:${name}`,
        name,
        containerIds: conts.map((c) => c.id),
        source: 'auto' as const,
        composeProject: name,
      },
      containers: conts,
    }));

  // Adicionar containers standalone como projeto separado
  const standalone = groups['__standalone__'];
  if (standalone && standalone.length > 0) {
    autoProjects.push({
      project: {
        id: 'auto:standalone',
        name: 'Standalone Containers',
        containerIds: standalone.map((c) => c.id),
        source: 'auto' as const,
      },
      containers: standalone,
    });
  }

  return { autoProjects };
}

export async function getProjectContainers(projectId: string): Promise<ContainerInfo[]> {
  const { autoProjects } = await getProjects();
  const project = autoProjects.find((p) => p.project.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  return project.containers;
}
