import { execSSH } from './ssh';

/**
 * Valida e sanitiza ID de container (apenas alfanuméricos)
 */
function sanitizeContainerId(id: string): string {
  // Container IDs são hexadecimais (short ou full)
  // Container names podem ter letras, números, underscore, hyphen, dot
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) {
    throw new Error('Invalid container ID');
  }
  return id;
}

export type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports?: string;
  composeProject?: string;
};

export type ContainerStats = {
  id: string;
  name: string;
  cpuPercent?: number;
  memUsageBytes?: number;
  memLimitBytes?: number;
  memPercent?: number;
};

export async function listContainers(): Promise<ContainerInfo[]> {
  const format = '{{.ID}}|{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}|{{.Ports}}|{{.Labels}}';
  const { stdout } = await execSSH(`docker ps -a --format '${format}'`);

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, name, image, state, status, ports, labels] = line.split('|');
      const composeProject = labels
        ?.split(',')
        .find((l) => l.startsWith('com.docker.compose.project='))
        ?.split('=')[1];
      return { id, name, image, state, status, ports: ports || undefined, composeProject };
    });
}

export async function startContainer(id: string): Promise<string> {
  const safeId = sanitizeContainerId(id);
  const { stdout, stderr } = await execSSH(`docker start ${safeId}`);
  if (stderr && !stdout) throw new Error(stderr);
  return stdout.trim();
}

export async function stopContainer(id: string): Promise<string> {
  const safeId = sanitizeContainerId(id);
  const { stdout, stderr } = await execSSH(`docker stop ${safeId}`);
  if (stderr && !stdout) throw new Error(stderr);
  return stdout.trim();
}

export async function restartContainer(id: string): Promise<string> {
  const safeId = sanitizeContainerId(id);
  const { stdout, stderr } = await execSSH(`docker restart ${safeId}`);
  if (stderr && !stdout) throw new Error(stderr);
  return stdout.trim();
}

export async function getContainerLogs(id: string, lines: number = 200): Promise<string> {
  const safeId = sanitizeContainerId(id);
  const safeLines = Math.max(1, Math.min(10000, Math.floor(lines)));
  const { stdout } = await execSSH(`docker logs --tail ${safeLines} ${safeId} 2>&1`);
  return stdout;
}

export async function getContainerStats(ids: string[]): Promise<ContainerStats[]> {
  if (ids.length === 0) return [];

  const safeIds = ids.map(sanitizeContainerId);
  const format = '{{.ID}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}';
  const { stdout } = await execSSH(`docker stats --no-stream --format '${format}' ${safeIds.join(' ')}`);

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, name, cpuStr, memUsageStr, memPercStr] = line.split('|');
      const cpuPercent = parseFloat(cpuStr?.replace('%', '') || '0');
      const memPercent = parseFloat(memPercStr?.replace('%', '') || '0');

      // Parse mem usage: "123MiB / 456MiB"
      const memMatch = memUsageStr?.match(/([\d.]+)(\w+)\s*\/\s*([\d.]+)(\w+)/);
      let memUsageBytes = 0;
      let memLimitBytes = 0;

      if (memMatch) {
        const toBytes = (val: string, unit: string) => {
          const n = parseFloat(val);
          if (unit === 'GiB') return n * 1024 ** 3;
          if (unit === 'MiB') return n * 1024 ** 2;
          if (unit === 'KiB') return n * 1024;
          return n;
        };
        memUsageBytes = toBytes(memMatch[1], memMatch[2]);
        memLimitBytes = toBytes(memMatch[3], memMatch[4]);
      }

      return { id, name, cpuPercent, memUsageBytes, memLimitBytes, memPercent };
    });
}

export async function getAllContainerStats(): Promise<ContainerStats[]> {
  const containers = await listContainers();
  const runningIds = containers.filter((c) => c.state === 'running').map((c) => c.id);
  if (runningIds.length === 0) return [];
  return getContainerStats(runningIds);
}

export async function inspectContainer(id: string) {
  const safeId = sanitizeContainerId(id);
  const { stdout } = await execSSH(`docker inspect ${safeId}`);
  const data = JSON.parse(stdout)[0];

  const env = (data.Config?.Env || []).map((e: string) => {
    const [key, ...rest] = e.split('=');
    return { key, value: rest.join('=') };
  });

  const cpus = data.HostConfig?.NanoCpus ? String(data.HostConfig.NanoCpus / 1e9) : undefined;
  const memory = data.HostConfig?.Memory ? `${data.HostConfig.Memory / (1024 * 1024)}m` : undefined;

  return { env, limits: { cpus, memory } };
}

export async function updateResources(id: string, limits: { cpus?: string; memory?: string }) {
  const safeId = sanitizeContainerId(id);
  const flags: string[] = [];

  // Validar e sanitizar cpus (número decimal)
  if (limits.cpus) {
    const cpuNum = parseFloat(limits.cpus);
    if (isNaN(cpuNum) || cpuNum <= 0 || cpuNum > 128) {
      throw new Error('Invalid CPU limit');
    }
    flags.push(`--cpus=${cpuNum}`);
  }

  // Validar e sanitizar memory (ex: 512m, 1g)
  if (limits.memory) {
    if (!/^\d+[kmgKMG]?$/.test(limits.memory)) {
      throw new Error('Invalid memory limit');
    }
    flags.push(`--memory=${limits.memory}`);
  }

  if (flags.length === 0) {
    return { message: 'No limits specified' };
  }

  const { stdout, stderr } = await execSSH(`docker update ${flags.join(' ')} ${safeId}`);
  if (stderr && !stdout) throw new Error(stderr);
  return { message: 'Updated', id: stdout.trim() };
}
