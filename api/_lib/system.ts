import { execSSH } from './ssh';

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

export async function getSystemOverview(): Promise<SystemOverview> {
  // Get CPU cores
  const { stdout: coresOut } = await execSSH('nproc');
  const cores = parseInt(coresOut.trim(), 10);

  // Get load average
  const { stdout: loadOut } = await execSSH('cat /proc/loadavg');
  const loadParts = loadOut.trim().split(' ');
  const load = loadParts.slice(0, 3).map(Number);

  // Get memory info
  const { stdout: memOut } = await execSSH('free -m');
  const memLines = memOut.trim().split('\n');
  const memParts = memLines[1]?.split(/\s+/) || [];
  const totalMb = parseInt(memParts[1] || '0', 10);
  const usedMb = parseInt(memParts[2] || '0', 10);
  const freeMb = parseInt(memParts[3] || '0', 10);
  const usedPercent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;

  // Get disk info
  const { stdout: diskOut } = await execSSH('df -B1');
  const diskLines = diskOut.trim().split('\n').slice(1);
  const disk = diskLines
    .filter((line) => line.startsWith('/'))
    .map((line) => {
      const parts = line.split(/\s+/);
      const sizeBytes = parseInt(parts[1] || '0', 10);
      const usedBytes = parseInt(parts[2] || '0', 10);
      const availBytes = parseInt(parts[3] || '0', 10);
      const usedPercent = parseInt((parts[4] || '0').replace('%', ''), 10);
      return {
        fs: parts[0],
        sizeBytes,
        usedBytes,
        availBytes,
        usedPercent,
        target: parts[5] || '/',
      };
    });

  return {
    cores,
    load,
    memory: { totalMb, usedMb, freeMb, usedPercent },
    disk,
  };
}
