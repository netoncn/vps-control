import { Client, ConnectConfig } from 'ssh2';
import { AppConfig } from '../config';

export type ExecResult = {
  stdout: string;
  stderr: string;
  code?: number | null;
  signal?: string | null;
};

type StreamCallbacks = {
  onData: (chunk: Buffer) => void;
  onError: (err: Error) => void;
  onClose: () => void;
};

export class SSHClient {
  private cfg: AppConfig['ssh'];

  constructor(cfg: AppConfig['ssh']) {
    this.cfg = cfg;
  }

  private connectConfig(): ConnectConfig {
    const { host, port, username, privateKey, password, timeoutMs } = this.cfg;
    const config: ConnectConfig = {
      host,
      port,
      username,
      readyTimeout: timeoutMs,
    };

    if (privateKey) {
      config.privateKey = privateKey;
    }
    if (password) {
      config.password = password;
    }

    return config;
  }

  async exec(command: string, timeoutMs?: number): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const timer = setTimeout(() => {
        client.end();
        reject(new Error(`SSH command timed out after ${timeoutMs || this.cfg.timeoutMs}ms`));
      }, timeoutMs || this.cfg.timeoutMs);

      client
        .on('ready', () => {
          client.exec(command, (err: Error | undefined, stream) => {
            if (err) {
              clearTimeout(timer);
              client.end();
              reject(err);
              return;
            }

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            stream
              .on('close', (code: number | null, signal: string | null) => {
                clearTimeout(timer);
                client.end();
                resolve({
                  stdout: Buffer.concat(stdoutChunks).toString('utf8'),
                  stderr: Buffer.concat(stderrChunks).toString('utf8'),
                  code,
                  signal,
                });
              })
              .on('data', (data: Buffer) => stdoutChunks.push(data))
              .stderr.on('data', (data: Buffer) => stderrChunks.push(data));
          });
        })
        .on('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        })
        .connect(this.connectConfig());
    });
  }

  stream(command: string, callbacks: StreamCallbacks, timeoutMs?: number) {
    const client = new Client();
    const timer = setTimeout(() => {
      client.end();
      callbacks.onError(new Error(`SSH stream timed out after ${timeoutMs || this.cfg.timeoutMs}ms`));
    }, timeoutMs || this.cfg.timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      client.end();
    };

    client
      .on('ready', () => {
        client.exec(command, (err: Error | undefined, stream) => {
          if (err) {
            cleanup();
            callbacks.onError(err);
            return;
          }

          stream
            .on('close', () => {
              cleanup();
              callbacks.onClose();
            })
            .on('data', (data: Buffer) => callbacks.onData(data))
            .stderr.on('data', (data: Buffer) => callbacks.onError(new Error(data.toString('utf8'))));
        });
      })
      .on('error', (err: Error) => {
        cleanup();
        callbacks.onError(err);
      })
      .connect(this.connectConfig());

    return {
      close: cleanup,
    };
  }
}
