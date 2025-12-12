import { SSHClient } from './sshClient';
import { SystemOverview } from '../types';

export class SystemService {
  constructor(private ssh: SSHClient) {}

  async getCores(): Promise<number> {
    const { stdout, stderr } = await this.ssh.exec('nproc');
    if (stderr) throw new Error(stderr);
    return Number(stdout.trim());
  }

  async getLoad(): Promise<number[]> {
    const { stdout, stderr } = await this.ssh.exec("cat /proc/loadavg | awk '{print $1\" \"$2\" \"$3}'");
    if (stderr) throw new Error(stderr);
    return stdout
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((v) => Number(v));
  }

  async getMemory(): Promise<SystemOverview['memory']> {
    const { stdout, stderr } = await this.ssh.exec("free -m | awk '/Mem:/ {print $2\" \"$3\" \"$4}'");
    if (stderr) throw new Error(stderr);
    const [totalStr, usedStr, freeStr] = stdout.trim().split(/\s+/);
    const total = Number(totalStr);
    const used = Number(usedStr);
    const free = Number(freeStr);
    const usedPercent = total ? Math.round((used / total) * 100) : 0;
    return { totalMb: total, usedMb: used, freeMb: free, usedPercent };
  }

  async getDisk(): Promise<SystemOverview['disk']> {
    const { stdout, stderr } = await this.ssh.exec(
      "df -B1 --output=source,size,used,avail,pcent,target -x tmpfs -x devtmpfs | tail -n +2",
    );
    if (stderr) throw new Error(stderr);
    return stdout
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 6)
      .map((parts) => ({
        fs: parts[0],
        sizeBytes: Number(parts[1]),
        usedBytes: Number(parts[2]),
        availBytes: Number(parts[3]),
        usedPercent: Number(parts[4].replace('%', '')) || 0,
        target: parts[5],
      }));
  }

  async overview(): Promise<SystemOverview> {
    const [cores, load, memory, disk] = await Promise.all([
      this.getCores(),
      this.getLoad(),
      this.getMemory(),
      this.getDisk(),
    ]);
    return { cores, load, memory, disk };
  }
}
