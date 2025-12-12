import { SSHClient } from './sshClient';
import {
  ContainerInfo,
  ContainerInspect,
  ContainerStats,
  LogsTailOptions,
  ResourceLimits,
} from '../types';

const composeLabel = 'com.docker.compose.project';

function parseJsonLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, string>[];
}

function parsePercent(text?: string) {
  if (!text) return undefined;
  const num = parseFloat(text.replace('%', ''));
  return Number.isFinite(num) ? num : undefined;
}

function parseBytes(text?: string) {
  if (!text) return undefined;
  // Docker stats reports e.g., "12.5MiB"
  const match = text.match(/([\d.]+)\s*([KMG]i?)?B?/i);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase() || '';
  const multipliers: Record<string, number> = {
    K: 1e3,
    KI: 1024,
    M: 1e6,
    MI: 1024 ** 2,
    G: 1e9,
    GI: 1024 ** 3,
  };
  const factor = multipliers[unit] || 1;
  return Math.round(value * factor);
}

export class DockerService {
  constructor(private ssh: SSHClient) {}

  async listContainers(): Promise<ContainerInfo[]> {
    const { stdout, stderr } = await this.ssh.exec(
      `docker ps -a --format '{{json .}}'`,
    );
    if (stderr) {
      throw new Error(stderr);
    }

    const rows = parseJsonLines(stdout);
    return rows.map((row) => ({
      id: row.ID,
      name: row.Names,
      image: row.Image,
      state: row.State,
      status: row.Status,
      createdAt: row.CreatedAt,
      ports: row.Ports,
      labels: row.Labels ? Object.fromEntries(row.Labels.split(',').map((pair: string) => {
        const [k, v] = pair.split('=');
        return [k, v];
      })) : {},
      composeProject: row.Labels?.includes(composeLabel)
        ? row.Labels?.split(',')
            .map((pair: string) => pair.split('='))
            .find(([k]) => k === composeLabel)?.[1]
        : undefined,
    }));
  }

  async inspectContainer(id: string): Promise<ContainerInspect & { limits: ResourceLimits }> {
    const { stdout, stderr } = await this.ssh.exec(
      `docker inspect ${id} --format '{{json .Config.Env}}'`,
    );
    if (stderr) throw new Error(stderr);

    const env = JSON.parse(stdout || '[]') as string[];
    const envPairs = env.map((item) => {
      const [key, ...rest] = item.split('=');
      return { key, value: rest.join('=') };
    });

    const limitsRes = await this.ssh.exec(
      `docker inspect ${id} --format '{{json .HostConfig}}'`,
    );
    if (limitsRes.stderr) throw new Error(limitsRes.stderr);
    const hostCfg = JSON.parse(limitsRes.stdout || '{}');
    const limits: ResourceLimits = {
      cpus: hostCfg.NanoCpus ? (hostCfg.NanoCpus / 1e9).toString() : undefined,
      memory: hostCfg.Memory ? `${hostCfg.Memory}` : undefined,
    };

    return { env: envPairs, limits };
  }

  async tailLogs(containerId: string, options: LogsTailOptions = {}) {
    const lines = options.lines ?? 200;
    const { stdout, stderr } = await this.ssh.exec(
      `docker logs --tail ${lines} ${containerId}`,
    );
    if (stderr) throw new Error(stderr);
    return stdout;
  }

  streamLogs(containerId: string, lines: number, onChunk: (chunk: Buffer) => void, onError: (err: Error) => void, onClose: () => void) {
    const cmd = `docker logs --tail ${lines} -f ${containerId}`;
    return this.ssh.stream(cmd, { onData: onChunk, onError, onClose });
  }

  async startContainer(id: string) {
    const res = await this.ssh.exec(`docker start ${id}`);
    if (res.stderr) throw new Error(res.stderr);
    return res.stdout.trim();
  }

  async stopContainer(id: string) {
    const res = await this.ssh.exec(`docker stop ${id}`);
    if (res.stderr) throw new Error(res.stderr);
    return res.stdout.trim();
  }

  async restartContainer(id: string) {
    const res = await this.ssh.exec(`docker restart ${id}`);
    if (res.stderr) throw new Error(res.stderr);
    return res.stdout.trim();
  }

  async updateResources(id: string, limits: ResourceLimits) {
    const flags: string[] = [];
    if (limits.cpus) flags.push(`--cpus=${limits.cpus}`);
    if (limits.memory) flags.push(`--memory=${limits.memory}`);
    if (!flags.length) {
      throw new Error('No resource limits provided');
    }
    const cmd = `docker update ${flags.join(' ')} ${id}`;
    const res = await this.ssh.exec(cmd);
    if (res.stderr) throw new Error(res.stderr);
    return { command: cmd, output: res.stdout.trim() };
  }

  async stats(ids: string[]): Promise<ContainerStats[]> {
    if (!ids.length) return [];
    const cmd = `docker stats --no-stream --format '{{json .}}' ${ids.join(' ')}`;
    const { stdout, stderr } = await this.ssh.exec(cmd);
    if (stderr) throw new Error(stderr);
    const rows = parseJsonLines(stdout);
    return rows.map((row) => ({
      id: row.ID,
      name: row.Name,
      cpuPercent: parsePercent(row.CPUPerc),
      memUsageBytes: parseBytes(row.MemUsage?.split('/')[0]),
      memLimitBytes: parseBytes(row.MemUsage?.split('/')[1]),
      memPercent: parsePercent(row.MemPerc),
    }));
  }

  async statsAll(): Promise<ContainerStats[]> {
    const containers = await this.listContainers();
    const ids = containers.map((c) => c.id);
    return this.stats(ids);
  }
}
