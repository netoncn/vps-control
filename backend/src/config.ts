import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from local-only files if present
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type AppConfig = {
  serverHost: string;
  serverPort: number;
  corsOrigin: string;
  auth: {
    enabled: boolean;
    jwtSecret: string;
    username: string;
    passwordHash: string;
  };
  ssh: {
    host: string;
    port: number;
    username: string;
    privateKey?: Buffer;
    privateKeyPath?: string;
    password?: string;
    passphrase?: string;
    timeoutMs: number;
  };
};

export function loadConfig(): AppConfig {
  const {
    HOST,
    PORT,
    CORS_ORIGIN,
    AUTH_ENABLED,
    AUTH_JWT_SECRET,
    AUTH_USERNAME,
    AUTH_PASSWORD_HASH,
    VPS_HOST,
    VPS_PORT,
    VPS_USERNAME,
    VPS_PRIVATE_KEY_PATH,
    VPS_PASSWORD,
    VPS_PRIVATE_KEY_PASSPHRASE,
    SSH_CONNECT_TIMEOUT_MS,
  } = process.env;

  if (!VPS_HOST || !VPS_USERNAME) {
    throw new Error('Missing VPS_HOST or VPS_USERNAME. Set them in .env.local.');
  }

  const privateKeyPath = VPS_PRIVATE_KEY_PATH || undefined;
  const privateKey =
    privateKeyPath && fs.existsSync(privateKeyPath)
      ? fs.readFileSync(privateKeyPath)
      : undefined;

  const authEnabled = AUTH_ENABLED === 'true';

  return {
    serverHost: HOST || '0.0.0.0',
    serverPort: PORT ? Number(PORT) : 4000,
    corsOrigin: CORS_ORIGIN || 'http://localhost:5173',
    auth: {
      enabled: authEnabled,
      jwtSecret: AUTH_JWT_SECRET || 'change-this-secret-in-production',
      username: AUTH_USERNAME || 'admin',
      passwordHash: AUTH_PASSWORD_HASH || '',
    },
    ssh: {
      host: VPS_HOST,
      port: VPS_PORT ? Number(VPS_PORT) : 22,
      username: VPS_USERNAME,
      privateKey,
      privateKeyPath,
      password: VPS_PASSWORD || undefined,
      passphrase: VPS_PRIVATE_KEY_PASSPHRASE || undefined,
      timeoutMs: SSH_CONNECT_TIMEOUT_MS ? Number(SSH_CONNECT_TIMEOUT_MS) : 15000,
    },
  };
}
