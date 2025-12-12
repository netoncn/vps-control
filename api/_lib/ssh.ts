import { Client, ConnectConfig } from 'ssh2';
import { loadConfig } from './config';

export type ExecResult = {
  stdout: string;
  stderr: string;
  code?: number | null;
};

export async function execSSH(command: string): Promise<ExecResult> {
  const config = loadConfig();
  const { host, port, username, privateKey, password, timeoutMs } = config.ssh;

  const connectConfig: ConnectConfig = {
    host,
    port,
    username,
    readyTimeout: timeoutMs,
  };

  if (privateKey) {
    connectConfig.privateKey = privateKey;
  }
  if (password) {
    connectConfig.password = password;
  }

  return new Promise((resolve, reject) => {
    const client = new Client();
    const timer = setTimeout(() => {
      client.end();
      reject(new Error(`SSH timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    client
      .on('ready', () => {
        client.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            client.end();
            reject(err);
            return;
          }

          const stdoutChunks: Buffer[] = [];
          const stderrChunks: Buffer[] = [];

          stream
            .on('close', (code: number | null) => {
              clearTimeout(timer);
              client.end();
              resolve({
                stdout: Buffer.concat(stdoutChunks).toString('utf8'),
                stderr: Buffer.concat(stderrChunks).toString('utf8'),
                code,
              });
            })
            .on('data', (data: Buffer) => stdoutChunks.push(data))
            .stderr.on('data', (data: Buffer) => stderrChunks.push(data));
        });
      })
      .on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .connect(connectConfig);
  });
}
