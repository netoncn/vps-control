export type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt?: string;
  ports?: string;
  labels: Record<string, string>;
  composeProject?: string;
};

export type ContainerInspect = {
  env: Array<{ key: string; value: string }>;
};

export type ContainerStats = {
  id: string;
  name: string;
  cpuPercent?: number;
  memUsageBytes?: number;
  memLimitBytes?: number;
  memPercent?: number;
};

export type ResourceLimits = {
  cpus?: string;
  memory?: string;
};

export type Project = {
  id: string;
  name: string;
  containerIds: string[];
  source: 'auto' | 'manual';
  composeProject?: string;
};

export type ProjectWithContainers = {
  project: Project;
  containers: ContainerInfo[];
};

export type LogsTailOptions = {
  lines?: number;
};

export type LogsStreamHandle = {
  close: () => void;
};

export type SystemOverview = {
  cores: number;
  load: number[];
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usedPercent: number;
  };
  disk: Array<{
    fs: string;
    sizeBytes: number;
    usedBytes: number;
    availBytes: number;
    usedPercent: number;
    target: string;
  }>;
};
